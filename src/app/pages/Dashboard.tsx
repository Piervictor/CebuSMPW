import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAppContext } from '../hooks/useAppContext';
import { toLocalDateStr } from '../../lib/dateUtils';
import {
  MapPin, Users, Building2, CalendarDays, CheckCircle2, AlertTriangle,
  Clock, CalendarPlus, UserPlus, ChevronRight, CircleAlert,
} from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  green: '#16A34A',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
  yellow: '#CA8A04',
  yellowBg: '#FEFCE8',
  yellowBorder: '#FDE68A',
  red: '#DC2626',
  redBg: '#FEF2F2',
  redBorder: '#FECACA',
  accent: '#4F6BED',
  accentBg: '#EEF1FD',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  bg: '#F9FAFB',
  white: '#FFFFFF',
  border: '#E5E7EB',
  cardShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
};

function statusColor(status: 'filled' | 'partial' | 'open') {
  if (status === 'filled') return { dot: T.green, bg: T.greenBg, border: T.greenBorder, label: 'Full' };
  if (status === 'partial') return { dot: T.yellow, bg: T.yellowBg, border: T.yellowBorder, label: 'Partial' };
  return { dot: T.red, bg: T.redBg, border: T.redBorder, label: 'Empty' };
}

export default function Dashboard() {
  const { locations, members, congregations, shifts, timeslots } = useAppContext();
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toLocalDateStr(today), [today]);

  // ── 1. Quick Summary ──────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthStartStr = toLocalDateStr(monthStart);
    const monthEndStr = toLocalDateStr(monthEnd);

    const monthShifts = shifts.filter((s) => s.date >= monthStartStr && s.date <= monthEndStr);
    const filled = monthShifts.filter((s) => s.status === 'filled').length;
    const vacant = monthShifts.filter((s) => s.status === 'open').length;

    return {
      totalLocations: locations.length,
      totalMembers: members.length,
      totalCongregations: congregations.length,
      totalSlots: monthShifts.length,
      filledSlots: filled,
      vacantSlots: vacant,
    };
  }, [locations, members, congregations, shifts, today]);

  // ── 2. Needs Attention ────────────────────────────────────────────────────
  const needsAttention = useMemo(() => {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = toLocalDateStr(weekEnd);

    const todayUnfilled = shifts.filter(
      (s) => s.date === todayStr && s.status !== 'filled',
    );

    const weekUnfilled = shifts.filter(
      (s) => s.date > todayStr && s.date <= weekEndStr && s.status !== 'filled',
    );

    const locationsWithShiftIds = new Set(shifts.map((s) => s.locationId));
    const noAssignments = locations.filter((l) => !locationsWithShiftIds.has(l.id));

    return { todayUnfilled, weekUnfilled, noAssignments };
  }, [shifts, locations, todayStr, today]);

  const attentionCount =
    needsAttention.todayUnfilled.length +
    needsAttention.weekUnfilled.length +
    needsAttention.noAssignments.length;

  // ── 3. Today Activity ─────────────────────────────────────────────────────
  const todayShifts = useMemo(() => {
    const todayData = shifts.filter((s) => s.date === todayStr);
    // group by location
    const grouped: Record<string, typeof todayData> = {};
    for (const s of todayData) {
      if (!grouped[s.locationId]) grouped[s.locationId] = [];
      grouped[s.locationId].push(s);
    }

    return Object.entries(grouped).map(([locId, locShifts]) => {
      const loc = locations.find((l) => l.id === locId);
      return {
        locationId: locId,
        locationName: loc?.name ?? 'Unknown',
        shifts: locShifts.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      };
    });
  }, [shifts, todayStr, locations]);

  // ── 4. Upcoming Activity (next 5 days) ────────────────────────────────────
  const upcoming = useMemo(() => {
    const days: { label: string; dateStr: string; vacant: number; partial: number }[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const ds = toLocalDateStr(d);
      const dayShifts = shifts.filter((s) => s.date === ds);
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dateStr: ds,
        vacant: dayShifts.filter((s) => s.status === 'open').length,
        partial: dayShifts.filter((s) => s.status === 'partial').length,
      });
    }
    return days;
  }, [shifts, today]);

  // ── Quick-action helper (reuses same routes as QuickActions component) ────
  const quickActions = [
    { label: 'Create Schedule', icon: CalendarPlus, href: '/scheduling' },
    { label: 'Add Member', icon: UserPlus, href: '/members?new=member' },
    { label: 'Add Location', icon: MapPin, href: '/locations?new=location' },
    { label: 'Add Congregation', icon: Building2, href: '/circuit-structure?new=congregation' },
  ];

  // ── Helper: location name by id ──────────────────────────────────────────
  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? 'Unknown';

  // ── Render ────────────────────────────────────────────────────────────────
  const summaryCards: { label: string; value: number; icon: React.ElementType; color: string; bgColor: string }[] = [
    { label: 'Total Locations', value: summary.totalLocations, icon: MapPin, color: '#3B82F6', bgColor: '#EFF6FF' },
    { label: 'Total Members', value: summary.totalMembers, icon: Users, color: '#8B5CF6', bgColor: '#F5F3FF' },
    { label: 'Total Congregations', value: summary.totalCongregations, icon: Building2, color: '#0EA5E9', bgColor: '#F0F9FF' },
    { label: 'Slots This Month', value: summary.totalSlots, icon: CalendarDays, color: '#6366F1', bgColor: '#EEF2FF' },
    { label: 'Filled Slots', value: summary.filledSlots, icon: CheckCircle2, color: T.green, bgColor: T.greenBg },
    { label: 'Vacant Slots', value: summary.vacantSlots, icon: AlertTriangle, color: T.red, bgColor: T.redBg },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: T.text }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: T.textSecondary }}>
          Scheduling overview &middot; {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* ── 1. Quick Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border" style={{ borderColor: T.border, boxShadow: T.cardShadow }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: c.bgColor }}
                  >
                    <Icon className="h-4 w-4" style={{ color: c.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[22px] font-semibold leading-tight" style={{ color: T.text }}>{c.value}</p>
                    <p className="text-[11px] font-medium truncate" style={{ color: T.textSecondary }}>{c.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── 2. Needs Attention ─────────────────────────────────────────────── */}
      <Card className="border" style={{ borderColor: attentionCount > 0 ? T.yellowBorder : T.greenBorder, boxShadow: T.cardShadow }}>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CircleAlert
            className="h-4.5 w-4.5 flex-shrink-0"
            style={{ color: attentionCount > 0 ? T.yellow : T.green }}
          />
          <CardTitle className="text-sm font-semibold" style={{ color: T.text }}>
            Needs Attention
            {attentionCount > 0 && (
              <span
                className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: T.yellow }}
              >
                {attentionCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {attentionCount === 0 ? (
            <p className="text-sm py-3" style={{ color: T.textSecondary }}>
              All clear — every slot is covered and all locations have assignments.
            </p>
          ) : (
            <div className="space-y-1.5 mt-1">
              {needsAttention.todayUnfilled.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/scheduling')}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#FEF9C3]/60"
                  style={{ backgroundColor: T.yellowBg }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="h-4 w-4 flex-shrink-0" style={{ color: T.red }} />
                    <span className="text-[13px] font-medium truncate" style={{ color: T.text }}>
                      {needsAttention.todayUnfilled.length} slot{needsAttention.todayUnfilled.length !== 1 ? 's' : ''} today not fully filled
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: T.textMuted }} />
                </button>
              )}

              {needsAttention.weekUnfilled.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/scheduling/vacant-slots')}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#FEF9C3]/60"
                  style={{ backgroundColor: T.yellowBg }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: T.yellow }} />
                    <span className="text-[13px] font-medium truncate" style={{ color: T.text }}>
                      {needsAttention.weekUnfilled.length} slot{needsAttention.weekUnfilled.length !== 1 ? 's' : ''} this week with missing members
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: T.textMuted }} />
                </button>
              )}

              {needsAttention.noAssignments.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/locations')}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#FEF2F2]/60"
                  style={{ backgroundColor: T.redBg }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: T.red }} />
                    <span className="text-[13px] font-medium truncate" style={{ color: T.text }}>
                      {needsAttention.noAssignments.length} location{needsAttention.noAssignments.length !== 1 ? 's' : ''} with no assignments
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: T.textMuted }} />
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Today Activity + 4. Upcoming Activity (side by side on lg) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Today Activity — wider column */}
        <Card className="lg:col-span-3 border" style={{ borderColor: T.border, boxShadow: T.cardShadow }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: T.text }}>
              Today&apos;s Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {todayShifts.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: T.textMuted }}>No shifts scheduled today.</p>
            ) : (
              <div className="space-y-3 mt-1">
                {todayShifts.map((group) => (
                  <div key={group.locationId}>
                    <p className="text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: T.textSecondary }}>
                      {group.locationName}
                    </p>
                    <div className="space-y-1">
                      {group.shifts.map((s) => {
                        const sc = statusColor(s.status);
                        return (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2"
                            style={{ backgroundColor: sc.bg, border: `1px solid ${sc.border}` }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: sc.dot }}
                              />
                              <span className="text-[13px] font-medium" style={{ color: T.text }}>
                                {s.startTime} – {s.endTime}
                              </span>
                            </div>
                            <span className="text-[12px] font-semibold" style={{ color: sc.dot }}>
                              {s.assignedMembers.length}/{s.requiredCount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Activity — narrower column */}
        <Card className="lg:col-span-2 border" style={{ borderColor: T.border, boxShadow: T.cardShadow }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: T.text }}>Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.every((d) => d.vacant === 0 && d.partial === 0) ? (
              <p className="text-sm py-6 text-center" style={{ color: T.textMuted }}>No upcoming slots need attention.</p>
            ) : (
              <div className="space-y-1.5 mt-1">
                {upcoming.map((d) => (
                  <div
                    key={d.dateStr}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: T.bg }}
                  >
                    <span className="text-[13px] font-medium" style={{ color: T.text }}>{d.label}</span>
                    <div className="flex items-center gap-3">
                      {d.vacant > 0 && (
                        <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: T.red }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.red }} />
                          {d.vacant} vacant
                        </span>
                      )}
                      {d.partial > 0 && (
                        <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: T.yellow }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.yellow }} />
                          {d.partial} partial
                        </span>
                      )}
                      {d.vacant === 0 && d.partial === 0 && (
                        <span className="text-[12px] font-medium" style={{ color: T.green }}>All filled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Quick Actions ───────────────────────────────────────────────── */}
      <Card className="border" style={{ borderColor: T.border, boxShadow: T.cardShadow }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: T.text }}>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => navigate(qa.href)}
                  className="flex items-center gap-2.5 rounded-lg px-3.5 py-3 text-left transition-colors hover:bg-[#F1F3FF]"
                  style={{ backgroundColor: T.accentBg }}
                >
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: T.accent }} />
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: T.text }}>{qa.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 6. Recent Activity ─────────────────────────────────────────────── */}
      <RecentActivity shifts={shifts} locName={locName} members={members} />
    </div>
  );
}

// ── Recent Activity (optional section) ──────────────────────────────────────
function RecentActivity({
  shifts,
  locName,
  members,
}: {
  shifts: { id: string; locationId: string; date: string; startTime: string; endTime: string; assignedMembers: string[]; assignedBy?: 'admin' | 'self'; status: string }[];
  locName: (id: string) => string;
  members: { id: string; name: string }[];
}) {
  // Build a synthetic activity feed from shift data
  const activities = useMemo(() => {
    const items: { id: string; text: string; time: string; color: string }[] = [];

    // Most recently modified shifts (those with assigned members) serve as activity signals
    const recentShifts = [...shifts]
      .filter((s) => s.assignedMembers.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
      .slice(0, 6);

    for (const s of recentShifts) {
      const mName = members.find((m) => m.id === s.assignedMembers[s.assignedMembers.length - 1])?.name ?? 'A member';
      const loc = locName(s.locationId);
      const isAdmin = s.assignedBy === 'admin';
      items.push({
        id: s.id,
        text: isAdmin
          ? `Admin assigned ${mName} to ${loc}`
          : `${mName} joined a slot at ${loc}`,
        time: `${s.date} ${s.startTime}`,
        color: isAdmin ? T.accent : T.green,
      });
    }

    // Also show recent open/partial as "cancelled" signals (up to 2)
    const recentOpen = [...shifts]
      .filter((s) => s.status === 'open' && s.assignedMembers.length === 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2);

    for (const s of recentOpen) {
      items.push({
        id: `cancel-${s.id}`,
        text: `Slot at ${locName(s.locationId)} is vacant (${s.date})`,
        time: s.date,
        color: T.red,
      });
    }

    return items.slice(0, 6);
  }, [shifts, members, locName]);

  if (activities.length === 0) return null;

  return (
    <Card className="border" style={{ borderColor: T.border, boxShadow: T.cardShadow }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold" style={{ color: T.text }}>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 mt-1">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 rounded-lg px-3 py-2" style={{ backgroundColor: T.bg }}>
              <span
                className="inline-block h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: a.color }}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: T.text }}>{a.text}</p>
                <p className="text-[11px]" style={{ color: T.textMuted }}>{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
