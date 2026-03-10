import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import type { Timeslot, DayOfWeek } from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import { AlertTriangle, Plus, X } from 'lucide-react';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

/** Convert 24h "HH:MM" to 12h "H:MM AM/PM" */
function formatTime12h(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

/** Generate time options from 05:00 to 22:00 in 30-minute steps */
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 5; h <= 22; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();
const PUBLISHER_OPTIONS = [2, 3, 4, 5, 6];

interface TimeSlotEntry {
  startTime: string;
  endTime: string;
}

interface DayConfig {
  enabled: boolean;
  slots: TimeSlotEntry[];
}

type DaysState = Record<DayOfWeek, DayConfig>;

const DEFAULT_SLOT: TimeSlotEntry = { startTime: '08:00', endTime: '10:00' };

function buildInitialDays(timeslot?: Timeslot): DaysState {
  const base: DaysState = {} as DaysState;
  for (const day of DAYS_OF_WEEK) {
    base[day] = { enabled: false, slots: [{ ...DEFAULT_SLOT }] };
  }
  if (timeslot) {
    base[timeslot.dayOfWeek] = {
      enabled: true,
      slots: [{ startTime: timeslot.startTime, endTime: timeslot.endTime }],
    };
  }
  return base;
}

interface TimeslotFormProps {
  timeslot?: Timeslot;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TimeslotForm({ timeslot, onSuccess, onCancel }: TimeslotFormProps) {
  const { createTimeslot, updateTimeslot, locations, isLoading, clearError } = useAppContext();
  const isEditMode = !!timeslot;
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [locationId, setLocationId] = useState(timeslot?.locationId ?? '');
  const [days, setDays] = useState<DaysState>(() => buildInitialDays(timeslot));
  const [requiredPublishers, setRequiredPublishers] = useState(timeslot?.requiredPublishers ?? 2);
  const [active, setActive] = useState(timeslot?.active ?? true);

  useEffect(() => { clearError(); }, [clearError]);

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        // Reset to one default slot when re-enabling
        slots: prev[day].enabled ? prev[day].slots : [{ ...DEFAULT_SLOT }],
      },
    }));
  };

  const updateSlotTime = (day: DayOfWeek, slotIdx: number, field: 'startTime' | 'endTime', value: string) => {
    setDays((prev) => {
      const newSlots = [...prev[day].slots];
      newSlots[slotIdx] = { ...newSlots[slotIdx], [field]: value };
      return { ...prev, [day]: { ...prev[day], slots: newSlots } };
    });
  };

  const addSlot = (day: DayOfWeek) => {
    setDays((prev) => {
      const lastSlot = prev[day].slots[prev[day].slots.length - 1];
      // Default the next slot to start where the last one ended
      const newStart = lastSlot?.endTime || '10:00';
      // Try 2 hours later for end, cap at 22:00
      const startHour = parseInt(newStart.split(':')[0], 10);
      const newEnd = `${String(Math.min(startHour + 2, 22)).padStart(2, '0')}:00`;
      return {
        ...prev,
        [day]: { ...prev[day], slots: [...prev[day].slots, { startTime: newStart, endTime: newEnd }] },
      };
    });
  };

  const removeSlot = (day: DayOfWeek, slotIdx: number) => {
    setDays((prev) => {
      const newSlots = prev[day].slots.filter((_, i) => i !== slotIdx);
      // Keep at least one slot if day is enabled
      if (newSlots.length === 0) newSlots.push({ ...DEFAULT_SLOT });
      return { ...prev, [day]: { ...prev[day], slots: newSlots } };
    });
  };

  const validate = (): string | null => {
    if (!locationId) return 'Please select a location.';
    const enabledDays = DAYS_OF_WEEK.filter((d) => days[d].enabled);
    if (enabledDays.length === 0) return 'Please select at least one day.';
    for (const d of enabledDays) {
      for (let i = 0; i < days[d].slots.length; i++) {
        const { startTime, endTime } = days[d].slots[i];
        if (!startTime || !endTime)
          return `Please set start and end time for ${d} slot ${i + 1}.`;
        if (startTime >= endTime)
          return `End time must be after start time on ${d} slot ${i + 1}.`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const err = validate();
    if (err) {
      setFormError(err);
      toast.error(err);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && timeslot) {
        // Edit mode: single slot update
        const enabledDay = DAYS_OF_WEEK.find((d) => days[d].enabled)!;
        const slot = days[enabledDay].slots[0];
        await updateTimeslot(timeslot.id, {
          locationId,
          dayOfWeek: enabledDay,
          startTime: slot.startTime,
          endTime: slot.endTime,
          requiredPublishers,
          active,
        });
        toast.success('Timeslot updated successfully');
      } else {
        // Create mode: one DB row per day × slot
        let count = 0;
        const enabledDays = DAYS_OF_WEEK.filter((d) => days[d].enabled);
        for (const day of enabledDays) {
          for (const slot of days[day].slots) {
            await createTimeslot({
              locationId,
              dayOfWeek: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              requiredPublishers,
              active,
            });
            count++;
          }
        }
        toast.success(
          count === 1
            ? 'Timeslot created successfully'
            : `${count} timeslots created successfully`,
        );
      }
      onSuccess?.();
    } catch (submitErr) {
      const errorMsg = submitErr instanceof Error ? submitErr.message : 'Operation failed';
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeLocations = locations.filter((l) => l.active);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Location */}
      <div className="space-y-2">
        <Label>Location *</Label>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className={!locationId && formError ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select a location" />
          </SelectTrigger>
          <SelectContent>
            {activeLocations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name} — {loc.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Days of Week with multiple slots per day */}
      <div className="space-y-2">
        <Label>Available Days *</Label>
        <div className="space-y-3 rounded-lg border p-4">
          {DAYS_OF_WEEK.map((day) => {
            const cfg = days[day];
            return (
              <div key={day}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`day-${day}`}
                    checked={cfg.enabled}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <Label htmlFor={`day-${day}`} className="text-sm font-medium cursor-pointer select-none">
                    {day}
                  </Label>
                </div>

                {cfg.enabled && (
                  <div className="ml-8 mt-2 mb-1 space-y-2">
                    {cfg.slots.map((slot, idx) => (
                      <div key={idx} className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-neutral-500">Start</Label>
                          <Select value={slot.startTime} onValueChange={(v) => updateSlotTime(day, idx, 'startTime', v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{formatTime12h(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-neutral-500">End</Label>
                          <Select value={slot.endTime} onValueChange={(v) => updateSlotTime(day, idx, 'endTime', v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>{formatTime12h(t)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {cfg.slots.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50"
                            onClick={() => removeSlot(day, idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 mt-1"
                      onClick={() => addSlot(day)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add slot
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Required Publishers */}
      <div className="space-y-2">
        <Label>Required Publishers *</Label>
        <Select value={String(requiredPublishers)} onValueChange={(v) => setRequiredPublishers(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PUBLISHER_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label className="text-base">Active</Label>
          <p className="text-sm text-neutral-500">Enable this timeslot for scheduling</p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || isLoading} className="flex-1">
          {isSubmitting || isLoading
            ? 'Saving...'
            : isEditMode
              ? 'Update Timeslot'
              : 'Create Timeslot'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
