import { useMemo, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAppContext } from '../../hooks/useAppContext';
import { toLocalDateStr } from '../../../lib/dateUtils';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Clock,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

export default function MyAssignments() {
  const { currentUser, members, shifts, getLocationById, removeFromShift } = useAppContext();
  const [filterPeriod, setFilterPeriod] = useState<string>('upcoming');

  const memberData = useMemo(() => {
    if (!currentUser) return null;
    return members.find((m) => m.id === currentUser.id) || members[0];
  }, [currentUser, members]);

  const todayStr = toLocalDateStr(new Date());

  const memberShifts = useMemo(() => {
    if (!memberData) return [];
    return shifts.filter((s) => s.assignedMembers.includes(memberData.id));
  }, [memberData, shifts]);

  const filteredShifts = useMemo(() => {
    let result = [...memberShifts];

    if (filterPeriod === 'upcoming') {
      result = result.filter((s) => s.date >= todayStr);
    } else if (filterPeriod === 'this-week') {
      const today = new Date();
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      result = result.filter(
        (s) => s.date >= toLocalDateStr(weekStart) && s.date <= toLocalDateStr(weekEnd)
      );
    } else if (filterPeriod === 'this-month') {
      const today = new Date();
      const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      const me = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      result = result.filter((s) => s.date >= ms && s.date <= me);
    }

    return result.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [memberShifts, filterPeriod, todayStr]);

  const fmt12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleCancel = async (shiftId: string) => {
    if (!memberData) return;
    try {
      await removeFromShift(shiftId, memberData.id);
      toast.success('Shift cancelled successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel shift');
    }
  };

  const isUpcoming = (dateStr: string) => dateStr >= todayStr;

  if (!currentUser || !memberData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900">My Assignments</h1>
        <p className="text-neutral-600">No member profile found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">My Assignments</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {filteredShifts.length} assignment{filteredShifts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="h-9 text-[13px] w-full sm:w-[180px]" style={{ borderColor: '#E5E7EB' }}>
            <SelectValue placeholder="Filter period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignments List */}
      {filteredShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-neutral-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No assignments found</p>
              <p className="text-sm mt-1">Adjust the filter or check back later.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredShifts.map((shift) => {
            const location = getLocationById(shift.locationId);
            const upcoming = isUpcoming(shift.date);
            return (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: upcoming ? '#EEF0FD' : '#F3F4F6' }}
                      >
                        <MapPin className="h-4.5 w-4.5" style={{ color: upcoming ? '#4F6BED' : '#9CA3AF' }} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-neutral-900">{location?.name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateShort(shift.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={shift.assignedBy === 'admin' ? 'default' : 'secondary'}
                            className="text-[11px]"
                          >
                            {shift.assignedBy === 'admin' ? 'Assigned by admin' : 'Self-reserved'}
                          </Badge>
                          {!upcoming && (
                            <Badge variant="outline" className="text-[11px] text-green-600 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {upcoming && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                        onClick={() => handleCancel(shift.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
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
