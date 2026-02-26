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
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { CreateLocationSchema, UpdateLocationSchema } from '../../schemas';
import type { LocationFormData, LocationUpdateData } from '../../schemas';
import type { Location } from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import { AlertTriangle } from 'lucide-react';

interface LocationFormProps {
  location?: Location;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LocationForm({ location, onSuccess, onCancel }: LocationFormProps) {
  const { createLocation, updateLocation, congregations, isLoading, error } = useAppContext();

  const isEditMode = !!location;
  const schema = isEditMode ? UpdateLocationSchema : CreateLocationSchema;

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
          name: location.name,
          category: location.category,
          city: location.city,
          linkedCongregations: location.linkedCongregations,
          ageGroup: location.ageGroup,
          experienceLevel: location.experienceLevel,
          maxPublishers: location.maxPublishers,
          active: location.active,
          notes: location.notes,
        }
      : {
          category: 'Plaza',
          ageGroup: 'All ages',
          experienceLevel: 'Any',
          active: true,
          maxPublishers: 3,
        },
  });

  const selectedCongregations = watch('linkedCongregations') || [];

  const onSubmit = async (data: LocationFormData | LocationUpdateData) => {
    try {
      if (isEditMode && location) {
        await updateLocation(location.id, data);
        toast.success('Location updated successfully');
      } else {
        await createLocation(data as LocationFormData);
        toast.success('Location created successfully');
        reset();
      }
      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Operation failed';
      toast.error(errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Location Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Location Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Central Plaza, City Hospital"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="city">City *</Label>
        <Input
          id="city"
          placeholder="e.g., Downtown, North District"
          {...register('city')}
          className={errors.city ? 'border-red-500' : ''}
        />
        {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select defaultValue={location?.category || 'Plaza'} {...register('category')}>
          <SelectTrigger id="category" className={errors.category ? 'border-red-500' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Hospital">Hospital</SelectItem>
            <SelectItem value="Plaza">Plaza</SelectItem>
            <SelectItem value="Terminal">Terminal</SelectItem>
            <SelectItem value="Mall">Mall</SelectItem>
          </SelectContent>
        </Select>
        {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
      </div>

      {/* Linked Congregations */}
      <div className="space-y-3">
        <Label>Linked Congregations * (Select at least one)</Label>
        <div className="space-y-2 border border-neutral-200 rounded-lg p-4">
          {congregations.length === 0 ? (
            <p className="text-sm text-neutral-500 italic">No congregations available</p>
          ) : (
            congregations.map((cong) => (
              <div key={cong.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`cong-${cong.id}`}
                  checked={selectedCongregations.includes(cong.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      register('linkedCongregations').onChange?.({
                        target: { value: [...selectedCongregations, cong.id] },
                      });
                    } else {
                      register('linkedCongregations').onChange?.({
                        target: {
                          value: selectedCongregations.filter((id) => id !== cong.id),
                        },
                      });
                    }
                  }}
                />
                <label htmlFor={`cong-${cong.id}`} className="text-sm cursor-pointer">
                  {cong.name} ({cong.city})
                </label>
              </div>
            ))
          )}
        </div>
        {errors.linkedCongregations && (
          <p className="text-sm text-red-500">{errors.linkedCongregations.message}</p>
        )}
      </div>

      {/* Age Group */}
      <div className="space-y-2">
        <Label htmlFor="ageGroup">Age Group Requirement</Label>
        <Select defaultValue={location?.ageGroup || 'All ages'} {...register('ageGroup')}>
          <SelectTrigger id="ageGroup">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All ages">All ages</SelectItem>
            <SelectItem value="Adults only">Adults only</SelectItem>
            <SelectItem value="Seniors excluded">Seniors excluded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Experience Level */}
      <div className="space-y-2">
        <Label htmlFor="experienceLevel">Experience Requirement</Label>
        <Select defaultValue={location?.experienceLevel || 'Any'} {...register('experienceLevel')}>
          <SelectTrigger id="experienceLevel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any">Any</SelectItem>
            <SelectItem value="Intermediate">Intermediate or Experienced</SelectItem>
            <SelectItem value="Experienced only">Experienced only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Max Publishers */}
      <div className="space-y-2">
        <Label htmlFor="maxPublishers">Maximum Publishers *</Label>
        <Input
          id="maxPublishers"
          type="number"
          min="1"
          max="10"
          placeholder="e.g., 3"
          {...register('maxPublishers', { valueAsNumber: true })}
          className={errors.maxPublishers ? 'border-red-500' : ''}
        />
        {errors.maxPublishers && (
          <p className="text-sm text-red-500">{errors.maxPublishers.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Special instructions, requirements, or observations..."
          rows={3}
          {...register('notes')}
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center space-x-2 p-3 bg-neutral-50 rounded-lg">
        <Checkbox
          id="active"
          defaultChecked={location?.active ?? true}
          {...register('active')}
        />
        <Label htmlFor="active" className="cursor-pointer mb-0">
          Active location (available for shift assignment)
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="flex-1"
        >
          {isSubmitting || isLoading ? 'Saving...' : isEditMode ? 'Update Location' : 'Create Location'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-neutral-500 text-center">
        * Required fields
      </p>
    </form>
  );
}
