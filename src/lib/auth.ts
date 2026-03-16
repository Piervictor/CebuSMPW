/**
 * Auth Service — Supabase Authentication & Role Management
 *
 * Provides:
 *  • Sign-in / sign-out wrappers
 *  • Session listener
 *  • `getUserProfile()` — fetches the user_profiles row (role + member_id)
 *  • Role-checking helpers used by guards and services
 */

import { supabase } from './supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'member';

export interface UserProfile {
  id: string;            // auth.uid()
  role: AppRole;
  memberId: string | null;
  displayName: string;
}

// ─── Session helpers ──────────────────────────────────────────

/** Get the current Supabase session (null if not logged in). */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Get the current Supabase Auth user (null if not logged in). */
export async function getAuthUser(): Promise<SupabaseUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (session: Session | null) => void,
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session),
  );
  return () => subscription.unsubscribe();
}

// ─── Sign-in / Sign-out ───────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// ─── User Profile (role + member link) ────────────────────────

/**
 * Fetch the user_profiles row for the currently authenticated user.
 * Returns `null` when no auth session or no profile row exists.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role, member_id, display_name')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    role: data.role as AppRole,
    memberId: data.member_id ?? null,
    displayName: data.display_name ?? '',
  };
}

// ─── Role-checking utilities ──────────────────────────────────

/** Check whether the given role is an admin role. */
export function isAdmin(role: string | undefined | null): boolean {
  return role === 'admin';
}

/** Check whether the given role is a member role. */
export function isMember(role: string | undefined | null): boolean {
  return role === 'member';
}

/**
 * Require admin role — throws if the current profile is not admin.
 * Use this in service functions that must be admin-only.
 */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden: admin access required');
  }
  return profile;
}

/**
 * Require that the caller is either an admin or the specific member.
 * Use this for "own data" operations.
 */
export async function requireSelfOrAdmin(memberId: string): Promise<UserProfile> {
  const profile = await getUserProfile();
  if (!profile) {
    throw new Error('Forbidden: authentication required');
  }
  if (profile.role === 'admin') return profile;
  if (profile.memberId === memberId) return profile;
  throw new Error('Forbidden: you can only access your own data');
}
