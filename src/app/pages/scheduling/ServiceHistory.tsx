import { useState, useMemo } from 'react';
import { SchedulingBreadcrumb } from '../../components/SchedulingBreadcrumb';
import { MemberTooltip } from '../../components/MemberTooltip';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAppContext } from '../../hooks/useAppContext';
import { toLocalDateStr } from '../../../lib/dateUtils';
import {
  Search, Users, MapPin, Calendar, Clock, History,
} from 'lucide-react';

export default function ServiceHistory() {
  const { shifts, members, locations, congregations, getLocationById } = useAppContext();
  const getMemberById = (id: string) => members.find((m) => m.id === id);
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const activeLocations = locations.filter((l) => l.active);
  const activeMembers = members.filter((m) => m.status === 'Active').sort((a, b) => a.name.localeCompare(b.name));

  const fmt12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Available months derived from shift data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    shifts.forEach((s) => {
      if (s.assignedMembers.length > 0) months.add(s.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [shifts]);

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Flatten all assignment records into table rows
  type HistoryRow = {
    key: string;
    memberId: string;
    memberName: string;
    congregation: string;
    locationName: string;
    locationCity: string;
    date: string;
    startTime: string;
    endTime: string;
  };

  const historyRows = useMemo(() => {
    const rows: HistoryRow[] = [];

    const todayStr = toLocalDateStr(new Date());

    shifts.forEach((shift) => {
      if (shift.assignedMembers.length === 0) return;

      // Date range filter
      if (filterDate === 'this-week') {
        const today = new Date();
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const ws = new Date(today); ws.setDate(today.getDate() + diff);
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        if (shift.date < toLocalDateStr(ws) || shift.date > toLocalDateStr(we)) return;
      } else if (filterDate === 'this-month') {
        const today = new Date();
        const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
        const me = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        if (shift.date < ms || shift.date > me) return;
      } else if (filterDate === 'past') {
        if (shift.date >= todayStr) return;
      } else if (filterDate !== 'all' && !shift.date.startsWith(filterDate)) {
        return; // specific month like "2026-03"
      }

      // Location filter
      if (filterLocation !== 'all' && shift.locationId !== filterLocation) return;

      const loc = getLocationById(shift.locationId);

      shift.assignedMembers.forEach((memberId) => {
        // Member filter
        if (filterMember !== 'all' && memberId !== filterMember) return;

        const member = getMemberById(memberId);
        if (!member) return;

        // Search
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const match = member.name.toLowerCase().includes(term) ||
            loc?.name.toLowerCase().includes(term) ||
            getCongregationName(member.congregationId).toLowerCase().includes(term) ||
            shift.date.includes(term);
          if (!match) return;
        }

        rows.push({
          key: `${shift.id}-${memberId}`,
          memberId,
          memberName: member.name,
          congregation: getCongregationName(member.congregationId),
          locationName: loc?.name || 'Unknown',
          locationCity: loc?.city || '',
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
        });
      });
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime) || a.memberName.localeCompare(b.memberName));
  }, [shifts, filterMember, filterLocation, filterDate, searchTerm, getLocationById]);

  // Stats
  const uniqueMembers = new Set(historyRows.map((r) => r.memberId)).size;
  const uniqueLocations = new Set(historyRows.map((r) => r.locationName)).size;

  return (
    <div className="space-y-4">
      <SchedulingBreadcrumb items={[
        { label: 'Scheduling', href: '/scheduling' },
        { label: 'Service History' },
      ]} />
      {/* ── Top Filter Bar ── */}
      <div className="rounded-[10px] p-4 sticky top-14 z-10" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Search records…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-[13px]"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Member filter */}
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="h-9 text-[13px] w-full lg:w-[200px]" style={{ borderColor: '#E5E7EB' }}>
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {activeMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location filter */}
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="h-9 text-[13px] w-full lg:w-[200px]" style={{ borderColor: '#E5E7EB' }}>
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {activeLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range filter */}
          <Select value={filterDate} onValueChange={setFilterDate}>
            <SelectTrigger className="h-9 text-[13px] w-full lg:w-[170px]" style={{ borderColor: '#E5E7EB' }}>
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="past">Past Only</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Summary stats */}
          <div className="flex items-center gap-3 lg:ml-auto flex-shrink-0">
            <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{historyRows.length} records</span>
            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{uniqueMembers} members</span>
            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{uniqueLocations} locations</span>
          </div>
        </div>
      </div>

      {/* ── History Table ── */}
      {historyRows.length === 0 ? (
        <div className="rounded-[10px] p-14 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-center h-16 w-16 rounded-[10px] mx-auto mb-4" style={{ backgroundColor: '#F1F3FF' }}>
            <History className="h-8 w-8" style={{ color: '#4F6BED' }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>No service history records found.</h3>
          <p className="text-[13px] mt-1 max-w-xs mx-auto" style={{ color: '#6B7280' }}>
            Assignments will appear here once schedules are created. Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Table header — desktop */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_140px_160px_1fr] gap-3 px-4 py-2.5 items-center"
            style={{ backgroundColor: '#FAFBFC', borderBottom: '1px solid #E5E7EB' }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Member Name</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Location</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Date</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Time Slot</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Congregation</span>
          </div>

          {/* Table rows */}
          <div>
            {historyRows.map((row, idx) => {
              const todayStr = toLocalDateStr(new Date());
              const isToday = row.date === todayStr;
              const isPast = row.date < todayStr;

              return (
                <div key={row.key}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_1fr_140px_160px_1fr] gap-3 px-4 py-2.5 items-center transition-colors hover:bg-[#FAFBFC]"
                    style={{ borderBottom: idx < historyRows.length - 1 ? '1px solid #F3F4F6' : undefined }}>
                    {/* Member Name */}
                    <MemberTooltip memberId={row.memberId}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                          <span className="text-[10px] font-semibold" style={{ color: '#4F6BED' }}>
                            {row.memberName.split(',')[0]?.[0] || '?'}
                          </span>
                        </div>
                        <span className="text-[13px] font-medium truncate" style={{ color: isPast ? '#6B7280' : '#1F2937' }}>
                          {row.memberName}
                        </span>
                      </div>
                    </MemberTooltip>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#4F6BED' }} />
                      <span className="text-[13px] truncate" style={{ color: isPast ? '#6B7280' : '#1F2937' }}>
                        {row.locationName}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px]" style={{ color: isToday ? '#4F6BED' : isPast ? '#9CA3AF' : '#1F2937' }}>
                        {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {isToday && (
                        <span className="text-[8px] font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}>TODAY</span>
                      )}
                    </div>

                    {/* Time Slot */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                      <span className="text-[12px] tabular-nums" style={{ color: isPast ? '#9CA3AF' : '#4B5563' }}>
                        {fmt12h(row.startTime)} – {fmt12h(row.endTime)}
                      </span>
                    </div>

                    {/* Congregation */}
                    <span className="text-[12px] truncate" style={{ color: '#6B7280' }}>
                      {row.congregation}
                    </span>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden px-4 py-3 transition-colors hover:bg-[#FAFBFC]"
                    style={{ borderBottom: idx < historyRows.length - 1 ? '1px solid #F3F4F6' : undefined }}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                        <span className="text-[10px] font-semibold" style={{ color: '#4F6BED' }}>
                          {row.memberName.split(',')[0]?.[0] || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium truncate" style={{ color: '#1F2937' }}>{row.memberName}</p>
                        <p className="text-[11px]" style={{ color: '#6B7280' }}>{row.congregation}</p>
                      </div>
                      {isToday && (
                        <span className="text-[8px] font-semibold px-1 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}>TODAY</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] ml-9.5 pl-0.5" style={{ color: '#6B7280' }}>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" style={{ color: '#4F6BED' }} />{row.locationName}</span>
                      <span style={{ color: '#D1D5DB' }}>·</span>
                      <span>{formatDate(row.date)}</span>
                      <span style={{ color: '#D1D5DB' }}>·</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmt12h(row.startTime)} – {fmt12h(row.endTime)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
