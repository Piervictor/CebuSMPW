import { useState, useMemo, useEffect } from 'react';
import { SchedulingBreadcrumb } from '../../components/SchedulingBreadcrumb';
import { MemberTooltip } from '../../components/MemberTooltip';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAppContext } from '../../hooks/useAppContext';
import type { Shift } from '../../data/mockData';
import { Clock, MapPin, Search, Users, UserPlus, Calendar, Filter } from 'lucide-react';
import { toLocalDateStr } from '../../../lib/dateUtils';
import { toast } from 'sonner';

type TimeSlotFilter = 'all' | 'morning' | 'afternoon' | 'evening';

function classifyTime(startTime: string): TimeSlotFilter {
  const h = parseInt(startTime.split(':')[0], 10);
  if (h >= 17) return 'evening';
  if (h >= 12) return 'afternoon';
  return 'morning';
}

export default function VacantSlots() {
  const {
    shifts, locations, members, currentUser,
    getLocationById, assignMemberToShift, loadShiftsForWeek,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('upcoming');
  const [filterTimeSlot, setFilterTimeSlot] = useState<TimeSlotFilter>('all');

  const activeLocations = locations.filter((l) => l.active);

  // Load shifts for upcoming weeks across all active locations
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);

    const weeks: string[] = [];
    for (let i = 0; i < 4; i++) {
      const w = new Date(weekStart);
      w.setDate(weekStart.getDate() + i * 7);
      weeks.push(toLocalDateStr(w));
    }

    activeLocations.forEach((loc) => {
      weeks.forEach((w) => loadShiftsForWeek(loc.id, w));
    });
  }, [activeLocations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayStr = toLocalDateStr(new Date());

  const vacantShifts = useMemo(() => {
    let filtered = shifts.filter((s) => s.status !== 'filled');

    // Date range filter
    if (filterPeriod === 'upcoming') {
      filtered = filtered.filter((s) => s.date >= todayStr);
    } else if (filterPeriod === 'this-week') {
      const today = new Date();
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      filtered = filtered.filter((s) => s.date >= toLocalDateStr(weekStart) && s.date <= toLocalDateStr(weekEnd));
    } else if (filterPeriod === 'this-month') {
      const today = new Date();
      const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      const me = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      filtered = filtered.filter((s) => s.date >= ms && s.date <= me);
    }

    // Location filter
    if (filterLocation !== 'all') {
      filtered = filtered.filter((s) => s.locationId === filterLocation);
    }

    // Time slot filter
    if (filterTimeSlot !== 'all') {
      filtered = filtered.filter((s) => classifyTime(s.startTime) === filterTimeSlot);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => {
        const loc = getLocationById(s.locationId);
        return loc?.name.toLowerCase().includes(term) || s.date.includes(term);
      });
    }

    return filtered.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, filterLocation, filterPeriod, filterTimeSlot, searchTerm, todayStr, getLocationById]);

  const fmt12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDateLong = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Self-join for members
  const handleSelfJoin = async (shift: Shift) => {
    if (!currentUser) return;

    const member = members.find((m) =>
      m.telegramHandle === currentUser.telegramHandle ||
      m.email === currentUser.id ||
      m.name === currentUser.name
    );

    if (!member) {
      toast.error('Your member profile was not found');
      return;
    }

    try {
      await assignMemberToShift(shift.id, member.id);
      toast.success('You have been assigned to this shift!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join shift');
    }
  };

  const openCount = vacantShifts.filter((s) => s.status === 'open').length;
  const partialCount = vacantShifts.filter((s) => s.status === 'partial').length;

  return (
    <div className="space-y-4">
      <SchedulingBreadcrumb items={[
        { label: 'Scheduling', href: '/scheduling' },
        { label: 'Vacant Slots' },
      ]} />
      {/* ── Top Filter Bar ── */}
      <div className="rounded-[10px] p-4 sticky top-14 z-10" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Search location or date…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-[13px]"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

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
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="h-9 text-[13px] w-full lg:w-[160px]" style={{ borderColor: '#E5E7EB' }}>
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Time slot filter */}
          <Select value={filterTimeSlot} onValueChange={(v) => setFilterTimeSlot(v as TimeSlotFilter)}>
            <SelectTrigger className="h-9 text-[13px] w-full lg:w-[160px]" style={{ borderColor: '#E5E7EB' }}>
              <SelectValue placeholder="All time slots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time Slots</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>

          {/* Stats */}
          <div className="flex items-center gap-3 lg:ml-auto flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
              <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{openCount} open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
              <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{partialCount} partial</span>
            </div>
            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
              {vacantShifts.length} total
            </span>
          </div>
        </div>
      </div>

      {/* ── Vacant Slot Cards ── */}
      {vacantShifts.length === 0 ? (
        <div className="rounded-[10px] p-14 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-center h-16 w-16 rounded-[10px] mx-auto mb-4" style={{ backgroundColor: '#F1F3FF' }}>
            <Calendar className="h-8 w-8" style={{ color: '#4F6BED' }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>No vacant slots available.</h3>
          <p className="text-[13px] mt-1 max-w-xs mx-auto" style={{ color: '#6B7280' }}>
            All schedule slots are currently filled. Check back later or adjust your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {vacantShifts.map((shift) => {
            const loc = getLocationById(shift.locationId);
            const assignedCount = shift.assignedMembers.length;
            const remaining = shift.requiredCount - assignedCount;
            const isOpen = shift.status === 'open';
            const capacityPct = shift.requiredCount > 0 ? Math.round((assignedCount / shift.requiredCount) * 100) : 0;
            const isToday = shift.date === todayStr;

            return (
              <div key={shift.id}
                className="rounded-[10px] overflow-hidden transition-all hover:shadow-md"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: isToday ? '1px solid #4F6BED' : isOpen ? '1px solid #FECACA' : '1px solid #FDE68A',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Card header — status bar */}
                <div className="px-4 py-2 flex items-center justify-between" style={{
                  backgroundColor: isOpen ? '#FEF2F2' : '#FFFBEB',
                  borderBottom: '1px solid',
                  borderBottomColor: isOpen ? '#FECACA' : '#FDE68A',
                }}>
                  <span className="text-[11px] font-semibold" style={{ color: isOpen ? '#DC2626' : '#D97706' }}>
                    {isOpen ? 'OPEN' : 'PARTIAL'}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: isOpen ? '#DC2626' : '#D97706' }}>
                    {assignedCount}/{shift.requiredCount}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Location name */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                      <MapPin className="h-4 w-4" style={{ color: '#4F6BED' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate" style={{ color: '#1F2937' }}>{loc?.name || 'Unknown'}</p>
                      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{loc?.city}{loc?.category ? ` · ${loc.category}` : ''}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                    <span className="text-[13px] font-medium" style={{ color: '#1F2937' }}>{formatDateLong(shift.date)}</span>
                    {isToday && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}>TODAY</span>
                    )}
                  </div>

                  {/* Time slot */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                    <span className="text-[13px] tabular-nums" style={{ color: '#1F2937' }}>
                      {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                    </span>
                  </div>

                  {/* Available capacity */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" style={{ color: '#6B7280' }} />
                        <span className="text-[12px] font-medium" style={{ color: '#6B7280' }}>
                          {remaining} of {shift.requiredCount} needed
                        </span>
                      </div>
                      <span className="text-[11px] tabular-nums" style={{ color: '#9CA3AF' }}>{capacityPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${capacityPct}%`,
                        backgroundColor: isOpen ? '#EF4444' : '#F59E0B',
                      }} />
                    </div>
                  </div>

                  {/* Assigned members preview */}
                  {assignedCount > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {shift.assignedMembers.map((memberId) => {
                        const member = members.find((m) => m.id === memberId);
                        if (!member) return null;
                        return (
                          <MemberTooltip key={memberId} memberId={memberId}>
                            <span
                              className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md"
                              style={{ backgroundColor: '#F1F3FF', color: '#4F6BED' }}>
                              {member.name}
                            </span>
                          </MemberTooltip>
                        );
                      })}
                    </div>
                  )}

                  {/* Join Slot button */}
                  <Button size="sm"
                    className="w-full h-9 text-[12px] gap-1.5 font-medium"
                    style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}
                    onClick={() => handleSelfJoin(shift)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Join Slot
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
