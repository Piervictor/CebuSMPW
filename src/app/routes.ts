import { createHashRouter, redirect } from 'react-router';
import { MainLayout } from './components/layout/MainLayout';
import { AdminGuard, MemberGuard } from './components/RouteGuards';
import Dashboard from './pages/Dashboard';
import CircuitStructure from './pages/CircuitStructure';
// Members module
import MembersLayout from './pages/members/MembersLayout';
import MemberDirectory from './pages/members/MemberDirectory';
import MemberAvailability from './pages/members/MemberAvailability';
import MemberParticipation from './pages/members/MemberParticipation';
import MemberGroups from './pages/members/MemberGroups';

// Congregations module
import CongregationsLayout from './pages/congregations/CongregationsLayout';
import CongregationsList from './pages/congregations/CongregationsList';
import CongregationDetail from './pages/congregations/CongregationDetail';

// Locations module
import LocationsLayout from './pages/locations/LocationsLayout';
import LocationsList from './pages/locations/LocationsList';
import CircuitOverview from './pages/locations/CircuitOverview';
import LocationDetails from './pages/locations/LocationDetails';
import MemberDashboard from './pages/MemberDashboard';
import Integrations from './pages/Integrations';
import Reports from './pages/Reports';
import SettingsLayout from './pages/settings/SettingsLayout';
import SchedulingPolicies from './pages/settings/SchedulingPolicies';

// Scheduling module
import SchedulingLayout from './pages/scheduling/SchedulingLayout';
import MonthlySchedule from './pages/scheduling/MonthlySchedule';
import VacantSlots from './pages/scheduling/VacantSlots';
import AssignmentManager from './pages/scheduling/AssignmentManager';
import ServiceHistory from './pages/scheduling/ServiceHistory';
import SchedulingCalendar from './pages/scheduling/SchedulingCalendar';

// Member Portal module
import MemberPortalLayout from './pages/portal/MemberPortalLayout';
import MyDashboard from './pages/portal/MyDashboard';
import MyAssignments from './pages/portal/MyAssignments';
import JoinVacantSlots from './pages/portal/JoinVacantSlots';
import MyAvailability from './pages/portal/MyAvailability';
import MyHistory from './pages/portal/MyHistory';
import MyProfile from './pages/portal/MyProfile';

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
            Component: Dashboard,
          },
          {
            path: 'circuit-structure',
            Component: CircuitStructure,
          },
          {
            path: 'congregations',
            Component: CongregationsLayout,
            children: [
              {
                index: true,
                Component: CongregationsList,
              },
              {
                path: 'circuit-overview',
                Component: CircuitOverview,
              },
              {
                path: 'detail/:id',
                Component: CongregationDetail,
              },
            ],
          },
          {
            path: 'locations',
            Component: LocationsLayout,
            children: [
              {
                index: true,
                Component: LocationsList,
              },
              {
                path: 'circuit-overview',
                loader: () => redirect('/congregations/circuit-overview'),
              },
              {
                path: 'detail/:id',
                Component: LocationDetails,
              },
            ],
          },
          {
            path: 'members',
            Component: MembersLayout,
            children: [
              {
                index: true,
                Component: MemberDirectory,
              },
              {
                path: 'availability',
                Component: MemberAvailability,
              },
              {
                path: 'participation',
                Component: MemberParticipation,
              },
              {
                path: 'groups',
                Component: MemberGroups,
              },
            ],
          },
          {
            path: 'scheduling',
            Component: SchedulingLayout,
            children: [
              {
                index: true,
                Component: MonthlySchedule,
              },
              {
                path: 'vacant-slots',
                Component: VacantSlots,
              },
              {
                path: 'assignments',
                Component: AssignmentManager,
              },
              {
                path: 'history',
                Component: ServiceHistory,
              },
              {
                path: 'calendar',
                Component: SchedulingCalendar,
              },
            ],
          },
          {
            path: 'integrations',
            Component: Integrations,
          },
          {
            path: 'reports',
            Component: Reports,
          },
          {
            path: 'settings',
            Component: SettingsLayout,
            children: [
              {
                index: true,
                Component: SchedulingPolicies,
              },
              {
                path: 'scheduling-policies',
                Component: SchedulingPolicies,
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
            Component: MemberDashboard,
          },
          {
            path: 'my-portal',
            Component: MemberPortalLayout,
            children: [
              {
                index: true,
                Component: MyDashboard,
              },
              {
                path: 'assignments',
                Component: MyAssignments,
              },
              {
                path: 'join',
                Component: JoinVacantSlots,
              },
              {
                path: 'availability',
                Component: MyAvailability,
              },
              {
                path: 'history',
                Component: MyHistory,
              },
              {
                path: 'profile',
                Component: MyProfile,
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
