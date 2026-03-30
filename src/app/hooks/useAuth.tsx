/**
 * AuthProvider — React context that exposes Supabase auth state + user profile.
 *
 * Wraps the entire app and listens for auth state changes.
 * Provides `authProfile` (UserProfile | null), `authLoading`, and helpers.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  type UserProfile,
  getUserProfile,
  onAuthStateChange,
  signInWithEmail as authSignIn,
  signOut as authSignOut,
  isAdmin as checkIsAdmin,
} from '../../lib/auth';

interface AuthContextType {
  /** The current user's profile (role, memberId, etc.) or null if unauthenticated. */
  authProfile: UserProfile | null;
  /** True while the initial session check is in progress. */
  authLoading: boolean;
  /** Sign in with email + password. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign out. */
  signOut: () => Promise<void>;
  /** Convenience: is the current user an admin? */
  isAdmin: boolean;
  /** Convenience: is the current user a member? */
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authProfile, setAuthProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load profile whenever the Supabase session changes (with timeout)
  const refreshProfile = useCallback(async () => {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth profile timed out')), 5000),
      );
      const profile = await Promise.race([getUserProfile(), timeout]);
      setAuthProfile(profile);
    } catch {
      setAuthProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refreshProfile();

    // Listen for login/logout events
    const unsubscribe = onAuthStateChange(() => {
      refreshProfile();
    });

    return unsubscribe;
  }, [refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    await authSignIn(email, password);
    // Profile will refresh automatically via the auth state listener
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setAuthProfile(null);
  }, []);

  const value: AuthContextType = {
    authProfile,
    authLoading,
    signIn,
    signOut,
    isAdmin: checkIsAdmin(authProfile?.role),
    isMember: authProfile?.role === 'member',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
