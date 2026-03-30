import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { CongregationForm } from '../../components/forms/CongregationForm';
import { useAppContext } from '../../hooks/useAppContext';
import {
  Search,
  Plus,
  Network,
  Users,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Congregation } from '../../data/mockData';

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
  shadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
};

export default function CongregationsList() {
  const { circuits, congregations, locations, members, deleteCongregation } = useAppContext();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [circuitFilter, setCircuitFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Congregation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Congregation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Enrich congregations with computed stats
  const enrichedCongregations = useMemo(() => {
    return congregations.map((cong) => {
      const circuit = circuits.find((c) => c.id === cong.circuitId);
      const memberCount = members.filter((m) => m.congregationId === cong.id).length;
      const linkedLocationCount = locations.filter((l) =>
        l.linkedCongregations.includes(cong.id),
      ).length;
      return {
        ...cong,
        circuitName: circuit?.name || 'Unknown',
        memberCount,
        linkedLocationCount,
      };
    });
  }, [congregations, circuits, members, locations]);

  // Apply search and circuit filter
  const filteredCongregations = useMemo(() => {
    let result = enrichedCongregations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (cong) =>
          cong.name.toLowerCase().includes(q) ||
          cong.circuitName.toLowerCase().includes(q) ||
          (cong.city && cong.city.toLowerCase().includes(q)),
      );
    }

    if (circuitFilter !== 'all') {
      result = result.filter((cong) => cong.circuitId === circuitFilter);
    }

    return result;
  }, [enrichedCongregations, searchQuery, circuitFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCongregation(deleteTarget.id);
      toast.success(`Congregation "${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete congregation');
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine circuitId for create form — use filter if set, otherwise first circuit
  const defaultCircuitId = circuitFilter !== 'all' ? circuitFilter : (circuits[0]?.id || '');

  return (
    <div className="space-y-4">
      {/* Toolbar: search, filter, create */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0 w-full sm:max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: C.textMuted }}
          />
          <input
            type="text"
            placeholder="Search congregations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg py-2 pl-9 pr-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
            style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              color: C.text,
            }}
          />
        </div>

        {/* Circuit filter */}
        <Select value={circuitFilter} onValueChange={setCircuitFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by circuit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Circuits</SelectItem>
            {circuits.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Create button */}
        <Button
          size="sm"
          className="gap-1.5 text-white shadow-sm whitespace-nowrap"
          style={{ backgroundColor: C.accent }}
          onClick={() => setFormOpen(true)}
          disabled={circuits.length === 0}
        >
          <Plus className="h-3.5 w-3.5" /> New Congregation
        </Button>
      </div>

      {/* Summary */}
      <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
        {filteredCongregations.length} congregation{filteredCongregations.length !== 1 ? 's' : ''} found
        {circuitFilter !== 'all' && ` in ${circuits.find((c) => c.id === circuitFilter)?.name}`}
      </p>

      {/* Congregations table */}
      {filteredCongregations.length === 0 ? (
        <div className="py-16 text-center">
          <Network className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
          <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
            {congregations.length === 0
              ? 'No congregations registered yet'
              : 'No congregations match your search'}
          </p>
          {congregations.length === 0 && circuits.length > 0 && (
            <Button
              size="sm"
              className="mt-3 gap-1 text-white"
              style={{ backgroundColor: C.accent }}
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Congregation
            </Button>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: `1px solid ${C.border}`, boxShadow: C.shadow }}
        >
          {/* Table header */}
          <div
            className="hidden sm:grid grid-cols-[1fr_160px_100px_100px_80px] gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: C.headerBg,
              color: C.textSecondary,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span>Congregation</span>
            <span>Circuit</span>
            <span className="text-center">Members</span>
            <span className="text-center">Locations</span>
            <span className="text-center">Actions</span>
          </div>

          {/* Table rows */}
          <div style={{ backgroundColor: C.white }}>
            {filteredCongregations.map((cong, i) => (
              <div
                key={cong.id}
                className="group grid grid-cols-1 sm:grid-cols-[1fr_160px_100px_100px_80px] gap-1 sm:gap-3 items-center px-5 py-3 cursor-pointer transition-colors hover:bg-[#F7F8FA]"
                style={{
                  borderBottom:
                    i < filteredCongregations.length - 1
                      ? `1px solid ${C.borderLight}`
                      : undefined,
                }}
                onClick={() => navigate(`/congregations/detail/${cong.id}`)}
              >
                {/* Name + city */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                    {cong.name}
                  </p>
                  <p className="text-xs truncate sm:hidden" style={{ color: C.textSecondary }}>
                    {cong.circuitName}
                    {cong.city && ` · ${cong.city}`}
                  </p>
                  <p className="text-xs truncate hidden sm:block" style={{ color: C.textSecondary }}>
                    {cong.city || 'No city specified'}
                  </p>
                </div>

                {/* Circuit */}
                <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                  <Network className="h-3 w-3 flex-shrink-0" style={{ color: C.textMuted }} />
                  <span className="text-xs font-medium truncate" style={{ color: C.textSecondary }}>
                    {cong.circuitName}
                  </span>
                </div>

                {/* Members count */}
                <div className="hidden sm:flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" style={{ color: C.textMuted }} />
                  <span className="text-sm font-medium" style={{ color: C.text }}>
                    {cong.memberCount}
                  </span>
                </div>

                {/* Linked locations count */}
                <div className="hidden sm:flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" style={{ color: C.textMuted }} />
                  <span className="text-sm font-medium" style={{ color: C.text }}>
                    {cong.linkedLocationCount}
                  </span>
                </div>

                {/* Actions */}
                <div className="hidden sm:flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditTarget(cong);
                    }}
                    className="h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-gray-100"
                    title="Edit congregation"
                  >
                    <Pencil className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(cong);
                    }}
                    className="h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-red-50"
                    title="Delete congregation"
                  >
                    <Trash2 className="h-3.5 w-3.5" style={{ color: C.danger }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create congregation dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Congregation</DialogTitle>
            <DialogDescription>
              Create a new congregation under a circuit.
            </DialogDescription>
          </DialogHeader>
          <CongregationForm
            circuitId={defaultCircuitId}
            onSuccess={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit congregation dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Congregation</DialogTitle>
            <DialogDescription>
              Update the details for {editTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <CongregationForm
              congregation={editTarget}
              circuitId={editTarget.circuitId}
              onSuccess={() => setEditTarget(null)}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this congregation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>.
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
