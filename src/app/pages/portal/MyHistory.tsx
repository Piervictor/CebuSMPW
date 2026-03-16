import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAppContext } from '../../hooks/useAppContext';
import { toLocalDateStr } from '../../../lib/dateUtils';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  History,
  TrendingUp,
} from 'lucide-react';

export default function MyHistory() {
  const { currentUser, members, shifts, getLocationById } = useAppContext();
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  const memberData = useMemo(() => {
    if (!currentUser) return null;
    return members.find((m) => m.id === currentUser.id) || members[0];
  }, [currentUser, members]);

  const todayStr = toLocalDateStr(new Date());

  const pastShifts = useMemo(() => {
    if (!memberData) return [];
    let result = shifts
      .filter((s) => s.assignedMembers.includes(memberData.id) && s.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

    if (filterPeriod === 'last-month') {
      const today = new Date();
      const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const me = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 0));
      result = result.filter((s) => s.date >= ms && s.date <= me);
    } else if (filterPeriod === 'last-3-months') {
      const today = new Date();
      const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() - 3, 1));
      result = result.filter((s) => s.date >= ms);
    } else if (filterPeriod === 'last-6-months') {
      const today = new Date();
      const ms = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() - 6, 1));
      result = result.filter((s) => s.date >= ms);
    }

    return result;
  }, [memberData, shifts, filterPeriod, todayStr]);

  // Stats
  const totalShifts = pastShifts.length;
  const uniqueLocations = new Set(pastShifts.map((s) => s.locationId)).size;
  const totalHours = pastShifts.reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

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
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!currentUser || !memberData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900">My History</h1>
        <p className="text-neutral-600">No member profile found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">My History</h1>
          <p className="text-sm text-neutral-500 mt-1">Your past witnessing assignments</p>
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="h-9 text-[13px] w-full sm:w-[180px]" style={{ borderColor: '#E5E7EB' }}>
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="last-3-months">Last 3 Months</SelectItem>
            <SelectItem value="last-6-months">Last 6 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Total Shifts</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">{totalShifts}</p>
              </div>
              <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Hours Served</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">{totalHours.toFixed(1)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF0FD' }}>
                <Clock className="h-5 w-5" style={{ color: '#4F6BED' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Locations</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">{uniqueLocations}</p>
              </div>
              <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      {pastShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-neutral-500">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No past shifts recorded</p>
              <p className="text-sm mt-1">Your completed assignments will appear here.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completed Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
              {pastShifts.map((shift) => {
                const location = getLocationById(shift.locationId);
                return (
                  <div key={shift.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-neutral-100">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{location?.name}</p>
                        <p className="text-xs text-neutral-500">
                          {formatDate(shift.date)} &bull; {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      {shift.assignedBy === 'admin' ? 'Assigned' : 'Self'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
