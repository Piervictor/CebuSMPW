import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { toLocalDateStr } from '../../lib/dateUtils';
import {
  Circuit,
  Congregation,
  Location,
  Member,
  Shift,
  Timeslot,
  User,
  UserRole,
  DEFAULT_LOCATION_CATEGORIES,
  currentUser as initialCurrentUser,
  SchedulingPolicies,
} from '../data/mockData';
import {
  supabaseCircuitService,
  supabaseCongregationService,
  supabaseLocationService,
  supabaseMemberService,
  supabaseTimeslotService,
  supabaseShiftService,
  supabaseSchedulingPoliciesService,
} from '../../lib/supabaseService';

/**
 * Main App Context Interface
 * Manages all global state: user, congregations, locations, members, shifts
 * Provides mutators for all entity operations with async operations
 */
interface AppContextType {
  // ============ STATE ============
  currentUser: User | null;
  circuits: Circuit[];
  congregations: Congregation[];
  locations: Location[];
  members: Member[];
  shifts: Shift[];
  timeslots: Timeslot[];
  isLoading: boolean;
  error: string | null;
  schedulingPolicies: SchedulingPolicies;

  // ============ USER & AUTH ============
  setCurrentUser: (userId: string, role: UserRole) => Promise<void>;
  logout: () => void;

  // ============ SHIFTS ============
  assignMemberToShift: (shiftId: string, memberId: string) => Promise<void>;
  removeFromShift: (shiftId: string, memberId: string) => Promise<void>;
  updateShift: (shiftId: string, updates: Partial<Shift>) => Promise<void>;
  getShiftById: (shiftId: string) => Shift | undefined;
  getShiftsByMember: (memberId: string) => Shift[];
  getShiftsByLocation: (locationId: string) => Shift[];
  validateShiftAssignment: (shiftId: string, memberId: string) => { valid: boolean; reason?: string };
  loadShiftsForWeek: (locationId: string, weekStartDate: string) => Promise<Shift[]>;

  // ============ TIMESLOTS ============
  createTimeslot: (timeslot: Omit<Timeslot, 'id'>) => Promise<Timeslot>;
  updateTimeslot: (timeslotId: string, updates: Partial<Timeslot>) => Promise<void>;
  deleteTimeslot: (timeslotId: string) => Promise<void>;

  // ============ MEMBERS ============
  createMember: (member: Omit<Member, 'id'>) => Promise<Member>;
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  getMemberById: (memberId: string) => Member | undefined;
  getMembersByCongregation: (congregationId: string) => Member[];

  // ============ LOCATIONS ============
  createLocation: (location: Omit<Location, 'id'>) => Promise<Location>;
  updateLocation: (locationId: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  getLocationById: (locationId: string) => Location | undefined;

  // ============ CIRCUITS ============
  createCircuit: (circuit: Omit<Circuit, 'id'>) => Promise<Circuit>;
  updateCircuit: (circuitId: string, updates: Partial<Circuit>) => Promise<void>;
  deleteCircuit: (circuitId: string) => Promise<void>;
  getCircuitById: (circuitId: string) => Circuit | undefined;

  // ============ CONGREGATIONS ============
  createCongregation: (congregation: Omit<Congregation, 'id'>) => Promise<Congregation>;
  updateCongregation: (congregationId: string, updates: Partial<Congregation>) => Promise<void>;
  deleteCongregation: (congregationId: string) => Promise<void>;
  getCongregationById: (congregationId: string) => Congregation | undefined;

  // ============ UTILITIES ============
  refetchData: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;

  // ============ LOCATION CATEGORIES ============
  locationCategories: string[];
  addLocationCategory: (category: string) => void;

  // ============ SCHEDULING POLICIES ============
  updateSchedulingPolicies: (updates: Partial<SchedulingPolicies>) => Promise<void>;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * AppProvider Component
 * Provides global state management for the entire application
 * All mutations go through this provider to ensure consistency
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ============ STATE INITIALIZATION ============
  const [currentUser, setCurrentUserState] = useState<User | null>(initialCurrentUser);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);

  // ============ SCHEDULING POLICIES (global) ============
  const SCHEDULING_POLICIES_KEY = 'cebusmpw_scheduling_policies';
  const defaultSchedulingPolicies: SchedulingPolicies = {
    weeklyLimit: 2,
    monthlyLimit: 8,
    allowSameDayAssignments: true,
    allowConsecutiveDayAssignments: true,
  };

  const [schedulingPolicies, setSchedulingPolicies] = useState<SchedulingPolicies>(() => {
    try {
      const stored = localStorage.getItem(SCHEDULING_POLICIES_KEY);
      if (!stored) return defaultSchedulingPolicies;
      const parsed = JSON.parse(stored) as Partial<SchedulingPolicies>;
      return { ...defaultSchedulingPolicies, ...parsed };
    } catch {
      return defaultSchedulingPolicies;
    }
  });

  // ============ LOCATION CATEGORIES (dynamic) ============
  const CUSTOM_CATEGORIES_KEY = 'cebusmpw_custom_location_categories';

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Derived: merge defaults + custom + categories already used by existing locations
  const locationCategories = useMemo(() => {
    const fromLocations = locations.map((l) => l.category).filter(Boolean);
    const all = new Set([...DEFAULT_LOCATION_CATEGORIES, ...customCategories, ...fromLocations]);
    return Array.from(all);
  }, [locations, customCategories]);

  const addLocationCategory = useCallback((category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    setCustomCategories((prev) => {
      if (prev.includes(trimmed) || DEFAULT_LOCATION_CATEGORIES.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateSchedulingPolicies = useCallback(async (updates: Partial<SchedulingPolicies>) => {
    setSchedulingPolicies((prev) => {
      const next = { ...prev, ...updates };
      // Persist to localStorage immediately as fallback
      localStorage.setItem(SCHEDULING_POLICIES_KEY, JSON.stringify(next));
      // Persist to Supabase in background
      supabaseSchedulingPoliciesService.upsert(next).catch((err) =>
        console.error('Failed to save scheduling policies to Supabase:', err)
      );
      return next;
    });
  }, []);

  // ============ LOAD FROM SUPABASE ON MOUNT ============
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [circuitsData, congregationsData, locationsData, membersData, timeslotsData, shiftsData, policiesData] = await Promise.all([
          supabaseCircuitService.getAll(),
          supabaseCongregationService.getAll(),
          supabaseLocationService.getAll(),
          supabaseMemberService.getAll(),
          supabaseTimeslotService.getAll(),
          supabaseShiftService.getAll().catch(() => [] as Shift[]),
          supabaseSchedulingPoliciesService.get().catch(() => null),
        ]);
        if (!cancelled) {
          setCircuits(circuitsData);
          setCongregations(congregationsData);
          setLocations(locationsData);
          setMembers(membersData);
          setTimeslots(timeslotsData);
          setShifts(shiftsData);
          if (policiesData) {
            setSchedulingPolicies(policiesData);
            localStorage.setItem(SCHEDULING_POLICIES_KEY, JSON.stringify(policiesData));
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load data from Supabase:', err);
          setErrorState(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, []);

  // ============ ERROR MANAGEMENT ============
  const setError = useCallback((errorMsg: string | null) => {
    setErrorState(errorMsg);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  // ============ USER & AUTH ============
  /**
   * Switch to a different user with specified role
   * Used by RoleSwitcher component for demo purposes
   */
  const setCurrentUser = useCallback(async (userId: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const user: User = {
        id: userId,
        name: `User ${userId}`,
        role,
        congregationId: role === 'member' ? 'cong-1' : undefined,
        telegramHandle: userId === 'adm' ? '@adminuser' : `@${userId}`,
      };

      setCurrentUserState(user);
      clearError();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to set user';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setError, clearError]);

  /**
   * Logout current user
   */
  const logout = useCallback(() => {
    setCurrentUserState(null);
    setError(null);
  }, [setError]);

  // ============ SHIFT OPERATIONS ============
  /**
   * Validate if a member can be assigned to a shift
   * Checks:
   * - Member exists
   * - Congregation is linked to location
   * - Age requirements met
   * - Experience requirements met
   * - Weekly/monthly limits not exceeded
   * - Not already assigned
   */
  const validateShiftAssignment = useCallback(
    (shiftId: string, memberId: string) => {
      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) {
        return { valid: false, reason: 'Shift not found' };
      }

      const member = members.find((m) => m.id === memberId);
      if (!member) {
        return { valid: false, reason: 'Member not found' };
      }

      const location = locations.find((l) => l.id === shift.locationId);
      if (!location) {
        return { valid: false, reason: 'Location not found' };
      }

      // Check congregation link
      if (!location.linkedCongregations.includes(member.congregationId)) {
        return { valid: false, reason: 'Congregation not linked to this location' };
      }

      // Check age requirement
      if (location.ageGroup === 'Seniors excluded' && member.ageGroup === 'Senior') {
        return { valid: false, reason: 'Seniors not eligible for this location' };
      }
      if (location.ageGroup === 'Adults only' && member.ageGroup === 'Youth') {
        return { valid: false, reason: 'Youth not eligible for this location' };
      }

      // Check experience requirement
      if (
        location.experienceLevel === 'Experienced only' &&
        member.experience !== 'Experienced'
      ) {
        return { valid: false, reason: 'Only experienced publishers eligible' };
      }
      if (
        location.experienceLevel === 'Intermediate' &&
        member.experience === 'New'
      ) {
        return { valid: false, reason: 'Minimum intermediate experience required' };
      }

      // Check if already assigned
      if (shift.assignedMembers.includes(memberId)) {
        return { valid: false, reason: 'Member already assigned to this shift' };
      }

      const memberShifts = shifts.filter((s) => s.assignedMembers.includes(memberId));

      if (!schedulingPolicies.allowSameDayAssignments) {
        const hasSameDay = memberShifts.some((s) => s.date === shift.date);
        if (hasSameDay) {
          return { valid: false, reason: 'Same-day assignments are disabled' };
        }
      }

      if (!schedulingPolicies.allowConsecutiveDayAssignments) {
        const shiftDate = new Date(shift.date + 'T00:00:00');
        const prevDate = new Date(shiftDate);
        const nextDate = new Date(shiftDate);
        prevDate.setDate(shiftDate.getDate() - 1);
        nextDate.setDate(shiftDate.getDate() + 1);
        const prevStr = toLocalDateStr(prevDate);
        const nextStr = toLocalDateStr(nextDate);
        const hasAdjacent = memberShifts.some((s) => s.date === prevStr || s.date === nextStr);
        if (hasAdjacent) {
          return { valid: false, reason: 'Consecutive-day assignments are disabled' };
        }
      }

      // Check weekly limit
      const weekStart = new Date(shift.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weeklyShifts = shifts.filter(
        (s) =>
          new Date(s.date) >= weekStart &&
          new Date(s.date) <= weekEnd &&
          s.assignedMembers.includes(memberId)
      );

      if (weeklyShifts.length >= schedulingPolicies.weeklyLimit) {
        return { valid: false, reason: `Weekly limit (${schedulingPolicies.weeklyLimit}) exceeded` };
      }

      // Check monthly limit
      const monthStart = new Date(shift.date);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthlyShifts = shifts.filter(
        (s) =>
          new Date(s.date) >= monthStart &&
          new Date(s.date) <= monthEnd &&
          s.assignedMembers.includes(memberId)
      );

      if (monthlyShifts.length >= schedulingPolicies.monthlyLimit) {
        return { valid: false, reason: `Monthly limit (${schedulingPolicies.monthlyLimit}) exceeded` };
      }

      return { valid: true };
    },
    [shifts, members, locations, schedulingPolicies]
  );

  /**
   * Assign a member to a shift
   * Validates eligibility before assignment
   */
  const assignMemberToShift = useCallback(
    async (shiftId: string, memberId: string) => {
      setIsLoading(true);
      try {
        // Validate assignment
        const validation = validateShiftAssignment(shiftId, memberId);
        if (!validation.valid) {
          throw new Error(validation.reason || 'Assignment validation failed');
        }

        // Persist to Supabase
        const updatedShift = await supabaseShiftService.assignMember(shiftId, memberId, 'admin');

        // Update local state with the DB result
        setShifts((prev) =>
          prev.map((s) => (s.id === shiftId ? updatedShift : s))
        );

        // Update member reservation counts locally
        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId
              ? {
                  ...member,
                  monthlyReservations: member.monthlyReservations + 1,
                  weeklyReservations: member.weeklyReservations + 1,
                }
              : member
          )
        );

        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to assign member';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [validateShiftAssignment, setError, clearError]
  );

  /**
   * Remove a member from a shift
   */
  const removeFromShift = useCallback(
    async (shiftId: string, memberId: string) => {
      setIsLoading(true);
      try {
        // Persist to Supabase
        const updatedShift = await supabaseShiftService.removeMember(shiftId, memberId);

        // Update local state with DB result
        setShifts((prev) =>
          prev.map((s) => (s.id === shiftId ? updatedShift : s))
        );

        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to remove from shift';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  /**
   * Update shift details (time, required count, etc.)
   */
  const updateShift = useCallback(
    async (shiftId: string, updates: Partial<Shift>) => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        setShifts((prev) =>
          prev.map((shift) =>
            shift.id === shiftId ? { ...shift, ...updates } : shift
          )
        );

        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update shift';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  /**
   * Get shift by ID
   */
  const getShiftById = useCallback(
    (shiftId: string) => shifts.find((s) => s.id === shiftId),
    [shifts]
  );

  /**
   * Get all shifts for a specific member
   */
  const getShiftsByMember = useCallback(
    (memberId: string) =>
      shifts.filter((s) => s.assignedMembers.includes(memberId)),
    [shifts]
  );

  /**
   * Get all shifts for a specific location
   */
  const getShiftsByLocation = useCallback(
    (locationId: string) => shifts.filter((s) => s.locationId === locationId),
    [shifts]
  );

  /**
   * Load (or generate) shifts for a specific location + week from timeslots.
   * Calls the DB to create missing shift rows, then merges into local state.
   */
  const loadShiftsForWeek = useCallback(
    async (locationId: string, weekStartDate: string): Promise<Shift[]> => {
      try {
        const weekShifts = await supabaseShiftService.generateWeekShifts(locationId, weekStartDate);
        // Merge into local state: replace existing shifts for this location+week, keep the rest
        const weekEnd = new Date(weekStartDate + 'T00:00:00');
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = toLocalDateStr(weekEnd);

        setShifts((prev) => {
          // Remove old shifts for this location+week range
          const remaining = prev.filter(
            (s) =>
              !(s.locationId === locationId && s.date >= weekStartDate && s.date <= weekEndStr)
          );
          return [...remaining, ...weekShifts];
        });
        return weekShifts;
      } catch (err) {
        console.error('Failed to load shifts for week:', err);
        return [];
      }
    },
    []
  );

  // ============ TIMESLOT OPERATIONS ============
  const createTimeslot = useCallback(
    async (newTimeslot: Omit<Timeslot, 'id'>) => {
      setIsLoading(true);
      try {
        const timeslot = await supabaseTimeslotService.create(newTimeslot);
        setTimeslots((prev) => [...prev, timeslot]);
        clearError();
        return timeslot;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create timeslot';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  const updateTimeslot = useCallback(
    async (timeslotId: string, updates: Partial<Timeslot>) => {
      setIsLoading(true);
      try {
        const updated = await supabaseTimeslotService.update(timeslotId, updates);
        setTimeslots((prev) =>
          prev.map((t) => (t.id === timeslotId ? updated : t))
        );
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update timeslot';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  const deleteTimeslot = useCallback(
    async (timeslotId: string) => {
      setIsLoading(true);
      try {
        await supabaseTimeslotService.delete(timeslotId);
        setTimeslots((prev) => prev.filter((t) => t.id !== timeslotId));
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete timeslot';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  // ============ MEMBER OPERATIONS ============
  /**
   * Create a new member
   */
  const createMember = useCallback(
    async (newMember: Omit<Member, 'id'>) => {
      setIsLoading(true);
      try {
        const member = await supabaseMemberService.create(newMember);
        setMembers((prev) => [...prev, member]);
        clearError();
        return member;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create member';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  /**
   * Update member details
   */
  const updateMember = useCallback(
    async (memberId: string, updates: Partial<Member>) => {
      setIsLoading(true);
      try {
        const updated = await supabaseMemberService.update(memberId, updates);
        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId ? updated : member
          )
        );
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update member';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  /**
   * Delete a member
   * Removes from all shifts automatically
   */
  const deleteMember = useCallback(
    async (memberId: string) => {
      setIsLoading(true);
      try {
        await supabaseMemberService.delete(memberId);
        setMembers((prev) => prev.filter((member) => member.id !== memberId));

        // Remove from all local shifts
        setShifts((prev) =>
          prev.map((shift) => ({
            ...shift,
            assignedMembers: shift.assignedMembers.filter((id) => id !== memberId),
          }))
        );

        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete member';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  /**
   * Get member by ID
   */
  const getMemberById = useCallback(
    (memberId: string) => members.find((m) => m.id === memberId),
    [members]
  );

  /**
   * Get all members in a congregation
   */
  const getMembersByCongregation = useCallback(
    (congregationId: string) =>
      members.filter((m) => m.congregationId === congregationId),
    [members]
  );

  // ============ LOCATION OPERATIONS ============
  /**
   * Create a new location
   */
  const createLocation = useCallback(
    async (newLocation: Omit<Location, 'id'>) => {
      clearError();
      setIsLoading(true);
      try {
        if (!circuits.find((c) => c.id === newLocation.circuitId)) {
          throw new Error('Circuit not found');
        }

        if (!newLocation.multiCircuitSharing) {
          const invalidCongregation = newLocation.linkedCongregations.find((congregationId) => {
            const congregation = congregations.find((c) => c.id === congregationId);
            return !congregation || congregation.circuitId !== newLocation.circuitId;
          });

          if (invalidCongregation) {
            throw new Error('Linked congregations must belong to the selected circuit');
          }
        }

        const location = await supabaseLocationService.create(newLocation);
        setLocations((prev) => [...prev, location]);
        clearError();
        return location;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create location';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [circuits, congregations, setError, clearError]
  );

  /**
   * Update location details
   */
  const updateLocation = useCallback(
    async (locationId: string, updates: Partial<Location>) => {
      clearError();
      setIsLoading(true);
      try {
        const existingLocation = locations.find((l) => l.id === locationId);
        if (!existingLocation) {
          throw new Error('Location not found');
        }

        const resolvedCircuitId = updates.circuitId ?? existingLocation.circuitId;
        if (resolvedCircuitId && !circuits.find((c) => c.id === resolvedCircuitId)) {
          throw new Error('Circuit not found');
        }

        const isMultiCircuit = updates.multiCircuitSharing ?? existingLocation.multiCircuitSharing;
        if (updates.linkedCongregations && resolvedCircuitId && !isMultiCircuit) {
          const invalidCongregation = updates.linkedCongregations.find((congregationId) => {
            const congregation = congregations.find((c) => c.id === congregationId);
            return !congregation || congregation.circuitId !== resolvedCircuitId;
          });

          if (invalidCongregation) {
            throw new Error('Linked congregations must belong to the selected circuit');
          }
        }

        const updated = await supabaseLocationService.update(locationId, updates);
        setLocations((prev) =>
          prev.map((location) => (location.id === locationId ? updated : location))
        );
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update location';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [circuits, congregations, setError, clearError, locations]
  );

  /**
   * Delete a location
   * Validates no future shifts exist
   */
  const deleteLocation = useCallback(
    async (locationId: string) => {
      clearError();
      setIsLoading(true);
      try {
        const today = toLocalDateStr(new Date());
        const futureShifts = shifts.filter(
          (s) => s.locationId === locationId && s.date >= today
        );

        if (futureShifts.length > 0) {
          throw new Error('Cannot delete location with future shifts assigned');
        }

        await supabaseLocationService.delete(locationId);
        setLocations((prev) =>
          prev.filter((location) => location.id !== locationId)
        );
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete location';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError, locations, shifts]
  );

  /**
   * Get location by ID
   */
  const getLocationById = useCallback(
    (locationId: string) => locations.find((l) => l.id === locationId),
    [locations]
  );

  // ============ CIRCUIT OPERATIONS ============
  const createCircuit = useCallback(
    async (newCircuit: Omit<Circuit, 'id'>) => {
      clearError();
      setIsLoading(true);
      try {
        const circuit = await supabaseCircuitService.create(newCircuit);
        setCircuits((prev) => [...prev, circuit]);
        clearError();
        return circuit;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create circuit';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  const updateCircuit = useCallback(
    async (circuitId: string, updates: Partial<Circuit>) => {
      clearError();
      setIsLoading(true);
      try {
        const updated = await supabaseCircuitService.update(circuitId, updates);
        setCircuits((prev) =>
          prev.map((circuit) => (circuit.id === circuitId ? updated : circuit))
        );
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update circuit';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError]
  );

  const deleteCircuit = useCallback(
    async (circuitId: string) => {
      clearError();
      setIsLoading(true);
      try {
        const dependentCongregations = congregations.filter((c) => c.circuitId === circuitId);
        if (dependentCongregations.length > 0) {
          throw new Error(
            `Cannot delete circuit with ${dependentCongregations.length} congregation(s) assigned`
          );
        }

        const dependentLocations = locations.filter((location) => location.circuitId === circuitId);
        if (dependentLocations.length > 0) {
          throw new Error(
            `Cannot delete circuit with ${dependentLocations.length} location(s) assigned`
          );
        }

        await supabaseCircuitService.delete(circuitId);
        setCircuits((prev) => prev.filter((circuit) => circuit.id !== circuitId));
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete circuit';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [congregations, locations, setError, clearError]
  );

  const getCircuitById = useCallback(
    (circuitId: string) => circuits.find((circuit) => circuit.id === circuitId),
    [circuits]
  );

  // ============ CONGREGATION OPERATIONS ============
  /**
   * Create a new congregation
   */
  const createCongregation = useCallback(
    async (newCongregation: Omit<Congregation, 'id'>) => {
      clearError();
      setIsLoading(true);
      try {
        if (!circuits.find((c) => c.id === newCongregation.circuitId)) {
          throw new Error('Circuit not found');
        }

        const congregation = await supabaseCongregationService.create(newCongregation);
        setCongregations((prev) => [...prev, congregation]);
        clearError();
        return congregation;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create congregation';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [circuits, setError, clearError]
  );

  /**
   * Update congregation details
   */
  const updateCongregation = useCallback(
    async (congregationId: string, updates: Partial<Congregation>) => {
      clearError();
      setIsLoading(true);
      try {
        if (updates.circuitId && !circuits.find((c) => c.id === updates.circuitId)) {
          throw new Error('Circuit not found');
        }

        const updated = await supabaseCongregationService.update(congregationId, updates);
        setCongregations((prev) =>
          prev.map((congregation) =>
            congregation.id === congregationId ? updated : congregation
          )
        );
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update congregation';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [circuits, setError, clearError]
  );

  /**
   * Delete a congregation
   * Validates no members are assigned
   */
  const deleteCongregation = useCallback(
    async (congregationId: string) => {
      clearError();
      setIsLoading(true);
      try {
        // Check for dependent members
        const dependentMembers = members.filter(
          (m) => m.congregationId === congregationId
        );
        if (dependentMembers.length > 0) {
          throw new Error(
            `Cannot delete congregation with ${dependentMembers.length} active member(s)`
          );
        }

        // Check for locations that link this congregation
        const linkedLocations = locations.filter(
          (l) => l.linkedCongregations.includes(congregationId)
        );
        if (linkedLocations.length > 0) {
          throw new Error(
            `Cannot delete congregation linked to ${linkedLocations.length} location(s)`
          );
        }

        await supabaseCongregationService.delete(congregationId);
        setCongregations((prev) =>
          prev.filter((congregation) => congregation.id !== congregationId)
        );
        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete congregation';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError, members, locations]
  );

  /**
   * Get congregation by ID
   */
  const getCongregationById = useCallback(
    (congregationId: string) => congregations.find((c) => c.id === congregationId),
    [congregations]
  );

  // ============ DATA MANAGEMENT ============
  /**
   * Refetch all data from Supabase
   */
  const refetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [circuitsData, congregationsData, locationsData, timeslotsData, shiftsData] = await Promise.all([
        supabaseCircuitService.getAll(),
        supabaseCongregationService.getAll(),
        supabaseLocationService.getAll(),
        supabaseTimeslotService.getAll(),
        supabaseShiftService.getAll().catch(() => [] as Shift[]),
      ]);
      setCircuits(circuitsData);
      setCongregations(congregationsData);
      setLocations(locationsData);
      setTimeslots(timeslotsData);
      setShifts(shiftsData);
      clearError();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [setError, clearError]);

  // ============ CONTEXT VALUE ============
  const value: AppContextType = {
    // State
    currentUser,
    circuits,
    congregations,
    locations,
    members,
    shifts,
    timeslots,
    isLoading,
    error,
    schedulingPolicies,

    // User & Auth
    setCurrentUser,
    logout,

    // Shifts
    assignMemberToShift,
    removeFromShift,
    updateShift,
    getShiftById,
    getShiftsByMember,
    getShiftsByLocation,
    validateShiftAssignment,
    loadShiftsForWeek,

    // Timeslots
    createTimeslot,
    updateTimeslot,
    deleteTimeslot,

    // Members
    createMember,
    updateMember,
    deleteMember,
    getMemberById,
    getMembersByCongregation,

    // Locations
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationById,

    // Circuits
    createCircuit,
    updateCircuit,
    deleteCircuit,
    getCircuitById,

    // Congregations
    createCongregation,
    updateCongregation,
    deleteCongregation,
    getCongregationById,

    // Utilities
    refetchData,
    setError,
    clearError,

    // Location Categories
    locationCategories,
    addLocationCategory,

    // Scheduling Policies
    updateSchedulingPolicies,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Custom hook to access app context
 * Must be used within AppProvider
 * @throws Error if used outside AppProvider
 */
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within <AppProvider>');
  }
  return context;
};
