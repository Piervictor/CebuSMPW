import { Link, Outlet, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  CalendarDays,
  Clock,
  ClipboardList,
  History,
  Network,
  MessageSquare,
  BarChart3,
  User,
  Settings,
  Menu,
  X,
  ChevronDown,
  CalendarPlus,
  UserCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { GlobalSearch } from '../GlobalSearch';
import { QuickActions } from '../QuickActions';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  children?: { name: string; href: string; icon: React.ElementType }[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['circuit-admin', 'congregation-admin'] },
  {
    name: 'My Portal',
    href: '/my-portal',
    icon: User,
    roles: ['member'],
    children: [
      { name: 'Dashboard', href: '/my-portal', icon: LayoutDashboard },
      { name: 'My Assignments', href: '/my-portal/assignments', icon: ClipboardList },
      { name: 'Join Vacant Slots', href: '/my-portal/join', icon: CalendarPlus },
      { name: 'My Availability', href: '/my-portal/availability', icon: Clock },
      { name: 'My History', href: '/my-portal/history', icon: History },
      { name: 'My Profile', href: '/my-portal/profile', icon: UserCircle },
    ],
  },
  { name: 'My Schedule', href: '/my-schedule', icon: User, roles: ['member'] },
  { name: 'Circuit Structure', href: '/circuit-structure', icon: Network, roles: ['circuit-admin'] },
  {
    name: 'Congregations',
    href: '/congregations',
    icon: Network,
    roles: ['circuit-admin', 'congregation-admin'],
    children: [
      { name: 'Congregation List', href: '/congregations', icon: Network },
      { name: 'Circuit Overview', href: '/congregations/circuit-overview', icon: Network },
    ],
  },
  {
    name: 'Locations',
    href: '/locations',
    icon: MapPin,
    roles: ['circuit-admin', 'congregation-admin'],
    children: [
      { name: 'Locations List', href: '/locations', icon: MapPin },
    ],
  },
  {
    name: 'Members',
    href: '/members',
    icon: Users,
    roles: ['circuit-admin', 'congregation-admin'],
    children: [
      { name: 'Member Directory', href: '/members', icon: Users },
      { name: 'Availability', href: '/members/availability', icon: Clock },
      { name: 'Participation', href: '/members/participation', icon: BarChart3 },
      { name: 'Member Groups', href: '/members/groups', icon: ClipboardList },
    ],
  },
  {
    name: 'Scheduling',
    href: '/scheduling',
    icon: Calendar,
    roles: ['circuit-admin', 'congregation-admin'],
    children: [
      { name: 'Monthly Schedule', href: '/scheduling', icon: CalendarDays },
      { name: 'Vacant Slots', href: '/scheduling/vacant-slots', icon: Clock },
      { name: 'Assignment Manager', href: '/scheduling/assignments', icon: ClipboardList },
      { name: 'Service History', href: '/scheduling/history', icon: History },
      { name: 'Scheduling Calendar', href: '/scheduling/calendar', icon: Calendar },
    ],
  },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['circuit-admin', 'congregation-admin'] },
  { name: 'Integrations', href: '/integrations', icon: MessageSquare, roles: ['circuit-admin', 'congregation-admin'] },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['circuit-admin', 'congregation-admin'],
    children: [
      { name: 'Scheduling Policies', href: '/settings/scheduling-policies', icon: Calendar },
    ],
  },
];

export function MainLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (location.pathname.startsWith('/scheduling')) initial['Scheduling'] = true;
    if (location.pathname.startsWith('/congregations')) initial['Congregations'] = true;
    if (location.pathname.startsWith('/locations')) initial['Locations'] = true;
    if (location.pathname.startsWith('/members')) initial['Members'] = true;
    if (location.pathname.startsWith('/my-portal')) initial['My Portal'] = true;
    if (location.pathname.startsWith('/settings')) initial['Settings'] = true;
    return initial;
  });
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return null;
  }

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const renderNavItem = (item: NavItem, closeMobile?: () => void) => {
    if (item.children) {
      const isGroupActive = location.pathname.startsWith(item.href);
      const isOpen = openMenus[item.name] || isGroupActive;
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleMenu(item.name)}
            className={`w-full group flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
              isGroupActive
                ? 'text-white'
                : 'text-slate-300 hover:bg-white/8 hover:text-white'
            }`}
            style={isGroupActive ? { backgroundColor: '#4F6BED' } : undefined}
          >
            <div className="flex items-center">
              <item.icon
                className={`mr-2.5 flex-shrink-0 h-[18px] w-[18px] ${
                  isGroupActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`}
              />
              {item.name}
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isOpen ? 'rotate-180' : ''
              } ${isGroupActive ? 'text-white/70' : 'text-slate-500'}`}
            />
          </button>
          {isOpen && (
            <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-slate-600/40 pl-2.5">
              {item.children.map((child) => {
                const isChildActive = child.href === item.href
                  ? location.pathname === item.href
                  : location.pathname.startsWith(child.href);
                return (
                  <Link
                    key={child.href}
                    to={child.href}
                    onClick={closeMobile}
                    className={`group flex items-center px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                      isChildActive
                        ? 'bg-white/12 text-white'
                        : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                    }`}
                  >
                    <child.icon
                      className={`mr-2 flex-shrink-0 h-3.5 w-3.5 ${
                        isChildActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    {child.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={closeMobile}
        className={`group flex items-center px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
          isActive
            ? 'text-white'
            : 'text-slate-300 hover:bg-white/8 hover:text-white'
        }`}
        style={isActive ? { backgroundColor: '#4F6BED' } : undefined}
      >
        <item.icon
          className={`mr-2.5 flex-shrink-0 h-[18px] w-[18px] ${
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
          }`}
        />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#1F2A44', borderBottom: '1px solid #2D3A54' }}>
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4F6BED' }}>
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white leading-tight">CartSmart Circuit</h1>
                  <p className="text-[11px] text-slate-400 leading-tight">Public Witnessing Management</p>
                </div>
              </div>
            </div>
            <GlobalSearch />
            <QuickActions />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400 capitalize leading-tight">{currentUser.role.replace('-', ' ')}</p>
              </div>
              <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4F6BED' }}>
                <span className="text-xs font-semibold text-white">
                  {currentUser.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:pt-14">
        <div className="flex flex-col flex-grow pt-4 pb-4 overflow-y-auto" style={{ backgroundColor: '#1F2A44', borderRight: '1px solid #2D3A54' }}>
          <nav className="mt-2 flex-1 px-3 space-y-0.5">
            {filteredNavigation.map((item) => renderNavItem(item))}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-neutral-900/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-60 pt-18 pb-4 overflow-y-auto" style={{ backgroundColor: '#1F2A44' }}>
            <nav className="px-3 space-y-0.5">
              {filteredNavigation.map((item) =>
                renderNavItem(item, () => setMobileMenuOpen(false))
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-60 pt-14">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}