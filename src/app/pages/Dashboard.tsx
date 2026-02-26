import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, MapPin, Users, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { shifts, locations, members, congregations, getLocationById, getMemberById } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useState } from 'react';

export default function Dashboard() {
  const [selectedCongregation, setSelectedCongregation] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Calculate KPIs
  const totalLocations = locations.filter((l) => l.active).length;
  
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  
  const shiftsThisWeek = shifts.filter((s) => {
    const shiftDate = new Date(s.date);
    return shiftDate >= today && shiftDate <= endOfWeek;
  });

  const filledShifts = shiftsThisWeek.filter((s) => s.status === 'filled').length;
  const openShifts = shiftsThisWeek.filter((s) => s.status !== 'filled').length;
  const activePublishers = members.filter((m) => m.monthlyReservations > 0).length;

  // At-risk shifts (within 7 days, not fully filled)
  const atRiskShifts = shifts
    .filter((s) => {
      const shiftDate = new Date(s.date);
      const daysUntil = Math.ceil((shiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7 && s.status !== 'filled';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  // Coverage chart data by day
  const coverageByDay = shiftsThisWeek.reduce((acc, shift) => {
    const dayName = new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short' });
    if (!acc[dayName]) {
      acc[dayName] = { day: dayName, filled: 0, open: 0 };
    }
    if (shift.status === 'filled') {
      acc[dayName].filled++;
    } else {
      acc[dayName].open++;
    }
    return acc;
  }, {} as Record<string, { day: string; filled: number; open: number }>);

  const chartData = Object.values(coverageByDay);

  // Coverage by location category
  const coverageByCategory = shiftsThisWeek.reduce((acc, shift) => {
    const location = getLocationById(shift.locationId);
    if (!location) return acc;
    
    if (!acc[location.category]) {
      acc[location.category] = { category: location.category, filled: 0, open: 0 };
    }
    if (shift.status === 'filled') {
      acc[location.category].filled++;
    } else {
      acc[location.category].open++;
    }
    return acc;
  }, {} as Record<string, { category: string; filled: number; open: number }>);

  const categoryData = Object.values(coverageByCategory);

  // Pie chart data
  const pieData = [
    { name: 'Filled', value: filledShifts, color: '#22c55e' },
    { name: 'Partial', value: shiftsThisWeek.filter((s) => s.status === 'partial').length, color: '#f59e0b' },
    { name: 'Open', value: shiftsThisWeek.filter((s) => s.status === 'open').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Circuit Dashboard</h1>
        <p className="text-neutral-600 mt-1">Overview of witnessing cart activity across the circuit</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Locations</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">{totalLocations}</p>
                <p className="text-xs text-neutral-500 mt-1">Active witnessing sites</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Shifts This Week</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">{shiftsThisWeek.length}</p>
                <p className="text-xs text-neutral-500 mt-1">Scheduled opportunities</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Shift Coverage</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">
                  {filledShifts}/{shiftsThisWeek.length}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {Math.round((filledShifts / shiftsThisWeek.length) * 100)}% filled
                </p>
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
                <p className="text-sm font-medium text-neutral-600">Active Publishers</p>
                <p className="text-3xl font-semibold text-neutral-900 mt-2">{activePublishers}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  of {members.length} total
                </p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Coverage by Day</CardTitle>
            <CardDescription>Filled vs open shifts for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="day" stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip />
                <Legend />
                <Bar dataKey="filled" fill="#22c55e" name="Filled" />
                <Bar dataKey="open" fill="#ef4444" name="Open" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Status</CardTitle>
            <CardDescription>Distribution this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Location Category */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage by Location Category</CardTitle>
          <CardDescription>Shift coverage breakdown by location type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis type="number" stroke="#737373" />
              <YAxis dataKey="category" type="category" stroke="#737373" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="filled" fill="#22c55e" name="Filled" />
              <Bar dataKey="open" fill="#ef4444" name="Open" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* At-Risk Shifts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>At-Risk Shifts</CardTitle>
            <CardDescription>Shifts within the next 7 days that need coverage</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {atRiskShifts.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All shifts for the next week are covered!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRiskShifts.map((shift) => {
                const location = getLocationById(shift.locationId);
                const daysUntil = Math.ceil((new Date(shift.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-neutral-900">{location?.name}</p>
                          <p className="text-sm text-neutral-600">
                            {new Date(shift.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            • {shift.startTime} - {shift.endTime}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant={shift.status === 'open' ? 'destructive' : 'secondary'}>
                          {shift.assignedMembers.length} / {shift.requiredCount} assigned
                        </Badge>
                        <p className="text-xs text-neutral-500 mt-1">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine your dashboard view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">Location Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Hospital">Hospital</SelectItem>
                  <SelectItem value="Plaza">Plaza</SelectItem>
                  <SelectItem value="Terminal">Terminal</SelectItem>
                  <SelectItem value="Mall">Mall</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">Congregation</label>
              <Select value={selectedCongregation} onValueChange={setSelectedCongregation}>
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
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">Date Range</label>
              <Select defaultValue="week">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
