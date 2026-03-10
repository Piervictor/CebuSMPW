import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  type Shift,
  type Member,
  type WeekdayAvailability,
} from '../data/mockData';
import { useAppContext } from '../hooks/useAppContext';
import { Calendar, MapPin, Users, AlertTriangle, CheckCircle2, Clock, Send, Search } from 'lucide-react';
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

// ─── Component ────────────────────────────────────────────────

export default function Scheduling() {
  const { shifts, locations, members, congregations, timeslots, getLocationById } = useAppContext();
  const getMemberById = (id: string) => members.find((m) => m.id === id);
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCongregation, setFilterCongregation] = useState<string>('all');
  const [filterExperience, setFilterExperience] = useState<string>('all');

  // Set initial location once data loads from Supabase
  useEffect(() => {
    if (!selectedLocation && locations.length > 0) {
      const first = locations.find((l) => l.active);
      if (first) setSelectedLocation(first.id);
    }
  }, [locations, selectedLocation]);

  // Get shifts for selected location and week
  const getWeekStart = (offset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Start from Monday
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff + offset * 7);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const weekStart = getWeekStart(selectedWeekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekShifts = shifts.filter((s) => {
    const shiftDate = new Date(s.date);
    return (
      s.locationId === selectedLocation &&
      shiftDate >= weekStart &&
      shiftDate <= weekEnd
    );
  });

  // Group shifts by day
  const shiftsByDay: Record<string, Shift[]> = {};
  weekShifts.forEach((shift) => {
    if (!shiftsByDay[shift.date]) {
      shiftsByDay[shift.date] = [];
    }
    shiftsByDay[shift.date].push(shift);
  });

  // Get eligible members for selected shift
  const getEligibleMembers = (shift: Shift | null): Member[] => {
    if (!shift) return [];

    const location = getLocationById(shift.locationId);
    if (!location) return [];

    return members.filter((member) => {
      // Check if member's congregation is linked to location
      if (!location.linkedCongregations.includes(member.congregationId)) return false;

      // Check age group restrictions
      if (location.ageGroup === 'Seniors excluded' && member.ageGroup === 'Senior') return false;
      if (location.ageGroup === 'Adults only' && member.ageGroup === 'Youth') return false;

      // Check experience level
      if (location.experienceLevel === 'Experienced only' && member.experience !== 'Experienced') return false;

      // Check member availability against this shift's day + time period
      const { available } = checkAvailabilityMatch(member, shift);
      if (!available) return false;

      // Apply filters
      if (filterCongregation !== 'all' && member.congregationId !== filterCongregation) return false;
      if (filterExperience !== 'all' && member.experience !== filterExperience) return false;
      if (searchTerm && !member.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  };

  const checkMemberWarnings = (member: Member, shift: Shift): string[] => {
    const warnings: string[] = [];

    // Check weekly limit
    if (member.weeklyReservations >= member.weeklyLimit) {
      warnings.push('Weekly limit reached');
    } else if (member.weeklyReservations >= member.weeklyLimit - 1) {
      warnings.push('Near weekly limit');
    }

    // Check monthly limit
    if (member.monthlyReservations >= member.monthlyLimit) {
      warnings.push('Monthly limit reached');
    } else if (member.monthlyReservations >= member.monthlyLimit - 2) {
      warnings.push('Near monthly limit');
    }

    // Check time conflicts
    const memberShifts = shifts.filter((s) =>
      s.assignedMembers.includes(member.id) && s.date === shift.date
    );
    if (memberShifts.length > 0) {
      warnings.push('Has another shift this day');
    }

    return warnings;
  };

  const handleAssignMember = (memberId: string) => {
    if (!selectedShift) return;

    // In a real app, this would make an API call
    toast.success(`${getMemberById(memberId)?.name} assigned to shift`, {
      description: 'Telegram notification sent',
    });
    setDialogOpen(false);
  };

  const openShiftDialog = (shift: Shift) => {
    setSelectedShift(shift);
    setDialogOpen(true);
  };

  const eligibleMembers = getEligibleMembers(selectedShift);
  const location = selectedLocation ? getLocationById(selectedLocation) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Scheduling</h1>
        <p className="text-neutral-600 mt-1">Assign publishers to witnessing shifts</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.active)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.category})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">Week</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedWeekOffset(selectedWeekOffset - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedWeekOffset(0)}
                >
                  {selectedWeekOffset === 0 ? 'This Week' : `Week ${selectedWeekOffset > 0 ? '+' : ''}${selectedWeekOffset}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedWeekOffset(selectedWeekOffset + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">Week Range</label>
              <p className="text-sm text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {location && (
        <Card>
          <CardHeader>
            <CardTitle>Location Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                {location.category}
              </Badge>
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {location.ageGroup || 'All ages'}
              </Badge>
              <Badge variant="outline">{location.experienceLevel || 'Any'}</Badge>
              <Badge variant="outline">Max {location.maxPublishers || 3} publishers</Badge>
            </div>
            {location.notes && (
              <p className="text-sm text-neutral-600 mt-3">{location.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Calendar/Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              {location?.name} - {weekShifts.length} shifts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {Object.keys(shiftsByDay)
                  .sort()
                  .map((date) => {
                    const dateObj = new Date(date);
                    const dayShifts = shiftsByDay[date].sort((a, b) =>
                      a.startTime.localeCompare(b.startTime)
                    );

                    return (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-neutral-500" />
                          <h3 className="font-medium text-neutral-900">
                            {dateObj.toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </h3>
                        </div>
                        <div className="space-y-2 ml-6">
                          {dayShifts.map((shift) => (
                            <button
                              key={shift.id}
                              onClick={() => openShiftDialog(shift)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                shift.status === 'filled'
                                  ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                  : shift.status === 'partial'
                                  ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                                  : 'border-red-200 bg-red-50 hover:bg-red-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-neutral-500" />
                                  <span className="font-medium text-neutral-900">
                                    {shift.startTime} - {shift.endTime}
                                  </span>
                                </div>
                                <Badge
                                  variant={
                                    shift.status === 'filled'
                                      ? 'default'
                                      : shift.status === 'partial'
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                >
                                  {shift.assignedMembers.length}/{shift.requiredCount}
                                </Badge>
                              </div>
                              {shift.assignedMembers.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {shift.assignedMembers.map((memberId) => (
                                    <Badge key={memberId} variant="outline" className="text-xs">
                                      {getMemberById(memberId)?.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Shift Details (when shift is selected) */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Details</CardTitle>
            <CardDescription>
              {selectedShift ? 'Select a member to assign' : 'Click a shift to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-neutral-500" />
                      <span className="font-medium">
                        {new Date(selectedShift.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <Badge
                      variant={
                        selectedShift.status === 'filled'
                          ? 'default'
                          : selectedShift.status === 'partial'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {selectedShift.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-600">
                    {selectedShift.startTime} - {selectedShift.endTime}
                  </p>
                  <p className="text-sm text-neutral-600 mt-1">
                    {selectedShift.assignedMembers.length} / {selectedShift.requiredCount} assigned
                  </p>
                </div>

                {selectedShift.assignedMembers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">Currently Assigned</h4>
                    <div className="space-y-2">
                      {selectedShift.assignedMembers.map((memberId) => {
                        const member = getMemberById(memberId);
                        if (!member) return null;
                        return (
                          <div
                            key={memberId}
                            className="flex items-center justify-between p-2 bg-white border border-neutral-200 rounded"
                          >
                            <span className="text-sm">{member.name}</span>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedShift.status !== 'filled' && (
                  <Button className="w-full" onClick={() => setDialogOpen(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Assign Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a shift from the schedule to view details and assign members</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Member to Shift</DialogTitle>
            <DialogDescription>
              {selectedShift && (
                <>
                  {new Date(selectedShift.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  • {selectedShift.startTime} - {selectedShift.endTime} • {location?.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCongregation} onValueChange={setFilterCongregation}>
                <SelectTrigger>
                  <SelectValue placeholder="All congregations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Congregations</SelectItem>
                  {congregations.map((cong) => (
                    <SelectItem key={cong.id} value={cong.id}>
                      {cong.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterExperience} onValueChange={setFilterExperience}>
                <SelectTrigger>
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

            {/* Eligible Members */}
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-3">
                Eligible Members ({eligibleMembers.length})
              </h4>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {eligibleMembers.map((member) => {
                    const warnings = checkMemberWarnings(member, selectedShift!);
                    const hasBlockingWarning = warnings.some((w) =>
                      w.includes('limit reached')
                    );

                    return (
                      <div
                        key={member.id}
                        className={`p-3 border rounded-lg ${
                          hasBlockingWarning
                            ? 'border-red-200 bg-red-50'
                            : warnings.length > 0
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-neutral-900">{member.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {member.experience}
                              </Badge>
                              {(() => {
                                const { dayAvailability } = checkAvailabilityMatch(member, selectedShift!);
                                return (
                                  <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                                    <Clock className="h-3 w-3 mr-0.5" />
                                    {dayAvailability}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <p className="text-xs text-neutral-600 mt-1">
                              {getCongregationName(member.congregationId)} • {member.ageGroup}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600">
                              <span>Week: {member.weeklyReservations}/{member.weeklyLimit}</span>
                              <span>Month: {member.monthlyReservations}/{member.monthlyLimit}</span>
                            </div>
                            {warnings.length > 0 && (
                              <div className="flex items-start gap-2 mt-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1">
                                  {warnings.map((warning, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {warning}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAssignMember(member.id)}
                            disabled={hasBlockingWarning}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {eligibleMembers.length === 0 && (
                    <div className="text-center py-8 text-neutral-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No eligible members found</p>
                      <p className="text-sm mt-1">Try adjusting the filters</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
