import { useMemo, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Network, Users, MapPin, Clock, Hash, Pencil, Trash2 } from 'lucide-react';
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
import { CircuitForm } from '../../components/forms/CircuitForm';
import { toast } from 'sonner';
import type { Circuit } from '../../data/mockData';

// Design tokens
const C = {
  accent: '#4F6BED',
  accentLight: '#EEF1FD',
  white: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#10B981',
  warn: '#F59E0B',
  purple: '#7C3AED',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  shadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
};

export default function CircuitOverview() {
  const { circuits, congregations, locations, members, timeslots, deleteCircuit } = useAppContext();

  const [editCircuit, setEditCircuit] = useState<Circuit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Circuit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCircuit(deleteTarget.id);
      toast.success(`Circuit "${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete circuit');
    } finally {
      setIsDeleting(false);
    }
  };

  const circuitStats = useMemo(() => {
    return circuits.map((circuit) => {
      const congs = congregations.filter((c) => c.circuitId === circuit.id);
      const locs = locations.filter((l) => l.circuitId === circuit.id);
      const pubs = members.filter((m) => congs.some((c) => c.id === m.congregationId));
      const ts = timeslots.filter((t) => locs.some((l) => l.id === t.locationId));
      return {
        circuit,
        congregationCount: congs.length,
        publisherCount: pubs.length,
        locationCount: locs.length,
        timeslotCount: ts.length,
      };
    });
  }, [circuits, congregations, locations, members, timeslots]);

  if (circuits.length === 0) {
    return (
      <div className="py-16 text-center">
        <Network className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
        <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
          No circuits registered yet.
        </p>
        <p className="text-xs mt-1" style={{ color: C.textSecondary }}>
          Add circuits from the Circuit Structure page to see statistics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
        {circuits.length} circuit{circuits.length !== 1 ? 's' : ''} registered
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {circuitStats.map(({ circuit, congregationCount, publisherCount, locationCount, timeslotCount }) => (
          <div
            key={circuit.id}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.accent}`,
              boxShadow: C.shadow,
            }}
          >
            {/* Card header */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: `1px solid ${C.border}` }}
            >
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: C.accentLight }}
              >
                <Network className="h-4.5 w-4.5" style={{ color: C.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: C.text }}
                >
                  {circuit.name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: C.textMuted }}
                >
                  {circuit.coordinator}
                  {circuit.city && ` · ${circuit.city}`}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditCircuit(circuit)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                  title="Edit circuit"
                >
                  <Pencil className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(circuit)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                  title="Delete circuit"
                >
                  <Trash2 className="h-3.5 w-3.5" style={{ color: C.danger }} />
                </button>
              </div>
            </div>

            <div
              className="grid grid-cols-2"
            >
              {[
                {
                  label: 'Congregations',
                  value: congregationCount,
                  icon: Users,
                  color: C.purple,
                },
                {
                  label: 'Publishers',
                  value: publisherCount,
                  icon: Hash,
                  color: C.warn,
                },
                {
                  label: 'Locations',
                  value: locationCount,
                  icon: MapPin,
                  color: C.accent,
                },
                {
                  label: 'Timeslots',
                  value: timeslotCount,
                  icon: Clock,
                  color: C.success,
                },
              ].map((stat, idx) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2.5 px-4 py-3"
                  style={{
                    backgroundColor: C.white,
                    borderRight: idx % 2 === 0 ? `1px solid ${C.borderLight}` : undefined,
                    borderTop: idx >= 2 ? `1px solid ${C.borderLight}` : undefined,
                  }}
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${stat.color}14` }}
                  >
                    <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p
                      className="text-lg font-bold leading-tight"
                      style={{ color: C.text }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className="text-[10px] uppercase tracking-wider font-medium"
                      style={{ color: C.textSecondary }}
                    >
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Circuit Dialog */}
      <Dialog open={!!editCircuit} onOpenChange={(open) => !open && setEditCircuit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Circuit</DialogTitle>
            <DialogDescription>
              Update the details for {editCircuit?.name}.
            </DialogDescription>
          </DialogHeader>
          {editCircuit && (
            <CircuitForm
              circuit={editCircuit}
              onSuccess={() => setEditCircuit(null)}
              onCancel={() => setEditCircuit(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Circuit Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this circuit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and remove all
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Circuit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
