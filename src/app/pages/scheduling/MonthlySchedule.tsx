import { useState, useEffect, useMemo } from 'react';
import { SchedulingBreadcrumb } from '../../components/SchedulingBreadcrumb';
import { PolicySummaryPanel } from '../../components/PolicySummaryPanel';
import { MemberTooltip } from '../../components/MemberTooltip';
import { toLocalDateStr } from '../../../lib/dateUtils';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  type Shift,
  type Member,
  type WeekdayAvailability,
  type LocationCategory,
} from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import {
  MapPin, Users, AlertTriangle, CheckCircle2, Clock, Send, Search,
  ChevronLeft, ChevronRight, UserPlus, X, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Availability matching utilities ──────────────────────────

type ShiftPeriod = 'Morning' | 'Afternoon' | 'Evening';

function classifyShiftPeriod(startTime: string, _endTime: string): ShiftPeriod {
  const [sh] = startTime.split(':').map(Number);
  const [eh] = _endTime.split(':').map(Number);
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
  member: Member,
  shift: Shift,
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

const CATEGORY_TAG_STYLES: Record<LocationCategory, { bg: string; text: string }> = {
  Hospital: { bg: '#FFF1F2', text: '#BE123C' },
  Plaza:    { bg: '#F0F9FF', text: '#0369A1' },
  Terminal: { bg: '#FFFBEB', text: '#92400E' },
  Mall:     { bg: '#F5F3FF', text: '#6D28D9' },
};

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

// ─── Component ────────────────────────────────────────────────

export default function MonthlySchedule() {
  const {
    shifts, locations, members, congregations,
    getLocationById, assignMemberToShift, removeFromShift, loadShiftsForWeek, isLoading, schedulingPolicies,
  } = useAppContext();
  const getMemberById = (id: string) => members.find((m) => m.id === id);
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';
  const todayStr = toLocalDateStr(new Date());

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCongregation, setFilterCongregation] = useState<string>('all');
  const [filterExperience, setFilterExperience] = useState<string>('all');

  // Board-level filters
  const [boardSearch, setBoardSearch] = useState('');
  const [boardCongFilter, setBoardCongFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showVacantOnly, setShowVacantOnly] = useState(false);

  useEffect(() => {
    if (!selectedLocation && locations.length > 0) {
      const first = locations.find((l) => l.active);
      if (first) setSelectedLocation(first.id);
    }
  }, [locations, selectedLocation]);

  // ── Month helpers ──
  const getMonth = (offset: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const monthStart = getMonth(selectedMonthOffset);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Load shifts for each week of the month
  const [shiftsLoading, setShiftsLoading] = useState(false);
  useEffect(() => {
    if (!selectedLocation) return;
    let cancelled = false;
    setShiftsLoading(true);

    // Generate shifts for each week overlapping this month
    const weeks: string[] = [];
    const cursor = new Date(monthStart);
    // Go to Monday of the week containing monthStart
    const day = cursor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    cursor.setDate(cursor.getDate() + diff);

    while (cursor <= monthEnd) {
      weeks.push(toLocalDateStr(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }

    Promise.all(weeks.map((w) => loadShiftsForWeek(selectedLocation, w)))
      .finally(() => { if (!cancelled) setShiftsLoading(false); });

    return () => { cancelled = true; };
  }, [selectedLocation, monthStart.toISOString(), loadShiftsForWeek]);

  // Dates in the month
  const monthDates = useMemo(() => {
    const dates: Date[] = [];
    const d = new Date(monthStart);
    while (d <= monthEnd) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [monthStart.toISOString()]);

  // Shifts for selected location & month
  const monthStartStr = toLocalDateStr(monthStart);
  const monthEndStr = toLocalDateStr(monthEnd);

  const monthShifts = shifts.filter((s) =>
    s.locationId === selectedLocation && s.date >= monthStartStr && s.date <= monthEndStr
  );

  const shiftsByDay: Record<string, Shift[]> = {};
  monthShifts.forEach((shift) => {
    if (!shiftsByDay[shift.date]) shiftsByDay[shift.date] = [];
    shiftsByDay[shift.date].push(shift);
  });

  // ── Location stats ──
  const getLocationMonthStats = (locationId: string) => {
    const locShifts = shifts.filter((s) =>
      s.locationId === locationId && s.date >= monthStartStr && s.date <= monthEndStr
    );
    const total = locShifts.length;
    const filled = locShifts.filter((s) => s.status === 'filled').length;
    const open = locShifts.filter((s) => s.status === 'open').length;
    return { total, filled, open, partial: total - filled - open };
  };

  const activeLocations = locations.filter((l) => l.active);

  // ── Eligible member logic ──
  /**
   * Get members eligible for assignment.
   * Members must be Active. Congregation linking, age-group, experience, and
   * availability are enforced as hard rules. UI filters (search, congregation
   * dropdown, experience dropdown) refine the list further.
   */
  const getEligibleMembers = (shift: Shift | null): Member[] => {
    if (!shift) return [];
    const location = getLocationById(shift.locationId);
    if (!location) return [];

    const filtered = members.filter((member) => {
      if (member.status !== 'Active') return false;
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

  /**
   * Returns ALL Active members that failed one or more eligibility checks,
   * together with the specific reason they were excluded. This covers:
   *  - Members in congregations NOT linked to this location
   *  - Members excluded by age-group / experience restrictions
   *  - Members whose weekday availability doesn't match the shift
   */
  const getExcludedMembers = (shift: Shift | null): Array<{ member: Member; reason: string }> => {
    if (!shift) return [];
    const location = getLocationById(shift.locationId);
    if (!location) return [];

    const eligibleIds = new Set(getEligibleMembers(shift).map((m) => m.id));
    const excluded: Array<{ member: Member; reason: string }> = [];

    members.forEach((member) => {
      if (member.status !== 'Active') return;
      if (eligibleIds.has(member.id)) return;
      if (shift.assignedMembers.includes(member.id)) return;

      // Determine the first matching reason
      if (!location.linkedCongregations.includes(member.congregationId)) {
        excluded.push({ member, reason: `Congregation "${getCongregationName(member.congregationId)}" is not linked to this location` });
        return;
      }
      if (location.ageGroup === 'Seniors excluded' && member.ageGroup === 'Senior') {
        excluded.push({ member, reason: 'Seniors excluded at this location' });
        return;
      }
      if (location.ageGroup === 'Adults only' && member.ageGroup === 'Youth') {
        excluded.push({ member, reason: 'Adults only at this location' });
        return;
      }
      if (location.experienceLevel === 'Experienced only' && member.experience !== 'Experienced') {
        excluded.push({ member, reason: `Experienced only — member is ${member.experience}` });
        return;
      }
      const { available, reason: availReason } = checkAvailabilityMatch(member, shift);
      if (!available) {
        excluded.push({ member, reason: availReason });
        return;
      }
      // Filtered out by UI search / dropdowns — don't show in excluded
    });
    return excluded;
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
  const excludedMembers = getExcludedMembers(selectedShift);
  const location = selectedLocation ? getLocationById(selectedLocation) : null;

  const fmt12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const getCoveragePercent = (locationId: string) => {
    const stats = getLocationMonthStats(locationId);
    if (stats.total === 0) return 0;
    return Math.round((stats.filled / stats.total) * 100);
  };

  // ── Board-level shift filtering ──
  const filteredShiftsByDay: Record<string, Shift[]> = {};
  Object.entries(shiftsByDay).forEach(([dateStr, dayShifts]) => {
    const filtered = dayShifts.filter((shift) => {
      if (showVacantOnly && shift.status === 'filled') return false;
      if (statusFilter !== 'all' && shift.status !== statusFilter) return false;
      if (boardSearch) {
        const term = boardSearch.toLowerCase();
        const hasMember = shift.assignedMembers.some((id) => {
          const m = getMemberById(id);
          return m?.name.toLowerCase().includes(term);
        });
        if (!hasMember) return false;
      }
      if (boardCongFilter !== 'all' && shift.assignedMembers.length > 0) {
        const hasCong = shift.assignedMembers.some((id) => {
          const m = getMemberById(id);
          return m?.congregationId === boardCongFilter;
        });
        if (!hasCong) return false;
      }
      return true;
    });
    if (filtered.length > 0) {
      filteredShiftsByDay[dateStr] = filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
  });
  const totalFilteredShifts = Object.values(filteredShiftsByDay).reduce((sum, arr) => sum + arr.length, 0);

  // ── Quick Summary stats (all locations for this month) ──
  const allMonthShifts = useMemo(() =>
    shifts.filter((s) => s.date >= monthStartStr && s.date <= monthEndStr),
    [shifts, monthStartStr, monthEndStr]
  );
  const totalSlots = allMonthShifts.length;
  const filledSlots = allMonthShifts.filter((s) => s.status === 'filled').length;
  const vacantSlots = allMonthShifts.filter((s) => s.status !== 'filled').length;
  const activeLocationsInMonth = useMemo(() => {
    const ids = new Set(allMonthShifts.map((s) => s.locationId));
    return ids.size;
  }, [allMonthShifts]);

  const handleSummaryCardClick = (card: 'total' | 'filled' | 'vacant' | 'active') => {
    switch (card) {
      case 'total':
        setStatusFilter('all');
        setShowVacantOnly(false);
        setBoardSearch('');
        setBoardCongFilter('all');
        break;
      case 'filled':
        setStatusFilter('filled');
        setShowVacantOnly(false);
        break;
      case 'vacant':
        setShowVacantOnly(true);
        setStatusFilter('all');
        break;
      case 'active':
        // Reset filters to show all shifts across the active location
        setStatusFilter('all');
        setShowVacantOnly(false);
        setBoardSearch('');
        setBoardCongFilter('all');
        break;
    }
  };

  const isSummaryCardActive = (card: 'total' | 'filled' | 'vacant' | 'active') => {
    if (card === 'total') return statusFilter === 'all' && !showVacantOnly;
    if (card === 'filled') return statusFilter === 'filled' && !showVacantOnly;
    if (card === 'vacant') return showVacantOnly;
    return false;
  };

  return (
    <>
      <div className="space-y-4">
        <SchedulingBreadcrumb items={[
          { label: 'Scheduling', href: '/scheduling' },
          ...(location ? [
            { label: 'Monthly Schedule', href: '/scheduling' },
            { label: location.name },
          ] : [{ label: 'Monthly Schedule' }]),
        ]} />
        <PolicySummaryPanel />
        {/* ── Top Toolbar ── */}
        <div className="rounded-[10px] p-4 sticky top-14 z-10" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Location selector */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                <MapPin className="h-4 w-4" style={{ color: '#4F6BED' }} />
              </div>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-9 text-[13px] font-medium w-[220px]" style={{ borderColor: '#E5E7EB', color: '#1F2937' }}>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month navigator */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#F1F3F9]"
                onClick={() => setSelectedMonthOffset(selectedMonthOffset - 1)}>
                <ChevronLeft className="h-4 w-4" style={{ color: '#6B7280' }} />
              </Button>
              <Button variant="outline" size="sm"
                className="text-[12px] font-medium h-8 px-3 min-w-[140px] justify-center"
                style={{ borderColor: '#E5E7EB', color: '#1F2937' }}
                onClick={() => setSelectedMonthOffset(0)}>
                {selectedMonthOffset === 0 ? 'This Month' : monthLabel}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#F1F3F9]"
                onClick={() => setSelectedMonthOffset(selectedMonthOffset + 1)}>
                <ChevronRight className="h-4 w-4" style={{ color: '#6B7280' }} />
              </Button>
            </div>

            {/* Search member */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
              <Input
                placeholder="Search assigned members…"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                className="pl-9 h-9 text-[13px]"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>


          </div>
        </div>

        {/* ── Quick Summary ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              key: 'total' as const,
              title: 'Total Slots',
              value: totalSlots,
              description: 'All slots in the schedule',
              icon: Calendar,
            },
            {
              key: 'filled' as const,
              title: 'Filled Slots',
              value: filledSlots,
              description: 'Fully assigned slots',
              icon: CheckCircle2,
            },
            {
              key: 'vacant' as const,
              title: 'Vacant Slots',
              value: vacantSlots,
              description: 'Slots without assigned publishers',
              icon: AlertTriangle,
            },
            {
              key: 'active' as const,
              title: 'Active Locations',
              value: activeLocationsInMonth,
              description: 'Locations with scheduled assignments',
              icon: MapPin,
            },
          ].map((card) => {
            const active = isSummaryCardActive(card.key);
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleSummaryCardClick(card.key)}
                className="rounded-[10px] p-4 text-left transition-all cursor-pointer"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: active ? '2px solid #4F6BED' : '1px solid #E5E7EB',
                  boxShadow: active
                    ? '0 0 0 1px rgba(79,107,237,0.15), 0 2px 8px rgba(79,107,237,0.10)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#4F6BED';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                    {card.title}
                  </span>
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-lg"
                    style={{ backgroundColor: active ? '#4F6BED' : '#F1F3FF' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: active ? '#FFFFFF' : '#4F6BED' }} />
                  </div>
                </div>
                <p className="text-[28px] font-bold leading-none mb-1" style={{ color: '#1F2937' }}>
                  {card.value}
                </p>
                <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>

        {location ? (
          <>
            {/* ── Filter Panel ── */}
            <div className="rounded-[10px] p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Select value={boardCongFilter} onValueChange={setBoardCongFilter}>
                  <SelectTrigger className="h-8 text-[12px] w-[180px]" style={{ borderColor: '#E5E7EB' }}>
                    <SelectValue placeholder="All congregations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Congregations</SelectItem>
                    {congregations.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-[12px] w-[160px]" style={{ borderColor: '#E5E7EB' }}>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch checked={showVacantOnly} onCheckedChange={setShowVacantOnly} />
                  <span className="text-[12px] font-medium" style={{ color: '#6B7280' }}>Vacant only</span>
                </div>

                <div className="flex items-center gap-3 sm:ml-auto">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                    <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>
                      {monthShifts.filter((s) => s.status === 'filled').length} filled
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                    <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>
                      {monthShifts.filter((s) => s.status === 'partial').length} partial
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                    <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>
                      {monthShifts.filter((s) => s.status === 'open').length} open
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                    {totalFilteredShifts}/{monthShifts.length} shifts
                  </span>
                </div>
              </div>
            </div>

            {/* ── Scheduling Board ── */}
            <div className="space-y-4">
              {shiftsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="h-8 w-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#4F6BED', borderTopColor: 'transparent' }} />
                    <p className="text-[13px]" style={{ color: '#6B7280' }}>Loading shifts…</p>
                  </div>
                </div>
              ) : (
                monthDates.slice().reverse().map((day) => {
                  const dateStr = toLocalDateStr(day);
                  const dayShifts = filteredShiftsByDay[dateStr];
                  if (!dayShifts || dayShifts.length === 0) return null;

                  const isToday = dateStr === toLocalDateStr(new Date());

                  return (
                    <div key={dateStr}>
                      {/* Date header */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold" style={{ color: isToday ? '#4F6BED' : '#1F2937' }}>
                            {day.toLocaleDateString('en-US', { weekday: 'long' })}
                          </span>
                          <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
                            {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {isToday && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}>TODAY</span>
                          )}
                        </div>
                        <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
                        <span className="text-[11px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                          {dayShifts.length} slot{dayShifts.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Time slot cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {dayShifts.map((shift) => {
                          const assignedCount = shift.assignedMembers.length;
                          const isFilled = shift.status === 'filled';
                          const isOpen = shift.status === 'open';
                          const capacityPct = shift.requiredCount > 0 ? Math.round((assignedCount / shift.requiredCount) * 100) : 0;

                          return (
                            <div key={shift.id}
                              className="rounded-[10px] p-4 transition-all hover:shadow-md"
                              style={{
                                backgroundColor: '#FFFFFF',
                                border: isFilled ? '1px solid #A7F3D0' : isOpen ? '1px solid #FECACA' : '1px solid #FDE68A',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              }}
                            >
                              {/* Time range + capacity badge */}
                              <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" style={{ color: '#6B7280' }} />
                                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#1F2937' }}>
                                    {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                                  backgroundColor: isFilled ? '#ECFDF5' : isOpen ? '#FEF2F2' : '#FFFBEB',
                                  color: isFilled ? '#059669' : isOpen ? '#DC2626' : '#D97706',
                                }}>
                                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isFilled ? '#22C55E' : isOpen ? '#EF4444' : '#F59E0B' }} />
                                  {assignedCount}/{shift.requiredCount}
                                  {isFilled ? ' Filled' : isOpen ? ' Open' : ' Partial'}
                                </span>
                              </div>

                              {/* Location name */}
                              <div className="flex items-center gap-1.5 mb-2">
                                <MapPin className="h-3 w-3" style={{ color: '#9CA3AF' }} />
                                <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{location?.name}</span>
                              </div>

                              {/* Capacity indicator bar */}
                              <div className="h-1.5 rounded-full mb-2.5 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                                <div className="h-full rounded-full transition-all" style={{
                                  width: `${capacityPct}%`,
                                  backgroundColor: isFilled ? '#22C55E' : isOpen ? '#EF4444' : '#F59E0B',
                                }} />
                              </div>

                              {/* Assigned members */}
                              {assignedCount > 0 ? (
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                  {shift.assignedMembers.map((memberId) => {
                                    const member = getMemberById(memberId);
                                    if (!member) return null;
                                    return (
                                      <MemberTooltip key={memberId} memberId={memberId}>
                                        <span
                                          className="group inline-flex items-center gap-1 text-[11px] font-medium pl-2 pr-1 py-0.5 rounded-md"
                                          style={{ backgroundColor: '#F1F3FF', color: '#4F6BED' }}>
                                          {member.name}
                                          <button
                                            onClick={() => handleRemoveMember(shift.id, memberId)}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded transition-opacity"
                                            title="Remove from shift">
                                            <X className="h-3 w-3 text-red-500" />
                                          </button>
                                        </span>
                                      </MemberTooltip>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[11px] mb-2.5" style={{ color: '#9CA3AF' }}>No members assigned</p>
                              )}

                              {/* Assign button */}
                              {!isFilled && (() => {
                                const isPast = shift.date < todayStr;
                                return (
                                  <Button variant="outline" size="sm"
                                    className="w-full h-7 text-[11px] gap-1 hover:bg-[#F1F3FF] hover:text-[#4F6BED] hover:border-[#4F6BED]"
                                    style={{ borderColor: '#E5E7EB', color: isPast ? '#9CA3AF' : '#6B7280' }}
                                    disabled={isPast}
                                    onClick={() => !isPast && openAssignDialog(shift)}>
                                    <UserPlus className="h-3 w-3" />
                                    {isPast ? 'Past Slot' : 'Assign Member'}
                                  </Button>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {!shiftsLoading && totalFilteredShifts === 0 && monthShifts.length > 0 && (
                <div className="rounded-[10px] p-10 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <Search className="h-10 w-10 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                  <p className="text-[13px] font-medium" style={{ color: '#1F2937' }}>No matching shifts</p>
                  <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                    Try adjusting the filters to see more results.
                  </p>
                </div>
              )}

              {!shiftsLoading && monthShifts.length === 0 && (
                <div className="rounded-[10px] p-10 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <Calendar className="h-10 w-10 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                  <p className="text-[13px] font-medium" style={{ color: '#1F2937' }}>No shifts scheduled</p>
                  <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                    Configure time slots in the Locations page to generate shifts automatically.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-[10px] mx-auto mb-4" style={{ backgroundColor: '#F1F3FF' }}>
                <Calendar className="h-8 w-8" style={{ color: '#4F6BED' }} />
              </div>
              <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>
                {activeLocations.length === 0 ? 'No active locations' : 'Select a location'}
              </h3>
              <p className="text-[13px] mt-1 max-w-xs mx-auto" style={{ color: '#6B7280' }}>
                {activeLocations.length === 0
                  ? 'Add an active location in the Locations page to start scheduling.'
                  : 'Choose a location from the dropdown above to view and manage its monthly schedule.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Assignment Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" style={{ borderRadius: '12px' }}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold" style={{ color: '#1F2937' }}>Assign Member to Shift</DialogTitle>
            <DialogDescription>
              {selectedShift && (
                <span className="flex items-center gap-1.5 mt-1 text-[12px]" style={{ color: '#6B7280' }}>
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(selectedShift.date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'short', day: 'numeric',
                  })}
                  <span style={{ color: '#D1D5DB' }}>·</span>
                  <Clock className="h-3.5 w-3.5" />
                  {fmt12h(selectedShift.startTime)} – {fmt12h(selectedShift.endTime)}
                  <span style={{ color: '#D1D5DB' }}>·</span>
                  {location?.name}
                  <span style={{ color: '#D1D5DB' }}>·</span>
                  {selectedShift.assignedMembers.length}/{selectedShift.requiredCount} assigned
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedShift && selectedShift.assignedMembers.length > 0 && (
            <div className="px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Currently Assigned</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedShift.assignedMembers.map((memberId) => {
                  const member = getMemberById(memberId);
                  if (!member) return null;
                  return (
                    <span key={memberId} className="inline-flex items-center gap-1.5 text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-md"
                      style={{ backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                      <CheckCircle2 className="h-3 w-3" />
                      {member.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
              <Input placeholder="Search members…" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-[13px]" />
            </div>
            <Select value={filterCongregation} onValueChange={setFilterCongregation}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="All congregations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Congregations</SelectItem>
                {congregations.map((cong) => (
                  <SelectItem key={cong.id} value={cong.id}>{cong.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterExperience} onValueChange={setFilterExperience}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="All experience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Experienced">Experienced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-hidden px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Eligible Members ({eligibleMembers.length})
            </p>
            <ScrollArea className="h-[360px]">
              <div className="space-y-1.5 pr-3">
                {eligibleMembers.map((member) => {
                  const warnings = checkMemberWarnings(member, selectedShift!);
                  const hasBlockingWarning = warnings.some(
                    (w) => w.includes('limit reached') || w.includes('assignments disabled')
                  );
                  const alreadyAssigned = selectedShift?.assignedMembers.includes(member.id);
                  const { dayAvailability } = checkAvailabilityMatch(member, selectedShift!);
                  const shiftLocation = getLocationById(selectedShift!.locationId);
                  const isSuitable = shiftLocation && member.suitableCategories?.includes(shiftLocation.category);

                  return (
                    <div key={member.id}
                      className="p-3 rounded-[10px] transition-colors"
                      style={{
                        border: alreadyAssigned ? '1px solid #A7F3D0' : hasBlockingWarning ? '1px solid #FECACA' : warnings.length > 0 ? '1px solid #FDE68A' : isSuitable ? '1px solid #C7D2FE' : '1px solid #E5E7EB',
                        backgroundColor: alreadyAssigned ? '#F0FDF4' : hasBlockingWarning ? '#FEF2F2' : warnings.length > 0 ? '#FFFBEB' : isSuitable ? '#EEF2FF' : '#FFFFFF',
                      }}
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
                                const s = CATEGORY_TAG_STYLES[cat];
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
                          <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: '#6B7280' }}>
                            <span>{getCongregationName(member.congregationId)}</span>
                            <span style={{ color: '#D1D5DB' }}>·</span>
                            <span>{member.ageGroup}</span>
                            <span style={{ color: '#D1D5DB' }}>·</span>
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
                        {alreadyAssigned ? (
                          <span className="text-[11px] font-medium flex items-center gap-1 flex-shrink-0" style={{ color: '#059669' }}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Assigned
                          </span>
                        ) : (
                          <Button size="sm" className="h-8 text-[11px] gap-1 flex-shrink-0"
                            style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}
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
                  <div className="text-center py-10">
                    <Users className="h-10 w-10 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
                    <p className="text-[13px]" style={{ color: '#6B7280' }}>No eligible members found</p>
                    <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>Try adjusting the filters above</p>
                  </div>
                )}

                {/* Unavailable Members — shows why linked members are excluded */}
                {excludedMembers.length > 0 && (
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid #E5E7EB' }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                      Unavailable ({excludedMembers.length})
                    </p>
                    <div className="space-y-1">
                      {excludedMembers.map(({ member, reason }) => (
                        <div key={member.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-medium" style={{ color: '#6B7280' }}>{member.name}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                                {member.experience}
                              </span>
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: '#EF4444' }}>{reason}</p>
                          </div>
                          <X className="h-3 w-3 flex-shrink-0" style={{ color: '#D1D5DB' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
