import { useEffect, useState, useMemo } from 'react';
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
import { AlertTriangle, Users } from 'lucide-react';

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
          linkedCongregations: location.linkedCongregations ?? [],
          active: location.active,
          ageGroup: location.ageGroup ?? 'All ages',
          experienceLevel: location.experienceLevel ?? 'Any',
          maxPublishers: location.maxPublishers ?? 3,
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

  const isActive = watch('active') ?? true;
  const watchedCircuitId = watch('circuitId') ?? '';
  const watchedLinkedCongregations = (watch('linkedCongregations') ?? []) as string[];

  // Congregations belonging to the selected circuit
  const circuitCongregations = useMemo(
    () => congregations.filter((c) => c.circuitId === watchedCircuitId),
    [congregations, watchedCircuitId],
  );

  // When circuit changes, remove linked congregations that no longer belong
  useEffect(() => {
    if (!watchedCircuitId) return;
    const validIds = new Set(circuitCongregations.map((c) => c.id));
    const filtered = watchedLinkedCongregations.filter((id) => validIds.has(id));
    if (filtered.length !== watchedLinkedCongregations.length) {
      setValue('linkedCongregations', filtered, { shouldDirty: true });
    }
  }, [watchedCircuitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: LocationFormData | LocationUpdateData) => {
    setFormError(null);
    try {
      if (isEditMode && location) {
        const updateData: Partial<Location> = {
          ...data,
          linkedCongregations: (data as LocationFormData).linkedCongregations ?? location.linkedCongregations ?? [],
          notes: data.notes ?? '',
        };

        await updateLocation(location.id, updateData);
        toast.success('Location updated successfully');
      } else {
        const fd = data as LocationFormData;
        const createData: Omit<Location, 'id'> = {
          ...fd,
          linkedCongregations: fd.linkedCongregations ?? [],
          notes: fd.notes ?? '',
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
        <Label htmlFor="city">City</Label>
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

      {/* ── Linked Congregations (multi-select checkboxes) ── */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          Linked Congregations
        </Label>
        <p className="text-xs text-neutral-500 -mt-1">
          Only members from linked congregations will be available for scheduling at this location.
        </p>
        {!watchedCircuitId ? (
          <p className="text-xs text-amber-600 italic">Select a circuit first to see available congregations.</p>
        ) : circuitCongregations.length === 0 ? (
          <p className="text-xs text-amber-600 italic">No congregations found in the selected circuit.</p>
        ) : (
          <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-white">
            {circuitCongregations.map((cong) => {
              const isChecked = watchedLinkedCongregations.includes(cong.id);
              return (
                <div key={cong.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cong-${cong.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...watchedLinkedCongregations, cong.id]
                        : watchedLinkedCongregations.filter((id) => id !== cong.id);
                      setValue('linkedCongregations', updated, { shouldDirty: true });
                    }}
                  />
                  <Label htmlFor={`cong-${cong.id}`} className="cursor-pointer mb-0 text-sm font-normal">
                    {cong.name}{cong.city ? ` — ${cong.city}` : ''}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
        {watchedLinkedCongregations.length === 0 && watchedCircuitId && circuitCongregations.length > 0 && (
          <p className="text-xs text-amber-600">
            ⚠ No congregations linked — members won't appear in scheduling for this location.
          </p>
        )}
      </div>

      {/* ── Age Group ── */}
      <div className="space-y-2">
        <Label htmlFor="ageGroup">Age Group Restriction</Label>
        <Controller
          name="ageGroup"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? 'All ages'} onValueChange={field.onChange}>
              <SelectTrigger id="ageGroup">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All ages">All ages</SelectItem>
                <SelectItem value="Adults only">Adults only (exclude Youth)</SelectItem>
                <SelectItem value="Seniors excluded">Seniors excluded</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── Experience Level ── */}
      <div className="space-y-2">
        <Label htmlFor="experienceLevel">Experience Level</Label>
        <Controller
          name="experienceLevel"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? 'Any'} onValueChange={field.onChange}>
              <SelectTrigger id="experienceLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any experience</SelectItem>
                <SelectItem value="Intermediate">Intermediate & above</SelectItem>
                <SelectItem value="Experienced only">Experienced only</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── Max Publishers ── */}
      <div className="space-y-2">
        <Label htmlFor="maxPublishers">Max Publishers per Shift</Label>
        <Input
          id="maxPublishers"
          type="number"
          min={1}
          max={10}
          {...register('maxPublishers', { valueAsNumber: true })}
        />
        {errors.maxPublishers && <p className="text-sm text-red-500">{(errors.maxPublishers as { message?: string }).message}</p>}
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
