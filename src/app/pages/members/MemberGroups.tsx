import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import { useAppContext } from '../../hooks/useAppContext';
import { FolderOpen, Plus, Trash2, Edit, Users, Search, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface MemberGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  memberIds: string[];
}

const DEFAULT_GROUPS: MemberGroup[] = [
  {
    id: 'regular',
    name: 'Regular Volunteers',
    description: 'Active members who volunteer on a regular basis',
    color: '#4F6BED',
    memberIds: [],
  },
  {
    id: 'backup',
    name: 'Backup Volunteers',
    description: 'Members available as backup when regular volunteers are unavailable',
    color: '#F59E0B',
    memberIds: [],
  },
];

// Local storage key for persisting groups
const STORAGE_KEY = 'cebusmpw_member_groups';

function loadGroups(): MemberGroup[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_GROUPS;
}

function saveGroups(groups: MemberGroup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export default function MemberGroups() {
  const { members } = useAppContext();
  const [groups, setGroups] = useState<MemberGroup[]>(loadGroups);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MemberGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<MemberGroup | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#4F6BED');

  const PRESET_COLORS = ['#4F6BED', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];

  const updateGroups = (newGroups: MemberGroup[]) => {
    setGroups(newGroups);
    saveGroups(newGroups);
  };

  const getMemberById = (id: string) => members.find((m) => m.id === id);

  const handleCreateGroup = () => {
    if (!formName.trim()) {
      toast.error('Group name is required');
      return;
    }
    const newGroup: MemberGroup = {
      id: `group_${Date.now()}`,
      name: formName.trim(),
      description: formDescription.trim(),
      color: formColor,
      memberIds: [],
    };
    updateGroups([...groups, newGroup]);
    toast.success(`Group "${newGroup.name}" created`);
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEditGroup = () => {
    if (!selectedGroup || !formName.trim()) {
      toast.error('Group name is required');
      return;
    }
    const updated = groups.map((g) =>
      g.id === selectedGroup.id
        ? { ...g, name: formName.trim(), description: formDescription.trim(), color: formColor }
        : g
    );
    updateGroups(updated);
    toast.success(`Group "${formName.trim()}" updated`);
    setEditDialogOpen(false);
    resetForm();
  };

  const handleDeleteGroup = () => {
    if (!groupToDelete) return;
    updateGroups(groups.filter((g) => g.id !== groupToDelete.id));
    toast.success(`Group "${groupToDelete.name}" deleted`);
    setDeleteConfirmOpen(false);
    setGroupToDelete(null);
  };

  const openEditDialog = (group: MemberGroup) => {
    setSelectedGroup(group);
    setFormName(group.name);
    setFormDescription(group.description);
    setFormColor(group.color);
    setEditDialogOpen(true);
  };

  const openAddMemberDialog = (group: MemberGroup) => {
    setSelectedGroup(group);
    setMemberSearchTerm('');
    setAddMemberDialogOpen(true);
  };

  const addMemberToGroup = (memberId: string) => {
    if (!selectedGroup) return;
    if (selectedGroup.memberIds.includes(memberId)) {
      toast.error('Member is already in this group');
      return;
    }
    const updated = groups.map((g) =>
      g.id === selectedGroup.id
        ? { ...g, memberIds: [...g.memberIds, memberId] }
        : g
    );
    updateGroups(updated);
    setSelectedGroup({ ...selectedGroup, memberIds: [...selectedGroup.memberIds, memberId] });
    toast.success('Member added to group');
  };

  const removeMemberFromGroup = (groupId: string, memberId: string) => {
    const updated = groups.map((g) =>
      g.id === groupId
        ? { ...g, memberIds: g.memberIds.filter((id) => id !== memberId) }
        : g
    );
    updateGroups(updated);
    if (selectedGroup?.id === groupId) {
      setSelectedGroup({ ...selectedGroup, memberIds: selectedGroup.memberIds.filter((id) => id !== memberId) });
    }
    toast.success('Member removed from group');
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor('#4F6BED');
    setSelectedGroup(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const availableMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return members.filter((m) => {
      if (selectedGroup.memberIds.includes(m.id)) return false;
      const fullName = `${m.surname} ${m.firstName}`.toLowerCase();
      return fullName.includes(memberSearchTerm.toLowerCase()) || m.name.toLowerCase().includes(memberSearchTerm.toLowerCase());
    });
  }, [members, selectedGroup, memberSearchTerm]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#111827' }}>
            Member Groups
          </h1>
          <p className="text-[13px] leading-snug" style={{ color: '#6B7280' }}>
            Organize members into groups for efficient scheduling
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="text-white"
          style={{ backgroundColor: '#4F6BED' }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF1FD' }}>
                <FolderOpen className="h-5 w-5" style={{ color: '#4F6BED' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Total Groups</p>
                <p className="text-xl font-semibold" style={{ color: '#111827' }}>{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-50">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Grouped Members</p>
                <p className="text-xl font-semibold" style={{ color: '#111827' }}>
                  {new Set(groups.flatMap((g) => g.memberIds)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-50">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Ungrouped</p>
                <p className="text-xl font-semibold" style={{ color: '#111827' }}>
                  {members.length - new Set(groups.flatMap((g) => g.memberIds)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups list */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-10 w-10 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
              <p className="text-sm font-medium" style={{ color: '#6B7280' }}>No groups created yet</p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Create a group to organize members</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <div>
                      <CardTitle className="text-base" style={{ color: '#111827' }}>{group.name}</CardTitle>
                      {group.description && (
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs" style={{ borderColor: '#E5E7EB', color: '#374151' }}>
                      {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openAddMemberDialog(group)}
                      title="Add member"
                    >
                      <UserPlus className="h-4 w-4" style={{ color: '#6B7280' }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditDialog(group)}
                      title="Edit group"
                    >
                      <Edit className="h-4 w-4" style={{ color: '#6B7280' }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => { setGroupToDelete(group); setDeleteConfirmOpen(true); }}
                      title="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {group.memberIds.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {group.memberIds.map((memberId) => {
                      const member = getMemberById(memberId);
                      if (!member) return null;
                      return (
                        <div
                          key={memberId}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm"
                          style={{ backgroundColor: '#F7F8FA', border: '1px solid #E5E7EB' }}
                        >
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-medium text-white shrink-0"
                            style={{ backgroundColor: group.color }}
                          >
                            {member.surname[0]}{member.firstName[0]}
                          </div>
                          <span className="text-xs font-medium" style={{ color: '#374151' }}>
                            {member.surname}, {member.firstName}
                          </span>
                          <button
                            onClick={() => removeMemberFromGroup(group.id, memberId)}
                            className="ml-1 rounded-full p-0.5 hover:bg-red-100 transition-colors"
                            title="Remove from group"
                          >
                            <X className="h-3 w-3 text-neutral-400 hover:text-red-600" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: '#111827' }}>Create New Group</DialogTitle>
            <DialogDescription>Add a new group to organize members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Group Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Regular Volunteers"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Description</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of this group"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Color</label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormColor(color)}
                    className={`h-7 w-7 rounded-full transition-all ${formColor === color ? 'ring-2 ring-offset-2 ring-[#4F6BED]' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreateGroup}
                className="text-white"
                style={{ backgroundColor: '#4F6BED' }}
              >
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: '#111827' }}>Edit Group</DialogTitle>
            <DialogDescription>Update group details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Group Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Group name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Description</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Color</label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormColor(color)}
                    className={`h-7 w-7 rounded-full transition-all ${formColor === color ? 'ring-2 ring-offset-2 ring-[#4F6BED]' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleEditGroup}
                className="text-white"
                style={{ backgroundColor: '#4F6BED' }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member to Group Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: '#111827' }}>
              Add Members — {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription>Search and add members to this group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search members..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
              {availableMembers.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>
                  No members available
                </p>
              ) : (
                availableMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => addMemberToGroup(member.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F7F8FA] transition-colors"
                    style={{ borderBottom: '1px solid #F3F4F6' }}
                  >
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                      style={{ backgroundColor: '#4F6BED' }}
                    >
                      {member.surname[0]}{member.firstName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                        {member.surname}, {member.firstName}
                      </p>
                    </div>
                    <UserPlus className="h-4 w-4 shrink-0" style={{ color: '#4F6BED' }} />
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{groupToDelete?.name}</strong>?
              Members will not be deleted, only removed from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
