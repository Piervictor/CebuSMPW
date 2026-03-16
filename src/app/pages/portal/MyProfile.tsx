import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
import {
  User,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Globe,
  Pencil,
  Check,
} from 'lucide-react';

export default function MyProfile() {
  const { currentUser, members, congregations, locations, getLocationById, updateMember } = useAppContext();
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<{
    email: string;
    phone: string;
    telegramHandle: string;
    languageGroup: string;
    preferredDays: string[];
    preferredTimes: string[];
    preferredLocations: string[];
  } | null>(null);

  const memberData = useMemo(() => {
    if (!currentUser) return null;
    return members.find((m) => m.id === currentUser.id) || members[0];
  }, [currentUser, members]);

  const getCongregationName = (id: string) =>
    congregations.find((c) => c.id === id)?.name || 'Unknown';

  if (!currentUser || !memberData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900">My Profile</h1>
        <p className="text-neutral-600">No member profile found.</p>
      </div>
    );
  }

  const openEdit = () => {
    setEditData({
      email: memberData.email || '',
      phone: memberData.phone || '',
      telegramHandle: memberData.telegramHandle || '',
      languageGroup: memberData.languageGroup || '',
      preferredDays: [...memberData.preferredDays],
      preferredTimes: [...memberData.preferredTimes],
      preferredLocations: [...memberData.preferredLocations],
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData) return;
    try {
      await updateMember(memberData.id, {
        email: editData.email || undefined,
        phone: editData.phone || undefined,
        telegramHandle: editData.telegramHandle || undefined,
        languageGroup: editData.languageGroup || undefined,
        preferredDays: editData.preferredDays,
        preferredTimes: editData.preferredTimes,
        preferredLocations: editData.preferredLocations,
      });
      toast.success('Profile updated');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const ALL_TIMES = ['Morning', 'Afternoon', 'Evening'];

  const toggleItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const activeLocations = locations.filter((l) => l.active);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">My Profile</h1>
          <p className="text-sm text-neutral-500 mt-1">Your personal information and preferences</p>
        </div>
        <Button onClick={openEdit} style={{ backgroundColor: '#4F6BED' }}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 mb-6">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#4F6BED' }}
            >
              <span className="text-xl font-semibold text-white">
                {memberData.firstName?.[0]}{memberData.surname?.[0]}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{memberData.name}</h2>
              <p className="text-sm text-neutral-500">{getCongregationName(memberData.congregationId)}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={memberData.status === 'Active' ? 'default' : 'secondary'}>
                  {memberData.status}
                </Badge>
                <Badge variant="outline">{memberData.experience}</Badge>
                <Badge variant="outline">{memberData.ageGroup}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow icon={Mail} label="Email" value={memberData.email || 'Not set'} />
            <InfoRow icon={Phone} label="Phone" value={memberData.phone || 'Not set'} />
            <InfoRow icon={MessageSquare} label="Telegram" value={memberData.telegramHandle || 'Not set'} />
            <InfoRow icon={Globe} label="Languages" value={memberData.languageGroup || 'Not set'} />
            {memberData.dateOfBirth && (
              <InfoRow icon={Calendar} label="Date of Birth" value={memberData.dateOfBirth} />
            )}
            {memberData.age && (
              <InfoRow icon={User} label="Age" value={String(memberData.age)} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scheduling Preferences</CardTitle>
          <CardDescription>Your preferred days, times, and locations for witnessing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Preferred Days</p>
            <div className="flex flex-wrap gap-2">
              {memberData.preferredDays.length > 0 ? (
                memberData.preferredDays.map((day) => (
                  <Badge key={day} variant="secondary">{day}</Badge>
                ))
              ) : (
                <span className="text-sm text-neutral-400">No preferences set</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Preferred Times</p>
            <div className="flex flex-wrap gap-2">
              {memberData.preferredTimes.length > 0 ? (
                memberData.preferredTimes.map((time) => (
                  <Badge key={time} variant="secondary">{time}</Badge>
                ))
              ) : (
                <span className="text-sm text-neutral-400">No preferences set</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Preferred Locations</p>
            <div className="flex flex-wrap gap-2">
              {memberData.preferredLocations.length > 0 ? (
                memberData.preferredLocations.map((locId) => {
                  const loc = getLocationById(locId);
                  return (
                    <Badge key={locId} variant="secondary">{loc?.name || locId}</Badge>
                  );
                })
              ) : (
                <span className="text-sm text-neutral-400">No preferences set</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scheduling Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F7F8FA', border: '1px solid #E5E7EB' }}>
              <p className="text-xs text-neutral-500">Weekly Reservations</p>
              <p className="text-lg font-semibold text-neutral-900 mt-1">{memberData.weeklyReservations}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F7F8FA', border: '1px solid #E5E7EB' }}>
              <p className="text-xs text-neutral-500">Weekly Limit</p>
              <p className="text-lg font-semibold text-neutral-900 mt-1">{memberData.weeklyLimit}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F7F8FA', border: '1px solid #E5E7EB' }}>
              <p className="text-xs text-neutral-500">Monthly Reservations</p>
              <p className="text-lg font-semibold text-neutral-900 mt-1">{memberData.monthlyReservations}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F7F8FA', border: '1px solid #E5E7EB' }}>
              <p className="text-xs text-neutral-500">Monthly Limit</p>
              <p className="text-lg font-semibold text-neutral-900 mt-1">{memberData.monthlyLimit}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your contact info and scheduling preferences.</DialogDescription>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="h-9 text-[13px]"
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="h-9 text-[13px]"
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telegram</Label>
                <Input
                  value={editData.telegramHandle}
                  onChange={(e) => setEditData({ ...editData, telegramHandle: e.target.value })}
                  className="h-9 text-[13px]"
                  placeholder="@handle"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Language Group</Label>
                <Input
                  value={editData.languageGroup}
                  onChange={(e) => setEditData({ ...editData, languageGroup: e.target.value })}
                  className="h-9 text-[13px]"
                  placeholder="e.g. English, Cebuano"
                />
              </div>

              <div className="border-t pt-4" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Preferred Days</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => (
                    <Badge
                      key={day}
                      variant={editData.preferredDays.includes(day) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setEditData({ ...editData, preferredDays: toggleItem(editData.preferredDays, day) })}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Preferred Times</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_TIMES.map((time) => (
                    <Badge
                      key={time}
                      variant={editData.preferredTimes.includes(time) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setEditData({ ...editData, preferredTimes: toggleItem(editData.preferredTimes, time) })}
                    >
                      {time}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Preferred Locations</p>
                <div className="flex flex-wrap gap-2">
                  {activeLocations.map((loc) => (
                    <Badge
                      key={loc.id}
                      variant={editData.preferredLocations.includes(loc.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        setEditData({
                          ...editData,
                          preferredLocations: toggleItem(editData.preferredLocations, loc.id),
                        })
                      }
                    >
                      {loc.name}
                    </Badge>
                  ))}
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

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F7F8FA' }}>
      <Icon className="h-4 w-4 text-neutral-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-medium text-neutral-900">{value}</p>
      </div>
    </div>
  );
}
