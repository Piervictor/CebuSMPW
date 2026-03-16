import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAppContext } from '../../hooks/useAppContext';
import { toLocalDateStr } from '../../../lib/dateUtils';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Clock,
  Search,
  UserPlus,
  Users,
  CalendarPlus,
} from 'lucide-react';

export default function JoinVacantSlots() {
  const {
    currentUser,
    members,
    shifts,
    locations,
    getLocationById,
    assignMemberToShift,
    loadShiftsForWeek,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('upcoming');

  const memberData = useMemo(() => {
    if (!currentUser) return null;
    return members.find((m) => m.id === currentUser.id) || members[0];
  }, [currentUser, members]);

  const activeLocations = locations.filter((l) => l.active);

  // Load shifts for upcoming weeks
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
      filtered = filtered.filter(
        (s) => s.date >= toLocalDateStr(weekStart) && s.date <= toLocalDateStr(weekEnd)
      );
    } else if (filterPeriod === 'this-month') {
      const today = new Date();
      const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      const me = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      filtered = filtered.filter((s) => s.date >= ms && s.date <= me);
    }

    if (filterLocation !== 'all') {
      filtered = filtered.filter((s) => s.locationId === filterLocation);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => {
        const loc = getLocationById(s.locationId);
        return loc?.name.toLowerCase().includes(term) || s.date.includes(term);
      });
    }

    // Exclude shifts the member is already assigned to
    if (memberData) {
      filtered = filtered.filter((s) => !s.assignedMembers.includes(memberData.id));
    }

    return filtered.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, filterLocation, filterPeriod, searchTerm, todayStr, getLocationById, memberData]);

  const fmt12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleJoin = async (shiftId: string) => {
    if (!memberData) {
      toast.error('Your member profile was not found');
      return;
    }
    try {
      await assignMemberToShift(shiftId, memberData.id);
      toast.success('You have joined this shift!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join shift');
    }
  };

  if (!currentUser || !memberData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Join Vacant Slots</h1>
        <p className="text-neutral-600">No member profile found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Join Vacant Slots</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {vacantShifts.length} slot{vacantShifts.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-4 flex flex-col sm:flex-row gap-3"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}
      >
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <Input
            placeholder="Search location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-[13px]"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="h-9 text-[13px] w-full sm:w-[200px]" style={{ borderColor: '#E5E7EB' }}>
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {activeLocations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="h-9 text-[13px] w-full sm:w-[160px]" style={{ borderColor: '#E5E7EB' }}>
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vacant Slots List */}
      {vacantShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-neutral-500">
              <CalendarPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No vacant slots found</p>
              <p className="text-sm mt-1">All shifts are filled or try adjusting filters.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vacantShifts.map((shift) => {
            const location = getLocationById(shift.locationId);
            const slotsRemaining = shift.requiredCount - shift.assignedMembers.length;
            return (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#EEF0FD' }}
                      >
                        <MapPin className="h-4.5 w-4.5" style={{ color: '#4F6BED' }} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-neutral-900">{location?.name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(shift.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {shift.assignedMembers.length}/{shift.requiredCount} filled
                          </span>
                        </div>
                        <Badge
                          variant={shift.status === 'open' ? 'destructive' : 'secondary'}
                          className="text-[11px]"
                        >
                          {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="text-xs"
                      style={{ backgroundColor: '#4F6BED' }}
                      onClick={() => handleJoin(shift.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
