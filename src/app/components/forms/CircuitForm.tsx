import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import {
  CreateCircuitSchema,
  UpdateCircuitSchema,
  zodFormResolver,
  type CircuitFormData,
  type CircuitUpdateData,
} from '../../../schemas';
import type { Circuit } from '../../data/mockData';
import { useAppContext } from '../../hooks/useAppContext';
import { AlertTriangle } from 'lucide-react';

interface CircuitFormProps {
  circuit?: Circuit;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CircuitForm({ circuit, onSuccess, onCancel }: CircuitFormProps) {
  const { createCircuit, updateCircuit, isLoading, clearError } = useAppContext();
  const isEditMode = !!circuit;
  const schema = isEditMode ? UpdateCircuitSchema : CreateCircuitSchema;
  const [formError, setFormError] = useState<string | null>(null);

  // Clear stale context errors when form mounts
  useEffect(() => { clearError(); }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CircuitFormData | CircuitUpdateData>({
    resolver: zodFormResolver(schema),
    defaultValues: isEditMode
      ? {
          name: circuit.name,
          coordinator: circuit.coordinator,
          notes: circuit.notes ?? '',
        }
      : {
          name: '',
          city: '',
          coordinator: '',
          notes: '',
        },
  });

  const onSubmit = async (data: CircuitFormData | CircuitUpdateData) => {
    setFormError(null);
    try {
      if (isEditMode && circuit) {
        await updateCircuit(circuit.id, data);
        toast.success('Circuit updated successfully');
      } else {
        await createCircuit(data as CircuitFormData);
        toast.success('Circuit created successfully');
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
        <Label htmlFor="name">Circuit Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Metro Cebu South Circuit"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="coordinator">Circuit Overseer *</Label>
        <Input
          id="coordinator"
          placeholder="e.g., Brother Dela Cruz"
          {...register('coordinator')}
          className={errors.coordinator ? 'border-red-500' : ''}
        />
        {errors.coordinator && (
          <p className="text-sm text-red-500">{errors.coordinator.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={4}
          placeholder="Operational notes, areas covered, or coordinator guidance"
          {...register('notes')}
        />
        {errors.notes && <p className="text-sm text-red-500">{errors.notes.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || isLoading} className="flex-1">
          {isSubmitting || isLoading ? 'Saving...' : isEditMode ? 'Update Circuit' : 'Create Circuit'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
