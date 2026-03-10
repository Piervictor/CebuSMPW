import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
  Building2, ChevronRight, Clock, MapPin, Network, Plus, Edit, Trash2, Users,
  Search, Hash, LayoutGrid,
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

type FormDialogMode =
  | { type: 'circuit'; circuit?: Circuit }
  | { type: 'congregation'; circuitId: string; congregation?: Congregation }
  | { type: 'location'; circuitId: string; location?: Location }
  | { type: 'timeslot'; timeslot?: Timeslot };

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

  const [selectedCircuitId, setSelectedCircuitId] = useState<string>(circuits[0]?.id || '');
  const [formDialog, setFormDialog] = useState<FormDialogMode | null>(null);
  const [congregationCircuitPick, setCongregationCircuitPick] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'circuit' | 'congregation' | 'location' | 'timeslot';
    id: string;
    name: string;
  } | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');

  useEffect(() => {
    if (!selectedCircuitId && circuits[0]) {
      setSelectedCircuitId(circuits[0].id);
    }
    if (selectedCircuitId && !circuits.some((c) => c.id === selectedCircuitId)) {
      setSelectedCircuitId(circuits[0]?.id || '');
    }
  }, [circuits, selectedCircuitId]);

  const selectedCircuit = circuits.find((c) => c.id === selectedCircuitId) || null;
  const selectedCongregations = selectedCircuit
    ? congregations.filter((c) => c.circuitId === selectedCircuit.id)
    : [];
  const selectedLocations = selectedCircuit
    ? locations.filter((l) => l.circuitId === selectedCircuit.id)
    : [];

  const filteredCircuits = circuits.filter((c) =>
    c.name.toLowerCase().includes(sidebarSearch.toLowerCase()),
  );

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

  // ── Helper: get stats for a circuit ──
  const getCircuitStats = (circuitId: string) => {
    const congs = congregations.filter((c) => c.circuitId === circuitId);
    const locs = locations.filter((l) => l.circuitId === circuitId);
    const pubs = members.filter((m) => congs.some((c) => c.id === m.congregationId));
    return { congs: congs.length, locs: locs.length, pubs: pubs.length };
  };

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">Locations</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Manage circuits, congregations, and witnessing locations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => setFormDialog({ type: 'circuit' })}>
            <Plus className="h-4 w-4" /> Circuit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              const preselect = selectedCircuitId || circuits[0]?.id || '';
              setCongregationCircuitPick(preselect);
              setFormDialog({ type: 'congregation', circuitId: preselect });
            }}
          >
            <Plus className="h-4 w-4" /> Congregation
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const preselect = selectedCircuitId || circuits[0]?.id || '';
              setFormDialog({ type: 'location', circuitId: preselect });
            }}
          >
            <Plus className="h-4 w-4" /> Location
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setFormDialog({ type: 'timeslot' })}
          >
            <Plus className="h-4 w-4" /> Timeslot
          </Button>
        </div>
      </div>

      {/* ── Split layout: Sidebar + Detail ── */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-14rem)]">

        {/* ════════ LEFT SIDEBAR — Circuit list ════════ */}
        <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <div className="bg-white border border-neutral-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden sticky top-20">
            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-3 border-b border-neutral-100 bg-gradient-to-b from-slate-50/80 to-white">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-blue-600" />
                  Circuits
                </h2>
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] text-[11px] font-bold bg-blue-600 text-white rounded-md px-1.5 shadow-sm">
                  {circuits.length}
                </span>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search circuits…"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/80 py-1.5 pl-8 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                />
              </div>
            </div>

            {/* Circuit list */}
            <div className="max-h-[calc(100vh-20rem)] overflow-y-auto divide-y divide-neutral-100">
              {filteredCircuits.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                  <p className="text-sm text-neutral-400">
                    {circuits.length === 0 ? 'No circuits yet' : 'No circuits match your search'}
                  </p>
                </div>
              ) : (
                filteredCircuits.map((circuit) => {
                  const stats = getCircuitStats(circuit.id);
                  const isSelected = selectedCircuitId === circuit.id;
                  return (
                    <button
                      key={circuit.id}
                      onClick={() => setSelectedCircuitId(circuit.id)}
                      className={`w-full text-left px-4 py-3.5 transition-all duration-150 group relative ${
                        isSelected
                          ? 'bg-blue-50/70'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-600" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[13px] font-semibold truncate leading-snug ${
                              isSelected ? 'text-blue-700' : 'text-slate-800'
                            }`}
                          >
                            {circuit.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {circuit.city ? `${circuit.city} · ` : ''}
                            {circuit.coordinator}
                          </p>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 mt-0.5 flex-shrink-0 transition-transform ${
                            isSelected
                              ? 'text-blue-500 rotate-90'
                              : 'text-neutral-300 group-hover:text-neutral-400'
                          }`}
                        />
                      </div>
                      {/* Stat badges with labels */}
                      <div className="flex items-center gap-3 mt-2.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2 py-0.5 ${
                          isSelected ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Users className="h-3 w-3" />
                          {stats.congs}
                          <span className="text-[10px] font-normal opacity-75">Congs</span>
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2 py-0.5 ${
                          isSelected ? 'bg-amber-100/80 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <MapPin className="h-3 w-3" />
                          {stats.locs}
                          <span className="text-[10px] font-normal opacity-75">Locs</span>
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2 py-0.5 ${
                          isSelected ? 'bg-blue-100/80 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Hash className="h-3 w-3" />
                          {stats.pubs}
                          <span className="text-[10px] font-normal opacity-75">Pubs</span>
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Sidebar footer — global summary */}
            <div className="border-t border-neutral-200/80 bg-gradient-to-b from-slate-50/60 to-slate-100/40 px-4 py-3">
              <div className="grid grid-cols-3 text-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100/80 mb-1">
                    <Network className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p className="text-base font-bold text-slate-800 leading-none">{circuits.length}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Circuits</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-100/80 mb-1">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p className="text-base font-bold text-slate-800 leading-none">{congregations.length}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Congs</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-100/80 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <p className="text-base font-bold text-slate-800 leading-none">{locations.length}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Locations</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ════════ RIGHT PANEL — Detail content ════════ */}
        <main className="flex-1 min-w-0">
          {selectedCircuit ? (
            <div className="space-y-5">
              {/* ── Circuit header card ── */}
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-100 flex-shrink-0">
                          <Network className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xl tracking-tight truncate">{selectedCircuit.name}</CardTitle>
                          <CardDescription className="mt-0.5">
                            {selectedCircuit.city ? `${selectedCircuit.city} · ` : ''}Overseer: {selectedCircuit.coordinator}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setFormDialog({ type: 'circuit', circuit: selectedCircuit })}
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        onClick={() =>
                          setDeleteConfirm({ type: 'circuit', id: selectedCircuit.id, name: selectedCircuit.name })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {selectedCircuit.notes && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-neutral-500 leading-relaxed">{selectedCircuit.notes}</p>
                  </CardContent>
                )}
              </Card>

              {/* ── Stats strip ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Congregations</p>
                      <p className="text-2xl font-bold text-neutral-800 mt-0.5">{selectedCongregations.length}</p>
                    </div>
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-50">
                      <Users className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Locations</p>
                      <p className="text-2xl font-bold text-neutral-800 mt-0.5">{selectedLocations.length}</p>
                    </div>
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-amber-50">
                      <MapPin className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Publishers</p>
                      <p className="text-2xl font-bold text-neutral-800 mt-0.5">
                        {members.filter((m) => selectedCongregations.some((c) => c.id === m.congregationId)).length}
                      </p>
                    </div>
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50">
                      <Hash className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Timeslots</p>
                      <p className="text-2xl font-bold text-neutral-800 mt-0.5">
                        {timeslots.filter((t) => selectedLocations.some((l) => l.id === t.locationId)).length}
                      </p>
                    </div>
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-purple-50">
                      <Clock className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Congregations section ── */}
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50">
                        <Users className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Congregations</CardTitle>
                        <CardDescription className="text-xs">
                          {selectedCongregations.length} congregation{selectedCongregations.length !== 1 ? 's' : ''} in this circuit
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => {
                        setCongregationCircuitPick(selectedCircuit.id);
                        setFormDialog({ type: 'congregation', circuitId: selectedCircuit.id });
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedCongregations.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-neutral-200" />
                      <p className="text-sm text-neutral-400">No congregations yet. Add one to get started.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {selectedCongregations.map((congregation) => {
                        const congMembers = members.filter((m) => m.congregationId === congregation.id);
                        return (
                          <div
                            key={congregation.id}
                            className="group relative rounded-xl border border-neutral-200 bg-white p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-neutral-800 truncate">{congregation.name}</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                  {congMembers.length} publisher{congMembers.length !== 1 ? 's' : ''}
                                </p>
                                {congregation.overseers?.length > 0 && (
                                  <p className="text-xs text-neutral-400 mt-0.5 truncate">
                                    Overseers: {congregation.overseers.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() =>
                                    setFormDialog({
                                      type: 'congregation',
                                      circuitId: selectedCircuit.id,
                                      congregation,
                                    })
                                  }
                                >
                                  <Edit className="h-3.5 w-3.5 text-neutral-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: 'congregation',
                                      id: congregation.id,
                                      name: congregation.name,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Locations section ── */}
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-50">
                        <MapPin className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Locations</CardTitle>
                        <CardDescription className="text-xs">
                          {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} in this circuit
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => setFormDialog({ type: 'location', circuitId: selectedCircuit.id })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedLocations.length === 0 ? (
                    <div className="py-8 text-center">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-neutral-200" />
                      <p className="text-sm text-neutral-400">No locations yet. Add one to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedLocations.map((location) => {
                        const linkedCongNames = location.linkedCongregations
                          .map((cId) => congregations.find((c) => c.id === cId)?.name)
                          .filter(Boolean)
                          .join(', ');
                        const locationTimeslots = timeslots.filter((t) => t.locationId === location.id);
                        return (
                          <div
                            key={location.id}
                            className="group rounded-xl border border-neutral-200 bg-white p-4 hover:border-amber-200 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-neutral-800">{location.name}</p>
                                  {location.active ? (
                                    <span className="inline-flex items-center text-[10px] font-medium bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10px] font-medium bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full">
                                      Inactive
                                    </span>
                                  )}
                                  <span className="inline-flex items-center text-[10px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full">
                                    {location.category}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                  {location.city}
                                  {location.maxPublishers && ` · Max ${location.maxPublishers} publishers`}
                                </p>
                                {linkedCongNames && (
                                  <p className="text-xs text-neutral-400 mt-0.5">
                                    <span className="font-medium text-neutral-500">Linked:</span> {linkedCongNames}
                                  </p>
                                )}
                                {locationTimeslots.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {locationTimeslots.map((ts) => (
                                      <span
                                        key={ts.id}
                                        className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full"
                                      >
                                        <Clock className="h-2.5 w-2.5" />
                                        {ts.dayOfWeek.slice(0, 3)} {formatTime12h(ts.startTime)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() =>
                                    setFormDialog({
                                      type: 'location',
                                      circuitId: selectedCircuit.id,
                                      location,
                                    })
                                  }
                                >
                                  <Edit className="h-3.5 w-3.5 text-neutral-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: 'location',
                                      id: location.id,
                                      name: location.name,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Timeslots section ── */}
              {(() => {
                const circuitLocationIds = selectedLocations.map((l) => l.id);
                const circuitTimeslots = timeslots.filter((t) =>
                  circuitLocationIds.includes(t.locationId),
                );
                return (
                  <Card className="border-neutral-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-50">
                            <Clock className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Timeslots</CardTitle>
                            <CardDescription className="text-xs">
                              {circuitTimeslots.length} timeslot{circuitTimeslots.length !== 1 ? 's' : ''} across locations
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => setFormDialog({ type: 'timeslot' })}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {circuitTimeslots.length === 0 ? (
                        <div className="py-8 text-center">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-neutral-200" />
                          <p className="text-sm text-neutral-400">No timeslots yet. Add one to get started.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {circuitTimeslots.map((ts) => {
                            const loc = locations.find((l) => l.id === ts.locationId);
                            return (
                              <div
                                key={ts.id}
                                className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 hover:border-purple-200 hover:shadow-sm transition-all"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm text-neutral-800">
                                      {ts.dayOfWeek} · {formatTime12h(ts.startTime)} – {formatTime12h(ts.endTime)}
                                    </p>
                                    {!ts.active && (
                                      <span className="inline-flex items-center text-[10px] font-medium bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-500 mt-0.5">
                                    {loc?.name || 'Unknown location'} · {ts.requiredPublishers} publisher{ts.requiredPublishers !== 1 ? 's' : ''} required
                                  </p>
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setFormDialog({ type: 'timeslot', timeslot: ts })}
                                  >
                                    <Edit className="h-3.5 w-3.5 text-neutral-500" />
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
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-neutral-100 mx-auto mb-4">
                  <LayoutGrid className="h-8 w-8 text-neutral-300" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-700">
                  {circuits.length === 0 ? 'No circuits registered' : 'Select a circuit'}
                </h3>
                <p className="text-sm text-neutral-400 mt-1 max-w-xs mx-auto">
                  {circuits.length === 0
                    ? 'Add your first circuit to start organizing congregations and locations.'
                    : 'Click on a circuit from the sidebar to view its congregations and locations.'}
                </p>
                {circuits.length === 0 && (
                  <Button
                    className="mt-4 gap-1.5"
                    onClick={() => setFormDialog({ type: 'circuit' })}
                  >
                    <Plus className="h-4 w-4" /> Add Circuit
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
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

              {/* Circuit picker — shown when adding (not editing) */}
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

              {/* Only render the form once a circuit is chosen */}
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
