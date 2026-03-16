import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../hooks/useAppContext';
import {
  Plus, CalendarPlus, UserPlus, MapPin, Clock, Building2, Network, ChevronDown,
} from 'lucide-react';

interface Action {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: string[];
}

const ACTIONS: Action[] = [
  { label: 'Create Schedule',    icon: CalendarPlus, href: '/scheduling',                           roles: ['circuit-admin', 'congregation-admin'] },
  { label: 'Add Member',         icon: UserPlus,     href: '/members?new=member',                  roles: ['circuit-admin', 'congregation-admin'] },
  { label: 'Add Location',       icon: MapPin,       href: '/locations?new=location',              roles: ['circuit-admin', 'congregation-admin'] },
  { label: 'Create Timeslot',    icon: Clock,        href: '/locations?hint=timeslot',             roles: ['circuit-admin', 'congregation-admin'] },
  { label: 'Add Congregation',   icon: Building2,    href: '/circuit-structure?new=congregation',  roles: ['circuit-admin'] },
  { label: 'Add Circuit',        icon: Network,      href: '/circuit-structure?new=circuit',       roles: ['circuit-admin'] },
];

export function QuickActions() {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleActions = ACTIONS.filter((a) =>
    currentUser ? a.roles.includes(currentUser.role) : false
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!visibleActions.length) return null;

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-white rounded-lg transition-opacity hover:opacity-90 active:opacity-80"
        style={{
          backgroundColor: '#4F6BED',
          borderRadius: '8px',
          padding: '7px 14px',
        }}
      >
        <Plus className="h-4 w-4" />
        New
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 w-52 rounded-[10px] overflow-hidden z-50"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div className="py-1.5">
            {visibleActions.map((action, idx) => {
              const Icon = action.icon;
              // separator before congregation/circuit group
              const showSeparator =
                idx > 0 && action.label === 'Add Congregation';
              return (
                <div key={action.label}>
                  {showSeparator && (
                    <div className="my-1 h-px mx-3" style={{ backgroundColor: '#E5E7EB' }} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(action.href);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium text-left transition-colors hover:bg-[#F1F3FF]"
                    style={{ color: '#1F2937' }}
                  >
                    <div
                      className="flex items-center justify-center h-7 w-7 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: '#F1F3FF' }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: '#4F6BED' }} />
                    </div>
                    {action.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
