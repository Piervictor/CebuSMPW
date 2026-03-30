import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useAppContext } from '../../hooks/useAppContext';
import type { SchedulingPolicies as SchedulingPoliciesType } from '../../data/mockData';

const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

export default function SchedulingPolicies() {
  const { schedulingPolicies, updateSchedulingPolicies } = useAppContext();
  const [formState, setFormState] = useState<SchedulingPoliciesType>(schedulingPolicies);

  useEffect(() => {
    setFormState(schedulingPolicies);
  }, [schedulingPolicies]);

  const handleSave = () => {
    updateSchedulingPolicies(formState);
    toast.success('Scheduling policies updated');
  };

  const updateField = (field: keyof SchedulingPoliciesType, value: number | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Scheduling Policies</h1>
        <p className="text-neutral-600 mt-1">
          Define global assignment limits and rules applied across scheduling.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Limits</CardTitle>
          <CardDescription>Control how many shifts a member can be assigned.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="weekly-limit">Weekly Assignment Limit per Member</Label>
              <Input
                id="weekly-limit"
                type="number"
                min={1}
                max={14}
                value={formState.weeklyLimit}
                onChange={(e) =>
                  updateField('weeklyLimit', clampNumber(parseInt(e.target.value, 10), 1, 14))
                }
              />
              <p className="text-xs text-neutral-500">
                Example: 2 means a member can be assigned up to 2 shifts each week.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-limit">Monthly Assignment Limit per Member</Label>
              <Input
                id="monthly-limit"
                type="number"
                min={1}
                max={60}
                value={formState.monthlyLimit}
                onChange={(e) =>
                  updateField('monthlyLimit', clampNumber(parseInt(e.target.value, 10), 1, 60))
                }
              />
              <p className="text-xs text-neutral-500">
                Example: 8 means a member can be assigned up to 8 shifts per month.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Rules</CardTitle>
          <CardDescription>Control how assignments behave within the calendar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-neutral-200">
            <div>
              <p className="font-medium text-neutral-900">Allow multiple assignments per day</p>
              <p className="text-sm text-neutral-600">
                When disabled, members cannot be assigned to more than one shift on the same date.
              </p>
            </div>
            <Switch
              checked={formState.allowSameDayAssignments}
              onCheckedChange={(checked) => updateField('allowSameDayAssignments', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-neutral-900">Allow assignments on consecutive days</p>
              <p className="text-sm text-neutral-600">
                When disabled, members cannot be scheduled on back-to-back days.
              </p>
            </div>
            <Switch
              checked={formState.allowConsecutiveDayAssignments}
              onCheckedChange={(checked) => updateField('allowConsecutiveDayAssignments', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <Button onClick={handleSave}>Save Scheduling Policies</Button>
      </div>
    </div>
  );
}
