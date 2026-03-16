/**
 * Layout route guards — thin wrappers that plug into createHashRouter's
 * Component-based routing to enforce role restrictions on nested routes.
 */

import { Outlet } from 'react-router';
import { RequireRole } from './RequireRole';

export function AdminGuard() {
  return (
    <RequireRole allowed={['admin']}>
      <Outlet />
    </RequireRole>
  );
}

export function MemberGuard() {
  return (
    <RequireRole allowed={['member']}>
      <Outlet />
    </RequireRole>
  );
}
