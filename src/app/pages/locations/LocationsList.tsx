import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { LocationForm } from '../../components/forms/LocationForm';
import { useAppContext } from '../../hooks/useAppContext';
import {
  Search,
  Plus,
  MapPin,
  Network,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';

// Design tokens
const C = {
  accent: '#4F6BED',
  accentLight: '#EEF1FD',
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

export default function LocationsList() {
  const { circuits, locations, timeslots } = useAppContext();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [circuitFilter, setCircuitFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  // Quick Actions: auto-open create dialog when navigated with ?new=location or show hint for timeslot
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const action = searchParams.get('new');
    const hint = searchParams.get('hint');
    if (action === 'location') {
      setSearchParams({}, { replace: true });
      setFormOpen(true);
    } else if (hint === 'timeslot') {
      setSearchParams({}, { replace: true });
      import('sonner').then(({ toast }) =>
        toast.info('Select a location below, then open it to add a timeslot.')
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enrich locations with computed stats
  const enrichedLocations = useMemo(() => {
    return locations.map((loc) => {
      const circuit = circuits.find((c) => c.id === loc.circuitId);
      const linkedCongCount = loc.linkedCongregations.length;
      const timeslotCount = timeslots.filter((t) => t.locationId === loc.id).length;
      return {
        ...loc,
        circuitName: circuit?.name || 'Unknown',
        linkedCongCount,
        timeslotCount,
      };
    });
  }, [locations, circuits, timeslots]);

  // Apply search and circuit filter
  const filteredLocations = useMemo(() => {
    let result = enrichedLocations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.city.toLowerCase().includes(q) ||
          loc.circuitName.toLowerCase().includes(q),
      );
    }

    if (circuitFilter !== 'all') {
      result = result.filter((loc) => loc.circuitId === circuitFilter);
    }

    return result;
  }, [enrichedLocations, searchQuery, circuitFilter]);

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
            placeholder="Search locations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg py-2 pl-9 pr-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#4F6BED]/30"
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
        >
          <Plus className="h-3.5 w-3.5" /> New Location
        </Button>
      </div>

      {/* Summary */}
      <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
        {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
        {circuitFilter !== 'all' && ` in ${circuits.find((c) => c.id === circuitFilter)?.name}`}
      </p>

      {/* Locations table */}
      {filteredLocations.length === 0 ? (
        <div className="py-16 text-center">
          <MapPin className="h-10 w-10 mx-auto mb-3" style={{ color: C.border }} />
          <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
            {locations.length === 0 ? 'No locations registered yet' : 'No locations match your search'}
          </p>
          {locations.length === 0 && (
            <Button
              size="sm"
              className="mt-3 gap-1 text-white"
              style={{ backgroundColor: C.accent }}
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Location
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
            className="hidden sm:grid grid-cols-[1fr_160px_100px_100px_80px_32px] gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: C.headerBg,
              color: C.textSecondary,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span>Location</span>
            <span>Circuit</span>
            <span className="text-center">Congregations</span>
            <span className="text-center">Timeslots</span>
            <span className="text-center">Status</span>
            <span />
          </div>

          {/* Table rows */}
          <div style={{ backgroundColor: C.white }}>
            {filteredLocations.map((loc, i) => (
              <div
                key={loc.id}
                className="group grid grid-cols-1 sm:grid-cols-[1fr_160px_100px_100px_80px_32px] gap-1 sm:gap-3 items-center px-5 py-3 cursor-pointer transition-colors hover:bg-[#F7F8FA]"
                style={{
                  borderBottom:
                    i < filteredLocations.length - 1
                      ? `1px solid ${C.borderLight}`
                      : undefined,
                }}
                onClick={() => navigate(`/locations/detail/${loc.id}`)}
              >
                {/* Name + city */}
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: C.text }}
                  >
                    {loc.name}
                  </p>
                  <p
                    className="text-xs truncate sm:hidden"
                    style={{ color: C.textSecondary }}
                  >
                    {loc.circuitName} · {loc.city}
                  </p>
                  <p
                    className="text-xs truncate hidden sm:block"
                    style={{ color: C.textSecondary }}
                  >
                    {loc.city}
                    {loc.category && ` · ${loc.category}`}
                  </p>
                </div>

                {/* Circuit */}
                <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                  <Network className="h-3 w-3 flex-shrink-0" style={{ color: C.textMuted }} />
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: C.textSecondary }}
                  >
                    {loc.circuitName}
                  </span>
                </div>

                {/* Congregations count */}
                <div className="hidden sm:flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" style={{ color: C.textMuted }} />
                  <span className="text-sm font-medium" style={{ color: C.text }}>
                    {loc.linkedCongCount}
                  </span>
                </div>

                {/* Timeslots count */}
                <div className="hidden sm:flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" style={{ color: C.textMuted }} />
                  <span className="text-sm font-medium" style={{ color: C.text }}>
                    {loc.timeslotCount}
                  </span>
                </div>

                {/* Status */}
                <div className="hidden sm:flex justify-center">
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

                {/* Arrow */}
                <div className="hidden sm:flex justify-end">
                  <ChevronRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    style={{ color: C.textMuted }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create location dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>
              Create a new witnessing location.
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            onSuccess={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
