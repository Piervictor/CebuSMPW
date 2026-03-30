import { useState, useMemo, useEffect } from 'react';
import { SchedulingBreadcrumb } from '../../components/SchedulingBreadcrumb';
import { PolicySummaryPanel } from '../../components/PolicySummaryPanel';
import { MemberTooltip } from '../../components/MemberTooltip';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useAppContext } from '../../hooks/useAppContext';
import type { Shift, Member, WeekdayAvailability, LocationCategory } from '../../data/mockData';
import { Clock, MapPin, Search, Users, UserPlus, Calendar, Filter, AlertTriangle } from 'lucide-react';
import { toLocalDateStr } from '../../../lib/dateUtils';
import { toast } from 'sonner';

// ─── Availability utilities (same logic as AssignmentManager) ──────

type ShiftPeriod = 'Morning' | 'Afternoon' | 'Evening';

function classifyShiftPeriod(startTime: string, endTime: string): ShiftPeriod {
  const [sh] = startTime.split(':').map(Number);
  const [eh] = endTime.split(':').map(Number);
  if (sh >= 17) return 'Evening';
  if (sh >= 12) return 'Afternoon';
  if (eh > 14) return 'Afternoon';
  return 'Morning';
}

const PERIOD_COVERAGE: Record<ShiftPeriod, WeekdayAvailability[]> = {
  Morning: ['Morning', 'Half Day Morning', 'Full Day'],
  Afternoon: ['Afternoon', 'Half Day Afternoon', 'Full Day'],
  Evening: ['Evening', 'Full Day'],
};

function getWeekdayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
}

function checkAvailabilityMatch(
  member: Member, shift: Shift,
): { available: boolean; reason: string; dayAvailability: string } {
  const dayKey = getWeekdayKey(shift.date);
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
  const memberAvail = member.availability[dayKey as keyof typeof member.availability] as WeekdayAvailability;
  if (memberAvail === 'NA') return { available: false, reason: `Not available on ${dayKey}`, dayAvailability: 'NA' };
  const shiftPeriod = classifyShiftPeriod(shift.startTime, shift.endTime);
  const acceptableValues = PERIOD_COVERAGE[shiftPeriod];
  if (!acceptableValues.includes(memberAvail)) {
    return { available: false, reason: `Available ${memberAvail} only — shift is ${shiftPeriod.toLowerCase()}`, dayAvailability: memberAvail };
  }
  return { available: true, reason: '', dayAvailability: memberAvail };
}

const CATEGORY_TAG_STYLES: Record<string, { bg: string; text: string }> = {
  Hospital: { bg: '#FFF1F2', text: '#BE123C' },
  Plaza:    { bg: '#F0F9FF', text: '#0369A1' },
  Terminal: { bg: '#FFFBEB', text: '#92400E' },
  Mall:     { bg: '#F5F3FF', text: '#6D28D9' },
};
const DEFAULT_TAG_STYLE = { bg: '#F0FDFA', text: '#0F766E' };

function sortEligibleMembers(
  eligible: Member[],
  allShifts: Shift[],
  locationCategory: LocationCategory | undefined,
): Member[] {
  // Build a map of total assignment count and latest assigned date per member.
  // Includes past AND future shifts so that upcoming assignments are accounted for.
  const assignmentCountMap = new Map<string, number>();
  const latestAssignedMap = new Map<string, string>();
  for (const m of eligible) {
    let count = 0;
    let latest = '';
    for (const s of allShifts) {
      if (s.assignedMembers.includes(m.id)) {
        count++;
        if (s.date > latest) latest = s.date;
      }
    }
    assignmentCountMap.set(m.id, count);
    latestAssignedMap.set(m.id, latest);
  }

  return [...eligible].sort((a, b) => {
    // 1. Suitable for location category first
    if (locationCategory) {
      const suitA = a.suitableCategories?.includes(locationCategory) ? 0 : 1;
      const suitB = b.suitableCategories?.includes(locationCategory) ? 0 : 1;
      if (suitA !== suitB) return suitA - suitB;
    }

    // 2. Fewest total assignments first (unassigned members float to top)
    const countA = assignmentCountMap.get(a.id) || 0;
    const countB = assignmentCountMap.get(b.id) || 0;
    if (countA !== countB) return countA - countB;

    // 3. Among same count, least recently assigned first
    const lastA = latestAssignedMap.get(a.id) || '';
    const lastB = latestAssignedMap.get(b.id) || '';
    if (lastA !== lastB) return lastA.localeCompare(lastB);

    // 4. Alphabetical fallback
    return a.name.localeCompare(b.name);
  });
}

type TimeSlotFilter = 'all' | 'morning' | 'afternoon' | 'evening';

function classifyTime(startTime: string): TimeSlotFilter {
  const h = parseInt(startTime.split(':')[0], 10);
  if (h >= 17) return 'evening';
  if (h >= 12) return 'afternoon';
  return 'morning';
}

export default function VacantSlots() {
  const {
    shifts, locations, members, congregations, currentUser,
    getLocationById, assignMemberToShift, loadShiftsForWeek, isLoading, schedulingPolicies,
  } = useAppContext();

  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('upcoming');
  const [filterTimeSlot, setFilterTimeSlot] = useState<TimeSlotFilter>('all');

  // Assign-member dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTargetShift, setAssignTargetShift] = useState<Shift | null>(null);
  const [assignSearch, setAssignSearch] = useState('');

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

  // Open assign-member dialog for a shift
  const openAssignDialog = (shift: Shift) => {
    setAssignTargetShift(shift);
    setAssignSearch('');
    setAssignDialogOpen(true);
  };

  const closeAssignDialog = () => {
    setAssignDialogOpen(false);
    setAssignTargetShift(null);
    setAssignSearch('');
  };

  // Get eligible members for the target shift (same logic as AssignmentManager)
  const getEligibleMembers = (): Member[] => {
    if (!assignTargetShift) return [];
    const location = getLocationById(assignTargetShift.locationId);
    if (!location) return [];

    const filtered = members.filter((member) => {
      if (assignTargetShift.assignedMembers.includes(member.id)) return false;
      if (!location.linkedCongregations.includes(member.congregationId)) return false;
      if (member.status !== 'Active') return false;
      if (location.ageGroup === 'Seniors excluded' && member.ageGroup === 'Senior') return false;
      if (location.ageGroup === 'Adults only' && member.ageGroup === 'Youth') return false;
      if (location.experienceLevel === 'Experienced only' && member.experience !== 'Experienced') return false;
      if (location.experienceLevel === 'Intermediate' && member.experience === 'New') return false;
      const { available } = checkAvailabilityMatch(member, assignTargetShift);
      if (!available) return false;
      if (assignSearch && !member.name.toLowerCase().includes(assignSearch.toLowerCase())) return false;
      return true;
    });

    return sortEligibleMembers(filtered, shifts, location.category);
  };

  const checkMemberWarnings = (member: Member, shift: Shift): string[] => {
    const warnings: string[] = [];
    if (member.weeklyReservations >= schedulingPolicies.weeklyLimit) {
      warnings.push('Weekly limit reached');
    } else if (member.weeklyReservations >= schedulingPolicies.weeklyLimit - 1) {
      warnings.push('Near weekly limit');
    }
    if (member.monthlyReservations >= schedulingPolicies.monthlyLimit) {
      warnings.push('Monthly limit reached');
    } else if (member.monthlyReservations >= schedulingPolicies.monthlyLimit - 2) {
      warnings.push('Near monthly limit');
    }

    const memberShifts = shifts.filter(
      (s) => s.assignedMembers.includes(member.id) && s.date === shift.date
    );
    if (memberShifts.length > 0) warnings.push('Has another shift this day');
    if (!schedulingPolicies.allowSameDayAssignments && memberShifts.length > 0) {
      warnings.push('Same-day assignments disabled');
    }

    if (!schedulingPolicies.allowConsecutiveDayAssignments) {
      const shiftDate = new Date(shift.date + 'T00:00:00');
      const prevDate = new Date(shiftDate);
      const nextDate = new Date(shiftDate);
      prevDate.setDate(shiftDate.getDate() - 1);
      nextDate.setDate(shiftDate.getDate() + 1);
      const prevStr = toLocalDateStr(prevDate);
      const nextStr = toLocalDateStr(nextDate);
      const hasAdjacent = shifts.some(
        (s) => s.assignedMembers.includes(member.id) && (s.date === prevStr || s.date === nextStr)
      );
      if (hasAdjacent) warnings.push('Consecutive-day assignments disabled');
    }

    return warnings;
  };

  // Handle assigning a member from the dialog
  const handleAssignMember = async (memberId: string) => {
    if (!assignTargetShift) return;
    try {
      await assignMemberToShift(assignTargetShift.id, memberId);
      const member = members.find((m) => m.id === memberId);
      toast.success(`${member?.name || 'Member'} assigned to shift`);
      closeAssignDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign member');
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
      <PolicySummaryPanel />
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

                  {/* Assign Member button */}
                  <Button size="sm"
                    className="w-full h-9 text-[12px] gap-1.5 font-medium"
                    style={{ backgroundColor: shift.date < todayStr ? '#9CA3AF' : '#4F6BED', color: '#FFFFFF' }}
                    onClick={() => openAssignDialog(shift)}
                    disabled={shift.date < todayStr}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {shift.date < todayStr ? 'Past Slot' : 'Assign Member'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Assign Member Dialog ── */}
      <Dialog open={assignDialogOpen} onOpenChange={() => closeAssignDialog()}>
        <DialogContent className="w-full sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ borderRadius: '12px' }}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold" style={{ color: '#1F2937' }}>Assign Member</DialogTitle>
            {assignTargetShift && (() => {
              const loc = getLocationById(assignTargetShift.locationId);
              return (
                <DialogDescription className="text-[12px]" style={{ color: '#6B7280' }}>
                  {loc?.name} &middot; {formatDate(assignTargetShift.date)} &middot; {fmt12h(assignTargetShift.startTime)} – {fmt12h(assignTargetShift.endTime)}
                  <span className="ml-2 text-[11px] font-semibold" style={{ color: '#D97706' }}>
                    ({assignTargetShift.requiredCount - assignTargetShift.assignedMembers.length} slot{assignTargetShift.requiredCount - assignTargetShift.assignedMembers.length !== 1 ? 's' : ''} remaining)
                  </span>
                </DialogDescription>
              );
            })()}
          </DialogHeader>
          <div className="relative px-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
            <Input placeholder="Search members…" value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)} className="pl-9 h-9 text-[13px]" />
          </div>
          <ScrollArea className="flex-1 max-h-[400px] px-1">
            <div className="space-y-1.5 pr-3">
              {getEligibleMembers().map((member) => {
                const { dayAvailability } = checkAvailabilityMatch(member, assignTargetShift!);
                const shiftLocation = getLocationById(assignTargetShift!.locationId);
                const isSuitable = shiftLocation && member.suitableCategories?.includes(shiftLocation.category);
                const warnings = checkMemberWarnings(member, assignTargetShift!);
                const hasBlockingWarning = warnings.some(
                  (w) => w.includes('limit reached') || w.includes('assignments disabled')
                );
                return (
                  <div key={member.id} className="p-3 rounded-[10px] hover:bg-[#FAFBFC] transition-colors"
                    style={{ border: isSuitable ? '1px solid #C7D2FE' : '1px solid #E5E7EB', backgroundColor: isSuitable ? '#EEF2FF' : undefined }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-medium" style={{ color: '#1F2937' }}>{member.name}</p>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                            {member.experience}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F1F3FF', color: '#4F6BED' }}>
                            {dayAvailability}
                          </span>
                        </div>
                        {(member.suitableCategories ?? []).length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {member.suitableCategories!.map((cat) => {
                              const s = CATEGORY_TAG_STYLES[cat] || DEFAULT_TAG_STYLE;
                              const isMatch = shiftLocation?.category === cat;
                              return (
                                <span key={cat} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: s.bg,
                                    color: s.text,
                                    outline: isMatch ? `1.5px solid ${s.text}` : 'none',
                                  }}
                                >
                                  {cat}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                          {getCongregationName(member.congregationId)} &middot; {member.ageGroup}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: '#6B7280' }}>
                          <span className="tabular-nums">W: {member.weeklyReservations}/{schedulingPolicies.weeklyLimit}</span>
                          <span style={{ color: '#D1D5DB' }}>·</span>
                          <span className="tabular-nums">M: {member.monthlyReservations}/{schedulingPolicies.monthlyLimit}</span>
                        </div>
                        {warnings.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0" style={{ color: '#F59E0B' }} />
                            <span className="text-[10px]" style={{ color: '#D97706' }}>{warnings.join(' · ')}</span>
                          </div>
                        )}
                      </div>
                      <Button size="sm" className="h-7 text-[11px] gap-1"
                        style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}
                        onClick={() => handleAssignMember(member.id)}
                        disabled={hasBlockingWarning || isLoading}
                      >
                        <UserPlus className="h-3 w-3" />
                        Assign
                      </Button>
                    </div>
                  </div>
                );
              })}
              {getEligibleMembers().length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
                  <p className="text-[13px]" style={{ color: '#6B7280' }}>No eligible members found</p>
                  <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                    Members must be active, linked to this location's congregation, meet age/experience requirements, and be available on this day & time.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
