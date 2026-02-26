import { createBrowserRouter } from 'react-router';
import { MainLayout } from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import CircuitStructure from './pages/CircuitStructure';
import Locations from './pages/Locations';
import Members from './pages/Members';
import Scheduling from './pages/Scheduling';
import MemberDashboard from './pages/MemberDashboard';
import Integrations from './pages/Integrations';
import Reports from './pages/Reports';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: MainLayout,
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
        path: 'locations',
        Component: Locations,
      },
      {
        path: 'members',
        Component: Members,
      },
      {
        path: 'scheduling',
        Component: Scheduling,
      },
      {
        path: 'my-schedule',
        Component: MemberDashboard,
      },
      {
        path: 'integrations',
        Component: Integrations,
      },
      {
        path: 'reports',
        Component: Reports,
      },
    ],
  },
]);
