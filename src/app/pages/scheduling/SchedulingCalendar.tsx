import { useState, useMemo, useEffect } from 'react';
import { SchedulingBreadcrumb } from '../../components/SchedulingBreadcrumb';
import { MemberTooltip } from '../../components/MemberTooltip';
import { toLocalDateStr } from '../../../lib/dateUtils';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useAppContext } from '../../hooks/useAppContext';
import type { Shift } from '../../data/mockData';
import {
  ChevronLeft, ChevronRight, MapPin, Clock, Users, Calendar, X,
} from 'lucide-react';

export default function SchedulingCalendar() {
  const { shifts, locations, members, getLocationById, loadShiftsForWeek } = useAppContext();
  const getMemberById = (id: string) => members.find((m) => m.id === id);

  const [monthOffset, setMonthOffset] = useState(0);
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const activeLocations = locations.filter((l) => l.active);

  const monthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [monthOffset]);

  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();

  // Load shifts for this month
  useEffect(() => {
    const monthStart = new Date(monthDate);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const cursor = new Date(monthStart);
    const day = cursor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    cursor.setDate(cursor.getDate() + diff);

    const weeks: string[] = [];
    while (cursor <= monthEnd) {
      weeks.push(toLocalDateStr(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }

    const locsToLoad = filterLocation !== 'all'
      ? [filterLocation]
      : activeLocations.map((l) => l.id);

    locsToLoad.forEach((locId) => {
      weeks.forEach((w) => loadShiftsForWeek(locId, w));
    });
  }, [monthDate.toISOString(), filterLocation, activeLocations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthStartStr = toLocalDateStr(monthDate);
  const monthEndStr = toLocalDateStr(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
  const todayStr = toLocalDateStr(new Date());

  const monthShifts = useMemo(() => {
    let filtered = shifts.filter((s) => s.date >= monthStartStr && s.date <= monthEndStr);
    if (filterLocation !== 'all') {
      filtered = filtered.filter((s) => s.locationId === filterLocation);
    }
    return filtered;
  }, [shifts, monthStartStr, monthEndStr, filterLocation]);

  const shiftsByDate = useMemo(() => {
    const groups: Record<string, Shift[]> = {};
    monthShifts.forEach((s) => {
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    });
    // Sort shifts within each day
    Object.values(groups).forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return groups;
  }, [monthShifts]);

  const selectedDateShifts = useMemo(() => {
    if (!selectedDate) return [];
    return (shiftsByDate[selectedDate] || []);
  }, [selectedDate, shiftsByDate]);

  const fmt12h = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const calendarCells = useMemo(() => {
    const cells: Array<{ date: string; day: number } | null> = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date, day: d });
    }
    return cells;
  }, [firstDayOfWeek, daysInMonth, monthDate]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const filledTotal = monthShifts.filter((s) => s.status === 'filled').length;
  const partialTotal = monthShifts.filter((s) => s.status === 'partial').length;
  const openTotal = monthShifts.filter((s) => s.status === 'open').length;

  return (
    <div className="space-y-4">
      <SchedulingBreadcrumb items={[
        { label: 'Scheduling', href: '/scheduling' },
        { label: 'Scheduling Calendar' },
      ]} />
      {/* ── Calendar Navigation Toolbar ── */}
      <div className="rounded-[10px] p-4 sticky top-14 z-10" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Month navigation */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#F1F3F9]"
                onClick={() => setMonthOffset(monthOffset - 1)}>
                <ChevronLeft className="h-4 w-4" style={{ color: '#6B7280' }} />
              </Button>
              <Button variant="outline" size="sm"
                className="text-[13px] font-semibold h-8 px-4 min-w-[170px] justify-center"
                style={{ borderColor: '#E5E7EB', color: '#1F2937' }}
                onClick={() => setMonthOffset(0)}>
                {monthOffset === 0 ? 'This Month' : monthLabel}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#F1F3F9]"
                onClick={() => setMonthOffset(monthOffset + 1)}>
                <ChevronRight className="h-4 w-4" style={{ color: '#6B7280' }} />
              </Button>
            </div>

            {monthOffset !== 0 && (
              <span className="text-[12px] hidden sm:inline" style={{ color: '#9CA3AF' }}>{monthLabel}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Location filter */}
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="h-9 text-[13px] w-full sm:w-[200px]" style={{ borderColor: '#E5E7EB' }}>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {activeLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Summary stats */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{filledTotal}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{partialTotal}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{openTotal}</span>
              </div>
              <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{monthShifts.length} shifts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Calendar Grid ── */}
        <div className="flex-1 rounded-[10px] overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#FAFBFC' }}>
            {weekdays.map((d) => (
              <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Empty state — no shifts this month */}
          {monthShifts.length === 0 && (
            <div className="py-16 text-center" style={{ borderTop: '1px solid #F3F4F6' }}>
              <div className="flex items-center justify-center h-14 w-14 rounded-[10px] mx-auto mb-3" style={{ backgroundColor: '#F1F3FF' }}>
                <Calendar className="h-7 w-7" style={{ color: '#4F6BED' }} />
              </div>
              <p className="text-[14px] font-semibold" style={{ color: '#1F2937' }}>No shifts scheduled this month.</p>
              <p className="text-[12px] mt-1 max-w-xs mx-auto" style={{ color: '#6B7280' }}>
                Configure time slots in the Locations page to generate shifts automatically.
              </p>
            </div>
          )}

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, i) => {
              if (!cell) {
                return (
                  <div key={`empty-${i}`} className="min-h-[110px]" style={{
                    borderBottom: '1px solid #F3F4F6',
                    borderRight: i % 7 !== 6 ? '1px solid #F3F4F6' : undefined,
                    backgroundColor: '#FAFBFC',
                  }} />
                );
              }

              const dayShifts = shiftsByDate[cell.date] || [];
              const isToday = cell.date === todayStr;
              const isSelected = cell.date === selectedDate;
              const maxVisible = 2;

              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                  className="min-h-[110px] p-1.5 text-left transition-all relative group"
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    borderRight: i % 7 !== 6 ? '1px solid #F3F4F6' : undefined,
                    backgroundColor: isSelected ? '#F1F3FF' : isToday ? '#FAFBFF' : undefined,
                    outline: isSelected ? '2px solid #4F6BED' : undefined,
                    outlineOffset: '-2px',
                  }}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[13px] font-medium leading-none ${isToday ? '' : ''}`}
                      style={{
                        color: isToday ? '#FFFFFF' : '#374151',
                        backgroundColor: isToday ? '#4F6BED' : undefined,
                        borderRadius: isToday ? '9999px' : undefined,
                        width: isToday ? '24px' : undefined,
                        height: isToday ? '24px' : undefined,
                        display: isToday ? 'flex' : undefined,
                        alignItems: isToday ? 'center' : undefined,
                        justifyContent: isToday ? 'center' : undefined,
                      }}>
                      {cell.day}
                    </span>
                    {dayShifts.length > 0 && (
                      <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#9CA3AF' }}>
                        {dayShifts.length}
                      </span>
                    )}
                  </div>

                  {/* Shift entries in cell */}
                  {dayShifts.length > 0 && (
                    <div className="space-y-0.5">
                      {dayShifts.slice(0, maxVisible).map((shift) => {
                        const loc = getLocationById(shift.locationId);
                        const statusColor = shift.status === 'filled' ? '#22C55E' : shift.status === 'open' ? '#EF4444' : '#F59E0B';
                        const memberNames = shift.assignedMembers
                          .map((id) => getMemberById(id)?.name.split(',')[0]?.trim() || '')
                          .filter(Boolean);

                        return (
                          <div key={shift.id} className="rounded-md px-1.5 py-1 transition-colors"
                            style={{ backgroundColor: shift.status === 'filled' ? '#F0FDF4' : shift.status === 'open' ? '#FEF2F2' : '#FFFBEB' }}>
                            {/* Location */}
                            <div className="flex items-center gap-1 mb-0.5">
                              <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                              <span className="text-[10px] font-medium truncate" style={{ color: '#1F2937' }}>
                                {loc?.name || 'Unknown'}
                              </span>
                            </div>
                            {/* Time */}
                            <p className="text-[9px] truncate pl-2.5" style={{ color: '#6B7280' }}>
                              {fmt12h(shift.startTime)}–{fmt12h(shift.endTime)}
                            </p>
                            {/* Assigned members */}
                            {memberNames.length > 0 && (
                              <p className="text-[9px] truncate pl-2.5" style={{ color: '#9CA3AF' }}>
                                {memberNames.length <= 2
                                  ? memberNames.join(', ')
                                  : `${memberNames[0]} +${memberNames.length - 1}`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {dayShifts.length > maxVisible && (
                        <p className="text-[9px] font-medium pl-1 group-hover:underline" style={{ color: '#4F6BED' }}>
                          +{dayShifts.length - maxVisible} more
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        {selectedDate && (
          <div className="w-full lg:w-80 rounded-[10px] overflow-hidden flex-shrink-0" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#FAFBFC' }}>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: '#1F2937' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'short', day: 'numeric',
                  })}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                  {selectedDateShifts.length} shift{selectedDateShifts.length !== 1 ? 's' : ''}
                  {selectedDateShifts.length > 0 && ` · ${selectedDateShifts.reduce((s, sh) => s + sh.assignedMembers.length, 0)} assigned`}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#F1F3F9]"
                onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" style={{ color: '#6B7280' }} />
              </Button>
            </div>

            <ScrollArea className="max-h-[500px]">
              {selectedDateShifts.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="h-10 w-10 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
                  <p className="text-[13px] font-medium" style={{ color: '#1F2937' }}>No shifts this day</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>No assignments scheduled for this date.</p>
                </div>
              ) : (
                <div>
                  {selectedDateShifts.map((shift, idx) => {
                    const loc = getLocationById(shift.locationId);
                    const isFilled = shift.status === 'filled';
                    const isOpen = shift.status === 'open';

                    return (
                      <div key={shift.id} className="p-4"
                        style={{ borderBottom: idx < selectedDateShifts.length - 1 ? '1px solid #F3F4F6' : undefined }}>
                        {/* Location */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                            <MapPin className="h-3.5 w-3.5" style={{ color: '#4F6BED' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold truncate" style={{ color: '#1F2937' }}>{loc?.name}</p>
                            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{loc?.city}{loc?.category ? ` · ${loc.category}` : ''}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{
                            backgroundColor: isFilled ? '#ECFDF5' : isOpen ? '#FEF2F2' : '#FFFBEB',
                            color: isFilled ? '#059669' : isOpen ? '#DC2626' : '#D97706',
                          }}>
                            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isFilled ? '#22C55E' : isOpen ? '#EF4444' : '#F59E0B' }} />
                            {shift.assignedMembers.length}/{shift.requiredCount}
                          </span>
                        </div>

                        {/* Time slot */}
                        <div className="flex items-center gap-1.5 mb-2 ml-9">
                          <Clock className="h-3 w-3" style={{ color: '#9CA3AF' }} />
                          <span className="text-[12px] tabular-nums" style={{ color: '#4B5563' }}>
                            {fmt12h(shift.startTime)} – {fmt12h(shift.endTime)}
                          </span>
                        </div>

                        {/* Assigned members */}
                        {shift.assignedMembers.length > 0 ? (
                          <div className="ml-9 space-y-1">
                            {shift.assignedMembers.map((memberId) => {
                              const member = getMemberById(memberId);
                              if (!member) return null;
                              return (
                                <MemberTooltip key={memberId} memberId={memberId}>
                                  <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F1F3FF' }}>
                                      <span className="text-[8px] font-semibold" style={{ color: '#4F6BED' }}>
                                        {member.name.split(',')[0]?.[0] || '?'}
                                      </span>
                                    </div>
                                    <span className="text-[11px] truncate" style={{ color: '#374151' }}>{member.name}</span>
                                  </div>
                                </MemberTooltip>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] ml-9" style={{ color: '#9CA3AF' }}>No members assigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
