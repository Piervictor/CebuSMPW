import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { LocationForm } from '../../components/forms/LocationForm';
import { TimeslotForm } from '../../components/forms/TimeslotForm';
import { useAppContext } from '../../hooks/useAppContext';
import type { Timeslot, Congregation, Member } from '../../data/mockData';
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  Hash,
  Network,
  Plus,
  Edit,
  Trash2,
  Settings,
  UserPlus,
  X,
  Search,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

/** Convert 24h "HH:MM" to 12h "H:MM AM/PM" */
function formatTime12h(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

// Design tokens
const C = {
  accent: '#4F6BED',
  accentHover: '#3B54D4',
  accentLight: '#EEF1FD',
  purple: '#7C3AED',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#111827',
  sidebarBg: '#1F2A44',
  sidebarActiveBg: '#4F6BED',
  sidebarActiveText: '#FFFFFF',
  sidebarInactiveText: '#94A3B8',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  headerBg: '#F9FAFB',
  success: '#10B981',
  successBg: '#ECFDF5',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  warn: '#F59E0B',
  warnBg: '#FFFBEB',
  shadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
};

type SidebarSection = 'general' | 'congregations' | 'members' | 'timeslots' | 'settings';

type FormMode =
  | { type: 'location' }
  | { type: 'timeslot'; timeslot?: Timeslot };

const sidebarItems: { key: SidebarSection; label: string; icon: React.ElementType }[] = [
  { key: 'general', label: 'General', icon: Info },
  { key: 'congregations', label: 'Linked Congregations', icon: Users },
  { key: 'members', label: 'Preferred Members', icon: UserPlus },
  { key: 'timeslots', label: 'Timeslots', icon: Clock },
  { key: 'settings', label: 'Location Settings', icon: Settings },
];

export default function LocationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    circuits,
    congregations,
    locations,
    members,
    timeslots,
    updateLocation,
    deleteLocation,
    updateMember,
    deleteTimeslot,
    isLoading,
  } = useAppContext();

  const [activeSection, setActiveSection] = useState<SidebarSection>('general');
  const [formDialog, setFormDialog] = useState<FormMode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'location' | 'timeslot';
    id: string;
    name: string;
  } | null>(null);
  const [congSearch, setCongSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedCircuitIds, setSelectedCircuitIds] = useState<Set<string>>(new Set());

  const location = locations.find((l) => l.id === id) || null;
  const locationCircuit = location
    ? circuits.find((c) => c.id === location.circuitId) || null
    : null;
  const locationTimeslots = location
    ? timeslots.filter((t) => t.locationId === location.id)
    : [];
  const locationCongregations = location
    ? (location.linkedCongregations
        .map((cId) => congregations.find((c) => c.id === cId))
        .filter(Boolean) as Congregation[])
    : [];

  // Other circuits available for selection (excludes the location's own circuit)
  const otherCircuits = useMemo(() => {
    if (!location) return [];
    return circuits.filter((c) => c.id !== location.circuitId);
  }, [location, circuits]);

  // All congregations that aren't already linked
  // Shows own circuit always + selected other circuits when multi-circuit is ON
  const availableCongregations = useMemo(() => {
    if (!location) return [];
    const linked = new Set(location.linkedCongregations);
    return congregations
      .filter((c) => {
        if (linked.has(c.id)) return false;
        if (c.circuitId === location.circuitId) return true;
        if (location.multiCircuitSharing && selectedCircuitIds.has(c.circuitId)) return true;
        return false;
      })
      .filter((c) =>
        !congSearch.trim() || c.name.toLowerCase().includes(congSearch.toLowerCase()),
      );
  }, [location, congregations, congSearch, selectedCircuitIds]);

  // Members who have this location in preferredLocations
  const preferredMembers = useMemo(() => {
    if (!location) return [];
    return members.filter((m) => m.preferredLocations.includes(location.id));
  }, [location, members]);

  // Members eligible to be added as preferred (from linked congregations, not already preferred)
  const availableMembers = useMemo(() => {
    if (!location) return [];
    const prefIds = new Set(preferredMembers.map((m) => m.id));
    const linkedCongIds = new Set(location.linkedCongregations);
    return members
      .filter((m) => linkedCongIds.has(m.congregationId) && !prefIds.has(m.id))
      .filter((m) =>
        !memberSearch.trim() || m.name.toLowerCase().includes(memberSearch.toLowerCase()),
      );
  }, [location, members, preferredMembers, memberSearch]);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'location') {
        await deleteLocation(deleteConfirm.id);
        toast.success('Location deleted');
        navigate('/locations');
      } else {
        await deleteTimeslot(deleteConfirm.id);
        toast.success('Timeslot deleted');
      }
      setDeleteConfirm(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(errorMsg);
    }
  };

  const handleLinkCongregation = async (congId: string) => {
    if (!location) return;
    try {
      await updateLocation(location.id, {
        linkedCongregations: [...location.linkedCongregations, congId],
      });
      toast.success('Congregation linked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to link congregation');
    }
  };

  const handleUnlinkCongregation = async (congId: string) => {
    if (!location) return;
    try {
      await updateLocation(location.id, {
        linkedCongregations: location.linkedCongregations.filter((id) => id !== congId),
      });
      toast.success('Congregation unlinked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unlink congregation');
    }
  };

  const handleAddPreferredMember = async (member: Member) => {
    if (!location) return;
    try {
      await updateMember(member.id, {
        preferredLocations: [...member.preferredLocations, location.id],
      });
      toast.success(`${member.name} added as preferred`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add preferred member');
    }
  };

  const handleRemovePreferredMember = async (member: Member) => {
    if (!location) return;
    try {
      await updateMember(member.id, {
        preferredLocations: member.preferredLocations.filter((lid) => lid !== location.id),
      });
      toast.success(`${member.name} removed from preferred`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove preferred member');
    }
  };

  const handleUpdateMaxPublishers = async (value: string) => {
    if (!location) return;
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    try {
      await updateLocation(location.id, { maxPublishers: num });
      toast.success('Slot capacity updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  if (!location) {
    return (
      <div className="py-16 text-center">
        <MapPin className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
        <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
          Location not found.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-1"
          onClick={() => navigate('/locations')}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Locations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs" style={{ color: C.textSecondary }}>
        <button
          onClick={() => navigate('/locations')}
          className="flex items-center gap-1 hover:underline font-medium transition-colors"
          style={{ color: C.accent }}
        >
          <ArrowLeft className="h-3 w-3" /> Locations
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium" style={{ color: C.text }}>
          {location.name}
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
              <MapPin className="h-5 w-5" style={{ color: C.accent }} />
            </div>
            <div className="min-w-0">
              <h2
                className="text-lg font-semibold tracking-tight truncate"
                style={{ color: C.text }}
              >
                {location.name}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                {location.city}
                {location.category && ` · ${location.category}`}
                {location.active ? (
                  <span
                    className="inline-flex items-center ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: C.successBg, color: C.success }}
                  >
                    Active
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: C.dangerBg, color: C.danger }}
                  >
                    Inactive
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setFormDialog({ type: 'location' })}
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
              onClick={() =>
                setDeleteConfirm({
                  type: 'location',
                  id: location.id,
                  name: location.name,
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout: sidebar + content */}
      <div className="flex gap-4 min-h-[calc(100vh-22rem)]">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <nav
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: C.sidebarBg, boxShadow: C.shadow }}
          >
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors text-left"
                  style={{
                    backgroundColor: isActive ? C.sidebarActiveBg : 'transparent',
                    color: isActive ? C.sidebarActiveText : C.sidebarInactiveText,
                  }}
                >
                  <item.icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: isActive ? C.sidebarActiveText : C.sidebarInactiveText }}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* ═══════ GENERAL ═══════ */}
          {activeSection === 'general' && (
            <div className="space-y-4">
              <SectionHeader icon={Info} title="General Information" />
              <div
                className="rounded-xl shadow-sm overflow-hidden"
                style={{ border: `1px solid ${C.border}` }}
              >
                <div className="divide-y" style={{ borderColor: C.borderLight }}>
                  <InfoRow label="Location Name" value={location.name} />
                  <InfoRow
                    label="Circuit"
                    value={
                      <span className="flex items-center gap-1.5">
                        <Network className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
                        {locationCircuit?.name || 'None'}
                      </span>
                    }
                  />
                  <InfoRow label="Address / City" value={location.city || '—'} />
                  <InfoRow label="Category" value={location.category || '—'} />
                  <InfoRow
                    label="Status"
                    value={
                      location.active ? (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: C.successBg, color: C.success }}
                        >
                          Active
                        </span>
                      ) : (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: C.dangerBg, color: C.danger }}
                        >
                          Inactive
                        </span>
                      )
                    }
                  />
                  {location.notes && <InfoRow label="Notes" value={location.notes} />}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Timeslots', value: locationTimeslots.length, icon: Clock, color: C.accent },
                  { label: 'Linked Congs', value: locationCongregations.length, icon: Users, color: C.purple },
                  { label: 'Preferred', value: preferredMembers.length, icon: UserPlus, color: C.warn },
                  { label: 'Max Publishers', value: location.maxPublishers || '—', icon: Hash, color: C.success },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl px-4 py-3"
                    style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: C.textSecondary }}>
                          {stat.label}
                        </p>
                        <p className="text-xl font-bold mt-0.5" style={{ color: C.text }}>
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${stat.color}14` }}
                      >
                        <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ LINKED CONGREGATIONS ═══════ */}
          {activeSection === 'congregations' && (
            <div className="space-y-4">
              <SectionHeader
                icon={Users}
                title="Linked Congregations"
                subtitle="Manage which congregations serve at this location."
                badge={locationCongregations.length}
              />

              {/* Currently linked */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${C.border}`, boxShadow: C.shadow }}
              >
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ backgroundColor: C.headerBg, borderBottom: `1px solid ${C.border}` }}
                >
                  <h4 className="text-xs font-semibold" style={{ color: C.text }}>
                    Currently Linked
                  </h4>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: C.accentLight, color: C.accent }}
                  >
                    {locationCongregations.length}
                  </span>
                </div>
                <div style={{ backgroundColor: C.white }}>
                  {locationCongregations.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="h-7 w-7 mx-auto mb-2" style={{ color: C.border }} />
                      <p className="text-xs" style={{ color: C.textSecondary }}>
                        No congregations linked yet.
                      </p>
                    </div>
                  ) : (
                    locationCongregations.map((cong, i) => {
                      const congMembers = members.filter((m) => m.congregationId === cong.id);
                      return (
                        <div
                          key={cong.id}
                          className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-[#F7F8FA]"
                          style={{
                            borderBottom:
                              i < locationCongregations.length - 1
                                ? `1px solid ${C.borderLight}`
                                : undefined,
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium" style={{ color: C.text }}>
                              {cong.name}
                            </p>
                            <p className="text-xs" style={{ color: C.textSecondary }}>
                              {congMembers.length} publisher{congMembers.length !== 1 ? 's' : ''}
                              {cong.overseers?.length > 0 && ` · ${cong.overseers.join(', ')}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleUnlinkCongregation(cong.id)}
                            disabled={isLoading}
                          >
                            <X className="h-3 w-3" /> Unlink
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Multi-Circuit Sharing toggle */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: C.white, borderBottom: location.multiCircuitSharing ? `1px solid ${C.borderLight}` : undefined }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>
                      Multi-Circuit Sharing
                    </p>
                    <p className="text-xs mt-0.5 max-w-sm" style={{ color: C.textSecondary }}>
                      Allow congregations from other circuits to be linked to this location.
                    </p>
                  </div>
                  <Switch
                    checked={!!location.multiCircuitSharing}
                    onCheckedChange={async (checked) => {
                      try {
                        await updateLocation(location.id, { multiCircuitSharing: checked });
                        if (!checked) setSelectedCircuitIds(new Set());
                        toast.success(checked ? 'Multi-circuit sharing enabled' : 'Multi-circuit sharing disabled');
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to update');
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>

                {/* Circuit selector — visible when multi-circuit sharing is ON */}
                {location.multiCircuitSharing && (
                  <div style={{ backgroundColor: C.white }}>
                    <div className="px-4 py-2" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <p className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                        Select circuits to include
                      </p>
                    </div>

                    {/* Own circuit — always included */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: `1px solid ${C.borderLight}` }}
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked disabled className="h-3.5 w-3.5 accent-[#4F6BED]" />
                        <span className="text-sm font-medium" style={{ color: C.text }}>
                          {locationCircuit?.name || 'Current Circuit'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: C.accentLight, color: C.accent }}>Own</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={isLoading}
                        onClick={async () => {
                          const linked = new Set(location.linkedCongregations);
                          const toLink = congregations
                            .filter((c) => c.circuitId === location.circuitId && !linked.has(c.id))
                            .map((c) => c.id);
                          if (toLink.length === 0) {
                            toast.info('All congregations in this circuit are already linked.');
                            return;
                          }
                          try {
                            for (const cId of toLink) await handleLinkCongregation(cId);
                            toast.success(`Linked ${toLink.length} congregation${toLink.length > 1 ? 's' : ''} from ${locationCircuit?.name || 'this circuit'}!`);
                          } catch { toast.error('Failed to link all congregations.'); }
                        }}
                      >
                        <Users className="h-3.5 w-3.5" /> Link all
                      </Button>
                    </div>

                    {/* Other circuits */}
                    {otherCircuits.length === 0 ? (
                      <div className="px-4 py-4 text-center">
                        <p className="text-xs" style={{ color: C.textMuted }}>No other circuits available.</p>
                      </div>
                    ) : (
                      otherCircuits.map((circuit, i) => {
                        const isSelected = selectedCircuitIds.has(circuit.id);
                        return (
                          <div
                            key={circuit.id}
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{
                              borderBottom:
                                i < otherCircuits.length - 1 ? `1px solid ${C.borderLight}` : undefined,
                            }}
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 accent-[#4F6BED]"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedCircuitIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(circuit.id)) next.delete(circuit.id);
                                    else next.add(circuit.id);
                                    return next;
                                  });
                                }}
                              />
                              <span className="text-sm" style={{ color: isSelected ? C.text : C.textSecondary }}>
                                {circuit.name}
                              </span>
                            </label>
                            {isSelected && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                disabled={isLoading}
                                onClick={async () => {
                                  const linked = new Set(location.linkedCongregations);
                                  const toLink = congregations
                                    .filter((c) => c.circuitId === circuit.id && !linked.has(c.id))
                                    .map((c) => c.id);
                                  if (toLink.length === 0) {
                                    toast.info(`All congregations in ${circuit.name} are already linked.`);
                                    return;
                                  }
                                  try {
                                    for (const cId of toLink) await handleLinkCongregation(cId);
                                    toast.success(`Linked ${toLink.length} congregation${toLink.length > 1 ? 's' : ''} from ${circuit.name}!`);
                                  } catch { toast.error('Failed to link all congregations.'); }
                                }}
                              >
                                <Users className="h-3.5 w-3.5" /> Link all
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Available to link */}
              <div
                className="rounded-xl shadow-sm overflow-hidden"
                style={{ border: `1px solid ${C.border}` }}
              >
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: C.borderLight }}>
                  <h4 className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                    Available Congregations
                  </h4>
                  <span className="text-[10px]" style={{ color: C.textMuted }}>
                    {location.multiCircuitSharing && selectedCircuitIds.size > 0
                      ? `Own + ${selectedCircuitIds.size} circuit${selectedCircuitIds.size > 1 ? 's' : ''}`
                      : 'Same circuit only'}
                  </span>
                </div>
                <div className="px-4 py-2 border-b" style={{ borderColor: C.borderLight }}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: C.textMuted }} />
                    <input
                      type="text"
                      placeholder="Search congregations…"
                      value={congSearch}
                      onChange={(e) => setCongSearch(e.target.value)}
                      className="w-full rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#4F6BED]/30"
                      style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, color: C.text }}
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto" style={{ backgroundColor: C.white }}>
                  {availableCongregations.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xs" style={{ color: C.textMuted }}>
                        {congSearch ? 'No matching congregations' : 'All congregations in this circuit are linked'}
                      </p>
                    </div>
                  ) : (
                    availableCongregations.map((cong, i) => {
                      const isCrossCircuit = cong.circuitId !== location.circuitId;
                      const crossCircuitName = isCrossCircuit
                        ? circuits.find((ci) => ci.id === cong.circuitId)?.name || 'another circuit'
                        : '';
                      return (
                      <div
                        key={cong.id}
                        className="flex items-center justify-between px-4 py-2 transition-colors hover:bg-[#F7F8FA]"
                        style={{
                          borderBottom:
                            i < availableCongregations.length - 1
                              ? `1px solid ${C.borderLight}`
                              : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm" style={{ color: isCrossCircuit ? C.textSecondary : C.text }}>
                            {cong.name}
                          </span>
                          {isCrossCircuit && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 flex-shrink-0 cursor-help" style={{ color: '#F59E0B' }} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                  <p>This congregation belongs to <strong>{crossCircuitName}</strong>. Please link the circuit first before assigning members.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          style={{ color: C.accent }}
                          onClick={() => handleLinkCongregation(cong.id)}
                          disabled={isLoading}
                        >
                          <Plus className="h-3 w-3" /> Link
                        </Button>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ PREFERRED MEMBERS ═══════ */}
          {activeSection === 'members' && (
            <div className="space-y-4">
              <SectionHeader
                icon={UserPlus}
                title="Preferred Members"
                subtitle="Members who frequently serve at this location."
                badge={preferredMembers.length}
              />

              {/* Currently preferred */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${C.border}`, boxShadow: C.shadow }}
              >
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ backgroundColor: C.headerBg, borderBottom: `1px solid ${C.border}` }}
                >
                  <h4 className="text-xs font-semibold" style={{ color: C.text }}>
                    Preferred List
                  </h4>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: C.accentLight, color: C.accent }}
                  >
                    {preferredMembers.length}
                  </span>
                </div>
                <div style={{ backgroundColor: C.white }}>
                  {preferredMembers.length === 0 ? (
                    <div className="py-8 text-center">
                      <UserPlus className="h-7 w-7 mx-auto mb-2" style={{ color: C.border }} />
                      <p className="text-xs" style={{ color: C.textSecondary }}>
                        No preferred members yet.
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>
                        Link congregations first, then add preferred members.
                      </p>
                    </div>
                  ) : (
                    preferredMembers.map((member, i) => {
                      const cong = congregations.find((c) => c.id === member.congregationId);
                      return (
                        <div
                          key={member.id}
                          className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-[#F7F8FA]"
                          style={{
                            borderBottom:
                              i < preferredMembers.length - 1
                                ? `1px solid ${C.borderLight}`
                                : undefined,
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
                              style={{ backgroundColor: C.accentLight, color: C.accent }}
                            >
                              {member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                                {member.name}
                              </p>
                              <p className="text-[11px] truncate" style={{ color: C.textSecondary }}>
                                {cong?.name || 'Unknown'} · {member.experience}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemovePreferredMember(member)}
                            disabled={isLoading}
                          >
                            <X className="h-3 w-3" /> Remove
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add members */}
              {location.linkedCongregations.length > 0 && (
                <div
                  className="rounded-xl shadow-sm overflow-hidden"
                  style={{ border: `1px solid ${C.border}` }}
                >
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: C.borderLight }}>
                    <h4 className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                      Add Members
                    </h4>
                    <span className="text-[10px]" style={{ color: C.textMuted }}>
                      From linked congregations
                    </span>
                  </div>
                  <div className="px-4 py-2 border-b" style={{ borderColor: C.borderLight }}>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: C.textMuted }} />
                      <input
                        type="text"
                        placeholder="Search members…"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#4F6BED]/30"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, color: C.text }}
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto" style={{ backgroundColor: C.white }}>
                    {availableMembers.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs" style={{ color: C.textMuted }}>
                          {memberSearch ? 'No matching members' : 'All eligible members are already preferred'}
                        </p>
                      </div>
                    ) : (
                      availableMembers.map((member, i) => {
                        const cong = congregations.find((c) => c.id === member.congregationId);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between px-4 py-2 transition-colors hover:bg-[#F7F8FA]"
                            style={{
                              borderBottom:
                                i < availableMembers.length - 1
                                  ? `1px solid ${C.borderLight}`
                                  : undefined,
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-semibold"
                                style={{ backgroundColor: C.borderLight, color: C.textSecondary }}
                              >
                                {member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm truncate" style={{ color: C.text }}>
                                  {member.name}
                                </p>
                                <p className="text-[10px] truncate" style={{ color: C.textMuted }}>
                                  {cong?.name || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              style={{ color: C.accent }}
                              onClick={() => handleAddPreferredMember(member)}
                              disabled={isLoading}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ TIMESLOTS ═══════ */}
          {activeSection === 'timeslots' && (
            <div className="space-y-4">
              <SectionHeader
                icon={Clock}
                title="Timeslots"
                subtitle="Manage recurring time slots for this location."
                badge={locationTimeslots.length}
                action={
                  <Button
                    size="sm"
                    className="gap-1 text-xs text-white"
                    style={{ backgroundColor: C.accent }}
                    onClick={() => setFormDialog({ type: 'timeslot' })}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Timeslot
                  </Button>
                }
              />

              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${C.border}`, boxShadow: C.shadow }}
              >
                <div
                  className="hidden sm:grid grid-cols-[1fr_120px_100px_80px] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: C.headerBg, color: C.textSecondary, borderBottom: `1px solid ${C.border}` }}
                >
                  <span>Schedule</span>
                  <span className="text-center">Publishers</span>
                  <span className="text-center">Status</span>
                  <span />
                </div>
                <div style={{ backgroundColor: C.white }}>
                  {locationTimeslots.length === 0 ? (
                    <div className="py-12 text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: C.border }} />
                      <p className="text-sm" style={{ color: C.textSecondary }}>
                        No timeslots yet.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3 gap-1 text-xs text-white"
                        style={{ backgroundColor: C.accent }}
                        onClick={() => setFormDialog({ type: 'timeslot' })}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Timeslot
                      </Button>
                    </div>
                  ) : (
                    locationTimeslots.map((ts, i) => (
                      <div
                        key={ts.id}
                        className="group grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_80px] gap-1 sm:gap-3 items-center px-4 py-2.5 transition-colors hover:bg-[#F7F8FA]"
                        style={{
                          borderBottom:
                            i < locationTimeslots.length - 1
                              ? `1px solid ${C.borderLight}`
                              : undefined,
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.text }}>
                            {ts.dayOfWeek}
                          </p>
                          <p className="text-xs" style={{ color: C.textSecondary }}>
                            {formatTime12h(ts.startTime)} – {formatTime12h(ts.endTime)}
                          </p>
                        </div>
                        <p className="hidden sm:block text-sm text-center" style={{ color: C.text }}>
                          {ts.requiredPublishers}
                        </p>
                        <div className="hidden sm:flex justify-center">
                          {ts.active ? (
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
                        <div className="hidden sm:flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setFormDialog({ type: 'timeslot', timeslot: ts })}
                          >
                            <Edit className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'timeslot',
                                id: ts.id,
                                name: `${ts.dayOfWeek} ${formatTime12h(ts.startTime)}–${formatTime12h(ts.endTime)}`,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ LOCATION SETTINGS ═══════ */}
          {activeSection === 'settings' && (
            <div className="space-y-4">
              <SectionHeader
                icon={Settings}
                title="Location Settings"
                subtitle="Configure capacity and sharing rules."
              />

              <div
                className="rounded-xl shadow-sm overflow-hidden"
                style={{ border: `1px solid ${C.border}` }}
              >
                <div className="divide-y" style={{ borderColor: C.borderLight }}>
                  {/* Slot capacity */}
                  <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: C.white }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>
                        Slot Capacity
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                        Maximum number of publishers per timeslot.
                      </p>
                    </div>
                    <Select
                      value={String(location.maxPublishers || 3)}
                      onValueChange={handleUpdateMaxPublishers}
                    >
                      <SelectTrigger className="w-20 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Active status */}
                  <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: C.white }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>
                        Active
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                        Inactive locations won't appear in scheduling.
                      </p>
                    </div>
                    <Switch
                      checked={location.active}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateLocation(location.id, { active: checked });
                          toast.success(checked ? 'Location activated' : 'Location deactivated');
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to update');
                        }
                      }}
                      disabled={isLoading}
                    />
                  </div>

                  {/* Age group */}
                  <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: C.white }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>
                        Age Restriction
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                        Restrict which age groups can serve here.
                      </p>
                    </div>
                    <Select
                      value={location.ageGroup || 'All ages'}
                      onValueChange={async (val) => {
                        try {
                          await updateLocation(location.id, { ageGroup: val as Location['ageGroup'] });
                          toast.success('Age restriction updated');
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to update');
                        }
                      }}
                    >
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All ages">All ages</SelectItem>
                        <SelectItem value="Adults only">Adults only</SelectItem>
                        <SelectItem value="Seniors excluded">Seniors excluded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Experience level */}
                  <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: C.white }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>
                        Experience Level
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                        Minimum experience required for publishers.
                      </p>
                    </div>
                    <Select
                      value={location.experienceLevel || 'Any'}
                      onValueChange={async (val) => {
                        try {
                          await updateLocation(location.id, { experienceLevel: val as Location['experienceLevel'] });
                          toast.success('Experience level updated');
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to update');
                        }
                      }}
                    >
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Any">Any</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Experienced only">Experienced only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form dialogs */}
      <Dialog
        open={!!formDialog}
        onOpenChange={(open) => !open && setFormDialog(null)}
      >
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {formDialog?.type === 'location' && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Location</DialogTitle>
                <DialogDescription>
                  Update the location details below.
                </DialogDescription>
              </DialogHeader>
              <LocationForm
                location={location}
                onSuccess={() => setFormDialog(null)}
                onCancel={() => setFormDialog(null)}
              />
            </>
          )}
          {formDialog?.type === 'timeslot' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formDialog.timeslot ? 'Edit Timeslot' : 'Add Timeslot'}
                </DialogTitle>
                <DialogDescription>
                  {formDialog.timeslot
                    ? 'Update the timeslot details below.'
                    : 'Create a recurring timeslot for this location.'}
                </DialogDescription>
              </DialogHeader>
              <TimeslotForm
                timeslot={formDialog.timeslot}
                onSuccess={() => setFormDialog(null)}
                onCancel={() => setFormDialog(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm?.name}</strong>? This action cannot be
              undone.
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

/* ─── Helper Components ─── */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  badge?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <Icon className="h-5 w-5 mt-0.5" style={{ color: '#4F6BED' }} />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold" style={{ color: '#111827' }}>
              {title}
            </h3>
            {badge !== undefined && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#EEF1FD', color: '#4F6BED' }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#FFFFFF' }}>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>
        {label}
      </p>
      <div className="text-sm font-medium" style={{ color: '#111827' }}>
        {value}
      </div>
    </div>
  );
}
