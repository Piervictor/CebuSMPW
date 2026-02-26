import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { congregations, shifts, members } from '../data/mockData';
import { Users, TrendingUp, Calendar, Award } from 'lucide-react';

export default function CircuitStructure() {
  const [selectedCongregation, setSelectedCongregation] = useState(congregations[0]);

  const congregationMembers = members.filter((m) => m.congregationId === selectedCongregation.id);
  const congregationShifts = shifts.filter((s) =>
    s.assignedMembers.some((memberId) =>
      congregationMembers.some((m) => m.id === memberId)
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Circuit Structure</h1>
        <p className="text-neutral-600 mt-1">
          Manage congregations and view their public witnessing activity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Congregation List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Congregations</CardTitle>
            <CardDescription>{congregations.length} in circuit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {congregations.map((congregation) => (
                <button
                  key={congregation.id}
                  onClick={() => setSelectedCongregation(congregation)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedCongregation.id === congregation.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{congregation.name}</p>
                      <p className="text-sm text-neutral-600 mt-1">{congregation.city}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {congregation.publisherCount} publishers
                        </Badge>
                      </div>
                    </div>
                    {selectedCongregation.id === congregation.id && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Congregation Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedCongregation.name}</CardTitle>
              <CardDescription>Congregation details and overseers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-neutral-700">City</p>
                  <p className="text-base text-neutral-900 mt-1">{selectedCongregation.city}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-700">Public Witnessing Overseers</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCongregation.overseers.map((overseer, index) => (
                      <Badge key={index} variant="outline">
                        {overseer}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Total Publishers</p>
                    <p className="text-3xl font-semibold text-neutral-900 mt-2">
                      {selectedCongregation.publisherCount}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {congregationMembers.length} participating
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Shifts Served</p>
                    <p className="text-3xl font-semibold text-neutral-900 mt-2">
                      {selectedCongregation.shiftsServed}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">All time</p>
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
                    <p className="text-sm font-medium text-neutral-600">Coverage Rate</p>
                    <p className="text-3xl font-semibold text-neutral-900 mt-2">
                      {selectedCongregation.coverageRate}%
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">Shifts fulfilled</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Active Members</p>
                    <p className="text-3xl font-semibold text-neutral-900 mt-2">
                      {congregationMembers.filter((m) => m.monthlyReservations > 0).length}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">This month</p>
                  </div>
                  <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Members List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Members</CardTitle>
              <CardDescription>
                Publishers from {selectedCongregation.name} participating in public witnessing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {congregationMembers.slice(0, 10).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-neutral-700">
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{member.name}</p>
                        <p className="text-sm text-neutral-600">
                          {member.experience} • {member.ageGroup}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900">
                        {member.monthlyReservations} shifts
                      </p>
                      <p className="text-xs text-neutral-500">This month</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
