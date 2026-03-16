import { useState, useMemo } from 'react';
import { SchedulingBreadcrumb } from '../../components/SchedulingBreadcrumb';
import { MemberTooltip } from '../../components/MemberTooltip';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useAppContext } from '../../hooks/useAppContext';
import type { Shift, Member, WeekdayAvailability } from '../../data/mockData';
import { toLocalDateStr } from '../../../lib/dateUtils';
import {
  Clock, MapPin, Search, Users, UserPlus, Calendar, ArrowRightLeft, Trash2,
  Send, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Availability utilities (shared) ──────────────────────

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

// ─── Component ────────────────────────────────────────────────

type DialogMode = 'replace' | 'move' | null;

export default function AssignmentManager() {
  const {
    shifts, locations, members, congregations,
    getLocationById, assignMemberToShift, removeFromShift, isLoading,
  } = useAppContext();
  const getMemberById = (id: string) => members.find((m) => m.id === id);
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('upcoming');

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [targetShift, setTargetShift] = useState<Shift | null>(null);
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [dialogSearch, setDialogSearch] = useState('');

  const todayStr = toLocalDateStr(new Date());
  const activeLocations = locations.filter((l) => l.active);

  // Get assigned shifts (shifts that have at least one member)
  const assignedShifts = useMemo(() => {
    let filtered = shifts.filter((s) => s.assignedMembers.length > 0);

    // Date range filter
    if (filterDate === 'upcoming') {
      filtered = filtered.filter((s) => s.date >= todayStr);
    } else if (filterDate === 'this-week') {
      const today = new Date();
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      filtered = filtered.filter((s) => s.date >= toLocalDateStr(weekStart) && s.date <= toLocalDateStr(weekEnd));
    } else if (filterDate === 'this-month') {
      const today = new Date();
      const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      const me = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      filtered = filtered.filter((s) => s.date >= ms && s.date <= me);
    }

    if (filterLocation !== 'all') {
      filtered = filtered.filter((s) => s.locationId === filterLocation);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => {
        const loc = getLocationById(s.locationId);
        const memberNames = s.assignedMembers.map((id) => getMemberById(id)?.name || '').join(' ');
        return (loc?.name.toLowerCase().includes(term)) ||
          memberNames.toLowerCase().includes(term) ||
          s.date.includes(term);
      });
    }

    return filtered.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, filterLocation, filterStatus, filterDate, searchTerm, todayStr, getLocationById]);

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

  // Remove member
  const handleRemove = async (shiftId: string, memberId: string) => {
    const member = getMemberById(memberId);
    try {
      await removeFromShift(shiftId, memberId);
      toast.success(`${member?.name || 'Member'} removed from shift`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  // Open Replace dialog
  const openReplaceDialog = (shift: Shift, memberId: string) => {
    setTargetShift(shift);
    setTargetMemberId(memberId);
    setDialogMode('replace');
    setDialogSearch('');
  };

  // Open Move dialog
  const openMoveDialog = (shift: Shift, memberId: string) => {
    setTargetShift(shift);
    setTargetMemberId(memberId);
    setDialogMode('move');
    setDialogSearch('');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setTargetShift(null);
    setTargetMemberId('');
    setDialogSearch('');
  };

  // Replace: remove old member, assign new member
  const handleReplace = async (newMemberId: string) => {
    if (!targetShift || !targetMemberId) return;
    try {
      await removeFromShift(targetShift.id, targetMemberId);
      await assignMemberToShift(targetShift.id, newMemberId);
      const oldName = getMemberById(targetMemberId)?.name || 'Member';
      const newName = getMemberById(newMemberId)?.name || 'Member';
      toast.success(`Replaced ${oldName} with ${newName}`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to replace member');
    }
  };

  // Move: remove from current shift, assign to target shift
  const handleMove = async (destinationShiftId: string) => {
    if (!targetShift || !targetMemberId) return;
    try {
      await removeFromShift(targetShift.id, targetMemberId);
      await assignMemberToShift(destinationShiftId, targetMemberId);
      const name = getMemberById(targetMemberId)?.name || 'Member';
      toast.success(`${name} moved to new shift`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move member');
    }
  };

  // Get eligible replacement members for replace dialog
  const getEligibleReplacements = (): Member[] => {
    if (!targetShift) return [];
    const location = getLocationById(targetShift.locationId);
    if (!location) return [];

    return members.filter((member) => {
      if (member.id === targetMemberId) return false; // Exclude the member being replaced
      if (targetShift.assignedMembers.includes(member.id)) return false;
      if (!location.linkedCongregations.includes(member.congregationId)) return false;
      if (location.ageGroup === 'Seniors excluded' && member.ageGroup === 'Senior') return false;
      if (location.ageGroup === 'Adults only' && member.ageGroup === 'Youth') return false;
      if (location.experienceLevel === 'Experienced only' && member.experience !== 'Experienced') return false;
      const { available } = checkAvailabilityMatch(member, targetShift);
      if (!available) return false;
      if (dialogSearch && !member.name.toLowerCase().includes(dialogSearch.toLowerCase())) return false;
      return true;
    });
  };

  // Get available destination shifts for move dialog
  const getAvailableDestinations = (): Shift[] => {
    if (!targetShift || !targetMemberId) return [];
    return shifts.filter((s) => {
      if (s.id === targetShift.id) return false;
      if (s.status === 'filled') return false;
      if (s.date < todayStr) return false;
      if (s.assignedMembers.includes(targetMemberId)) return false;
      if (dialogSearch) {
        const loc = getLocationById(s.locationId);
        const term = dialogSearch.toLowerCase();
        if (!loc?.name.toLowerCase().includes(term) && !s.date.includes(term)) return false;
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  };

  // Flatten all individual assignments for the table - declared in JSX section

  // Flatten all individual assignments for the table
  const allAssignments = useMemo(() => {
    const rows: Array<{ shift: Shift; memberId: string }> = [];
    assignedShifts.forEach((shift) => {
      shift.assignedMembers.forEach((memberId) => {
        rows.push({ shift, memberId });
      });
    });
    return rows;
  }, [assignedShifts]);

  return (
    <div className="space-y-4">
      <SchedulingBreadcrumb items={[
        { label: 'Scheduling', href: '/scheduling' },
        { label: 'Assignment Manager' },
      ]} />
      {/* ── Top Search & Filter Bar ── */}
      <div className="rounded-[10px] p-4 sticky top-14 z-10" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search member */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Search member or location…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-[13px]"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Filter by location */}
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

          {/* Filter by date */}
          <Select value={filterDate} onValueChange={setFilterDate}>
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

          {/* Stats */}
          <div className="flex items-center gap-3 lg:ml-auto flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
              <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>
                {assignedShifts.filter(s => s.status === 'filled').length} filled
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
              <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>
                {assignedShifts.filter(s => s.status === 'partial').length} partial
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
              <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>
                {assignedShifts.filter(s => s.status === 'open').length} open
              </span>
            </div>
            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
              {allAssignments.length} assignment{allAssignments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Assignment Table ── */}
      {assignedShifts.length === 0 ? (
        <div className="rounded-[10px] p-14 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-center h-16 w-16 rounded-[10px] mx-auto mb-4" style={{ backgroundColor: '#F1F3FF' }}>
            <Users className="h-8 w-8" style={{ color: '#4F6BED' }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>No assignments found</h3>
          <p className="text-[13px] mt-1 max-w-xs mx-auto" style={{ color: '#6B7280' }}>
            Assign members to shifts in the Monthly Schedule page, or adjust your filters.
          </p>
        </div>
      ) : (
        <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[140px_1fr_160px_1fr_100px_130px] gap-3 px-4 py-2.5 items-center"
            style={{ backgroundColor: '#FAFBFC', borderBottom: '1px solid #E5E7EB' }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Date</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Location</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Time Slot</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Assigned Members</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Capacity</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-right" style={{ color: '#6B7280' }}>Actions</span>
          </div>

          {/* Table rows — one row per shift×member */}
          <div>
            {assignedShifts.map((shift, shiftIdx) => {
              const loc = getLocationById(shift.locationId);
              const isToday = shift.date === todayStr;
              const isFilled = shift.status === 'filled';
              const isOpen = shift.status === 'open';

              return shift.assignedMembers.map((memberId, memberIdx) => {
                const member = getMemberById(memberId);
                if (!member) return null;
                const isFirstRow = memberIdx === 0;
                const isLastMember = memberIdx === shift.assignedMembers.length - 1;
                const isLastShift = shiftIdx === assignedShifts.length - 1;
                const showBottomBorder = isLastMember && !isLastShift;

                return (
                  <div key={`${shift.id}-${memberId}`}
                    className="group transition-colors hover:bg-[#FAFBFC]"
                    style={{ borderBottom: showBottomBorder ? '1px solid #E5E7EB' : memberIdx < shift.assignedMembers.length - 1 ? '1px solid #F3F4F6' : undefined }}
                  >
                    {/* Desktop table row */}
                    <div className="hidden md:grid grid-cols-[140px_1fr_160px_1fr_100px_130px] gap-3 px-4 py-2.5 items-center">
                      {/* Date */}
                      <div>
                        {isFirstRow && (
                          <div>
                            <p className="text-[13px] font-medium" style={{ color: isToday ? '#4F6BED' : '#1F2937' }}>
                              {formatDate(shift.date)}
                            </p>
                            {isToday && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5" style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}>TODAY</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      <div>
                        {isFirstRow && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#4F6BED' }} />
                            <span className="text-[13px] font-medium truncate" style={{ color: '#1F2937' }}>{loc?.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Time Slot */}
                      <div>
                        {isFirstRow && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                            <span className="text-[13px] tabular-nums" style={{ color: '#4B5563' }}>
                              {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Assigned Member */}
                      <MemberTooltip memberId={memberId}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                            <span className="text-[10px] font-semibold" style={{ color: '#4F6BED' }}>
                              {member.name.split(',')[0]?.[0] || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: '#1F2937' }}>{member.name}</p>
                            <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>
                              {getCongregationName(member.congregationId)} · {member.experience}
                            </p>
                          </div>
                        </div>
                      </MemberTooltip>

                      {/* Capacity */}
                      <div>
                        {isFirstRow && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                            backgroundColor: isFilled ? '#ECFDF5' : isOpen ? '#FEF2F2' : '#FFFBEB',
                            color: isFilled ? '#059669' : isOpen ? '#DC2626' : '#D97706',
                          }}>
                            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isFilled ? '#22C55E' : isOpen ? '#EF4444' : '#F59E0B' }} />
                            {shift.assignedMembers.length}/{shift.requiredCount}
                            {isFilled ? ' Filled' : isOpen ? ' Open' : ' Partial'}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm"
                          className="h-7 px-2 text-[11px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#F1F3FF]"
                          title="Replace member"
                          onClick={() => openReplaceDialog(shift, memberId)}>
                          <ArrowRightLeft className="h-3 w-3" style={{ color: '#4F6BED' }} />
                          <span className="hidden xl:inline" style={{ color: '#4F6BED' }}>Replace</span>
                        </Button>
                        <Button variant="ghost" size="sm"
                          className="h-7 px-2 text-[11px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#F1F3FF]"
                          title="Move to another shift"
                          onClick={() => openMoveDialog(shift, memberId)}>
                          <Pencil className="h-3 w-3" style={{ color: '#6B7280' }} />
                          <span className="hidden xl:inline" style={{ color: '#6B7280' }}>Edit</span>
                        </Button>
                        <Button variant="ghost" size="sm"
                          className="h-7 px-2 text-[11px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                          title="Remove from shift"
                          onClick={() => handleRemove(shift.id, memberId)}>
                          <Trash2 className="h-3 w-3" style={{ color: '#EF4444' }} />
                          <span className="hidden xl:inline" style={{ color: '#EF4444' }}>Remove</span>
                        </Button>
                      </div>
                    </div>

                    {/* Mobile card row */}
                    <div className="md:hidden px-4 py-3 space-y-2">
                      {isFirstRow && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium" style={{ color: isToday ? '#4F6BED' : '#1F2937' }}>{formatDate(shift.date)}</span>
                            {isToday && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}>TODAY</span>
                            )}
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                              backgroundColor: isFilled ? '#ECFDF5' : isOpen ? '#FEF2F2' : '#FFFBEB',
                              color: isFilled ? '#059669' : isOpen ? '#DC2626' : '#D97706',
                            }}>
                              {shift.assignedMembers.length}/{shift.requiredCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[12px]" style={{ color: '#6B7280' }}>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" style={{ color: '#4F6BED' }} />{loc?.name}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg" style={{ backgroundColor: '#F7F8FA' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                            <span className="text-[10px] font-semibold" style={{ color: '#4F6BED' }}>{member.name.split(',')[0]?.[0] || '?'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium truncate" style={{ color: '#1F2937' }}>{member.name}</p>
                            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{getCongregationName(member.congregationId)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#F1F3FF]"
                            onClick={() => openReplaceDialog(shift, memberId)}>
                            <ArrowRightLeft className="h-3.5 w-3.5" style={{ color: '#4F6BED' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#F1F3FF]"
                            onClick={() => openMoveDialog(shift, memberId)}>
                            <Pencil className="h-3.5 w-3.5" style={{ color: '#6B7280' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50"
                            onClick={() => handleRemove(shift.id, memberId)}>
                            <Trash2 className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* Replace Dialog */}
      <Dialog open={dialogMode === 'replace'} onOpenChange={() => closeDialog()}>
        <DialogContent className="w-full sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ borderRadius: '12px' }}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold" style={{ color: '#1F2937' }}>Replace Member</DialogTitle>
            <DialogDescription className="text-[12px]" style={{ color: '#6B7280' }}>
              Replace {getMemberById(targetMemberId)?.name || 'member'} with another eligible member.
            </DialogDescription>
          </DialogHeader>
          <div className="relative px-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
            <Input placeholder="Search members…" value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)} className="pl-9 h-9 text-[13px]" />
          </div>
          <ScrollArea className="flex-1 max-h-[400px] px-1">
            <div className="space-y-1.5 pr-3">
              {getEligibleReplacements().map((member) => {
                const { dayAvailability } = checkAvailabilityMatch(member, targetShift!);
                return (
                  <div key={member.id} className="p-3 rounded-[10px] hover:bg-[#FAFBFC] transition-colors" style={{ border: '1px solid #E5E7EB' }}>
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
                        <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                          {getCongregationName(member.congregationId)} · {member.ageGroup}
                        </p>
                      </div>
                      <Button size="sm" className="h-7 text-[11px] gap-1"
                        style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}
                        onClick={() => handleReplace(member.id)}
                        disabled={isLoading}
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        Replace
                      </Button>
                    </div>
                  </div>
                );
              })}
              {getEligibleReplacements().length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
                  <p className="text-[13px]" style={{ color: '#6B7280' }}>No eligible replacements found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={dialogMode === 'move'} onOpenChange={() => closeDialog()}>
        <DialogContent className="w-full sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ borderRadius: '12px' }}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold" style={{ color: '#1F2937' }}>Move Member to Another Shift</DialogTitle>
            <DialogDescription className="text-[12px]" style={{ color: '#6B7280' }}>
              Move {getMemberById(targetMemberId)?.name || 'member'} to a different shift.
            </DialogDescription>
          </DialogHeader>
          <div className="relative px-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
            <Input placeholder="Search by location or date…" value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)} className="pl-9 h-9 text-[13px]" />
          </div>
          <ScrollArea className="flex-1 max-h-[400px] px-1">
            <div className="space-y-1.5 pr-3">
              {getAvailableDestinations().map((shift) => {
                const loc = getLocationById(shift.locationId);
                const remaining = shift.requiredCount - shift.assignedMembers.length;
                return (
                  <div key={shift.id} className="p-3 rounded-[10px] hover:bg-[#FAFBFC] transition-colors" style={{ border: '1px solid #E5E7EB' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium" style={{ color: '#1F2937' }}>{loc?.name}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                            {remaining} slot{remaining !== 1 ? 's' : ''} left
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                          {formatDate(shift.date)} · {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                        </p>
                      </div>
                      <Button size="sm" className="h-7 text-[11px] gap-1"
                        style={{ backgroundColor: '#4F6BED', color: '#FFFFFF' }}
                        onClick={() => handleMove(shift.id)}
                        disabled={isLoading}
                      >
                        <Send className="h-3 w-3" />
                        Move
                      </Button>
                    </div>
                  </div>
                );
              })}
              {getAvailableDestinations().length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
                  <p className="text-[13px]" style={{ color: '#6B7280' }}>No available shifts to move to</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
