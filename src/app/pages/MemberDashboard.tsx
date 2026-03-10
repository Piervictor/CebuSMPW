import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { useAppContext } from '../hooks/useAppContext';
import { Calendar, MapPin, Clock, User, CheckCircle2, TrendingUp } from 'lucide-react';

export default function MemberDashboard() {
  const { currentUser, members, shifts, getLocationById, congregations } = useAppContext();
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  if (!currentUser) {
    return null;
  }

  // Get current member data
  const memberData = members.find((member) => member.id === currentUser.id) || members[0];

  if (!memberData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">My Schedule</h1>
          <p className="text-neutral-600 mt-1">No member profile is linked to the current user.</p>
        </div>
      </div>
    );
  }

  // Get member's shifts
  const memberShifts = shifts.filter((s) => s.assignedMembers.includes(memberData.id));

  // Upcoming shifts
  const today = new Date();
  const upcomingShifts = memberShifts
    .filter((s) => new Date(s.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Past shifts
  const pastShifts = memberShifts
    .filter((s) => new Date(s.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // This week's shifts
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  const thisWeekShifts = upcomingShifts.filter((s) => new Date(s.date) <= endOfWeek);

  // This month's shifts
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const thisMonthShifts = upcomingShifts.filter((s) => new Date(s.date) <= endOfMonth);

  // Calculate percentages
  const weeklyPercentage = (memberData.weeklyReservations / memberData.weeklyLimit) * 100;
  const monthlyPercentage = (memberData.monthlyReservations / memberData.monthlyLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">My Schedule</h1>
        <p className="text-neutral-600 mt-1">
          Welcome, {memberData.name} • {getCongregationName(memberData.congregationId)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">This Week</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">
                  {memberData.weeklyReservations}
                </p>
                <p className="text-xs text-neutral-500 mt-1">of {memberData.weeklyLimit} shifts</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <Progress value={weeklyPercentage} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">This Month</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">
                  {memberData.monthlyReservations}
                </p>
                <p className="text-xs text-neutral-500 mt-1">of {memberData.monthlyLimit} shifts</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <Progress value={monthlyPercentage} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Available Slots</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">
                  {memberData.monthlyLimit - memberData.monthlyReservations}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Remaining this month</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Served</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">{pastShifts.length}</p>
                <p className="text-xs text-neutral-500 mt-1">All time</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Info */}
      <Card>
        <CardHeader>
          <CardTitle>My Information</CardTitle>
          <CardDescription>Your profile and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-700">Congregation</p>
                <p className="text-base text-neutral-900 mt-1">
                  {getCongregationName(memberData.congregationId)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Experience Level</p>
                <p className="mt-1">
                  <Badge variant={memberData.experience === 'Experienced' ? 'default' : 'secondary'}>
                    {memberData.experience}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Age Group</p>
                <p className="mt-1">
                  <Badge variant="outline">{memberData.ageGroup}</Badge>
                </p>
              </div>
              {memberData.languageGroup && (
                <div>
                  <p className="text-sm font-medium text-neutral-700">Languages</p>
                  <p className="text-base text-neutral-900 mt-1">{memberData.languageGroup}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">Preferred Days</p>
                <div className="flex flex-wrap gap-2">
                  {memberData.preferredDays.map((day) => (
                    <Badge key={day} variant="secondary">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">Preferred Times</p>
                <div className="flex flex-wrap gap-2">
                  {memberData.preferredTimes.map((time) => (
                    <Badge key={time} variant="secondary">
                      {time}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">Preferred Locations</p>
                <div className="flex flex-wrap gap-2">
                  {memberData.preferredLocations.map((locId) => {
                    const location = getLocationById(locId);
                    return (
                      <Badge key={locId} variant="secondary">
                        {location?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button>Update Preferences</Button>
          </div>
        </CardContent>
      </Card>

      {/* Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>My Shifts</CardTitle>
          <CardDescription>View your upcoming and past witnessing shifts</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingShifts.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastShifts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3 mt-4">
              {upcomingShifts.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No upcoming shifts scheduled</p>
                  <p className="text-sm mt-1">Contact your overseer to get assigned</p>
                </div>
              ) : (
                upcomingShifts.map((shift) => {
                  const location = getLocationById(shift.locationId);
                  const shiftDate = new Date(shift.date);
                  const isThisWeek = shiftDate <= endOfWeek;

                  return (
                    <div
                      key={shift.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        isThisWeek
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-neutral-500" />
                            <h3 className="font-medium text-neutral-900">{location?.name}</h3>
                            {isThisWeek && <Badge variant="default">This Week</Badge>}
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-neutral-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {shiftDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {shift.startTime} - {shift.endTime}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Badge
                              variant={shift.assignedBy === 'admin' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {shift.assignedBy === 'admin'
                                ? 'Assigned by admin'
                                : 'Self-reserved'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3 mt-4">
              {pastShifts.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No past shifts recorded</p>
                </div>
              ) : (
                pastShifts.slice(0, 20).map((shift) => {
                  const location = getLocationById(shift.locationId);
                  const shiftDate = new Date(shift.date);

                  return (
                    <div
                      key={shift.id}
                      className="p-4 border border-neutral-200 rounded-lg bg-white opacity-75"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-neutral-400" />
                            <h3 className="font-medium text-neutral-700">{location?.name}</h3>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-neutral-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {shiftDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {shift.startTime} - {shift.endTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
