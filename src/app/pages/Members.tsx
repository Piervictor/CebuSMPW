import { useState, useEffect } from 'react';
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
import { Search, Users, AlertCircle, Calendar, MapPin, Plus, Edit, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function Members() {
  const { members, congregations, circuits, locations, shifts, deleteMember, error, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Look up names from live Supabase data
  const getCircuitName = (id: string) => circuits.find((c) => c.id === id)?.name || 'Unknown';
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';
  const getLocationName = (id: string) => locations.find((l) => l.id === id)?.name || 'Unknown';
  const [selectedCongregation, setSelectedCongregation] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Keep selectedMember in sync when members array updates (e.g. after edit/create)
  useEffect(() => {
    if (selectedMember) {
      const fresh = members.find((m) => m.id === selectedMember.id);
      if (fresh && fresh !== selectedMember) {
        setSelectedMember(fresh);
      }
    }
  }, [members, selectedMember]);

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.surname} ${member.firstName} ${member.middleInitial || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCongregation = selectedCongregation === 'all' || member.congregationId === selectedCongregation;
    
    return matchesSearch && matchesCongregation;
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
                <TableHead>Surname</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Contact #</TableHead>
                <TableHead>Congregation</TableHead>
                <TableHead>Circuit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Appearance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const appearanceColor = member.appearance === 'Excellent'
                  ? 'border-green-300 text-green-700 bg-green-50'
                  : member.appearance === 'Good'
                  ? 'border-blue-300 text-blue-700 bg-blue-50'
                  : 'border-amber-300 text-amber-700 bg-amber-50';
                
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.surname}</TableCell>
                    <TableCell>
                      {member.firstName}{member.middleInitial ? ` ${member.middleInitial}.` : ''}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {member.phone || '—'}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {getCongregationName(member.congregationId)}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {member.circuitId ? getCircuitName(member.circuitId) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === 'Active' ? 'default' : 'secondary'}
                        className={member.status === 'Active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                      >
                        {member.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={appearanceColor}>
                        {member.appearance || '—'}
                      </Badge>
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
                      {selectedMember.surname[0]}{selectedMember.firstName[0]}
                    </span>
                  </div>
                  <div>
                    <div>{selectedMember.name}</div>
                    <div className="text-sm text-neutral-500 font-normal">
                      {getCongregationName(selectedMember.congregationId)} &middot; {selectedMember.circuitId ? getCircuitName(selectedMember.circuitId) : ''}
                    </div>
                  </div>
                </SheetTitle>
                <SheetDescription>Member details and availability</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMember.phone && (
                      <div>
                        <span className="text-neutral-600">Contact #:</span>{' '}
                        <span className="text-neutral-900">{selectedMember.phone}</span>
                      </div>
                    )}
                    {selectedMember.email && (
                      <div>
                        <span className="text-neutral-600">Email:</span>{' '}
                        <span className="text-neutral-900">{selectedMember.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Demographics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Demographics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMember.dateOfBirth && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Date of Birth:</span>
                        <span>{new Date(selectedMember.dateOfBirth).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedMember.age !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Age:</span>
                        <span>{selectedMember.age}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Status:</span>
                      <Badge variant={selectedMember.status === 'Active' ? 'default' : 'secondary'}
                        className={selectedMember.status === 'Active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                        {selectedMember.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Appearance:</span>
                      <Badge variant="outline" className={
                        selectedMember.appearance === 'Excellent' ? 'border-green-300 text-green-700' :
                        selectedMember.appearance === 'Good' ? 'border-blue-300 text-blue-700' :
                        'border-amber-300 text-amber-700'
                      }>{selectedMember.appearance}</Badge>
                    </div>
                    {selectedMember.language && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Language:</span>
                        <span>{selectedMember.language}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Availability */}
                {selectedMember.availability && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Weekly Availability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map((day) => (
                          <div key={day} className="flex justify-between items-center">
                            <span className="text-neutral-600 capitalize w-20">{day}</span>
                            <Badge variant="outline" className={
                              selectedMember.availability[day] === 'NA' ? 'text-neutral-400' : 'text-blue-700 border-blue-300'
                            }>
                              {selectedMember.availability[day]}
                            </Badge>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Saturday (days/month):</span>
                            <span className="font-medium">{selectedMember.availability.saturdayDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Sunday (days/month):</span>
                            <span className="font-medium">{selectedMember.availability.sundayDays}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update the member details below'
                : 'Fill in the details to add a new member'}
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            key={editingMember?.id || 'new'}
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
