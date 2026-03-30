import { Calendar, CalendarDays, Ban, ArrowRightLeft } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';

export function PolicySummaryPanel() {
  const { schedulingPolicies } = useAppContext();

  const items = [
    {
      icon: Calendar,
      label: 'Weekly Limit',
      value: `${schedulingPolicies.weeklyLimit} per member`,
    },
    {
      icon: CalendarDays,
      label: 'Monthly Limit',
      value: `${schedulingPolicies.monthlyLimit} per member`,
    },
    {
      icon: Ban,
      label: 'Same-Day',
      value: schedulingPolicies.allowSameDayAssignments ? 'Allowed' : 'Not Allowed',
      warn: !schedulingPolicies.allowSameDayAssignments,
    },
    {
      icon: ArrowRightLeft,
      label: 'Consecutive Days',
      value: schedulingPolicies.allowConsecutiveDayAssignments ? 'Allowed' : 'Not Allowed',
      warn: !schedulingPolicies.allowConsecutiveDayAssignments,
    },
  ];

  return (
    <div
      className="rounded-[10px] px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5"
      style={{ backgroundColor: '#F8F9FB', border: '1px solid #E5E7EB' }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mr-1">
        Active Policies
      </span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[12px]">
          <item.icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: item.warn ? '#EF4444' : '#6B7280' }} />
          <span className="text-neutral-500">{item.label}:</span>
          <span
            className="font-medium"
            style={{ color: item.warn ? '#EF4444' : '#1F2937' }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
