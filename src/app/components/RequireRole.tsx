/**
 * RequireRole — Route guard component.
 *
 * Wrap a route element to restrict access to specific roles.
 * Supports two auth sources:
 *   1. Real Supabase Auth (via useAuth) — used in production
 *   2. Mock currentUser (via useAppContext) — used during development / RoleSwitcher
 *
 * Usage in routes:
 *   <Route element={<RequireRole allowed={['admin']}><AdminPage /></RequireRole>} />
 *
 * Or as a layout wrapper:
 *   { Component: () => <RequireRole allowed={['admin']}><Outlet /></RequireRole> }
 */

import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useAppContext } from '../hooks/useAppContext';
import type { AppRole } from '../../lib/auth';
import type { UserRole } from '../data/mockData';

/** Map the 3 app-level roles to the 2 RBAC roles used by the guard. */
function mapUserRoleToAppRole(role: UserRole): AppRole {
  return role === 'member' ? 'member' : 'admin';
}

interface RequireRoleProps {
  /** Roles that are allowed to view the children. */
  allowed: AppRole[];
  /** Where to redirect unauthorized users. Defaults to the member portal for members, dashboard for admins. */
  fallback?: string;
  children: React.ReactNode;
}

export function RequireRole({ allowed, fallback, children }: RequireRoleProps) {
  const { authProfile, authLoading } = useAuth();
  const { currentUser } = useAppContext();

  // Still loading Supabase session — show spinner
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200" style={{ borderTopColor: '#4F6BED' }} />
      </div>
    );
  }

  // Determine effective role: prefer real Supabase auth, fall back to mock currentUser
  const effectiveRole: AppRole | null = authProfile
    ? authProfile.role
    : currentUser
      ? mapUserRoleToAppRole(currentUser.role)
      : null;

  const effectiveIsAdmin = effectiveRole === 'admin';

  // No auth at all — redirect to root
  if (!effectiveRole) {
    return <Navigate to="/" replace />;
  }

  // Wrong role — redirect to appropriate default
  if (!allowed.includes(effectiveRole)) {
    const defaultPath = fallback ?? (effectiveIsAdmin ? '/' : '/my-portal');
    return <Navigate to={defaultPath} replace />;
  }

  return <>{children}</>;
}
