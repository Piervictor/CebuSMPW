import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAppContext } from '../../hooks/useAppContext';
import type { Member, WeekdayAvailability } from '../../data/mockData';
import { Search, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABILITY_OPTIONS: WeekdayAvailability[] = [
  'Morning',
  'Half Day Morning',
  'Half Day Afternoon',
  'Afternoon',
  'Full Day',
  'Evening',
  'NA',
];

const AVAILABILITY_CATEGORIES = [
  { label: 'Morning', options: ['Morning', 'Half Day Morning'] as WeekdayAvailability[] },
  { label: 'Half-day', options: ['Half Day Morning', 'Half Day Afternoon'] as WeekdayAvailability[] },
  { label: 'Afternoon', options: ['Afternoon', 'Half Day Afternoon'] as WeekdayAvailability[] },
  { label: 'Evening', options: ['Evening'] as WeekdayAvailability[] },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' };

function getAvailabilityColor(value: WeekdayAvailability): string {
  switch (value) {
    case 'Morning': return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'Half Day Morning': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Half Day Afternoon': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Afternoon': return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'Full Day': return 'bg-green-100 text-green-800 border-green-200';
    case 'Evening': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'NA': return 'bg-neutral-100 text-neutral-400 border-neutral-200';
    default: return '';
  }
}

export default function MemberAvailability() {
  const { members, congregations, updateMember } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCongregation, setSelectedCongregation] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editAvailability, setEditAvailability] = useState<Member['availability'] | null>(null);

  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const fullName = `${member.surname} ${member.firstName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCongregation = selectedCongregation === 'all' || member.congregationId === selectedCongregation;

      if (filterCategory !== 'all' && member.availability) {
        const cat = AVAILABILITY_CATEGORIES.find((c) => c.label === filterCategory);
        if (cat) {
          const hasCategory = DAYS.some((day) => cat.options.includes(member.availability[day]));
          if (!hasCategory) return false;
        }
      }

      return matchesSearch && matchesCongregation;
    });
  }, [members, searchTerm, selectedCongregation, filterCategory]);

  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setEditAvailability({ ...member.availability });
    setEditDialogOpen(true);
  };

  const handleSaveAvailability = async () => {
    if (!editingMember || !editAvailability) return;
    try {
      await updateMember(editingMember.id, { availability: editAvailability });
      toast.success(`Availability updated for ${editingMember.name}`);
      setEditDialogOpen(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update availability';
      toast.error(errorMsg);
    }
  };

  // Summary stats
  const availabilitySummary = useMemo(() => {
    const counts = { morning: 0, afternoon: 0, evening: 0, fullDay: 0 };
    members.forEach((m) => {
      if (!m.availability) return;
      DAYS.forEach((day) => {
        const val = m.availability[day];
        if (val === 'Morning' || val === 'Half Day Morning') counts.morning++;
        if (val === 'Afternoon' || val === 'Half Day Afternoon') counts.afternoon++;
        if (val === 'Evening') counts.evening++;
        if (val === 'Full Day') counts.fullDay++;
      });
    });
    return counts;
  }, [members]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#111827' }}>
          Availability
        </h1>
        <p className="text-[13px] leading-snug" style={{ color: '#6B7280' }}>
          Manage member availability for scheduling
        </p>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Morning', count: availabilitySummary.morning, color: 'bg-sky-50', icon: '🌅' },
          { label: 'Afternoon', count: availabilitySummary.afternoon, color: 'bg-violet-50', icon: '☀️' },
          { label: 'Evening', count: availabilitySummary.evening, color: 'bg-purple-50', icon: '🌙' },
          { label: 'Full Day', count: availabilitySummary.fullDay, color: 'bg-green-50', icon: '📅' },
        ].map((cat) => (
          <Card key={cat.label} style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#6B7280' }}>{cat.label}</p>
                  <p className="text-lg font-semibold" style={{ color: '#111827' }}>
                    {cat.count} <span className="text-xs font-normal" style={{ color: '#6B7280' }}>slots</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Availability Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {AVAILABILITY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.label} value={cat.label}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Availability Table */}
      <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base" style={{ color: '#111827' }}>Member Availability</CardTitle>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: '#E5E7EB' }}>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Member</TableHead>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Congregation</TableHead>
                  {DAYS.map((day) => (
                    <TableHead key={day} className="text-xs font-medium text-center" style={{ color: '#6B7280' }}>
                      {DAY_LABELS[day]}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-medium text-center" style={{ color: '#6B7280' }}>Sat</TableHead>
                  <TableHead className="text-xs font-medium text-center" style={{ color: '#6B7280' }}>Sun</TableHead>
                  <TableHead className="text-xs font-medium text-right" style={{ color: '#6B7280' }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
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
                    <TableCell className="text-xs" style={{ color: '#374151' }}>
                      {getCongregationName(member.congregationId)}
                    </TableCell>
                    {DAYS.map((day) => (
                      <TableCell key={day} className="text-center">
                        {member.availability ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${getAvailabilityColor(member.availability[day])}`}
                          >
                            {member.availability[day] === 'NA' ? '—' : member.availability[day].replace('Half Day ', '½ ')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-neutral-300">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <span className="text-xs font-medium" style={{ color: '#374151' }}>
                        {member.availability?.saturdayDays ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-medium" style={{ color: '#374151' }}>
                        {member.availability?.sundayDays ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openEditDialog(member)}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Availability Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: '#111827' }}>
              Edit Availability — {editingMember?.name}
            </DialogTitle>
            <DialogDescription>
              Set availability for each weekday and weekend days per month.
            </DialogDescription>
          </DialogHeader>
          {editAvailability && (
            <div className="space-y-4 mt-2">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium capitalize w-24" style={{ color: '#374151' }}>{day}</span>
                  <Select
                    value={editAvailability[day]}
                    onValueChange={(val) =>
                      setEditAvailability((prev) => prev ? { ...prev, [day]: val as WeekdayAvailability } : prev)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="border-t pt-4 space-y-3" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium w-24" style={{ color: '#374151' }}>Saturday</span>
                  <Select
                    value={String(editAvailability.saturdayDays)}
                    onValueChange={(val) =>
                      setEditAvailability((prev) => prev ? { ...prev, saturdayDays: parseInt(val, 10) } : prev)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} day{n !== 1 ? 's' : ''} / month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium w-24" style={{ color: '#374151' }}>Sunday</span>
                  <Select
                    value={String(editAvailability.sundayDays)}
                    onValueChange={(val) =>
                      setEditAvailability((prev) => prev ? { ...prev, sundayDays: parseInt(val, 10) } : prev)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} day{n !== 1 ? 's' : ''} / month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSaveAvailability}
                  className="text-white"
                  style={{ backgroundColor: '#4F6BED' }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
