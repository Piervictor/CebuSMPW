import { NavLink, Outlet, useLocation } from 'react-router';
import { List, Network } from 'lucide-react';

const congregationsTabs = [
  { name: 'Congregation List', href: '/congregations', icon: List, end: true },
  { name: 'Circuit Overview', href: '/congregations/circuit-overview', icon: Network },
];

export default function CongregationsLayout() {
  const location = useLocation();
  const isDetailPage = location.pathname.includes('/congregations/detail/');

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#F3E8FF' }}
          >
            <Network className="h-[18px] w-[18px]" style={{ color: '#7C3AED' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#111827' }}>
              Congregations
            </h1>
            <p className="text-[13px] leading-snug" style={{ color: '#6B7280' }}>
              Manage congregations, view members, and linked locations.
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation — pill style (hidden on detail pages) */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        }}
      >
        {!isDetailPage && (
          <>
            <nav className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto">
              {congregationsTabs.map((tab) => (
                <NavLink
                  key={tab.href}
                  to={tab.href}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
                      isActive
                        ? 'border-[#7C3AED] text-[#7C3AED] bg-[#F3E8FF]'
                        : 'border-transparent text-[#6B7280] hover:text-[#111827] hover:bg-[#F7F8FA]'
                    }`
                  }
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.name}
                </NavLink>
              ))}
            </nav>
            <div style={{ borderBottom: '1px solid #E5E7EB' }} />
          </>
        )}

        {/* Sub-page content */}
        <div
          className="p-5"
          style={isDetailPage ? { backgroundColor: '#F7F8FA' } : undefined}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
