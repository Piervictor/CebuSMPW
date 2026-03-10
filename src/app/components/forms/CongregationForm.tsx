import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import {
  CreateCongregationSchema,
  UpdateCongregationSchema,
  zodFormResolver,
  type CongregationFormData,
  type CongregationUpdateData,
} from '../../../schemas';
import type { Congregation } from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import { AlertTriangle } from 'lucide-react';

interface CongregationFormProps {
  congregation?: Congregation;
  circuitId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CongregationForm({ congregation, circuitId, onSuccess, onCancel }: CongregationFormProps) {
  const { createCongregation, updateCongregation, isLoading, clearError } = useAppContext();
  const isEditMode = !!congregation;
  const schema = isEditMode ? UpdateCongregationSchema : CreateCongregationSchema;
  const [formError, setFormError] = useState<string | null>(null);

  // Clear stale context errors when form mounts
  useEffect(() => { clearError(); }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CongregationFormData | CongregationUpdateData>({
    resolver: zodFormResolver(schema),
    defaultValues: isEditMode
      ? {
          circuitId: congregation.circuitId,
          name: congregation.name,
          overseers: congregation.overseers,
          shiftsServed: congregation.shiftsServed,
          coverageRate: congregation.coverageRate,
        }
      : {
          circuitId,
          name: '',
          city: '',
          overseers: [],
          publisherCount: 0,
          shiftsServed: 0,
          coverageRate: 0,
        },
  });

  const onSubmit = async (data: CongregationFormData | CongregationUpdateData) => {
    setFormError(null);
    try {
      if (isEditMode && congregation) {
        await updateCongregation(congregation.id, data);
        toast.success('Congregation updated successfully');
      } else {
        await createCongregation({ ...data, circuitId } as CongregationFormData);
        toast.success('Congregation created successfully');
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
        <Label htmlFor="cong-name">Congregation Name *</Label>
        <Input
          id="cong-name"
          placeholder="e.g., Central Congregation"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || isLoading} className="flex-1">
          {isSubmitting || isLoading
            ? 'Saving...'
            : isEditMode
              ? 'Update Congregation'
              : 'Create Congregation'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
