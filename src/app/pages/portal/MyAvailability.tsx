import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAppContext } from '../../hooks/useAppContext';
import { toast } from 'sonner';
import type { WeekdayAvailability, MemberAvailability as MemberAvailabilityType } from '../../data/mockData';
import { Clock, Calendar, AlertCircle, Check, Pencil } from 'lucide-react';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

const AVAILABILITY_OPTIONS: WeekdayAvailability[] = [
  'Morning',
  'Half Day Morning',
  'Half Day Afternoon',
  'Afternoon',
  'Full Day',
  'Evening',
  'NA',
];

const AVAILABILITY_COLORS: Record<WeekdayAvailability, string> = {
  Morning: '#DBEAFE',
  'Half Day Morning': '#E0E7FF',
  'Half Day Afternoon': '#FEF3C7',
  Afternoon: '#FDE68A',
  'Full Day': '#D1FAE5',
  Evening: '#E9D5FF',
  NA: '#F3F4F6',
};

const AVAILABILITY_TEXT: Record<WeekdayAvailability, string> = {
  Morning: '#1E40AF',
  'Half Day Morning': '#3730A3',
  'Half Day Afternoon': '#92400E',
  Afternoon: '#78350F',
  'Full Day': '#065F46',
  Evening: '#6B21A8',
  NA: '#6B7280',
};

export default function MyAvailability() {
  const { currentUser, members, updateMember } = useAppContext();
  const [editOpen, setEditOpen] = useState(false);
  const [editAvailability, setEditAvailability] = useState<MemberAvailabilityType | null>(null);
  const [tempUnavailableUntil, setTempUnavailableUntil] = useState<string>('');

  const memberData = useMemo(() => {
    if (!currentUser) return null;
    return members.find((m) => m.id === currentUser.id) || members[0];
  }, [currentUser, members]);

  if (!currentUser || !memberData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900">My Availability</h1>
        <p className="text-neutral-600">No member profile found.</p>
      </div>
    );
  }

  const openEdit = () => {
    setEditAvailability({ ...memberData.availability });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editAvailability) return;
    try {
      await updateMember(memberData.id, { availability: editAvailability });
      toast.success('Availability updated');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update availability');
    }
  };

  const handleTempUnavailable = async () => {
    if (!tempUnavailableUntil) {
      toast.error('Please select a date');
      return;
    }
    try {
      const naAvailability: MemberAvailabilityType = {
        monday: 'NA',
        tuesday: 'NA',
        wednesday: 'NA',
        thursday: 'NA',
        friday: 'NA',
        saturdayDays: 0,
        sundayDays: 0,
      };
      await updateMember(memberData.id, { availability: naAvailability, status: 'Inactive' });
      toast.success(`Marked as temporarily unavailable until ${tempUnavailableUntil}`);
      setTempUnavailableUntil('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const availability = memberData.availability;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">My Availability</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage your weekly availability for scheduling.</p>
        </div>
        <Button onClick={openEdit} style={{ backgroundColor: '#4F6BED' }}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Availability
        </Button>
      </div>

      {/* Weekday Availability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekday Schedule</CardTitle>
          <CardDescription>Your availability for each weekday</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {WEEKDAYS.map((day) => {
              const val = availability[day] as WeekdayAvailability;
              return (
                <div
                  key={day}
                  className="rounded-lg p-4 text-center"
                  style={{ backgroundColor: AVAILABILITY_COLORS[val], border: '1px solid #E5E7EB' }}
                >
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    {WEEKDAY_LABELS[day]}
                  </p>
                  <p
                    className="text-sm font-semibold mt-2"
                    style={{ color: AVAILABILITY_TEXT[val] }}
                  >
                    {val === 'NA' ? 'Not Available' : val}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekend Availability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekend Availability</CardTitle>
          <CardDescription>Number of Saturdays and Sundays available per month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-lg p-5 text-center"
              style={{ backgroundColor: '#EEF0FD', border: '1px solid #D6DAFB' }}
            >
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Saturday</p>
              <p className="text-3xl font-semibold mt-2" style={{ color: '#4F6BED' }}>
                {availability.saturdayDays}
              </p>
              <p className="text-xs text-neutral-400 mt-1">days per month</p>
            </div>
            <div
              className="rounded-lg p-5 text-center"
              style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
            >
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Sunday</p>
              <p className="text-3xl font-semibold mt-2 text-green-600">
                {availability.sundayDays}
              </p>
              <p className="text-xs text-neutral-400 mt-1">days per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Temporary Unavailable */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Temporary Unavailable
          </CardTitle>
          <CardDescription>
            Mark yourself as temporarily unavailable. This sets all availability to N/A and your status to Inactive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label className="text-xs text-neutral-600">Unavailable until</Label>
              <Input
                type="date"
                value={tempUnavailableUntil}
                onChange={(e) => setTempUnavailableUntil(e.target.value)}
                className="h-9 text-[13px]"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
            <Button
              variant="outline"
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={handleTempUnavailable}
            >
              Mark Unavailable
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Availability</DialogTitle>
            <DialogDescription>
              Update your weekly availability for scheduling.
            </DialogDescription>
          </DialogHeader>
          {editAvailability && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {WEEKDAYS.map((day) => (
                <div key={day} className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-medium w-24">{WEEKDAY_LABELS[day]}</Label>
                  <Select
                    value={editAvailability[day]}
                    onValueChange={(v) =>
                      setEditAvailability({ ...editAvailability, [day]: v as WeekdayAvailability })
                    }
                  >
                    <SelectTrigger className="flex-1 h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt === 'NA' ? 'Not Available' : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="border-t pt-4" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-sm font-medium text-neutral-700 mb-3">Weekend Availability</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-sm w-24">Saturday</Label>
                    <Select
                      value={String(editAvailability.saturdayDays)}
                      onValueChange={(v) =>
                        setEditAvailability({ ...editAvailability, saturdayDays: parseInt(v, 10) })
                      }
                    >
                      <SelectTrigger className="flex-1 h-9 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? 'day' : 'days'} per month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-sm w-24">Sunday</Label>
                    <Select
                      value={String(editAvailability.sundayDays)}
                      onValueChange={(v) =>
                        setEditAvailability({ ...editAvailability, sundayDays: parseInt(v, 10) })
                      }
                    >
                      <SelectTrigger className="flex-1 h-9 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? 'day' : 'days'} per month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} style={{ backgroundColor: '#4F6BED' }}>
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
