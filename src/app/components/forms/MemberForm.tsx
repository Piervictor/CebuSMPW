import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { CreateMemberSchema, UpdateMemberSchema } from '../../schemas';
import type { MemberFormData, MemberUpdateData } from '../../schemas';
import type { Member } from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import { AlertTriangle } from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES_OF_DAY = ['Morning', 'Afternoon', 'Evening'];

interface MemberFormProps {
  member?: Member;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MemberForm({ member, onSuccess, onCancel }: MemberFormProps) {
  const { createMember, updateMember, congregations, locations, isLoading, error } = useAppContext();

  const isEditMode = !!member;
  const schema = isEditMode ? UpdateMemberSchema : CreateMemberSchema;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEditMode
      ? {
          name: member.name,
          congregationId: member.congregationId,
          ageGroup: member.ageGroup,
          experience: member.experience,
          weeklyReservations: member.weeklyReservations,
          monthlyReservations: member.monthlyReservations,
          weeklyLimit: member.weeklyLimit,
          monthlyLimit: member.monthlyLimit,
          telegramHandle: member.telegramHandle,
          email: member.email,
          phone: member.phone,
          languageGroup: member.languageGroup,
          preferredDays: member.preferredDays,
          preferredTimes: member.preferredTimes,
          preferredLocations: member.preferredLocations,
        }
      : {
          ageGroup: 'Adult',
          experience: 'New',
          weeklyLimit: 2,
          monthlyLimit: 8,
          weeklyReservations: 0,
          monthlyReservations: 0,
          preferredDays: [],
          preferredTimes: [],
          preferredLocations: [],
        },
  });

  const selectedDays = watch('preferredDays') || [];
  const selectedTimes = watch('preferredTimes') || [];
  const selectedLocations = watch('preferredLocations') || [];

  const onSubmit = async (data: MemberFormData | MemberUpdateData) => {
    try {
      if (isEditMode && member) {
        await updateMember(member.id, data);
        toast.success('Member updated successfully');
      } else {
        await createMember(data as MemberFormData);
        toast.success('Member created successfully');
        reset();
      }
      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Operation failed';
      toast.error(errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Member Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Sarah Thompson"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      {/* Congregation */}
      <div className="space-y-2">
        <Label htmlFor="congregationId">Congregation *</Label>
        <Select defaultValue={member?.congregationId || ''} {...register('congregationId')}>
          <SelectTrigger id="congregationId" className={errors.congregationId ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select a congregation" />
          </SelectTrigger>
          <SelectContent>
            {congregations.map((cong) => (
              <SelectItem key={cong.id} value={cong.id}>
                {cong.name} ({cong.city})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.congregationId && (
          <p className="text-sm text-red-500">{errors.congregationId.message}</p>
        )}
      </div>

      {/* Age Group */}
      <div className="space-y-2">
        <Label htmlFor="ageGroup">Age Group *</Label>
        <Select defaultValue={member?.ageGroup || 'Adult'} {...register('ageGroup')}>
          <SelectTrigger id="ageGroup" className={errors.ageGroup ? 'border-red-500' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Youth">Youth</SelectItem>
            <SelectItem value="Adult">Adult</SelectItem>
            <SelectItem value="Senior">Senior</SelectItem>
          </SelectContent>
        </Select>
        {errors.ageGroup && <p className="text-sm text-red-500">{errors.ageGroup.message}</p>}
      </div>

      {/* Experience */}
      <div className="space-y-2">
        <Label htmlFor="experience">Experience Level *</Label>
        <Select defaultValue={member?.experience || 'New'} {...register('experience')}>
          <SelectTrigger id="experience" className={errors.experience ? 'border-red-500' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Experienced">Experienced</SelectItem>
          </SelectContent>
        </Select>
        {errors.experience && <p className="text-sm text-red-500">{errors.experience.message}</p>}
      </div>

      {/* Weekly Limit */}
      <div className="space-y-2">
        <Label htmlFor="weeklyLimit">Weekly Shift Limit *</Label>
        <Input
          id="weeklyLimit"
          type="number"
          min="1"
          max="7"
          {...register('weeklyLimit', { valueAsNumber: true })}
          className={errors.weeklyLimit ? 'border-red-500' : ''}
        />
        {errors.weeklyLimit && (
          <p className="text-sm text-red-500">{errors.weeklyLimit.message}</p>
        )}
      </div>

      {/* Monthly Limit */}
      <div className="space-y-2">
        <Label htmlFor="monthlyLimit">Monthly Shift Limit *</Label>
        <Input
          id="monthlyLimit"
          type="number"
          min="1"
          max="30"
          {...register('monthlyLimit', { valueAsNumber: true })}
          className={errors.monthlyLimit ? 'border-red-500' : ''}
        />
        {errors.monthlyLimit && (
          <p className="text-sm text-red-500">{errors.monthlyLimit.message}</p>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
        <p className="text-sm font-medium text-neutral-700">Contact Information</p>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="+1 (555) 000-0000"
            {...register('phone')}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telegramHandle">Telegram Handle</Label>
          <Input
            id="telegramHandle"
            placeholder="@username"
            {...register('telegramHandle')}
            className={errors.telegramHandle ? 'border-red-500' : ''}
          />
          {errors.telegramHandle && (
            <p className="text-sm text-red-500">{errors.telegramHandle.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="languageGroup">Languages</Label>
          <Input
            id="languageGroup"
            placeholder="e.g., English, Spanish"
            {...register('languageGroup')}
          />
        </div>
      </div>

      {/* Preferred Days */}
      <div className="space-y-3">
        <Label>Preferred Days * (Select at least one)</Label>
        <div className="grid grid-cols-2 gap-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={`day-${day}`}
                checked={selectedDays.includes(day)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    register('preferredDays').onChange?.({
                      target: { value: [...selectedDays, day] },
                    });
                  } else {
                    register('preferredDays').onChange?.({
                      target: { value: selectedDays.filter((d) => d !== day) },
                    });
                  }
                }}
              />
              <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">
                {day}
              </label>
            </div>
          ))}
        </div>
        {errors.preferredDays && (
          <p className="text-sm text-red-500">{errors.preferredDays.message}</p>
        )}
      </div>

      {/* Preferred Times */}
      <div className="space-y-3">
        <Label>Preferred Times * (Select at least one)</Label>
        <div className="grid grid-cols-3 gap-3">
          {TIMES_OF_DAY.map((time) => (
            <div key={time} className="flex items-center space-x-2">
              <Checkbox
                id={`time-${time}`}
                checked={selectedTimes.includes(time)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    register('preferredTimes').onChange?.({
                      target: { value: [...selectedTimes, time] },
                    });
                  } else {
                    register('preferredTimes').onChange?.({
                      target: { value: selectedTimes.filter((t) => t !== time) },
                    });
                  }
                }}
              />
              <label htmlFor={`time-${time}`} className="text-sm cursor-pointer">
                {time}
              </label>
            </div>
          ))}
        </div>
        {errors.preferredTimes && (
          <p className="text-sm text-red-500">{errors.preferredTimes.message}</p>
        )}
      </div>

      {/* Preferred Locations */}
      <div className="space-y-3">
        <Label>Preferred Locations (Optional)</Label>
        <div className="space-y-2 border border-neutral-200 rounded-lg p-3 max-h-40 overflow-y-auto">
          {locations.length === 0 ? (
            <p className="text-sm text-neutral-500 italic">No locations available</p>
          ) : (
            locations.map((loc) => (
              <div key={loc.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`loc-${loc.id}`}
                  checked={selectedLocations.includes(loc.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      register('preferredLocations').onChange?.({
                        target: { value: [...selectedLocations, loc.id] },
                      });
                    } else {
                      register('preferredLocations').onChange?.({
                        target: {
                          value: selectedLocations.filter((id) => id !== loc.id),
                        },
                      });
                    }
                  }}
                />
                <label htmlFor={`loc-${loc.id}`} className="text-sm cursor-pointer">
                  {loc.name}
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white -mx-4 px-4 py-4 border-t border-neutral-200">
        <Button type="submit" disabled={isSubmitting || isLoading} className="flex-1">
          {isSubmitting || isLoading ? 'Saving...' : isEditMode ? 'Update Member' : 'Create Member'}
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
