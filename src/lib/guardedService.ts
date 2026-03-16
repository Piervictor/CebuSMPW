/**
 * Guarded Service Layer — Role-enforced wrappers around Supabase services.
 *
 * These functions verify the caller's role (via the auth profile stored in-memory)
 * before delegating to the underlying Supabase service. This provides client-side
 * defence-in-depth on top of the Supabase RLS policies enforced server-side.
 *
 * Read operations are generally unrestricted (RLS filters results).
 * Write operations check admin/self permissions before executing.
 */

import { getUserProfile, type UserProfile } from './auth';
import {
  supabaseCircuitService,
  supabaseCongregationService,
  supabaseLocationService,
  supabaseMemberService,
  supabaseTimeslotService,
  supabaseShiftService,
} from './supabaseService';
import type {
  Circuit,
  Congregation,
  Location,
  Member,
  Timeslot,
  Shift,
} from '../app/data/mockData';

// ─── Internal helpers ───────────────────────────────────────

async function getProfile(): Promise<UserProfile | null> {
  return getUserProfile();
}

function assertAdmin(profile: UserProfile | null): asserts profile is UserProfile {
  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden: admin access required');
  }
}

function assertSelfOrAdmin(profile: UserProfile | null, memberId: string): asserts profile is UserProfile {
  if (!profile) throw new Error('Forbidden: authentication required');
  if (profile.role === 'admin') return;
  if (profile.memberId === memberId) return;
  throw new Error('Forbidden: you can only access your own data');
}

// ─── Circuit Guards (admin-only write) ──────────────────────

export const guardedCircuitService = {
  getAll: () => supabaseCircuitService.getAll(),

  async create(circuit: Omit<Circuit, 'id'>): Promise<Circuit> {
    assertAdmin(await getProfile());
    return supabaseCircuitService.create(circuit);
  },

  async update(id: string, updates: Partial<Circuit>): Promise<Circuit> {
    assertAdmin(await getProfile());
    return supabaseCircuitService.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    assertAdmin(await getProfile());
    return supabaseCircuitService.delete(id);
  },
};

// ─── Congregation Guards (admin-only write) ─────────────────

export const guardedCongregationService = {
  getAll: () => supabaseCongregationService.getAll(),

  async create(congregation: Omit<Congregation, 'id'>): Promise<Congregation> {
    assertAdmin(await getProfile());
    return supabaseCongregationService.create(congregation);
  },

  async update(id: string, updates: Partial<Congregation>): Promise<Congregation> {
    assertAdmin(await getProfile());
    return supabaseCongregationService.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    assertAdmin(await getProfile());
    return supabaseCongregationService.delete(id);
  },
};

// ─── Location Guards (admin-only write) ─────────────────────

export const guardedLocationService = {
  getAll: () => supabaseLocationService.getAll(),

  async create(location: Omit<Location, 'id'>): Promise<Location> {
    assertAdmin(await getProfile());
    return supabaseLocationService.create(location);
  },

  async update(id: string, updates: Partial<Location>): Promise<Location> {
    assertAdmin(await getProfile());
    return supabaseLocationService.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    assertAdmin(await getProfile());
    return supabaseLocationService.delete(id);
  },
};

// ─── Timeslot Guards (admin-only write) ─────────────────────

export const guardedTimeslotService = {
  getAll: () => supabaseTimeslotService.getAll(),

  async create(timeslot: Omit<Timeslot, 'id'>): Promise<Timeslot> {
    assertAdmin(await getProfile());
    return supabaseTimeslotService.create(timeslot);
  },

  async update(id: string, updates: Partial<Timeslot>): Promise<Timeslot> {
    assertAdmin(await getProfile());
    return supabaseTimeslotService.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    assertAdmin(await getProfile());
    return supabaseTimeslotService.delete(id);
  },
};

// ─── Member Guards ──────────────────────────────────────────

/** Fields that a member is allowed to update on their own record. */
const MEMBER_SELF_EDITABLE_FIELDS = new Set([
  'email', 'phone', 'telegramHandle', 'languageGroup',
  'preferredDays', 'preferredTimes', 'preferredLocations',
  'availability', 'status',
]);

export const guardedMemberService = {
  getAll: () => supabaseMemberService.getAll(),

  async create(member: Omit<Member, 'id'>): Promise<Member> {
    assertAdmin(await getProfile());
    return supabaseMemberService.create(member);
  },

  async update(id: string, updates: Partial<Member>): Promise<Member> {
    const profile = await getProfile();
    if (!profile) throw new Error('Forbidden: authentication required');

    if (profile.role !== 'admin') {
      // Members can only update themselves
      assertSelfOrAdmin(profile, id);
      // Strip fields that members cannot change
      const sanitised: Partial<Member> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (MEMBER_SELF_EDITABLE_FIELDS.has(key)) {
          (sanitised as Record<string, unknown>)[key] = value;
        }
      }
      return supabaseMemberService.update(id, sanitised);
    }

    return supabaseMemberService.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    assertAdmin(await getProfile());
    return supabaseMemberService.delete(id);
  },
};

// ─── Shift Guards ───────────────────────────────────────────

export const guardedShiftService = {
  getAll: () => supabaseShiftService.getAll(),
  getByDateRange: (s: string, e: string) => supabaseShiftService.getByDateRange(s, e),

  async generateWeekShifts(locationId: string, weekStartDate: string): Promise<Shift[]> {
    // Only admins should generate shifts; members just read existing ones
    const profile = await getProfile();
    if (profile && profile.role === 'admin') {
      return supabaseShiftService.generateWeekShifts(locationId, weekStartDate);
    }
    // For members, return existing shifts without generating new ones
    return supabaseShiftService.getByDateRange(weekStartDate, weekStartDate);
  },

  /**
   * Admin assigns any member to a shift.
   */
  async assignMember(shiftId: string, memberId: string, assignedBy: 'admin' | 'self'): Promise<Shift> {
    const profile = await getProfile();
    if (!profile) throw new Error('Forbidden: authentication required');

    if (assignedBy === 'admin') {
      assertAdmin(profile);
    } else {
      // Self-join: member can only assign themselves
      assertSelfOrAdmin(profile, memberId);
    }

    return supabaseShiftService.assignMember(shiftId, memberId, assignedBy);
  },

  /**
   * Remove a member from a shift.
   * Admins can remove anyone; members can only remove themselves.
   */
  async removeMember(shiftId: string, memberId: string): Promise<Shift> {
    const profile = await getProfile();
    assertSelfOrAdmin(profile, memberId);
    return supabaseShiftService.removeMember(shiftId, memberId);
  },
};
