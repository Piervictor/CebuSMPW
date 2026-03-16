import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Search, MapPin, Users, Calendar, X } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';

interface SearchResult {
  type: 'member' | 'location' | 'schedule';
  id: string;
  label: string;
  detail: string;
  href: string;
}

// ── Flexible date matcher ─────────────────────────────────────
// Returns true if the shift's ISO date (YYYY-MM-DD) matches the
// user's natural-language query in any of these formats:
//   "march", "mar", "03"           → month match
//   "march 2026", "03/2026"        → month + year
//   "march 5", "march 5 2025"      → month + day (+ year)
//   "03/5/2025", "3/5/2025"        → M/D/YYYY or M/D/YY
//   "2026-03", "2026-03-12"        → ISO prefix (existing behaviour)
const MONTH_NAMES: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function matchesDateQuery(dateStr: string, q: string): boolean {
  // Always support ISO prefix as-is
  if (dateStr.includes(q)) return true;

  const [yyyy, mm, dd] = dateStr.split('-');

  // Slash format: M/D/YYYY or M/D/YY  e.g. "3/5/2025"
  const slashMatch = q.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, qm, qd, qy] = slashMatch;
    const fullYear = qy.length === 2 ? `20${qy}` : qy;
    return mm === qm.padStart(2, '0') && dd === qd.padStart(2, '0') && yyyy === fullYear;
  }

  // Tokenise: "march 5 2025" → ["march","5","2025"]
  const tokens = q.trim().split(/[\s,]+/);
  const monthToken = tokens.find((t) => MONTH_NAMES[t]);
  const numTokens = tokens.filter((t) => /^\d+$/.test(t));

  if (!monthToken) return false;
  const targetMM = MONTH_NAMES[monthToken];
  if (mm !== targetMM) return false;

  // Year token: 4-digit number
  const yearToken = numTokens.find((t) => t.length === 4);
  if (yearToken && yyyy !== yearToken) return false;

  // Day token: 1-2 digit number (not the year)
  const dayToken = numTokens.find((t) => t.length <= 2);
  if (dayToken && dd !== dayToken.padStart(2, '0')) return false;

  return true;
}

export function GlobalSearch() {
  const { members, locations, shifts, getLocationById } = useAppContext();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search term
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo<SearchResult[]>(() => {
    const q = debouncedQuery.toLowerCase();
    if (q.length < 2) return [];

    const items: SearchResult[] = [];

    // Members — limit to 5
    for (const m of members) {
      if (items.filter((r) => r.type === 'member').length >= 5) break;
      if (m.name.toLowerCase().includes(q)) {
        items.push({
          type: 'member',
          id: m.id,
          label: m.name,
          detail: `${m.status} · ${m.experience}`,
          href: '/members',
        });
      }
    }

    // Locations — limit to 5
    for (const l of locations) {
      if (items.filter((r) => r.type === 'location').length >= 5) break;
      if (l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)) {
        items.push({
          type: 'location',
          id: l.id,
          label: l.name,
          detail: l.city,
          href: `/locations/detail/${l.id}`,
        });
      }
    }

    // Shifts — limit to 5, search by natural-language date or location name
    for (const s of shifts) {
      if (items.filter((r) => r.type === 'schedule').length >= 5) break;
      const loc = getLocationById(s.locationId);
      const locName = loc?.name ?? '';
      if (matchesDateQuery(s.date, q) || locName.toLowerCase().includes(q)) {
        const assignedNames = s.assignedMembers
          .map((id) => members.find((m) => m.id === id)?.name)
          .filter(Boolean) as string[];
        const memberDetail = assignedNames.length > 0
          ? assignedNames.join(', ')
          : 'No members assigned';
        items.push({
          type: 'schedule',
          id: s.id,
          label: new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          }),
          detail: `${locName} · ${memberDetail}`,
          href: '/scheduling',
        });
      }
    }

    return items;
  }, [debouncedQuery, members, locations, shifts, getLocationById]);

  // Reset selection when results change
  useEffect(() => setSelectedIndex(0), [results]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goToResult = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(result.href);
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      goToResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const iconForType = (type: SearchResult['type']) => {
    switch (type) {
      case 'member': return <Users className="h-3.5 w-3.5" style={{ color: '#4F6BED' }} />;
      case 'location': return <MapPin className="h-3.5 w-3.5" style={{ color: '#22C55E' }} />;
      case 'schedule': return <Calendar className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />;
    }
  };

  const labelForType = (type: SearchResult['type']) => {
    switch (type) {
      case 'member': return 'Member';
      case 'location': return 'Location';
      case 'schedule': return 'Schedule';
    }
  };

  return (
    <div ref={containerRef} className="relative hidden sm:block w-full max-w-xs lg:max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search members, locations, or schedules"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="w-full h-9 pl-9 pr-8 text-[13px] rounded-lg border-0 outline-none placeholder:text-slate-500 text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-[10px] overflow-hidden z-50"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Search className="h-6 w-6 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
              <p className="text-[13px] font-medium" style={{ color: '#6B7280' }}>No results found</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>Try a different search term</p>
            </div>
          ) : (
            <div className="py-1.5 max-h-[340px] overflow-y-auto">
              {results.map((result, idx) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => goToResult(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 transition-colors"
                  style={{
                    backgroundColor: idx === selectedIndex ? '#F1F3FF' : 'transparent',
                  }}
                >
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: idx === selectedIndex ? '#E8EBFF' : '#F3F4F6' }}
                  >
                    {iconForType(result.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate" style={{ color: '#1F2937' }}>
                      {result.label}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>
                      {result.detail}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                  >
                    {labelForType(result.type)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
