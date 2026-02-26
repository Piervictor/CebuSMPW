import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { MemberForm } from '../components/forms/MemberForm';
import { useAppContext } from '../hooks/useAppContext';
import type { Member } from '../data/mockData';
import { getCongregationName, getLocationName } from '../data/mockData';
import { Search, Users, AlertCircle, Calendar, MapPin, Plus, Edit, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function Members() {
  const { members, congregations, shifts, deleteMember, error, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCongregation, setSelectedCongregation] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedExperience, setSelectedExperience] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCongregation = selectedCongregation === 'all' || member.congregationId === selectedCongregation;
    const matchesAgeGroup = selectedAgeGroup === 'all' || member.ageGroup === selectedAgeGroup;
    const matchesExperience = selectedExperience === 'all' || member.experience === selectedExperience;
    
    return matchesSearch && matchesCongregation && matchesAgeGroup && matchesExperience;
  });

  const openMemberDetails = (member: Member) => {
    setSelectedMember(member);
    setSheetOpen(true);
  };

  const getMemberShifts = (memberId: string) => {
    return shifts.filter((s) => s.assignedMembers.includes(memberId));
  };

  const getUpcomingShifts = (memberId: string) => {
    const today = new Date();
    return getMemberShifts(memberId)
      .filter((s) => new Date(s.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  };

  const getPastShifts = (memberId: string) => {
    const today = new Date();
    return getMemberShifts(memberId)
      .filter((s) => new Date(s.date) < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setFormDialogOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setFormDialogOpen(true);
    setSheetOpen(false);
  };

  const handleDeleteClick = (member: Member) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (memberToDelete) {
      try {
        await deleteMember(memberToDelete.id);
        toast.success('Member deleted successfully');
        setDeleteConfirmOpen(false);
        setMemberToDelete(null);
        setSheetOpen(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete member';
        toast.error(errorMsg);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">Members</h1>
          <p className="text-neutral-600 mt-1">Directory of publishers participating in public witnessing</p>
        </div>
        <Button onClick={handleAddMember}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Members</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">{members.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active This Month</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {members.filter((m) => m.monthlyReservations > 0).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Experienced</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {members.filter((m) => m.experience === 'Experienced').length}
                </p>
              </div>
              <Badge variant="default">Exp.</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Near Limit</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {members.filter((m) => m.monthlyReservations >= m.monthlyLimit - 2).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
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
            <div>
              <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Age Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Age Groups</SelectItem>
                  <SelectItem value="Youth">Youth</SelectItem>
                  <SelectItem value="Adult">Adult</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experience Levels</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Congregation</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>This Week</TableHead>
                <TableHead>This Month</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const nearWeeklyLimit = member.weeklyReservations >= member.weeklyLimit - 1;
                const nearMonthlyLimit = member.monthlyReservations >= member.monthlyLimit - 2;
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-neutral-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-neutral-700">
                            {member.name.split(' ').map((n) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          {member.languageGroup && (
                            <p className="text-xs text-neutral-500">{member.languageGroup}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {getCongregationName(member.congregationId)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          member.ageGroup === 'Youth'
                            ? 'border-blue-300 text-blue-700'
                            : member.ageGroup === 'Senior'
                            ? 'border-purple-300 text-purple-700'
                            : 'border-green-300 text-green-700'
                        }
                      >
                        {member.ageGroup}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.experience === 'Experienced' ? 'default' : 'secondary'}
                      >
                        {member.experience}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={nearWeeklyLimit ? 'text-amber-600 font-medium' : ''}>
                          {member.weeklyReservations}/{member.weeklyLimit}
                        </span>
                        {nearWeeklyLimit && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={nearMonthlyLimit ? 'text-amber-600 font-medium' : ''}>
                          {member.monthlyReservations}/{member.monthlyLimit}
                        </span>
                        {nearMonthlyLimit && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMemberDetails(member)}
                        title="View details"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                        title="Edit member"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(member)}
                        title="Delete member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedMember && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-neutral-100 rounded-full flex items-center justify-center">
                    <span className="text-base font-medium text-neutral-700">
                      {selectedMember.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div>{selectedMember.name}</div>
                    <div className="text-sm text-neutral-500 font-normal">
                      {getCongregationName(selectedMember.congregationId)}
                    </div>
                  </div>
                </SheetTitle>
                <SheetDescription>Member details and schedule history</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMember.email && (
                      <div>
                        <span className="text-neutral-600">Email:</span>{' '}
                        <span className="text-neutral-900">{selectedMember.email}</span>
                      </div>
                    )}
                    {selectedMember.phone && (
                      <div>
                        <span className="text-neutral-600">Phone:</span>{' '}
                        <span className="text-neutral-900">{selectedMember.phone}</span>
                      </div>
                    )}
                    {selectedMember.telegramHandle && (
                      <div>
                        <span className="text-neutral-600">Telegram:</span>{' '}
                        <span className="text-neutral-900">{selectedMember.telegramHandle}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Attributes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attributes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{selectedMember.ageGroup}</Badge>
                      <Badge variant={selectedMember.experience === 'Experienced' ? 'default' : 'secondary'}>
                        {selectedMember.experience}
                      </Badge>
                      {selectedMember.languageGroup && (
                        <Badge variant="outline">{selectedMember.languageGroup}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Limits & Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity & Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Weekly reservations:</span>
                      <span className="font-medium">
                        {selectedMember.weeklyReservations} / {selectedMember.weeklyLimit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Monthly reservations:</span>
                      <span className="font-medium">
                        {selectedMember.monthlyReservations} / {selectedMember.monthlyLimit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Available slots (month):</span>
                      <span className="font-medium text-green-600">
                        {selectedMember.monthlyLimit - selectedMember.monthlyReservations}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">Preferred Days</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMember.preferredDays.map((day) => (
                          <Badge key={day} variant="secondary">{day}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">Preferred Times</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMember.preferredTimes.map((time) => (
                          <Badge key={time} variant="secondary">{time}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">Preferred Locations</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMember.preferredLocations.map((locId) => (
                          <Badge key={locId} variant="secondary">{getLocationName(locId)}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shifts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="upcoming">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                      </TabsList>
                      <TabsContent value="upcoming" className="space-y-3 mt-4">
                        {getUpcomingShifts(selectedMember.id).length === 0 ? (
                          <p className="text-sm text-neutral-500 text-center py-4">
                            No upcoming shifts scheduled
                          </p>
                        ) : (
                          getUpcomingShifts(selectedMember.id).map((shift) => (
                            <div
                              key={shift.id}
                              className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg"
                            >
                              <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-neutral-900">
                                  {getLocationName(shift.locationId)}
                                </p>
                                <p className="text-xs text-neutral-600 mt-1">
                                  {new Date(shift.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-neutral-600">
                                  {shift.startTime} - {shift.endTime}
                                </p>
                              </div>
                              <Badge variant={shift.assignedBy === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {shift.assignedBy === 'admin' ? 'Admin' : 'Self'}
                              </Badge>
                            </div>
                          ))
                        )}
                      </TabsContent>
                      <TabsContent value="past" className="space-y-3 mt-4">
                        {getPastShifts(selectedMember.id).length === 0 ? (
                          <p className="text-sm text-neutral-500 text-center py-4">
                            No past shifts recorded
                          </p>
                        ) : (
                          getPastShifts(selectedMember.id).map((shift) => (
                            <div
                              key={shift.id}
                              className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg opacity-75"
                            >
                              <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-neutral-900">
                                  {getLocationName(shift.locationId)}
                                </p>
                                <p className="text-xs text-neutral-600 mt-1">
                                  {new Date(shift.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-neutral-600">
                                  {shift.startTime} - {shift.endTime}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => handleEditMember(selectedMember)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Member
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteClick(selectedMember)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Member Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update the member details below'
                : 'Fill in the details to add a new member'}
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            member={editingMember || undefined}
            onSuccess={() => setFormDialogOpen(false)}
            onCancel={() => setFormDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{memberToDelete?.name}</strong>?
              This action cannot be undone. All associated shift assignments will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
