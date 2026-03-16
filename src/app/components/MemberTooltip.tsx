import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useAppContext } from '../hooks/useAppContext';
import { toLocalDateStr } from '../../lib/dateUtils';

interface Props {
  memberId: string;
  children: React.ReactNode;
}

export function MemberTooltip({ memberId, children }: Props) {
  const { members, congregations, shifts } = useAppContext();

  const tooltipData = useMemo(() => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return null;
    const congregation = congregations.find((c) => c.id === member.congregationId)?.name || 'Unknown';
    const todayStr = toLocalDateStr(new Date());
    const lastShift = shifts
      .filter((s) => s.assignedMembers.includes(memberId) && s.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      name: member.name,
      congregation,
      lastServed: lastShift?.date || null,
    };
  }, [memberId, members, congregations, shifts]);

  if (!tooltipData) return <>{children}</>;

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="px-3 py-2 text-left max-w-[220px]">
        <p className="text-[12px] font-semibold">{tooltipData.name}</p>
        <p className="text-[11px] opacity-80 mt-0.5">{tooltipData.congregation}</p>
        <p className="text-[11px] opacity-80 mt-0.5">
          {tooltipData.lastServed
            ? `Last served: ${fmtDate(tooltipData.lastServed)}`
            : 'No service record'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
