import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { MemberForm } from '../../components/forms/MemberForm';
import { useAppContext } from '../../hooks/useAppContext';
import type { Member } from '../../data/mockData';
import { Search, Users, AlertCircle, Calendar, MapPin, Plus, Edit, Trash2, Info, Power } from 'lucide-react';
import { toast } from 'sonner';

export default function MemberDirectory() {
  const { members, congregations, circuits, locations, shifts, deleteMember, updateMember, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const getCircuitName = (id: string) => circuits.find((c) => c.id === id)?.name || 'Unknown';
  const getCongregationName = (id: string) => congregations.find((c) => c.id === id)?.name || 'Unknown';
  const getLocationName = (id: string) => locations.find((l) => l.id === id)?.name || 'Unknown';
  const [selectedCongregation, setSelectedCongregation] = useState<string>('all');
  const [selectedCircuit, setSelectedCircuit] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Quick Actions: auto-open create dialog when navigated with ?new=member
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('new') === 'member') {
      setSearchParams({}, { replace: true });
      handleAddMember();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selectedMember in sync when members array updates
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
    const matchesCircuit = selectedCircuit === 'all' || member.circuitId === selectedCircuit;
    return matchesSearch && matchesCongregation && matchesCircuit;
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

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateMember(member.id, { status: newStatus });
      toast.success(`Member ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update member status';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#111827' }}>
            Member Directory
          </h1>
          <p className="text-[13px] leading-snug" style={{ color: '#6B7280' }}>
            Directory of publishers participating in public witnessing
          </p>
        </div>
        <Button
          onClick={handleAddMember}
          style={{ backgroundColor: '#4F6BED' }}
          className="hover:opacity-90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Total Members</p>
                <p className="text-2xl font-semibold mt-0.5" style={{ color: '#111827' }}>{members.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF1FD' }}>
                <Users className="h-5 w-5" style={{ color: '#4F6BED' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Active</p>
                <p className="text-2xl font-semibold mt-0.5" style={{ color: '#111827' }}>
                  {members.filter((m) => m.status === 'Active').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-50">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Experienced</p>
                <p className="text-2xl font-semibold mt-0.5" style={{ color: '#111827' }}>
                  {members.filter((m) => m.experience === 'Experienced').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50">
                <Badge variant="default" className="text-xs">Exp.</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Near Limit</p>
                <p className="text-2xl font-semibold mt-0.5" style={{ color: '#111827' }}>
                  {members.filter((m) => m.monthlyReservations >= m.monthlyLimit - 2).length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search by name..."
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
            <Select value={selectedCircuit} onValueChange={setSelectedCircuit}>
              <SelectTrigger>
                <SelectValue placeholder="Circuit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Circuits</SelectItem>
                {circuits.map((circuit) => (
                  <SelectItem key={circuit.id} value={circuit.id}>
                    {circuit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base" style={{ color: '#111827' }}>All Members</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: '#E5E7EB' }}>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Member Name</TableHead>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Congregation</TableHead>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Circuit</TableHead>
                  <TableHead className="text-xs font-medium" style={{ color: '#6B7280' }}>Status</TableHead>
                  <TableHead className="text-xs font-medium text-right" style={{ color: '#6B7280' }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer hover:bg-[#F7F8FA] transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                    onClick={() => openMemberDetails(member)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                          style={{ backgroundColor: '#4F6BED' }}
                        >
                          {member.surname[0]}{member.firstName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#111827' }}>
                            {member.surname}, {member.firstName}{member.middleInitial ? ` ${member.middleInitial}.` : ''}
                          </p>
                          {member.phone && (
                            <p className="text-xs" style={{ color: '#6B7280' }}>{member.phone}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: '#374151' }}>
                      {getCongregationName(member.congregationId)}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: '#374151' }}>
                      {member.circuitId ? getCircuitName(member.circuitId) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          member.status === 'Active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100 text-xs'
                            : 'text-xs'
                        }
                      >
                        {member.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openMemberDetails(member)}
                          title="View details"
                        >
                          <Info className="h-4 w-4" style={{ color: '#6B7280' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditMember(member)}
                          title="Edit member"
                        >
                          <Edit className="h-4 w-4" style={{ color: '#6B7280' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggleStatus(member)}
                          title={member.status === 'Active' ? 'Deactivate member' : 'Activate member'}
                        >
                          <Power className={`h-4 w-4 ${member.status === 'Active' ? 'text-green-600' : 'text-neutral-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(member)}
                          title="Delete member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Member Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedMember && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#EEF1FD' }}
                  >
                    <span className="text-base font-medium" style={{ color: '#4F6BED' }}>
                      {selectedMember.surname[0]}{selectedMember.firstName[0]}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: '#111827' }}>{selectedMember.name}</div>
                    <div className="text-sm font-normal" style={{ color: '#6B7280' }}>
                      {getCongregationName(selectedMember.congregationId)} &middot; {selectedMember.circuitId ? getCircuitName(selectedMember.circuitId) : ''}
                    </div>
                  </div>
                </SheetTitle>
                <SheetDescription>Member details and availability</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Contact Info */}
                <Card style={{ borderColor: '#E5E7EB' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm" style={{ color: '#111827' }}>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMember.phone && (
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Contact #:</span>
                        <span style={{ color: '#111827' }}>{selectedMember.phone}</span>
                      </div>
                    )}
                    {selectedMember.email && (
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Email:</span>
                        <span style={{ color: '#111827' }}>{selectedMember.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Demographics */}
                <Card style={{ borderColor: '#E5E7EB' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm" style={{ color: '#111827' }}>Demographics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMember.dateOfBirth && (
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Date of Birth:</span>
                        <span>{new Date(selectedMember.dateOfBirth).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedMember.age !== undefined && (
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Age:</span>
                        <span>{selectedMember.age}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280' }}>Status:</span>
                      <Badge
                        variant={selectedMember.status === 'Active' ? 'default' : 'secondary'}
                        className={selectedMember.status === 'Active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                      >
                        {selectedMember.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280' }}>Appearance:</span>
                      <Badge variant="outline" className={
                        selectedMember.appearance === 'Excellent' ? 'border-green-300 text-green-700' :
                        selectedMember.appearance === 'Good' ? 'border-blue-300 text-blue-700' :
                        'border-amber-300 text-amber-700'
                      }>{selectedMember.appearance}</Badge>
                    </div>
                    {selectedMember.language && (
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Language:</span>
                        <span>{selectedMember.language}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Availability */}
                {selectedMember.availability && (
                  <Card style={{ borderColor: '#E5E7EB' }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm" style={{ color: '#111827' }}>Weekly Availability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map((day) => (
                          <div key={day} className="flex justify-between items-center">
                            <span className="capitalize w-20" style={{ color: '#6B7280' }}>{day}</span>
                            <Badge variant="outline" className={
                              selectedMember.availability[day] === 'NA' ? 'text-neutral-400' : 'text-blue-700 border-blue-300'
                            }>
                              {selectedMember.availability[day]}
                            </Badge>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 space-y-1" style={{ borderColor: '#E5E7EB' }}>
                          <div className="flex justify-between">
                            <span style={{ color: '#6B7280' }}>Saturday (days/month):</span>
                            <span className="font-medium">{selectedMember.availability.saturdayDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: '#6B7280' }}>Sunday (days/month):</span>
                            <span className="font-medium">{selectedMember.availability.sundayDays}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Shifts */}
                <Card style={{ borderColor: '#E5E7EB' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm" style={{ color: '#111827' }}>Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="upcoming">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                      </TabsList>
                      <TabsContent value="upcoming" className="space-y-3 mt-4">
                        {getUpcomingShifts(selectedMember.id).length === 0 ? (
                          <p className="text-sm text-center py-4" style={{ color: '#6B7280' }}>
                            No upcoming shifts scheduled
                          </p>
                        ) : (
                          getUpcomingShifts(selectedMember.id).map((shift) => (
                            <div
                              key={shift.id}
                              className="flex items-start gap-3 p-3 rounded-lg"
                              style={{ border: '1px solid #E5E7EB' }}
                            >
                              <MapPin className="h-4 w-4 mt-0.5" style={{ color: '#6B7280' }} />
                              <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#111827' }}>
                                  {getLocationName(shift.locationId)}
                                </p>
                                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                  {new Date(shift.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs" style={{ color: '#6B7280' }}>
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
                          <p className="text-sm text-center py-4" style={{ color: '#6B7280' }}>
                            No past shifts recorded
                          </p>
                        ) : (
                          getPastShifts(selectedMember.id).map((shift) => (
                            <div
                              key={shift.id}
                              className="flex items-start gap-3 p-3 rounded-lg opacity-75"
                              style={{ border: '1px solid #E5E7EB' }}
                            >
                              <MapPin className="h-4 w-4 mt-0.5" style={{ color: '#6B7280' }} />
                              <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#111827' }}>
                                  {getLocationName(shift.locationId)}
                                </p>
                                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                  {new Date(shift.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs" style={{ color: '#6B7280' }}>
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
                  <Button
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#4F6BED' }}
                    onClick={() => handleEditMember(selectedMember)}
                  >
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
