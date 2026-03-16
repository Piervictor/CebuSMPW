import { useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Network, Users, MapPin, Clock, Hash } from 'lucide-react';

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
  shadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
};

export default function CircuitOverview() {
  const { circuits, congregations, locations, members, timeslots } = useAppContext();

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
    </div>
  );
}
