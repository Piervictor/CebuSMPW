import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  shifts,
  locations,
  members,
  congregations,
  getCongregationName,
  getLocationById,
  getMemberById,
} from '../data/mockData';
import { Download, FileText, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

export default function Reports() {
  const [dateRange, setDateRange] = useState('month');

  // Calculate location statistics
  const locationStats = locations.map((location) => {
    const locationShifts = shifts.filter((s) => s.locationId === location.id);
    const totalHours = locationShifts.length * 2; // Assuming 2 hour shifts average
    const filledShifts = locationShifts.filter((s) => s.status === 'filled').length;
    const coverageRate = locationShifts.length > 0 ? (filledShifts / locationShifts.length) * 100 : 0;

    return {
      id: location.id,
      name: location.name,
      category: location.category,
      city: location.city,
      totalShifts: locationShifts.length,
      totalHours,
      coverageRate: Math.round(coverageRate),
    };
  });

  // Calculate congregation statistics
  const congregationStats = congregations.map((congregation) => {
    const congregationMembers = members.filter((m) => m.congregationId === congregation.id);
    const totalShifts = shifts.filter((s) =>
      s.assignedMembers.some((memberId) =>
        congregationMembers.some((m) => m.id === memberId)
      )
    ).length;
    const activeMembers = congregationMembers.filter((m) => m.monthlyReservations > 0).length;
    const avgShiftsPerPublisher = activeMembers > 0 ? (totalShifts / activeMembers).toFixed(1) : '0';

    return {
      id: congregation.id,
      name: congregation.name,
      city: congregation.city,
      totalShifts,
      activeMembers,
      avgShiftsPerPublisher,
      publisherCount: congregation.publisherCount,
      participationRate: Math.round((activeMembers / congregation.publisherCount) * 100),
    };
  });

  // Calculate publisher statistics
  const publisherStats = members
    .map((member) => {
      const memberShifts = shifts.filter((s) => s.assignedMembers.includes(member.id));
      const totalHours = memberShifts.length * 2;

      return {
        id: member.id,
        name: member.name,
        congregation: getCongregationName(member.congregationId),
        totalShifts: memberShifts.length,
        totalHours,
        weeklyAvg: (memberShifts.length / 4).toFixed(1), // Assuming 4 weeks
        experience: member.experience,
      };
    })
    .sort((a, b) => b.totalShifts - a.totalShifts);

  // Chart data by category
  const categoryData = locationStats.reduce((acc, stat) => {
    const existing = acc.find((item) => item.category === stat.category);
    if (existing) {
      existing.shifts += stat.totalShifts;
      existing.hours += stat.totalHours;
    } else {
      acc.push({
        category: stat.category,
        shifts: stat.totalShifts,
        hours: stat.totalHours,
      });
    }
    return acc;
  }, [] as Array<{ category: string; shifts: number; hours: number }>);

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`, {
      description: 'Your download will begin shortly',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">Reports</h1>
          <p className="text-neutral-600 mt-1">
            Analyze public witnessing activity and engagement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-neutral-700">Date Range:</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Calendar className="h-4 w-4" />
              <span>
                Showing data for:{' '}
                <span className="font-medium text-neutral-900">
                  {dateRange === 'week'
                    ? 'Past 7 days'
                    : dateRange === 'month'
                    ? 'Past 30 days'
                    : dateRange === 'quarter'
                    ? 'Past 3 months'
                    : dateRange === 'year'
                    ? 'Past 12 months'
                    : 'All time'}
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Total Shifts</p>
            <p className="text-3xl font-semibold text-neutral-900 mt-2">{shifts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Total Hours</p>
            <p className="text-3xl font-semibold text-neutral-900 mt-2">{shifts.length * 2}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Active Locations</p>
            <p className="text-3xl font-semibold text-neutral-900 mt-2">
              {locations.filter((l) => l.active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Active Publishers</p>
            <p className="text-3xl font-semibold text-neutral-900 mt-2">
              {members.filter((m) => m.monthlyReservations > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity by Location Category</CardTitle>
          <CardDescription>Total shifts and hours by location type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="category" stroke="#737373" />
              <YAxis stroke="#737373" />
              <Tooltip />
              <Legend />
              <Bar dataKey="shifts" fill="#3b82f6" name="Shifts" />
              <Bar dataKey="hours" fill="#8b5cf6" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs for Different Reports */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="locations">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="locations">By Location</TabsTrigger>
              <TabsTrigger value="congregations">By Congregation</TabsTrigger>
              <TabsTrigger value="publishers">By Publisher</TabsTrigger>
            </TabsList>

            {/* By Location */}
            <TabsContent value="locations" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900">Location Performance</h3>
                  <Badge variant="secondary">{locationStats.length} locations</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Total Shifts</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Coverage Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationStats
                      .sort((a, b) => b.totalShifts - a.totalShifts)
                      .map((stat) => (
                        <TableRow key={stat.id}>
                          <TableCell className="font-medium">{stat.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                stat.category === 'Hospital'
                                  ? 'border-blue-300 text-blue-700'
                                  : stat.category === 'Plaza'
                                  ? 'border-green-300 text-green-700'
                                  : stat.category === 'Terminal'
                                  ? 'border-purple-300 text-purple-700'
                                  : 'border-amber-300 text-amber-700'
                              }
                            >
                              {stat.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-neutral-600">{stat.city}</TableCell>
                          <TableCell className="text-right">{stat.totalShifts}</TableCell>
                          <TableCell className="text-right">{stat.totalHours}h</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className={
                                  stat.coverageRate >= 80
                                    ? 'text-green-600'
                                    : stat.coverageRate >= 60
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                                }
                              >
                                {stat.coverageRate}%
                              </span>
                              {stat.coverageRate >= 80 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* By Congregation */}
            <TabsContent value="congregations" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900">Congregation Engagement</h3>
                  <Badge variant="secondary">{congregationStats.length} congregations</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Congregation</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Total Shifts</TableHead>
                      <TableHead className="text-right">Active Members</TableHead>
                      <TableHead className="text-right">Avg Shifts/Publisher</TableHead>
                      <TableHead className="text-right">Participation Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {congregationStats
                      .sort((a, b) => b.totalShifts - a.totalShifts)
                      .map((stat) => (
                        <TableRow key={stat.id}>
                          <TableCell className="font-medium">{stat.name}</TableCell>
                          <TableCell className="text-neutral-600">{stat.city}</TableCell>
                          <TableCell className="text-right">{stat.totalShifts}</TableCell>
                          <TableCell className="text-right">
                            {stat.activeMembers} / {stat.publisherCount}
                          </TableCell>
                          <TableCell className="text-right">{stat.avgShiftsPerPublisher}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                stat.participationRate >= 50
                                  ? 'text-green-600'
                                  : stat.participationRate >= 30
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }
                            >
                              {stat.participationRate}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* By Publisher */}
            <TabsContent value="publishers" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900">Top Publishers</h3>
                  <Badge variant="secondary">Top 20 by shifts served</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Congregation</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead className="text-right">Total Shifts</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Weekly Avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publisherStats.slice(0, 20).map((stat, index) => (
                      <TableRow key={stat.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-900">#{index + 1}</span>
                            {index < 3 && (
                              <Badge variant="default" className="text-xs">
                                Top {index + 1}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{stat.name}</TableCell>
                        <TableCell className="text-neutral-600">{stat.congregation}</TableCell>
                        <TableCell>
                          <Badge
                            variant={stat.experience === 'Experienced' ? 'default' : 'secondary'}
                          >
                            {stat.experience}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{stat.totalShifts}</TableCell>
                        <TableCell className="text-right">{stat.totalHours}h</TableCell>
                        <TableCell className="text-right">{stat.weeklyAvg}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
