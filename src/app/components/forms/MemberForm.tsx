import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Alert,
  AlertDescription,
} from '../ui/alert';
import { toast } from 'sonner';
import {
  CreateMemberSchema,
  UpdateMemberSchema,
  zodFormResolver,
} from '../../../schemas';
import type { MemberFormData, MemberUpdateData } from '../../../schemas';
import type { Member, WeekdayAvailability } from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import { AlertTriangle } from 'lucide-react';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri',
};
const AVAILABILITY_OPTIONS: WeekdayAvailability[] = ['Morning', 'Half Day Morning', 'Half Day Afternoon', 'Afternoon', 'Full Day', 'Evening', 'NA'];
const AVAILABILITY_LABELS: Record<string, string> = {
  'Morning': 'Morning',
  'Half Day Morning': 'HD AM',
  'Half Day Afternoon': 'HD PM',
  'Afternoon': 'Afternoon',
  'Full Day': 'Full Day',
  'Evening': 'Evening',
  'NA': 'NA',
};

const APPEARANCE_OPTIONS = ['Excellent', 'Good', 'Average'] as const;
const APPEARANCE_COLORS: Record<string, string> = {
  Excellent: 'border-green-400 bg-green-50 text-green-700',
  Good: 'border-blue-400 bg-blue-50 text-blue-700',
  Average: 'border-amber-400 bg-amber-50 text-amber-700',
};

const LOCATION_CATEGORIES: string[] = ['Hospital', 'Plaza', 'Terminal', 'Mall'];
const CATEGORY_COLORS: Record<string, string> = {
  Hospital: 'border-rose-400 bg-rose-50 text-rose-700',
  Plaza: 'border-sky-400 bg-sky-50 text-sky-700',
  Terminal: 'border-amber-400 bg-amber-50 text-amber-700',
  Mall: 'border-violet-400 bg-violet-50 text-violet-700',
};
const DEFAULT_CATEGORY_COLOR = 'border-teal-400 bg-teal-50 text-teal-700';

function calculateAge(dob: string): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface MemberFormProps {
  member?: Member;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MemberForm({ member, onSuccess, onCancel }: MemberFormProps) {
  const { createMember, updateMember, congregations, circuits, locationCategories, isLoading, clearError } = useAppContext();
  const isEditMode = !!member;
  const schema = isEditMode ? UpdateMemberSchema : CreateMemberSchema;
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { clearError(); }, [clearError]);

  const defaultAvailability = {
    monday: 'NA' as WeekdayAvailability,
    tuesday: 'NA' as WeekdayAvailability,
    wednesday: 'NA' as WeekdayAvailability,
    thursday: 'NA' as WeekdayAvailability,
    friday: 'NA' as WeekdayAvailability,
    saturdayDays: 0,
    sundayDays: 0,
  };

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MemberFormData | MemberUpdateData>({
    resolver: zodFormResolver(schema),
    defaultValues: isEditMode
      ? {
          surname: member.surname,
          firstName: member.firstName,
          middleInitial: member.middleInitial || '',
          circuitId: member.circuitId,
          congregationId: member.congregationId,
          dateOfBirth: member.dateOfBirth || '',
          age: member.age,
          status: member.status,
          appearance: member.appearance,
          language: member.language || '',
          availability: member.availability || defaultAvailability,
          phone: member.phone || '',
          email: member.email || '',
          ageGroup: member.ageGroup || 'Adult',
          experience: member.experience || 'New',
          weeklyLimit: member.weeklyLimit,
          monthlyLimit: member.monthlyLimit,
          weeklyReservations: member.weeklyReservations,
          monthlyReservations: member.monthlyReservations,
          preferredDays: member.preferredDays || [],
          preferredTimes: member.preferredTimes || [],
          preferredLocations: member.preferredLocations || [],
          suitableCategories: member.suitableCategories || [],
        }
      : {
          surname: '',
          firstName: '',
          middleInitial: '',
          circuitId: '',
          congregationId: '',
          dateOfBirth: '',
          status: 'Active',
          appearance: 'Good',
          language: '',
          availability: defaultAvailability,
          phone: '',
          email: '',
          ageGroup: 'Adult',
          experience: 'New',
          weeklyLimit: 2,
          monthlyLimit: 8,
          weeklyReservations: 0,
          monthlyReservations: 0,
          preferredDays: [],
          preferredTimes: [],
          preferredLocations: [],
          suitableCategories: [],
        },
  });

  const selectedCircuitId = watch('circuitId');
  const dateOfBirth = watch('dateOfBirth');

  // Auto-calculate age when DOB changes
  useEffect(() => {
    if (dateOfBirth) {
      const age = calculateAge(dateOfBirth);
      if (age !== undefined) setValue('age', age);
    }
  }, [dateOfBirth, setValue]);

  // Filter congregations by selected circuit
  const filteredCongregations = useMemo(
    () => selectedCircuitId
      ? congregations.filter((c) => c.circuitId === selectedCircuitId)
      : congregations,
    [selectedCircuitId, congregations]
  );

  // Reset congregation when circuit changes
  useEffect(() => {
    if (selectedCircuitId && !isEditMode) {
      const currentCong = watch('congregationId');
      const stillValid = filteredCongregations.some((c) => c.id === currentCong);
      if (!stillValid) setValue('congregationId', '');
    }
  }, [selectedCircuitId, filteredCongregations, setValue, isEditMode, watch]);

  const onSubmit = async (data: MemberFormData | MemberUpdateData) => {
    setFormError(null);
    try {
      // Compute display name
      const mi = (data as MemberFormData).middleInitial;
      const computedName = `${(data as MemberFormData).surname}, ${(data as MemberFormData).firstName}${mi ? ` ${mi}.` : ''}`;

      const payload = {
        ...data,
        name: computedName,
        age: data.dateOfBirth ? calculateAge(data.dateOfBirth) : undefined,
      };

      // Debug: verify availability is included in validated form data
      console.log('[MemberForm] onSubmit availability:', (data as MemberFormData).availability);

      if (isEditMode && member) {
        await updateMember(member.id, payload as Partial<Member>);
        toast.success('Member updated successfully');
      } else {
        await createMember(payload as Omit<Member, 'id'>);
        toast.success('Member created successfully');
        reset();
      }
      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Operation failed';
      setFormError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const onInvalid = (fieldErrors: Record<string, unknown>) => {
    const messages = Object.entries(fieldErrors)
      .map(([key, val]) => `${key}: ${(val as { message?: string })?.message || 'invalid'}`)
      .join(', ');
    toast.error(`Validation failed: ${messages}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {formError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* ─── Personal Information ─── */}
      <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
        <p className="text-sm font-semibold text-neutral-700">Personal Information</p>

        <div className="grid grid-cols-5 gap-3">
          {/* Surname */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="surname">Surname *</Label>
            <Input id="surname" placeholder="Dela Cruz" {...register('surname')} className={errors.surname ? 'border-red-500' : ''} />
            {errors.surname && <p className="text-xs text-red-500">{errors.surname.message}</p>}
          </div>
          {/* First Name */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" placeholder="Juan" {...register('firstName')} className={errors.firstName ? 'border-red-500' : ''} />
            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
          </div>
          {/* Middle Initial */}
          <div className="col-span-1 space-y-1">
            <Label htmlFor="middleInitial">Middle I.</Label>
            <Input id="middleInitial" placeholder="M" maxLength={5} {...register('middleInitial')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="phone">Contact #</Label>
            <Input id="phone" placeholder="09XX-XXX-XXXX" {...register('phone')} className={errors.phone ? 'border-red-500' : ''} />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="user@example.com" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
        </div>
      </div>

      {/* ─── Circuit & Congregation ─── */}
      <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
        <p className="text-sm font-semibold text-neutral-700">Assignment</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Circuit *</Label>
            <Controller
              name="circuitId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.circuitId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select circuit" />
                  </SelectTrigger>
                  <SelectContent>
                    {circuits.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.circuitId && <p className="text-xs text-red-500">{errors.circuitId.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Congregation *</Label>
            <Controller
              name="congregationId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!selectedCircuitId}>
                  <SelectTrigger className={errors.congregationId ? 'border-red-500' : ''}>
                    <SelectValue placeholder={selectedCircuitId ? 'Select congregation' : 'Select circuit first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCongregations.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.congregationId && <p className="text-xs text-red-500">{errors.congregationId.message}</p>}
          </div>
        </div>
      </div>

      {/* ─── Demographics ─── */}
      <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
        <p className="text-sm font-semibold text-neutral-700">Demographics</p>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" readOnly disabled value={dateOfBirth ? calculateAge(dateOfBirth) ?? '' : ''} className="bg-neutral-100" />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Appearance */}
          <div className="space-y-1">
            <Label>Appearance *</Label>
            <Controller
              name="appearance"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {APPEARANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => field.onChange(opt)}
                      className={`flex-1 py-2 px-2 text-xs font-medium rounded-md border-2 transition-all ${
                        field.value === opt
                          ? APPEARANCE_COLORS[opt]
                          : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.appearance && <p className="text-xs text-red-500">{errors.appearance.message}</p>}
          </div>
          {/* Language */}
          <div className="space-y-1">
            <Label htmlFor="language">Language</Label>
            <Input id="language" placeholder="e.g., English, Cebuano" {...register('language')} />
          </div>
        </div>
      </div>

      {/* ─── Availability Grid ─── */}
      <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
        <p className="text-sm font-semibold text-neutral-700">Weekly Availability</p>

        {/* Weekday availability */}
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-100">
                <th className="px-3 py-2 text-left font-medium text-neutral-600">Day</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-600">Availability</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((day) => (
                <tr key={day} className="border-t border-neutral-200">
                  <td className="px-3 py-2 font-medium text-neutral-700 w-16">
                    {WEEKDAY_LABELS[day]}
                  </td>
                  <td className="px-3 py-1">
                    <Controller
                      name={`availability.${day}`}
                      control={control}
                      render={({ field }) => (
                        <div className="flex gap-1 flex-wrap">
                          {AVAILABILITY_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              title={opt}
                              onClick={() => field.onChange(opt)}
                              className={`px-2 py-1 rounded text-xs transition-all ${
                                field.value === opt
                                  ? opt === 'NA'
                                    ? 'bg-neutral-500 text-white'
                                    : 'bg-blue-600 text-white'
                                  : 'bg-white border border-neutral-200 text-neutral-500 hover:border-blue-300'
                              }`}
                            >
                              {AVAILABILITY_LABELS[opt] || opt}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weekend availability (number of days) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="saturdayDays">Saturday (days available/month)</Label>
            <Controller
              name="availability.saturdayDays"
              control={control}
              render={({ field }) => (
                <Select value={String(field.value ?? 0)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'day' : 'days'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sundayDays">Sunday (days available/month)</Label>
            <Controller
              name="availability.sundayDays"
              control={control}
              render={({ field }) => (
                <Select value={String(field.value ?? 0)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'day' : 'days'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* ─── Suitable Location Categories ─── */}
      <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
        <p className="text-sm font-semibold text-neutral-700">Suitable Location Categories</p>
        <p className="text-xs text-neutral-500">Select location types this member is suited for. Used for scheduling prioritization.</p>
        <Controller
          name="suitableCategories"
          control={control}
          render={({ field }) => {
            const selected: string[] = (field.value as string[]) || [];
            const toggle = (cat: string) => {
              field.onChange(
                selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat],
              );
            };
            // Use dynamic categories from context, fallback to hardcoded defaults
            const categories = locationCategories.length > 0 ? locationCategories : LOCATION_CATEGORIES;
            return (
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggle(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border-2 transition-all ${
                      selected.includes(cat)
                        ? (CATEGORY_COLORS[cat] || DEFAULT_CATEGORY_COLOR)
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            );
          }}
        />
      </div>

      {/* ─── Form Actions ─── */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white -mx-2 px-2 py-4 border-t border-neutral-200">
        <Button type="submit" disabled={isSubmitting || isLoading} className="flex-1">
          {isSubmitting || isLoading ? 'Saving...' : isEditMode ? 'Update Member' : 'Add Member'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-neutral-500 text-center pb-4">
        * Required fields
      </p>
    </form>
  );
}
