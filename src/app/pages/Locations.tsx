import { useEffect, useState, useMemo } from 'react';
import { Button } from '../components/ui/button';
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
import { LocationForm } from '../components/forms/LocationForm';
import { CircuitForm } from '../components/forms/CircuitForm';
import { CongregationForm } from '../components/forms/CongregationForm';
import { TimeslotForm } from '../components/forms/TimeslotForm';
import { useAppContext } from '../hooks/useAppContext';
import type { Location, Congregation, Circuit, Timeslot } from '../data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Clock, MapPin, Network, Plus, Edit, Trash2, Users,
  Search, Hash, ChevronRight, ArrowLeft, Filter,
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

// ─── Design tokens ────────────────────────────────────────────
const C = {
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryMuted: '#DBEAFE',
  secondary: '#7C3AED',
  secondaryLight: '#F5F3FF',
  bg: '#FFF8E7',             // warm golden tint page background
  bgWarm: '#F5F3EE',
  white: '#FFFFFF',
  text: '#0A0A0A',
  navy: '#1F2A44',
  navyLight: '#2A3754',      // slightly lighter navy for hover
  circuitsAccent: '#FFE396',
  sidebarCard: '#1F2A44',
  cream: '#FFF5D6',          // warm cream for content areas
  creamDeep: '#FFEEBA',      // deeper cream for hover
  sectionBorder: '#1F2A44',  // conspicuous navy border
  sectionBorderGold: '#E8C84A', // gold border accent
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textLight: '#CBD5E1',      // light text on dark bg
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#10B981',
  successBg: '#ECFDF5',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  warn: '#F59E0B',
  warnBg: '#FFFBEB',
};

type FormDialogMode =
  | { type: 'circuit'; circuit?: Circuit }
  | { type: 'congregation'; circuitId: string; congregation?: Congregation }
  | { type: 'location'; circuitId: string; location?: Location }
  | { type: 'timeslot'; timeslot?: Timeslot };

type DetailTab = 'overview' | 'congregations' | 'locations' | 'publishers' | 'timeslots';

export default function Locations() {
  const {
    circuits,
    congregations,
    locations,
    members,
    timeslots,
    deleteCircuit,
    deleteCongregation,
    deleteLocation,
    deleteTimeslot,
    isLoading,
  } = useAppContext();

  const [selectedCircuitId, setSelectedCircuitId] = useState<string>('');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [formDialog, setFormDialog] = useState<FormDialogMode | null>(null);
  const [congregationCircuitPick, setCongregationCircuitPick] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'circuit' | 'congregation' | 'location' | 'timeslot';
    id: string;
    name: string;
  } | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // ── Derived / filtered ──
  const filteredCircuits = useMemo(() => {
    let result = circuits;
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.coordinator?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [circuits, listSearch]);

  // Auto-select first circuit
  useEffect(() => {
    if (!selectedCircuitId && circuits[0]) setSelectedCircuitId(circuits[0].id);
    if (selectedCircuitId && !circuits.some((c) => c.id === selectedCircuitId))
      setSelectedCircuitId(circuits[0]?.id || '');
  }, [circuits, selectedCircuitId]);

  const selectedCircuit = circuits.find((c) => c.id === selectedCircuitId) || null;
  const selectedCircuitCongregations = selectedCircuit
    ? congregations.filter((c) => c.circuitId === selectedCircuit.id)
    : [];
  const selectedCircuitLocations = selectedCircuit
    ? locations.filter((l) => l.circuitId === selectedCircuit.id)
    : [];
  const selectedCircuitPublishers = selectedCircuit
    ? members.filter((m) => selectedCircuitCongregations.some((c) => c.id === m.congregationId))
    : [];
  const selectedCircuitTimeslots = selectedCircuit
    ? timeslots.filter((t) => selectedCircuitLocations.some((l) => l.id === t.locationId))
    : [];

  const getCircuitStats = (circuitId: string) => {
    const congs = congregations.filter((c) => c.circuitId === circuitId);
    const locs = locations.filter((l) => l.circuitId === circuitId);
    const pubs = members.filter((m) => congs.some((c) => c.id === m.congregationId));
    const ts = timeslots.filter((t) => locs.some((l) => l.id === t.locationId));
    return { congs: congs.length, locs: locs.length, pubs: pubs.length, ts: ts.length };
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'circuit') {
        await deleteCircuit(deleteConfirm.id);
        toast.success('Circuit deleted');
      } else if (deleteConfirm.type === 'congregation') {
        await deleteCongregation(deleteConfirm.id);
        toast.success('Congregation deleted');
      } else if (deleteConfirm.type === 'timeslot') {
        await deleteTimeslot(deleteConfirm.id);
        toast.success('Timeslot deleted');
      } else {
        await deleteLocation(deleteConfirm.id);
        toast.success('Location deleted');
      }
      setDeleteConfirm(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(errorMsg);
    }
  };

  // Location detail (for drill-in from Locations tab)
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) || null;
  const selectedLocationCircuit = selectedLocation
    ? circuits.find((c) => c.id === selectedLocation.circuitId) || null
    : null;
  const selectedLocationTimeslots = selectedLocation
    ? timeslots.filter((t) => t.locationId === selectedLocation.id)
    : [];
  const selectedLocationCongregations = selectedLocation
    ? (selectedLocation.linkedCongregations
        .map((cId) => congregations.find((c) => c.id === cId))
        .filter(Boolean) as Congregation[])
    : [];

  // Tab definitions
  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'congregations', label: 'Congregations' },
    { key: 'locations', label: 'Locations' },
    { key: 'publishers', label: 'Publishers' },
    { key: 'timeslots', label: 'Timeslots' },
  ];

  // Filtered locations for locations tab
  const filteredCircuitLocations = useMemo(() => {
    let result = selectedCircuitLocations;
    if (statusFilter === 'active') result = result.filter((l) => l.active);
    else if (statusFilter === 'inactive') result = result.filter((l) => !l.active);
    return result;
  }, [selectedCircuitLocations, statusFilter]);

  return (
    <div style={{ backgroundColor: C.bg }} className="min-h-[calc(100vh-5rem)] -m-8 p-6">
      {/* ── Quick Stats Bar ── */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-6">
          {[
            { label: 'Circuits', value: circuits.length, icon: Network, color: C.primary },
            { label: 'Congregations', value: congregations.length, icon: Users, color: C.secondary },
            { label: 'Locations', value: locations.length, icon: MapPin, color: C.success },
            { label: 'Publishers', value: members.length, icon: Hash, color: C.warn },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight" style={{ color: C.text }}>{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: C.textSecondary }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            className="gap-1.5 text-white shadow-sm"
            style={{ backgroundColor: C.primary }}
            onClick={() => setFormDialog({ type: 'circuit' })}
          >
            <Plus className="h-3.5 w-3.5" /> Add Circuit
          </Button>
        </div>
      </div>

      {/* ── Three-panel layout ── */}
      <div className="flex gap-5 min-h-[calc(100vh-12rem)]">

        {/* ════════ MIDDLE PANEL — Circuits List ════════ */}
        <div className="w-80 xl:w-96 flex-shrink-0">
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: C.circuitsAccent, border: `1px solid ${C.border}` }}>
            {/* Header + search */}
            <div className="p-4" style={{ backgroundColor: C.circuitsAccent, borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color: C.text }}>Circuits</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: C.white, color: C.text }}>
                  {circuits.length}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: C.textMuted }} />
                <input
                  type="text"
                  placeholder="Search circuits…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full rounded-lg py-2 pl-9 pr-3 text-sm transition-all focus:outline-none focus:ring-2"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text, focusRingColor: C.primary }}
                />
              </div>
            </div>

            {/* Circuit cards */}
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto">
              {filteredCircuits.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Network className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
                  <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
                    {circuits.length === 0 ? 'No circuits yet' : 'No circuits match your search'}
                  </p>
                  {circuits.length === 0 && (
                    <Button
                      size="sm"
                      className="mt-3 gap-1 text-white"
                      style={{ backgroundColor: C.primary }}
                      onClick={() => setFormDialog({ type: 'circuit' })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Circuit
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredCircuits.map((circuit) => {
                    const stats = getCircuitStats(circuit.id);
                    const isSelected = selectedCircuitId === circuit.id;
                    return (
                      <button
                        key={circuit.id}
                        onClick={() => {
                          setSelectedCircuitId(circuit.id);
                          setDetailTab('overview');
                          setSelectedLocationId('');
                        }}
                        className="w-full text-left rounded-xl p-4 transition-all group"
                        style={{
                          backgroundColor: isSelected ? C.primaryLight : C.sidebarCard,
                          border: `1.5px solid ${isSelected ? C.primary : 'transparent'}`,
                          boxShadow: isSelected ? `0 0 0 1px ${C.primary}20` : undefined,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" style={{ color: isSelected ? C.text : C.white }}>
                              {circuit.name}
                            </p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: isSelected ? C.textSecondary : '#B0BACC' }}>
                              Overseer: {circuit.coordinator}
                            </p>
                          </div>
                          <ChevronRight
                            className="h-4 w-4 mt-0.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                            style={{ color: isSelected ? C.primary : '#B0BACC' }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: isSelected ? C.textSecondary : '#8A95A9' }}>
                            <MapPin className="h-3 w-3" /> {stats.locs}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: isSelected ? C.textSecondary : '#8A95A9' }}>
                            <Users className="h-3 w-3" /> {stats.congs}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: isSelected ? C.textSecondary : '#8A95A9' }}>
                            <Clock className="h-3 w-3" /> {stats.ts}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════ RIGHT PANEL — Detail ════════ */}
        <div className="flex-1 min-w-0">
          {/* Location drill-in view */}
          {selectedLocation ? (
            <div className="space-y-5">
              {/* Breadcrumb + back */}
              <div className="flex items-center gap-2 text-xs" style={{ color: C.textSecondary }}>
                <button
                  onClick={() => setSelectedLocationId('')}
                  className="flex items-center gap-1 hover:underline font-medium transition-colors"
                  style={{ color: C.primary }}
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <ChevronRight className="h-3 w-3" />
                <span>Locations</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium" style={{ color: C.text }}>{selectedLocation.name}</span>
              </div>

              {/* Location header card */}
              <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: C.cream, border: `2px solid ${C.sectionBorder}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFE39640' }}>
                      <MapPin className="h-5 w-5" style={{ color: C.navy }} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold tracking-tight truncate" style={{ color: C.text }}>
                        {selectedLocation.name}
                      </h2>
                      <p className="text-sm mt-0.5" style={{ color: C.textSecondary }}>
                        {selectedLocation.city}
                        {selectedLocation.category && ` · ${selectedLocation.category}`}
                        {selectedLocation.active ? (
                          <span className="inline-flex items-center ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: C.successBg, color: C.success }}>Active</span>
                        ) : (
                          <span className="inline-flex items-center ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: C.dangerBg, color: C.danger }}>Inactive</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() =>
                        setFormDialog({ type: 'location', circuitId: selectedLocation.circuitId, location: selectedLocation })
                      }
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      onClick={() =>
                        setDeleteConfirm({ type: 'location', id: selectedLocation.id, name: selectedLocation.name })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Timeslots', value: selectedLocationTimeslots.length, icon: Clock, color: C.primary },
                  { label: 'Linked Congs', value: selectedLocationCongregations.length, icon: Users, color: C.secondary },
                  { label: 'Max Publishers', value: selectedLocation.maxPublishers || '—', icon: Hash, color: C.warn },
                  { label: 'Circuit', value: selectedLocationCircuit?.name || 'None', icon: Network, isText: true, color: C.success },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl px-4 py-3.5 shadow-sm" style={{ backgroundColor: C.cream, border: `2px solid ${C.sectionBorderGold}` }}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: C.textSecondary }}>{stat.label}</p>
                        <p className={`${stat.isText ? 'text-sm' : 'text-2xl'} font-bold mt-0.5 truncate`} style={{ color: C.text }}>{stat.value}</p>
                      </div>
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${stat.color}14` }}>
                        <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeslots */}
              <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4" style={{ color: C.circuitsAccent }} />
                    <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Timeslots</h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE39640', color: C.circuitsAccent }}>
                      {selectedLocationTimeslots.length}
                    </span>
                  </div>
                  <Button size="sm" className="gap-1 text-xs text-white" style={{ backgroundColor: C.primary }} onClick={() => setFormDialog({ type: 'timeslot' })}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                <div style={{ backgroundColor: C.cream }}>
                  {selectedLocationTimeslots.length === 0 ? (
                    <div className="py-10 text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: C.border }} />
                      <p className="text-sm" style={{ color: C.textSecondary }}>No timeslots yet.</p>
                    </div>
                  ) : (
                    selectedLocationTimeslots.map((ts, i) => (
                      <div
                        key={ts.id}
                        className="group flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#FFEEBA]"
                        style={{ borderBottom: i < selectedLocationTimeslots.length - 1 ? `1px solid ${C.sectionBorderGold}` : undefined }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.text }}>
                            {ts.dayOfWeek} · {formatTime12h(ts.startTime)} – {formatTime12h(ts.endTime)}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                            {ts.requiredPublishers} publisher{ts.requiredPublishers !== 1 ? 's' : ''} required
                            {!ts.active && <span className="ml-1 text-red-500">· Inactive</span>}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setFormDialog({ type: 'timeslot', timeslot: ts })}>
                            <Edit className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() =>
                            setDeleteConfirm({ type: 'timeslot', id: ts.id, name: `${ts.dayOfWeek} ${formatTime12h(ts.startTime)}–${formatTime12h(ts.endTime)}` })
                          }>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Linked Congregations */}
              <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                <div className="px-5 py-3 flex items-center gap-2.5" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                  <Users className="h-4 w-4" style={{ color: C.secondary }} />
                  <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Linked Congregations</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE39640', color: C.circuitsAccent }}>
                    {selectedLocationCongregations.length}
                  </span>
                </div>
                <div style={{ backgroundColor: C.cream }}>
                  {selectedLocationCongregations.length === 0 ? (
                    <div className="py-10 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2" style={{ color: C.border }} />
                      <p className="text-sm" style={{ color: C.textSecondary }}>No congregations linked.</p>
                    </div>
                  ) : (
                    selectedLocationCongregations.map((cong, i) => {
                      const congMembers = members.filter((m) => m.congregationId === cong.id);
                      return (
                        <div key={cong.id} className="px-5 py-3 transition-colors hover:bg-[#FFEEBA]"
                          style={{ borderBottom: i < selectedLocationCongregations.length - 1 ? `1px solid ${C.sectionBorderGold}` : undefined }}>
                          <p className="text-sm font-medium" style={{ color: C.text }}>{cong.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                            {congMembers.length} publisher{congMembers.length !== 1 ? 's' : ''}
                            {cong.overseers?.length > 0 && ` · Overseers: ${cong.overseers.join(', ')}`}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Circuit Info */}
              {selectedLocationCircuit && (
                <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                  <div className="px-5 py-3 flex items-center gap-2.5" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                    <Network className="h-4 w-4" style={{ color: C.success }} />
                    <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Circuit Info</h3>
                  </div>
                  <div className="px-5 py-4" style={{ backgroundColor: C.cream }}>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{selectedLocationCircuit.name}</p>
                    <p className="text-xs mt-1" style={{ color: C.textSecondary }}>
                      {selectedLocationCircuit.city && `${selectedLocationCircuit.city} · `}
                      Overseer: {selectedLocationCircuit.coordinator}
                    </p>
                    {selectedLocationCircuit.notes && (
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: C.textSecondary }}>{selectedLocationCircuit.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : selectedCircuit ? (
            /* ── Circuit detail with tabbed view ── */
            <div className="space-y-5">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs" style={{ color: C.textSecondary }}>
                <span>Circuit Structure</span>
                <ChevronRight className="h-3 w-3" />
                <span>Locations</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium" style={{ color: C.text }}>{selectedCircuit.name}</span>
              </div>

              {/* Circuit header */}
              <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: C.cream, border: `2px solid ${C.sectionBorder}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.navy }}>
                      <Network className="h-5 w-5" style={{ color: '#FFE396' }} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold tracking-tight truncate" style={{ color: C.text }}>
                        {selectedCircuit.name}
                      </h2>
                      <p className="text-sm mt-0.5" style={{ color: C.textSecondary }}>
                        Overseer: {selectedCircuit.coordinator}
                        {selectedCircuit.city && ` · ${selectedCircuit.city}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setFormDialog({ type: 'circuit', circuit: selectedCircuit })}>
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      onClick={() => setDeleteConfirm({ type: 'circuit', id: selectedCircuit.id, name: selectedCircuit.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
                {selectedCircuit.notes && (
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: C.textSecondary }}>{selectedCircuit.notes}</p>
                )}
              </div>

              {/* Tab navigation */}
              <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: C.cream, border: `2px solid ${C.sectionBorder}` }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className="flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-all"
                    style={{
                      backgroundColor: detailTab === tab.key ? C.navy : 'transparent',
                      color: detailTab === tab.key ? '#FFE396' : C.textSecondary,
                      boxShadow: detailTab === tab.key ? '0 2px 6px rgba(31,42,68,0.25)' : undefined,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {detailTab === 'overview' && (
                <div className="space-y-5">
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Congregations', value: selectedCircuitCongregations.length, icon: Users, color: C.secondary },
                      { label: 'Locations', value: selectedCircuitLocations.length, icon: MapPin, color: C.primary },
                      { label: 'Publishers', value: selectedCircuitPublishers.length, icon: Hash, color: C.warn },
                      { label: 'Timeslots', value: selectedCircuitTimeslots.length, icon: Clock, color: C.success },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl px-4 py-4 shadow-sm" style={{ backgroundColor: C.cream, border: `2px solid ${C.sectionBorderGold}` }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: C.textSecondary }}>{stat.label}</p>
                            <p className="text-2xl font-bold mt-0.5" style={{ color: C.text }}>{stat.value}</p>
                          </div>
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}14` }}>
                            <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick lists */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    {/* Recent Congregations */}
                    <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" style={{ color: C.secondary }} />
                          <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Congregations</h3>
                        </div>
                        <button onClick={() => setDetailTab('congregations')} className="text-xs font-medium hover:underline" style={{ color: C.circuitsAccent }}>
                          View all
                        </button>
                      </div>
                      <div style={{ backgroundColor: C.cream }}>
                        {selectedCircuitCongregations.length === 0 ? (
                          <div className="py-6 text-center">
                            <p className="text-xs" style={{ color: C.textSecondary }}>No congregations yet</p>
                          </div>
                        ) : (
                          selectedCircuitCongregations.slice(0, 4).map((cong, i) => {
                            const cnt = members.filter((m) => m.congregationId === cong.id).length;
                            return (
                              <div key={cong.id} className="px-4 py-2.5 flex items-center justify-between transition-colors hover:bg-[#FFEEBA]"
                                style={{ borderBottom: i < Math.min(selectedCircuitCongregations.length, 4) - 1 ? `1px solid ${C.sectionBorderGold}` : undefined }}>
                                <p className="text-sm font-medium truncate" style={{ color: C.text }}>{cong.name}</p>
                                <span className="text-xs flex-shrink-0 ml-2" style={{ color: C.textSecondary }}>{cnt} pub{cnt !== 1 ? 's' : ''}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Recent Locations */}
                    <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" style={{ color: C.circuitsAccent }} />
                          <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Locations</h3>
                        </div>
                        <button onClick={() => setDetailTab('locations')} className="text-xs font-medium hover:underline" style={{ color: C.circuitsAccent }}>
                          View all
                        </button>
                      </div>
                      <div style={{ backgroundColor: C.cream }}>
                        {selectedCircuitLocations.length === 0 ? (
                          <div className="py-6 text-center">
                            <p className="text-xs" style={{ color: C.textSecondary }}>No locations yet</p>
                          </div>
                        ) : (
                          selectedCircuitLocations.slice(0, 4).map((loc, i) => {
                            const ts = timeslots.filter((t) => t.locationId === loc.id).length;
                            return (
                              <div key={loc.id} className="px-4 py-2.5 flex items-center justify-between transition-colors hover:bg-[#FFEEBA] cursor-pointer"
                                style={{ borderBottom: i < Math.min(selectedCircuitLocations.length, 4) - 1 ? `1px solid ${C.sectionBorderGold}` : undefined }}
                                onClick={() => setSelectedLocationId(loc.id)}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>{loc.name}</p>
                                  {loc.active ? (
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: C.successBg, color: C.success }}>Active</span>
                                  ) : (
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: C.dangerBg, color: C.danger }}>Inactive</span>
                                  )}
                                </div>
                                <span className="text-xs flex-shrink-0 ml-2" style={{ color: C.textSecondary }}>{ts} slot{ts !== 1 ? 's' : ''}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'congregations' && (
                <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                  <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4" style={{ color: C.secondary }} />
                      <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Congregations</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE39640', color: C.circuitsAccent }}>
                        {selectedCircuitCongregations.length}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1 text-xs text-white"
                      style={{ backgroundColor: C.primary }}
                      onClick={() => {
                        setCongregationCircuitPick(selectedCircuit.id);
                        setFormDialog({ type: 'congregation', circuitId: selectedCircuit.id });
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Congregation
                    </Button>
                  </div>
                  <div style={{ backgroundColor: C.cream }}>
                    {selectedCircuitCongregations.length === 0 ? (
                      <div className="py-12 text-center">
                        <Users className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
                        <p className="text-sm" style={{ color: C.textSecondary }}>No congregations yet.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 p-4">
                        {selectedCircuitCongregations.map((cong) => {
                          const congMembers = members.filter((m) => m.congregationId === cong.id);
                          return (
                            <div key={cong.id} className="group relative rounded-xl p-4 transition-all hover:shadow-md" style={{ border: `2px solid ${C.sectionBorderGold}`, backgroundColor: C.cream }}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm truncate" style={{ color: C.text }}>{cong.name}</p>
                                  <p className="text-xs mt-1" style={{ color: C.textSecondary }}>
                                    {congMembers.length} publisher{congMembers.length !== 1 ? 's' : ''}
                                  </p>
                                  {cong.overseers?.length > 0 && (
                                    <p className="text-xs mt-0.5 truncate" style={{ color: C.textMuted }}>
                                      Overseers: {cong.overseers.join(', ')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                    onClick={() => setFormDialog({ type: 'congregation', circuitId: selectedCircuit.id, congregation: cong })}>
                                    <Edit className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                    onClick={() => setDeleteConfirm({ type: 'congregation', id: cong.id, name: cong.name })}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'locations' && (
                <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                  <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4" style={{ color: C.circuitsAccent }} />
                      <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Locations</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE39640', color: C.circuitsAccent }}>
                        {selectedCircuitLocations.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs">
                        <Filter className="h-3 w-3" style={{ color: C.textMuted }} />
                        {(['all', 'active', 'inactive'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className="px-2 py-1 rounded-md text-xs font-medium transition-colors capitalize"
                            style={{
                              backgroundColor: statusFilter === f ? '#FFE39640' : 'transparent',
                              color: statusFilter === f ? C.circuitsAccent : C.textLight,
                            }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      <Button size="sm" className="gap-1 text-xs text-white" style={{ backgroundColor: C.primary }}
                        onClick={() => setFormDialog({ type: 'location', circuitId: selectedCircuit.id })}>
                        <Plus className="h-3.5 w-3.5" /> Add Location
                      </Button>
                    </div>
                  </div>
                  <div style={{ backgroundColor: C.cream }}>
                    {filteredCircuitLocations.length === 0 ? (
                      <div className="py-12 text-center">
                        <MapPin className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
                        <p className="text-sm" style={{ color: C.textSecondary }}>No locations found.</p>
                      </div>
                    ) : (
                      filteredCircuitLocations.map((loc, i) => {
                        const locTimeslots = timeslots.filter((t) => t.locationId === loc.id);
                        const linkedCongNames = loc.linkedCongregations
                          .map((cId) => congregations.find((c) => c.id === cId)?.name)
                          .filter(Boolean)
                          .join(', ');
                        return (
                          <div
                            key={loc.id}
                            className="group px-5 py-3.5 transition-colors hover:bg-[#FFEEBA] cursor-pointer"
                            style={{ borderBottom: i < filteredCircuitLocations.length - 1 ? `1px solid ${C.sectionBorderGold}` : undefined }}
                            onClick={() => setSelectedLocationId(loc.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm" style={{ color: C.text }}>{loc.name}</p>
                                  {loc.active ? (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: C.successBg, color: C.success }}>Active</span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: C.dangerBg, color: C.danger }}>Inactive</span>
                                  )}
                                </div>
                                <p className="text-xs mt-1" style={{ color: C.textSecondary }}>
                                  {loc.city}
                                  {locTimeslots.length > 0 && ` · ${locTimeslots.length} timeslot${locTimeslots.length !== 1 ? 's' : ''}`}
                                  {linkedCongNames && ` · ${linkedCongNames}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => {
                                    e.stopPropagation();
                                    setFormDialog({ type: 'location', circuitId: selectedCircuit.id, location: loc });
                                  }}>
                                    <Edit className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({ type: 'location', id: loc.id, name: loc.name });
                                  }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: C.textMuted }} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'publishers' && (
                <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                  <div className="px-5 py-3 flex items-center gap-2.5" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                    <Hash className="h-4 w-4" style={{ color: C.warn }} />
                    <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>Publishers</h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE39640', color: C.circuitsAccent }}>
                      {selectedCircuitPublishers.length}
                    </span>
                  </div>
                  <div style={{ backgroundColor: C.cream }}>
                    {selectedCircuitPublishers.length === 0 ? (
                      <div className="py-12 text-center">
                        <Hash className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
                        <p className="text-sm" style={{ color: C.textSecondary }}>No publishers in this circuit yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: C.borderLight }}>
                        {selectedCircuitPublishers.map((pub) => {
                          const congName = congregations.find((c) => c.id === pub.congregationId)?.name || 'Unknown';
                          return (
                            <div key={pub.id} className="px-5 py-3 flex items-center justify-between transition-colors hover:bg-[#FFEEBA]">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                                  style={{ backgroundColor: '#FFE39640', color: C.circuitsAccent }}>
                                  {pub.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>{pub.name}</p>
                                  <p className="text-xs truncate" style={{ color: C.textSecondary }}>{congName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{
                                  backgroundColor: pub.experience === 'Experienced' ? C.successBg : pub.experience === 'New' ? C.warnBg : '#FFE39640',
                                  color: pub.experience === 'Experienced' ? C.success : pub.experience === 'New' ? C.warn : C.navy,
                                }}>
                                  {pub.experience}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'timeslots' && (
                <div className="rounded-xl shadow-sm overflow-hidden" style={{ border: `2px solid ${C.sectionBorder}` }}>
                  <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: C.navy, borderBottom: `1px solid ${C.navyLight}` }}>
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4" style={{ color: C.success }} />
                      <h3 className="text-sm font-semibold" style={{ color: C.circuitsAccent }}>All Timeslots</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE39640', color: C.circuitsAccent }}>
                        {selectedCircuitTimeslots.length}
                      </span>
                    </div>
                    <Button size="sm" className="gap-1 text-xs text-white" style={{ backgroundColor: C.primary }}
                      onClick={() => setFormDialog({ type: 'timeslot' })}>
                      <Plus className="h-3.5 w-3.5" /> Add Timeslot
                    </Button>
                  </div>
                  <div style={{ backgroundColor: C.cream }}>
                    {selectedCircuitTimeslots.length === 0 ? (
                      <div className="py-12 text-center">
                        <Clock className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
                        <p className="text-sm" style={{ color: C.textSecondary }}>No timeslots yet.</p>
                      </div>
                    ) : (
                      selectedCircuitTimeslots.map((ts, i) => {
                        const locName = locations.find((l) => l.id === ts.locationId)?.name || 'Unknown';
                        return (
                          <div key={ts.id} className="group flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#FFEEBA]"
                            style={{ borderBottom: i < selectedCircuitTimeslots.length - 1 ? `1px solid ${C.sectionBorderGold}` : undefined }}>
                            <div>
                              <p className="text-sm font-medium" style={{ color: C.text }}>
                                {ts.dayOfWeek} · {formatTime12h(ts.startTime)} – {formatTime12h(ts.endTime)}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                                {locName} · {ts.requiredPublishers} publisher{ts.requiredPublishers !== 1 ? 's' : ''}
                                {!ts.active && <span className="ml-1 text-red-500">· Inactive</span>}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setFormDialog({ type: 'timeslot', timeslot: ts })}>
                                <Edit className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                onClick={() => setDeleteConfirm({ type: 'timeslot', id: ts.id, name: `${ts.dayOfWeek} ${formatTime12h(ts.startTime)}–${formatTime12h(ts.endTime)}` })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#FFE39640' }}>
                  <Network className="h-8 w-8" style={{ color: C.navy }} />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: C.text }}>
                  {circuits.length === 0 ? 'No circuits registered' : 'Select a circuit'}
                </h3>
                <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: C.textSecondary }}>
                  {circuits.length === 0
                    ? 'Add your first circuit to start organizing congregations and locations.'
                    : 'Click on a circuit from the list to view its details.'}
                </p>
                {circuits.length === 0 && (
                  <Button className="mt-4 gap-1.5 text-white" style={{ backgroundColor: C.primary }}
                    onClick={() => setFormDialog({ type: 'circuit' })}>
                    <Plus className="h-4 w-4" /> Add Circuit
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Form dialogs ── */}
      <Dialog open={!!formDialog} onOpenChange={(open) => !open && setFormDialog(null)}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {formDialog?.type === 'circuit' && (
            <>
              <DialogHeader>
                <DialogTitle>{formDialog.circuit ? 'Edit Circuit' : 'Add Circuit'}</DialogTitle>
                <DialogDescription>
                  {formDialog.circuit
                    ? 'Update circuit details.'
                    : 'Create a new circuit, then add congregations and locations under it.'}
                </DialogDescription>
              </DialogHeader>
              <CircuitForm
                circuit={formDialog.circuit}
                onSuccess={() => setFormDialog(null)}
                onCancel={() => setFormDialog(null)}
              />
            </>
          )}

          {formDialog?.type === 'congregation' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formDialog.congregation ? 'Edit Congregation' : 'Add Congregation'}
                </DialogTitle>
                <DialogDescription>
                  {formDialog.congregation
                    ? 'Update congregation details.'
                    : 'Select the circuit this congregation belongs to, then fill in the details.'}
                </DialogDescription>
              </DialogHeader>

              {!formDialog.congregation && (
                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Circuit <span className="text-red-500">*</span>
                  </label>
                  {circuits.length === 0 ? (
                    <p className="text-sm text-amber-600">
                      No circuits exist yet. Add a circuit first before adding a congregation.
                    </p>
                  ) : (
                    <Select
                      value={congregationCircuitPick}
                      onValueChange={(val) => {
                        setCongregationCircuitPick(val);
                        setFormDialog({ type: 'congregation', circuitId: val });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a circuit" />
                      </SelectTrigger>
                      <SelectContent>
                        {circuits.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {(formDialog.congregation || congregationCircuitPick) && circuits.length > 0 && (
                <CongregationForm
                  key={formDialog.congregation?.id || congregationCircuitPick}
                  congregation={formDialog.congregation}
                  circuitId={formDialog.congregation ? formDialog.circuitId : congregationCircuitPick}
                  onSuccess={() => { setFormDialog(null); setCongregationCircuitPick(''); }}
                  onCancel={() => { setFormDialog(null); setCongregationCircuitPick(''); }}
                />
              )}
            </>
          )}

          {formDialog?.type === 'location' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formDialog.location ? 'Edit Location' : 'Add Location'}
                </DialogTitle>
                <DialogDescription>
                  {formDialog.location
                    ? 'Update the location details below.'
                    : `Add a location under ${circuits.find((c) => c.id === formDialog.circuitId)?.name || 'the selected circuit'}.`}
                </DialogDescription>
              </DialogHeader>
              <LocationForm
                location={formDialog.location}
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
                    : 'Create a recurring timeslot for a location.'}
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

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
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
