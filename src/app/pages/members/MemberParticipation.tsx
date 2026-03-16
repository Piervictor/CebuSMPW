import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { useAppContext } from '../../hooks/useAppContext';
import { Search, BarChart3, CalendarCheck, ArrowUpDown } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function MemberParticipation() {
  const { members, congregations, shifts } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCongregation, setSelectedCongregation] = useState<string>('all');
  const [sortField, setSortField] = useState<'lastServed' | 'totalAssignments' | 'name'>('lastServed');
  const [sortAsc, setSortAsc] = useState(true);

  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  // Compute participation data per member
  const participationData = useMemo(() => {
    return members.map((member) => {
      const memberShifts = shifts.filter((s) => s.assignedMembers.includes(member.id));
      const pastShifts = memberShifts.filter((s) => new Date(s.date) < new Date());
      const upcomingShifts = memberShifts.filter((s) => new Date(s.date) >= new Date());

      const sortedPast = pastShifts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastServedDate = sortedPast.length > 0 ? sortedPast[0].date : null;

      // Days since last served
      let daysSinceLastServed: number | null = null;
      if (lastServedDate) {
        const diff = new Date().getTime() - new Date(lastServedDate).getTime();
        daysSinceLastServed = Math.floor(diff / (1000 * 60 * 60 * 24));
      }

      return {
        member,
        totalAssignments: memberShifts.length,
        pastAssignments: pastShifts.length,
        upcomingAssignments: upcomingShifts.length,
        lastServedDate,
        daysSinceLastServed,
      };
    });
  }, [members, shifts]);

  const filteredAndSorted = useMemo(() => {
    let filtered = participationData.filter((item) => {
      const fullName = `${item.member.surname} ${item.member.firstName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || item.member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCongregation = selectedCongregation === 'all' || item.member.congregationId === selectedCongregation;
      return matchesSearch && matchesCongregation;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'lastServed') {
        const dateA = a.lastServedDate ? new Date(a.lastServedDate).getTime() : 0;
        const dateB = b.lastServedDate ? new Date(b.lastServedDate).getTime() : 0;
        cmp = dateA - dateB;
      } else if (sortField === 'totalAssignments') {
        cmp = a.totalAssignments - b.totalAssignments;
      } else {
        cmp = a.member.name.localeCompare(b.member.name);
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [participationData, searchTerm, selectedCongregation, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Overview stats
  const totalPastAssignments = participationData.reduce((sum, p) => sum + p.pastAssignments, 0);
  const avgAssignments = members.length > 0 ? (totalPastAssignments / members.length).toFixed(1) : '0';
  const neverServed = participationData.filter((p) => p.pastAssignments === 0).length;

  function getParticipationBadge(daysSince: number | null) {
    if (daysSince === null) return <Badge variant="outline" className="text-[10px] bg-neutral-50 text-neutral-400 border-neutral-200">Never</Badge>;
    if (daysSince <= 7) return <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Recent</Badge>;
    if (daysSince <= 30) return <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">This Month</Badge>;
    if (daysSince <= 90) return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Overdue</Badge>;
    return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Long Overdue</Badge>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#111827' }}>
          Member Participation
        </h1>
        <p className="text-[13px] leading-snug" style={{ color: '#6B7280' }}>
          Participation statistics based on service history
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF1FD' }}>
                <BarChart3 className="h-5 w-5" style={{ color: '#4F6BED' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Total Assignments</p>
                <p className="text-xl font-semibold" style={{ color: '#111827' }}>{totalPastAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-50">
                <CalendarCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Avg. per Member</p>
                <p className="text-xl font-semibold" style={{ color: '#111827' }}>{avgAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-50">
                <Search className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Never Served</p>
                <p className="text-xl font-semibold" style={{ color: '#111827' }}>{neverServed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCongregation} onValueChange={setSelectedCongregation}>
              <SelectTrigger>
                <SelectValue placeholder="Congregation" />
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
        </CardContent>
      </Card>

      {/* Participation Table */}
      <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base" style={{ color: '#111827' }}>Participation History</CardTitle>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Sorted by last served date to help with fair scheduling
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: '#E5E7EB' }}>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-medium h-auto p-0"
                      style={{ color: '#6B7280' }}
                      onClick={() => toggleSort('name')}
                    >
                      Member Name
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Congregation</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-medium h-auto p-0"
                      style={{ color: '#6B7280' }}
                      onClick={() => toggleSort('lastServed')}
                    >
                      Last Served
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-medium h-auto p-0"
                      style={{ color: '#6B7280' }}
                      onClick={() => toggleSort('totalAssignments')}
                    >
                      Total Assignments
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Upcoming</TableHead>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map(({ member, lastServedDate, daysSinceLastServed, totalAssignments, upcomingAssignments }) => (
                  <TableRow key={member.id} style={{ borderColor: '#E5E7EB' }}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                          style={{ backgroundColor: '#4F6BED' }}
                        >
                          {member.surname[0]}{member.firstName[0]}
                        </div>
                        <span className="text-sm font-medium" style={{ color: '#111827' }}>
                          {member.surname}, {member.firstName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: '#374151' }}>
                      {getCongregationName(member.congregationId)}
                    </TableCell>
                    <TableCell>
                      {lastServedDate ? (
                        <div>
                          <p className="text-sm" style={{ color: '#111827' }}>
                            {new Date(lastServedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-[10px]" style={{ color: '#6B7280' }}>
                            {daysSinceLastServed} day{daysSinceLastServed !== 1 ? 's' : ''} ago
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Never served</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium" style={{ color: '#111827' }}>{totalAssignments}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" style={{ color: '#374151' }}>{upcomingAssignments}</span>
                    </TableCell>
                    <TableCell>
                      {getParticipationBadge(daysSinceLastServed)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
