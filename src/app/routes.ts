import { createHashRouter, redirect } from 'react-router';
import { MainLayout } from './components/layout/MainLayout';
import { AdminGuard, MemberGuard } from './components/RouteGuards';

// Lazy-load helper: react-router's `lazy` expects { Component }
const lazy = (importFn: () => Promise<{ default: React.ComponentType }>) => ({
  lazy: async () => {
    const mod = await importFn();
    return { Component: mod.default };
  },
});

// Layout components stay eager (tiny, always needed for nested routes)
import MembersLayout from './pages/members/MembersLayout';
import CongregationsLayout from './pages/congregations/CongregationsLayout';
import LocationsLayout from './pages/locations/LocationsLayout';
import SchedulingLayout from './pages/scheduling/SchedulingLayout';
import MemberPortalLayout from './pages/portal/MemberPortalLayout';
import SettingsLayout from './pages/settings/SettingsLayout';

export const router = createHashRouter([
  {
    path: '/',
    Component: MainLayout,
    children: [
      // ── Admin-only routes ─────────────────────────────────
      {
        Component: AdminGuard,
        children: [
          {
            index: true,
            ...lazy(() => import('./pages/Dashboard')),
          },
          {
            path: 'circuit-structure',
            ...lazy(() => import('./pages/CircuitStructure')),
          },
          {
            path: 'congregations',
            Component: CongregationsLayout,
            children: [
              {
                index: true,
                ...lazy(() => import('./pages/congregations/CongregationsList')),
              },
              {
                path: 'circuit-overview',
                ...lazy(() => import('./pages/locations/CircuitOverview')),
              },
              {
                path: 'detail/:id',
                ...lazy(() => import('./pages/congregations/CongregationDetail')),
              },
            ],
          },
          {
            path: 'locations',
            Component: LocationsLayout,
            children: [
              {
                index: true,
                ...lazy(() => import('./pages/locations/LocationsList')),
              },
              {
                path: 'circuit-overview',
                loader: () => redirect('/congregations/circuit-overview'),
              },
              {
                path: 'detail/:id',
                ...lazy(() => import('./pages/locations/LocationDetails')),
              },
            ],
          },
          {
            path: 'members',
            Component: MembersLayout,
            children: [
              {
                index: true,
                ...lazy(() => import('./pages/members/MemberDirectory')),
              },
              {
                path: 'availability',
                ...lazy(() => import('./pages/members/MemberAvailability')),
              },
              {
                path: 'participation',
                ...lazy(() => import('./pages/members/MemberParticipation')),
              },
              {
                path: 'groups',
                ...lazy(() => import('./pages/members/MemberGroups')),
              },
            ],
          },
          {
            path: 'scheduling',
            Component: SchedulingLayout,
            children: [
              {
                index: true,
                ...lazy(() => import('./pages/scheduling/MonthlySchedule')),
              },
              {
                path: 'vacant-slots',
                ...lazy(() => import('./pages/scheduling/VacantSlots')),
              },
              {
                path: 'assignments',
                ...lazy(() => import('./pages/scheduling/AssignmentManager')),
              },
              {
                path: 'history',
                ...lazy(() => import('./pages/scheduling/ServiceHistory')),
              },
              {
                path: 'calendar',
                ...lazy(() => import('./pages/scheduling/SchedulingCalendar')),
              },
            ],
          },
          {
            path: 'integrations',
            ...lazy(() => import('./pages/Integrations')),
          },
          {
            path: 'reports',
            ...lazy(() => import('./pages/Reports')),
          },
          {
            path: 'settings',
            Component: SettingsLayout,
            children: [
              {
                index: true,
                ...lazy(() => import('./pages/settings/BrandingSettings')),
              },
              {
                path: 'branding',
                ...lazy(() => import('./pages/settings/BrandingSettings')),
              },
              {
                path: 'scheduling-policies',
                ...lazy(() => import('./pages/settings/SchedulingPolicies')),
              },
            ],
          },
        ],
      },

      // ── Member-only routes ────────────────────────────────
      {
        Component: MemberGuard,
        children: [
          {
            path: 'my-schedule',
            ...lazy(() => import('./pages/MemberDashboard')),
          },
          {
            path: 'my-portal',
            Component: MemberPortalLayout,
            children: [
              {
                index: true,
                ...lazy(() => import('./pages/portal/MyDashboard')),
              },
              {
                path: 'assignments',
                ...lazy(() => import('./pages/portal/MyAssignments')),
              },
              {
                path: 'join',
                ...lazy(() => import('./pages/portal/JoinVacantSlots')),
              },
              {
                path: 'availability',
                ...lazy(() => import('./pages/portal/MyAvailability')),
              },
              {
                path: 'history',
                ...lazy(() => import('./pages/portal/MyHistory')),
              },
              {
                path: 'profile',
                ...lazy(() => import('./pages/portal/MyProfile')),
              },
            ],
          },
        ],
      },
      // Catch-all: redirect unmatched paths to dashboard
      {
        path: '*',
        loader: () => redirect('/'),
      },
    ],
  },
]);
