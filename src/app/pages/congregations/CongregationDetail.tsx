import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { CongregationForm } from '../../components/forms/CongregationForm';
import { useAppContext } from '../../hooks/useAppContext';
import {
  ArrowLeft,
  ChevronRight,
  Network,
  Users,
  MapPin,
  Edit,
  Trash2,
  Info,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';

// Design tokens
const C = {
  accent: '#7C3AED',
  accentLight: '#F3E8FF',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  headerBg: '#F9FAFB',
  success: '#10B981',
  successBg: '#ECFDF5',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  blue: '#4F6BED',
  blueBg: '#EEF1FD',
  shadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
};

type SidebarSection = 'general' | 'members' | 'locations';

const sidebarItems: { key: SidebarSection; label: string; icon: React.ElementType }[] = [
  { key: 'general', label: 'General', icon: Info },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'locations', label: 'Linked Locations', icon: MapPin },
];

export default function CongregationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    circuits,
    congregations,
    locations,
    members,
    deleteCongregation,
  } = useAppContext();

  const [activeSection, setActiveSection] = useState<SidebarSection>('general');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const congregation = congregations.find((c) => c.id === id) || null;
  const circuit = congregation
    ? circuits.find((c) => c.id === congregation.circuitId) || null
    : null;

  // Members belonging to this congregation
  const congMembers = useMemo(() => {
    if (!congregation) return [];
    return members.filter((m) => m.congregationId === congregation.id);
  }, [congregation, members]);

  // Locations where this congregation is linked
  const linkedLocations = useMemo(() => {
    if (!congregation) return [];
    return locations.filter((l) => l.linkedCongregations.includes(congregation.id));
  }, [congregation, locations]);

  const handleDelete = async () => {
    if (!congregation) return;
    setIsDeleting(true);
    try {
      await deleteCongregation(congregation.id);
      toast.success(`Congregation "${congregation.name}" deleted successfully`);
      navigate('/congregations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete congregation');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (!congregation) {
    return (
      <div className="py-16 text-center">
        <Network className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
        <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
          Congregation not found.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-1"
          onClick={() => navigate('/congregations')}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Congregations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs" style={{ color: C.textSecondary }}>
        <button
          onClick={() => navigate('/congregations')}
          className="flex items-center gap-1 hover:underline font-medium transition-colors"
          style={{ color: C.accent }}
        >
          <ArrowLeft className="h-3 w-3" /> Congregations
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium" style={{ color: C.text }}>
          {congregation.name}
        </span>
      </div>

      {/* Header card */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: C.accentLight }}
            >
              <Network className="h-5 w-5" style={{ color: C.accent }} />
            </div>
            <div className="min-w-0">
              <h2
                className="text-lg font-semibold tracking-tight truncate"
                style={{ color: C.text }}
              >
                {congregation.name}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                {circuit?.name || 'Unknown Circuit'}
                {congregation.city && ` · ${congregation.city}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Members', value: congMembers.length, icon: Users, color: C.accent, bg: C.accentLight },
            { label: 'Linked Locations', value: linkedLocations.length, icon: MapPin, color: C.blue, bg: C.blueBg },
            { label: 'Publisher Count', value: congregation.publisherCount ?? 0, icon: Hash, color: C.success, bg: C.successBg },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.borderLight}` }}
            >
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight" style={{ color: C.text }}>
                  {stat.value}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.textSecondary }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout: sidebar + content */}
      <div className="flex gap-4">
        {/* Sidebar */}
        <div
          className="hidden md:flex flex-col w-48 flex-shrink-0 rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#1F2A44',
            boxShadow: C.shadow,
          }}
        >
          {sidebarItems.map((item) => {
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors text-left ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                style={isActive ? { backgroundColor: C.accent } : undefined}
              >
                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Mobile section tabs */}
        <div className="md:hidden flex gap-1 mb-2 overflow-x-auto w-full">
          {sidebarItems.map((item) => {
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: C.accent } : undefined}
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}
          >
            {/* General section */}
            {activeSection === 'general' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                  General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium" style={{ color: C.textMuted }}>
                      Congregation Name
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: C.text }}>
                      {congregation.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: C.textMuted }}>
                      Circuit
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: C.text }}>
                      {circuit?.name || 'Unknown'}
                    </p>
                  </div>
                  {congregation.city && (
                    <div>
                      <p className="text-xs font-medium" style={{ color: C.textMuted }}>
                        City
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: C.text }}>
                        {congregation.city}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium" style={{ color: C.textMuted }}>
                      Overseers
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: C.text }}>
                      {congregation.overseers.length > 0
                        ? congregation.overseers.join(', ')
                        : 'No overseers assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: C.textMuted }}>
                      Coverage Rate
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: C.text }}>
                      {congregation.coverageRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: C.textMuted }}>
                      Shifts Served
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: C.text }}>
                      {congregation.shiftsServed}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Members section */}
            {activeSection === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                    Members ({congMembers.length})
                  </h3>
                </div>

                {congMembers.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed p-6 text-center"
                    style={{ borderColor: C.border }}
                  >
                    <Users className="h-8 w-8 mx-auto mb-2" style={{ color: C.textMuted }} />
                    <p className="text-sm" style={{ color: C.textSecondary }}>
                      No members belong to this congregation yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {congMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-gray-50"
                        style={{ border: `1px solid ${C.borderLight}` }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                            {member.name}
                          </p>
                          <p className="text-xs" style={{ color: C.textSecondary }}>
                            {member.status} · {member.experience}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: member.status === 'Active' ? C.successBg : C.dangerBg,
                            color: member.status === 'Active' ? C.success : C.danger,
                          }}
                        >
                          {member.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Linked Locations section */}
            {activeSection === 'locations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                    Linked Locations ({linkedLocations.length})
                  </h3>
                </div>

                {linkedLocations.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed p-6 text-center"
                    style={{ borderColor: C.border }}
                  >
                    <MapPin className="h-8 w-8 mx-auto mb-2" style={{ color: C.textMuted }} />
                    <p className="text-sm" style={{ color: C.textSecondary }}>
                      This congregation is not linked to any locations yet.
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                      Link locations from the Locations module.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {linkedLocations.map((loc) => {
                      const locCircuit = circuits.find((c) => c.id === loc.circuitId);
                      return (
                        <div
                          key={loc.id}
                          className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-gray-50"
                          style={{ border: `1px solid ${C.borderLight}` }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: C.blueBg }}
                            >
                              <MapPin className="h-3.5 w-3.5" style={{ color: C.blue }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                                {loc.name}
                              </p>
                              <p className="text-xs" style={{ color: C.textSecondary }}>
                                {loc.city}
                                {locCircuit && ` · ${locCircuit.name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: C.headerBg,
                                color: C.textSecondary,
                              }}
                            >
                              {loc.category}
                            </span>
                            {loc.active ? (
                              <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: C.successBg, color: C.success }}
                              >
                                Active
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: C.dangerBg, color: C.danger }}
                              >
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Congregation</DialogTitle>
            <DialogDescription>
              Update the details for {congregation.name}.
            </DialogDescription>
          </DialogHeader>
          <CongregationForm
            congregation={congregation}
            circuitId={congregation.circuitId}
            onSuccess={() => setEditDialogOpen(false)}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this congregation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{congregation.name}</strong>.
              Congregations with active members or linked locations cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Congregation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
