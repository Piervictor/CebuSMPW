import { useState, useEffect, useMemo } from 'react';
import { toLocalDateStr } from '../../lib/dateUtils';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  type Shift,
  type Member,
  type WeekdayAvailability,
  type LocationCategory,
} from '../data/mockData';
import { useAppContext } from '../hooks/useAppContext';
import {
  Calendar, MapPin, Users, AlertTriangle, CheckCircle2, Clock, Send, Search,
  ChevronLeft, ChevronRight, Building2, UserPlus, X,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Availability matching utilities ──────────────────────────

type ShiftPeriod = 'Morning' | 'Afternoon' | 'Evening';

/** Classify a shift's time range into a broad period. */
function classifyShiftPeriod(startTime: string, endTime: string): ShiftPeriod {
  const [sh] = startTime.split(':').map(Number);
  const [eh] = endTime.split(':').map(Number);
  // Evening: shift starts at 17:00 or later
  if (sh >= 17) return 'Evening';
  // Afternoon: shift starts at 12:00 or later (but before evening)
  if (sh >= 12) return 'Afternoon';
  // Morning start – if it ends past 14:00—treat as Afternoon (spans into PM)
  if (eh > 14) return 'Afternoon';
  return 'Morning';
}

/**
 * Map of which WeekdayAvailability values cover each shift period.
 * 'Full Day' always covers everything.
 */
const PERIOD_COVERAGE: Record<ShiftPeriod, WeekdayAvailability[]> = {
  Morning:   ['Morning', 'Half Day Morning', 'Full Day'],
  Afternoon: ['Afternoon', 'Half Day Afternoon', 'Full Day'],
  Evening:   ['Evening', 'Full Day'],
};

/**
 * Determine the day-of-week key from a shift's ISO date string.
 * Returns the lowercase weekday name matching MemberAvailability keys,
 * or 'saturday'/'sunday' for weekends.
 */
function getWeekdayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
}

/**
 * Check whether a member's recorded availability covers the given shift.
 * Returns { available, reason, dayAvailability }.
 */
function checkAvailabilityMatch(
  member: Member,
  shift: Shift,
): { available: boolean; reason: string; dayAvailability: string } {
  const dayKey = getWeekdayKey(shift.date);

  // ── Weekend logic: member only stores how many Sat/Sun per month ──
  if (dayKey === 'saturday') {
    const days = member.availability.saturdayDays;
    if (days <= 0) return { available: false, reason: 'Not available on Saturdays', dayAvailability: `Sat: ${days}/mo` };
    return { available: true, reason: '', dayAvailability: `Sat: ${days}/mo` };
  }
  if (dayKey === 'sunday') {
    const days = member.availability.sundayDays;
    if (days <= 0) return { available: false, reason: 'Not available on Sundays', dayAvailability: `Sun: ${days}/mo` };
    return { available: true, reason: '', dayAvailability: `Sun: ${days}/mo` };
  }

  // ── Weekday logic ──
  const memberAvail = member.availability[dayKey as keyof typeof member.availability] as WeekdayAvailability;

  if (memberAvail === 'NA') {
    return { available: false, reason: `Not available on ${dayKey}`, dayAvailability: 'NA' };
  }

  const shiftPeriod = classifyShiftPeriod(shift.startTime, shift.endTime);
  const acceptableValues = PERIOD_COVERAGE[shiftPeriod];

  if (!acceptableValues.includes(memberAvail)) {
    return {
      available: false,
      reason: `Available ${memberAvail} only — shift is ${shiftPeriod.toLowerCase()}`,
      dayAvailability: memberAvail,
    };
  }

  return { available: true, reason: '', dayAvailability: memberAvail };
}

// ─── Suitability helpers ──────────────────────────────────────

const CATEGORY_TAG_STYLES: Record<string, { bg: string; text: string }> = {
  Hospital: { bg: '#FFF1F2', text: '#BE123C' },
  Plaza:    { bg: '#F0F9FF', text: '#0369A1' },
  Terminal: { bg: '#FFFBEB', text: '#92400E' },
  Mall:     { bg: '#F5F3FF', text: '#6D28D9' },
};
const DEFAULT_TAG_STYLE = { bg: '#F0FDFA', text: '#0F766E' };

/**
 * Sort eligible members by:
 * 1. Suitable for the location category (qualified members first)
 * 2. Least recently served (fairness among equally-qualified members)
 * 3. Alphabetical by name as fallback
 */
function sortEligibleMembers(
  eligible: Member[],
  allShifts: Shift[],
  locationCategory: LocationCategory | undefined,
): Member[] {
  const todayStr = toLocalDateStr(new Date());
  const lastServedMap = new Map<string, string>();
  for (const m of eligible) {
    let latest = '';
    for (const s of allShifts) {
      if (s.assignedMembers.includes(m.id) && s.date <= todayStr && s.date > latest) {
        latest = s.date;
      }
    }
    lastServedMap.set(m.id, latest);
  }

  return [...eligible].sort((a, b) => {
    // 1. Suitable for location category first (qualified members surface to top)
    if (locationCategory) {
      const suitA = a.suitableCategories?.includes(locationCategory) ? 0 : 1;
      const suitB = b.suitableCategories?.includes(locationCategory) ? 0 : 1;
      if (suitA !== suitB) return suitA - suitB;
    }

    // 2. Least recently served (empty string = never served → highest priority)
    const lastA = lastServedMap.get(a.id) || '';
    const lastB = lastServedMap.get(b.id) || '';
    if (lastA !== lastB) return lastA.localeCompare(lastB);

    // 3. Alphabetical fallback
    return a.name.localeCompare(b.name);
  });
}

// ─── Component ────────────────────────────────────────────────

export default function Scheduling() {
  const {
    shifts, locations, members, congregations, timeslots,
    getLocationById, assignMemberToShift, removeFromShift, loadShiftsForWeek, isLoading,
  } = useAppContext();
  const getMemberById = (id: string) => members.find((m) => m.id === id);
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCongregation, setFilterCongregation] = useState<string>('all');
  const [filterExperience, setFilterExperience] = useState<string>('all');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Set initial location once data loads
  useEffect(() => {
    if (!selectedLocation && locations.length > 0) {
      const first = locations.find((l) => l.active);
      if (first) setSelectedLocation(first.id);
    }
  }, [locations, selectedLocation]);

  // ── Week helpers ──
  const getWeekStart = (offset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff + offset * 7);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const weekStart = getWeekStart(selectedWeekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = toLocalDateStr(weekStart);

  // Load/generate shifts from DB when location or week changes
  const [shiftsLoading, setShiftsLoading] = useState(false);
  useEffect(() => {
    if (!selectedLocation || !weekStartStr) return;
    let cancelled = false;
    setShiftsLoading(true);
    loadShiftsForWeek(selectedLocation, weekStartStr).finally(() => {
      if (!cancelled) setShiftsLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedLocation, weekStartStr, loadShiftsForWeek]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart.toISOString()]);

  // Shifts for the selected location + week
  const weekShifts = shifts.filter((s) => {
    const shiftDate = new Date(s.date);
    return s.locationId === selectedLocation && shiftDate >= weekStart && shiftDate <= weekEnd;
  });

  const shiftsByDay: Record<string, Shift[]> = {};
  weekShifts.forEach((shift) => {
    if (!shiftsByDay[shift.date]) shiftsByDay[shift.date] = [];
    shiftsByDay[shift.date].push(shift);
  });

  // ── Location stats for sidebar ──
  const getLocationWeekStats = (locationId: string) => {
    const locShifts = shifts.filter((s) => {
      const d = new Date(s.date);
      return s.locationId === locationId && d >= weekStart && d <= weekEnd;
    });
    const total = locShifts.length;
    const filled = locShifts.filter((s) => s.status === 'filled').length;
    const open = locShifts.filter((s) => s.status === 'open').length;
    return { total, filled, open, partial: total - filled - open };
  };

  const activeLocations = locations.filter((l) => l.active);
  const filteredLocations = activeLocations.filter((l) =>
    l.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  // ── Eligible member logic ──
  const getEligibleMembers = (shift: Shift | null): Member[] => {
    if (!shift) return [];
    const location = getLocationById(shift.locationId);
    if (!location) return [];

    const filtered = members.filter((member) => {
      if (!location.linkedCongregations.includes(member.congregationId)) return false;
      if (location.ageGroup === 'Seniors excluded' && member.ageGroup === 'Senior') return false;
      if (location.ageGroup === 'Adults only' && member.ageGroup === 'Youth') return false;
      if (location.experienceLevel === 'Experienced only' && member.experience !== 'Experienced') return false;
      const { available } = checkAvailabilityMatch(member, shift);
      if (!available) return false;
      if (filterCongregation !== 'all' && member.congregationId !== filterCongregation) return false;
      if (filterExperience !== 'all' && member.experience !== filterExperience) return false;
      if (searchTerm && !member.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    return sortEligibleMembers(filtered, shifts, location.category);
  };

  const checkMemberWarnings = (member: Member, shift: Shift): string[] => {
    const warnings: string[] = [];
    if (member.weeklyReservations >= member.weeklyLimit) {
      warnings.push('Weekly limit reached');
    } else if (member.weeklyReservations >= member.weeklyLimit - 1) {
      warnings.push('Near weekly limit');
    }
    if (member.monthlyReservations >= member.monthlyLimit) {
      warnings.push('Monthly limit reached');
    } else if (member.monthlyReservations >= member.monthlyLimit - 2) {
      warnings.push('Near monthly limit');
    }
    const memberShifts = shifts.filter(
      (s) => s.assignedMembers.includes(member.id) && s.date === shift.date
    );
    if (memberShifts.length > 0) warnings.push('Has another shift this day');
    return warnings;
  };

  const handleAssignMember = async (memberId: string) => {
    if (!selectedShift) return;
    try {
      await assignMemberToShift(selectedShift.id, memberId);
      toast.success(`${getMemberById(memberId)?.name} assigned to shift`, {
        description: 'Member has been scheduled successfully',
      });
      setDialogOpen(false);
      setSelectedShift(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign member');
    }
  };

  const handleRemoveMember = async (shiftId: string, memberId: string) => {
    try {
      await removeFromShift(shiftId, memberId);
      toast.success(`${getMemberById(memberId)?.name} removed from shift`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const openAssignDialog = (shift: Shift) => {
    setSelectedShift(shift);
    setSearchTerm('');
    setFilterCongregation('all');
    setFilterExperience('all');
    setDialogOpen(true);
  };

  const eligibleMembers = getEligibleMembers(selectedShift);
  const location = selectedLocation ? getLocationById(selectedLocation) : null;

  // ── Format helpers ──
  const fmt12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const fmtDateShort = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const fmtDateFull = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // ── Coverage % for a location ──
  const getCoveragePercent = (locationId: string) => {
    const stats = getLocationWeekStats(locationId);
    if (stats.total === 0) return 0;
    return Math.round((stats.filled / stats.total) * 100);
  };

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">Scheduling</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Assign publishers to witnessing shifts across locations.
          </p>
        </div>
      </div>

      {/* ── Split layout: Sidebar + Detail ── */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-14rem)]">

        {/* ════════ LEFT SIDEBAR — Location list ════════ */}
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden sticky top-20">
            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Locations
                </h2>
                <span className="text-xs font-medium text-neutral-400">
                  {activeLocations.length} active
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search locations…"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                />
              </div>
            </div>

            {/* Location list */}
            <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
              {filteredLocations.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                  <p className="text-sm text-neutral-400">
                    {activeLocations.length === 0 ? 'No active locations' : 'No matches'}
                  </p>
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isSelected = selectedLocation === loc.id;
                  const stats = getLocationWeekStats(loc.id);
                  const coverage = getCoveragePercent(loc.id);
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc.id)}
                      className={`w-full text-left px-4 py-3 transition-colors relative border-b border-neutral-100 last:border-b-0 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-neutral-50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600" />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-neutral-800'}`}>
                            {loc.name}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {loc.category} · {loc.city}
                          </p>
                        </div>
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-neutral-300'}`} />
                      </div>
                      {/* Coverage bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              coverage >= 80 ? 'bg-emerald-500' : coverage >= 40 ? 'bg-amber-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.max(coverage, 2)}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-medium tabular-nums ${isSelected ? 'text-blue-600' : 'text-neutral-400'}`}>
                          {stats.filled}/{stats.total}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Sidebar footer */}
            <div className="border-t border-neutral-100 px-4 py-2.5 flex items-center justify-between text-xs text-neutral-400">
              <span>{activeLocations.length} locations</span>
              <span>{weekShifts.length} shifts this week</span>
            </div>
          </div>
        </aside>

        {/* ════════ RIGHT PANEL — Schedule ════════ */}
        <main className="flex-1 min-w-0">
          {location ? (
            <div className="space-y-4">
              {/* ── Location header + week nav ── */}
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Location info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 flex-shrink-0">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-neutral-900 truncate">{location.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-neutral-500">{location.category}</span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-xs text-neutral-500">{location.ageGroup || 'All ages'}</span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-xs text-neutral-500">{location.experienceLevel || 'Any experience'}</span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-xs text-neutral-500">Max {location.maxPublishers || 3}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Week navigator */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedWeekOffset(selectedWeekOffset - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-medium h-8 px-3 min-w-[150px] justify-center"
                      onClick={() => setSelectedWeekOffset(0)}
                    >
                      {selectedWeekOffset === 0
                        ? 'This Week'
                        : `${fmtDateShort(weekStart)} – ${fmtDateShort(weekEnd)}`}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedWeekOffset(selectedWeekOffset + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Week date range subtitle */}
                <p className="text-xs text-neutral-400 mt-2">
                  {fmtDateShort(weekStart)} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                  {weekShifts.length} shift{weekShifts.length !== 1 ? 's' : ''}
                  {' · '}
                  {weekShifts.filter((s) => s.status === 'filled').length} filled
                  {' · '}
                  {weekShifts.filter((s) => s.status === 'open').length} open
                </p>
              </div>

              {/* ── Weekly schedule grid ── */}
              <div className="space-y-3">
                {weekDays.map((day) => {
                  const dateStr = toLocalDateStr(day);
                  const dayShifts = (shiftsByDay[dateStr] || []).sort((a, b) =>
                    a.startTime.localeCompare(b.startTime)
                  );
                  const isToday = dateStr === toLocalDateStr(new Date());

                  return (
                    <div
                      key={dateStr}
                      className={`bg-white border rounded-xl shadow-sm overflow-hidden ${
                        isToday ? 'border-blue-200' : 'border-neutral-200'
                      }`}
                    >
                      {/* Day header */}
                      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                        isToday ? 'bg-blue-50/60 border-blue-100' : 'bg-neutral-50/60 border-neutral-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-neutral-800'}`}>
                            {day.toLocaleDateString('en-US', { weekday: 'long' })}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-medium bg-blue-600 text-white px-1.5 py-0.5 rounded">
                              TODAY
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-400">
                          {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Shifts */}
                      {dayShifts.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs text-neutral-400">No shifts scheduled</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-100">
                          {dayShifts.map((shift) => {
                            const assignedCount = shift.assignedMembers.length;
                            const isFilled = shift.status === 'filled';
                            const isOpen = shift.status === 'open';

                            return (
                              <div key={shift.id} className="px-4 py-3 hover:bg-neutral-50/50 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                  {/* Time + status */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                                      <span className="text-sm font-medium text-neutral-800 tabular-nums">
                                        {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                                      </span>
                                    </div>
                                    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                      isFilled
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : isOpen
                                        ? 'bg-red-50 text-red-600'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {assignedCount}/{shift.requiredCount}
                                      {isFilled ? ' Filled' : isOpen ? ' Open' : ' Partial'}
                                    </span>
                                  </div>

                                  {/* Assign button */}
                                  {!isFilled && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1 flex-shrink-0"
                                      onClick={() => openAssignDialog(shift)}
                                    >
                                      <UserPlus className="h-3 w-3" />
                                      Assign
                                    </Button>
                                  )}
                                </div>

                                {/* Assigned members */}
                                {assignedCount > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2 ml-5">
                                    {shift.assignedMembers.map((memberId) => {
                                      const member = getMemberById(memberId);
                                      if (!member) return null;
                                      return (
                                        <span
                                          key={memberId}
                                          className="group inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-700 pl-2 pr-1 py-0.5 rounded-md"
                                        >
                                          {member.name}
                                          <button
                                            onClick={() => handleRemoveMember(shift.id, memberId)}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded transition-opacity"
                                            title="Remove from shift"
                                          >
                                            <X className="h-3 w-3 text-red-500" />
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-neutral-100 mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-neutral-300" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-700">
                  {activeLocations.length === 0 ? 'No active locations' : 'Select a location'}
                </h3>
                <p className="text-sm text-neutral-400 mt-1 max-w-xs mx-auto">
                  {activeLocations.length === 0
                    ? 'Add an active location in the Locations page to start scheduling.'
                    : 'Pick a location from the sidebar to view and manage its weekly schedule.'}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Assignment Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Member to Shift</DialogTitle>
            <DialogDescription>
              {selectedShift && (
                <span className="flex items-center gap-1.5 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(selectedShift.date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'short', day: 'numeric',
                  })}
                  <span className="text-neutral-300">·</span>
                  <Clock className="h-3.5 w-3.5" />
                  {fmt12h(selectedShift.startTime)} – {fmt12h(selectedShift.endTime)}
                  <span className="text-neutral-300">·</span>
                  {location?.name}
                  <span className="text-neutral-300">·</span>
                  {selectedShift.assignedMembers.length}/{selectedShift.requiredCount} assigned
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Currently assigned */}
          {selectedShift && selectedShift.assignedMembers.length > 0 && (
            <div className="px-1">
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Currently Assigned</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedShift.assignedMembers.map((memberId) => {
                  const member = getMemberById(memberId);
                  if (!member) return null;
                  return (
                    <span key={memberId} className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 pl-2.5 pr-1.5 py-1 rounded-md">
                      <CheckCircle2 className="h-3 w-3" />
                      {member.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Search members…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={filterCongregation} onValueChange={setFilterCongregation}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All congregations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Congregations</SelectItem>
                {congregations.map((cong) => (
                  <SelectItem key={cong.id} value={cong.id}>{cong.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterExperience} onValueChange={setFilterExperience}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Experienced">Experienced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Eligible members list */}
          <div className="flex-1 overflow-hidden px-1">
            <p className="text-xs font-medium text-neutral-500 mb-2">
              Eligible Members ({eligibleMembers.length})
            </p>
            <ScrollArea className="h-[360px]">
              <div className="space-y-1.5 pr-3">
                {eligibleMembers.map((member) => {
                  const warnings = checkMemberWarnings(member, selectedShift!);
                  const hasBlockingWarning = warnings.some((w) => w.includes('limit reached'));
                  const alreadyAssigned = selectedShift?.assignedMembers.includes(member.id);
                  const { dayAvailability } = checkAvailabilityMatch(member, selectedShift!);
                  const shiftLocation = getLocationById(selectedShift!.locationId);
                  const isSuitable = shiftLocation && member.suitableCategories?.includes(shiftLocation.category);

                  return (
                    <div
                      key={member.id}
                      className={`p-3 border rounded-lg transition-colors ${
                        alreadyAssigned
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : hasBlockingWarning
                          ? 'border-red-200 bg-red-50/50'
                          : warnings.length > 0
                          ? 'border-amber-200 bg-amber-50/50'
                          : isSuitable
                          ? 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-300'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                            <span className="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                              {member.experience}
                            </span>
                            <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              {dayAvailability}
                            </span>
                            {member.suitableCategories?.map((cat) => {
                              const style = CATEGORY_TAG_STYLES[cat] || DEFAULT_TAG_STYLE;
                              const isMatch = shiftLocation?.category === cat;
                              return (
                                <span
                                  key={cat}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: style.bg,
                                    color: style.text,
                                    outline: isMatch ? `1.5px solid ${style.text}` : undefined,
                                  }}
                                >
                                  {cat}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                            <span>{getCongregationName(member.congregationId)}</span>
                            <span className="text-neutral-300">·</span>
                            <span>{member.ageGroup}</span>
                            <span className="text-neutral-300">·</span>
                            <span className="tabular-nums">W: {member.weeklyReservations}/{member.weeklyLimit}</span>
                            <span className="text-neutral-300">·</span>
                            <span className="tabular-nums">M: {member.monthlyReservations}/{member.monthlyLimit}</span>
                          </div>
                          {warnings.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                              <span className="text-[11px] text-amber-600">
                                {warnings.join(' · ')}
                              </span>
                            </div>
                          )}
                        </div>
                        {alreadyAssigned ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 flex-shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Assigned
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1 flex-shrink-0"
                            onClick={() => handleAssignMember(member.id)}
                            disabled={hasBlockingWarning || isLoading}
                          >
                            <Send className="h-3 w-3" />
                            Assign
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {eligibleMembers.length === 0 && (
                  <div className="text-center py-10 text-neutral-500">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No eligible members found</p>
                    <p className="text-xs mt-1 text-neutral-400">Try adjusting the filters above</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
