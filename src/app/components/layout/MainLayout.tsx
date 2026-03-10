import { Link, Outlet, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  Network,
  MessageSquare,
  BarChart3,
  User,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['circuit-admin', 'congregation-admin'] },
  { name: 'My Schedule', href: '/my-schedule', icon: User, roles: ['member'] },
  { name: 'Circuit Structure', href: '/circuit-structure', icon: Network, roles: ['circuit-admin'] },
  { name: 'Locations', href: '/locations', icon: MapPin, roles: ['circuit-admin', 'congregation-admin'] },
  { name: 'Members', href: '/members', icon: Users, roles: ['circuit-admin', 'congregation-admin'] },
  { name: 'Scheduling', href: '/scheduling', icon: Calendar, roles: ['circuit-admin', 'congregation-admin'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['circuit-admin', 'congregation-admin'] },
  { name: 'Integrations', href: '/integrations', icon: MessageSquare, roles: ['circuit-admin', 'congregation-admin'] },
];

export function MainLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return null;
  }

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-neutral-900">CartSmart Circuit</h1>
                <p className="text-xs text-neutral-500">Public Witnessing Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-900">{currentUser.name}</p>
                <p className="text-xs text-neutral-500 capitalize">{currentUser.role.replace('-', ' ')}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  {currentUser.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:pt-16">
        <div className="flex flex-col flex-grow bg-white border-r border-neutral-200 pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-blue-700' : 'text-neutral-500 group-hover:text-neutral-700'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-neutral-900/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white pt-20 pb-4 overflow-y-auto">
            <nav className="px-4 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive ? 'text-blue-700' : 'text-neutral-500 group-hover:text-neutral-700'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64 pt-16">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}