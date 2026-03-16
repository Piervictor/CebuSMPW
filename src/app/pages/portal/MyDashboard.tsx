import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { useAppContext } from '../../hooks/useAppContext';
import { toLocalDateStr } from '../../../lib/dateUtils';
import {
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  CalendarPlus,
  ClipboardList,
} from 'lucide-react';

export default function MyDashboard() {
  const { currentUser, members, shifts, getLocationById, congregations } = useAppContext();

  const memberData = useMemo(() => {
    if (!currentUser) return null;
    return members.find((m) => m.id === currentUser.id) || members[0];
  }, [currentUser, members]);

  const getCongregationName = (id: string) =>
    congregations.find((c) => c.id === id)?.name || 'Unknown';

  if (!currentUser || !memberData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Member Dashboard</h1>
        <p className="text-neutral-600">No member profile is linked to the current user.</p>
      </div>
    );
  }

  const todayStr = toLocalDateStr(new Date());
  const memberShifts = shifts.filter((s) => s.assignedMembers.includes(memberData.id));
  const upcomingShifts = memberShifts
    .filter((s) => s.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const pastShifts = memberShifts.filter((s) => s.date < todayStr);

  const nextShift = upcomingShifts[0];
  const weeklyPct = memberData.weeklyLimit > 0
    ? Math.min((memberData.weeklyReservations / memberData.weeklyLimit) * 100, 100)
    : 0;
  const monthlyPct = memberData.monthlyLimit > 0
    ? Math.min((memberData.monthlyReservations / memberData.monthlyLimit) * 100, 100)
    : 0;

  const vacantCount = shifts.filter(
    (s) => s.status !== 'filled' && s.date >= todayStr
  ).length;

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
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Member Dashboard</h1>
        <p className="text-neutral-600 mt-1">
          Welcome, {memberData.firstName} &bull; {getCongregationName(memberData.congregationId)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">This Week</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {memberData.weeklyReservations}
                  <span className="text-sm font-normal text-neutral-400">/{memberData.weeklyLimit}</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF0FD' }}>
                <Calendar className="h-5 w-5" style={{ color: '#4F6BED' }} />
              </div>
            </div>
            <Progress value={weeklyPct} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">This Month</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {memberData.monthlyReservations}
                  <span className="text-sm font-normal text-neutral-400">/{memberData.monthlyLimit}</span>
                </p>
              </div>
              <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <Progress value={monthlyPct} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Total Served</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">{pastShifts.length}</p>
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
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Vacant Slots</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">{vacantCount}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Available to join</p>
              </div>
              <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <CalendarPlus className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Assignment + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Assignment */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Next Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            {nextShift ? (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0F2FE', border: '1px solid #D6DAFB' }}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: '#4F6BED' }} />
                      <span className="font-medium text-neutral-900">
                        {getLocationById(nextShift.locationId)?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(nextShift.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{fmt12h(nextShift.startTime)} – {fmt12h(nextShift.endTime)}</span>
                    </div>
                    <Badge variant={nextShift.assignedBy === 'admin' ? 'default' : 'secondary'} className="text-xs mt-1">
                      {nextShift.assignedBy === 'admin' ? 'Assigned by admin' : 'Self-reserved'}
                    </Badge>
                  </div>
                  <Link to="/my-portal/assignments">
                    <Button variant="outline" size="sm">
                      View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming assignments</p>
                <Link to="/my-portal/join">
                  <Button variant="outline" size="sm" className="mt-3">
                    Browse Vacant Slots
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/my-portal/join" className="block">
              <Button variant="outline" className="w-full justify-start text-sm h-10">
                <CalendarPlus className="h-4 w-4 mr-2" style={{ color: '#4F6BED' }} />
                Join a Vacant Slot
              </Button>
            </Link>
            <Link to="/my-portal/availability" className="block">
              <Button variant="outline" className="w-full justify-start text-sm h-10">
                <Clock className="h-4 w-4 mr-2" style={{ color: '#4F6BED' }} />
                Update My Availability
              </Button>
            </Link>
            <Link to="/my-portal/assignments" className="block">
              <Button variant="outline" className="w-full justify-start text-sm h-10">
                <ClipboardList className="h-4 w-4 mr-2" style={{ color: '#4F6BED' }} />
                View My Assignments
              </Button>
            </Link>
            <Link to="/my-portal/profile" className="block">
              <Button variant="outline" className="w-full justify-start text-sm h-10">
                <TrendingUp className="h-4 w-4 mr-2" style={{ color: '#4F6BED' }} />
                My Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts Preview */}
      {upcomingShifts.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Shifts</CardTitle>
              <Link to="/my-portal/assignments">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
              {upcomingShifts.slice(0, 5).map((shift) => {
                const location = getLocationById(shift.locationId);
                return (
                  <div key={shift.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF0FD' }}>
                        <MapPin className="h-4 w-4" style={{ color: '#4F6BED' }} />
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
