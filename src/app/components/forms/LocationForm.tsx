import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { CreateLocationSchema, UpdateLocationSchema, zodFormResolver } from '../../../schemas';
import type { LocationFormData, LocationUpdateData } from '../../../schemas';
import type { Location } from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import { AlertTriangle } from 'lucide-react';

interface LocationFormProps {
  location?: Location;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LocationForm({ location, onSuccess, onCancel }: LocationFormProps) {
  const {
    createLocation,
    updateLocation,
    circuits,
    congregations,
    isLoading,
    clearError,
  } = useAppContext();
  const [formError, setFormError] = useState<string | null>(null);

  // Clear stale context errors when form mounts
  useEffect(() => { clearError(); }, [clearError]);

  const isEditMode = !!location;
  const schema = isEditMode ? UpdateLocationSchema : CreateLocationSchema;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LocationFormData | LocationUpdateData>({
    resolver: zodFormResolver(schema),
    defaultValues: isEditMode
      ? {
          circuitId: location.circuitId,
          name: location.name,
          category: location.category,
          city: location.city,
          linkedCongregations: location.linkedCongregations,
          active: location.active,
          notes: location.notes,
        }
      : {
          circuitId: '',
          name: '',
          category: 'Plaza',
          city: '',
          linkedCongregations: [],
          active: true,
          ageGroup: 'All ages',
          experienceLevel: 'Any',
          maxPublishers: 3,
          notes: '',
        },
  });

  const selectedCircuitId = watch('circuitId') || '';
  const selectedCongregations = watch('linkedCongregations') || [];
  const isActive = watch('active') ?? true;

  const availableCongregations = congregations.filter(
    (congregation) => congregation.circuitId === selectedCircuitId
  );

  useEffect(() => {
    if (!selectedCircuitId) {
      if (selectedCongregations.length > 0) {
        setValue('linkedCongregations', [], { shouldValidate: true, shouldDirty: true });
      }
      return;
    }

    const validCongregationIds = availableCongregations.map((congregation) => congregation.id);
    const nextCongregations = selectedCongregations.filter((congregationId) =>
      validCongregationIds.includes(congregationId)
    );

    if (nextCongregations.length !== selectedCongregations.length) {
      setValue('linkedCongregations', nextCongregations, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [availableCongregations, selectedCircuitId, selectedCongregations, setValue]);

  const onSubmit = async (data: LocationFormData | LocationUpdateData) => {
    setFormError(null);
    try {
      if (isEditMode && location) {
        const updateData: Partial<Location> = {
          ...data,
          notes: data.notes ?? '',
        };

        await updateLocation(location.id, updateData);
        toast.success('Location updated successfully');
      } else {
        const createData: Omit<Location, 'id'> = {
          ...(data as LocationFormData),
          notes: data.notes ?? '',
        };

        await createLocation(createData);
        toast.success('Location created successfully');
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
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="circuitId">Circuit *</Label>
        <Controller
          name="circuitId"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="circuitId" className={errors.circuitId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a circuit" />
              </SelectTrigger>
              <SelectContent>
                {circuits.map((circuit) => (
                  <SelectItem key={circuit.id} value={circuit.id}>
                    {circuit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.circuitId && <p className="text-sm text-red-500">{errors.circuitId.message}</p>}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
        {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
      </div>

      <div className="space-y-3">
        <Label>Linked Congregations * (same circuit only)</Label>
        <div className="space-y-2 border border-neutral-200 rounded-lg p-4">
          {!selectedCircuitId ? (
            <p className="text-sm text-neutral-500 italic">Select a circuit first</p>
          ) : availableCongregations.length === 0 ? (
            <p className="text-sm text-neutral-500 italic">No congregations available in this circuit</p>
          ) : (
            availableCongregations.map((congregation) => {
              const checked = selectedCongregations.includes(congregation.id);

              return (
                <div key={congregation.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cong-${congregation.id}`}
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      const nextValue = nextChecked
                        ? [...selectedCongregations, congregation.id]
                        : selectedCongregations.filter((id) => id !== congregation.id);

                      setValue('linkedCongregations', nextValue, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                  <label htmlFor={`cong-${congregation.id}`} className="text-sm cursor-pointer">
                    {congregation.name}{congregation.city ? ` (${congregation.city})` : ''}
                  </label>
                </div>
              );
            })
          )}
        </div>
        {errors.linkedCongregations && (
          <p className="text-sm text-red-500">{errors.linkedCongregations.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Special instructions, requirements, or observations..."
          rows={3}
          {...register('notes')}
        />
      </div>

      <div className="flex items-center space-x-2 p-3 bg-neutral-50 rounded-lg">
        <Checkbox
          id="active"
          checked={isActive}
          onCheckedChange={(checked) => {
            setValue('active', checked === true, { shouldDirty: true, shouldValidate: true });
          }}
        />
        <Label htmlFor="active" className="cursor-pointer mb-0">
          Active location (available for shift assignment)
        </Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting || isLoading} className="flex-1">
          {isSubmitting || isLoading ? 'Saving...' : isEditMode ? 'Update Location' : 'Create Location'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-neutral-500 text-center">* Required fields</p>
    </form>
  );
}
