import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Congregation,
  Location,
  Member,
  Shift,
  User,
  UserRole,
  congregations as initialCongregations,
  locations as initialLocations,
  members as initialMembers,
  shifts as initialShifts,
  currentUser as initialCurrentUser,
} from '../data/mockData';

/**
 * Main App Context Interface
 * Manages all global state: user, congregations, locations, members, shifts
 * Provides mutators for all entity operations with async operations
 */
interface AppContextType {
  // ============ STATE ============
  currentUser: User | null;
  congregations: Congregation[];
  locations: Location[];
  members: Member[];
  shifts: Shift[];
  isLoading: boolean;
  error: string | null;

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

  // ============ CONGREGATIONS ============
  createCongregation: (congregation: Omit<Congregation, 'id'>) => Promise<Congregation>;
  updateCongregation: (congregationId: string, updates: Partial<Congregation>) => Promise<void>;
  deleteCongregation: (congregationId: string) => Promise<void>;
  getCongregationById: (congregationId: string) => Congregation | undefined;

  // ============ UTILITIES ============
  refetchData: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
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
  const [congregations, setCongregations] = useState<Congregation[]>(initialCongregations);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);

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

      if (weeklyShifts.length >= member.weeklyLimit) {
        return { valid: false, reason: `Weekly limit (${member.weeklyLimit}) exceeded` };
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

      if (monthlyShifts.length >= member.monthlyLimit) {
        return { valid: false, reason: `Monthly limit (${member.monthlyLimit}) exceeded` };
      }

      return { valid: true };
    },
    [shifts, members, locations]
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

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Update shifts state
        setShifts((prev) =>
          prev.map((shift) =>
            shift.id === shiftId
              ? {
                  ...shift,
                  assignedMembers: [...shift.assignedMembers, memberId],
                  status:
                    shift.assignedMembers.length + 1 >= shift.requiredCount
                      ? 'filled'
                      : 'partial',
                  assignedBy: 'admin',
                }
              : shift
          )
        );

        // Update member shift count
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift) {
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
        }

        clearError();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to assign member';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [validateShiftAssignment, setError, clearError, shifts]
  );

  /**
   * Remove a member from a shift
   */
  const removeFromShift = useCallback(
    async (shiftId: string, memberId: string) => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        setShifts((prev) =>
          prev.map((shift) => {
            if (shift.id === shiftId) {
              const newAssigned = shift.assignedMembers.filter((id) => id !== memberId);
              return {
                ...shift,
                assignedMembers: newAssigned,
                status:
                  newAssigned.length === 0
                    ? 'open'
                    : newAssigned.length < shift.requiredCount
                      ? 'partial'
                      : 'filled',
              };
            }
            return shift;
          })
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

  // ============ MEMBER OPERATIONS ============
  /**
   * Create a new member
   */
  const createMember = useCallback(
    async (newMember: Omit<Member, 'id'>) => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const member: Member = {
          ...newMember,
          id: `mem-${Date.now()}`,
        };

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
        // Validate member exists
        if (!members.find((m) => m.id === memberId)) {
          throw new Error('Member not found');
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId ? { ...member, ...updates } : member
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
    [setError, clearError, members]
  );

  /**
   * Delete a member
   * Removes from all shifts automatically
   */
  const deleteMember = useCallback(
    async (memberId: string) => {
      setIsLoading(true);
      try {
        // Validate member exists
        if (!members.find((m) => m.id === memberId)) {
          throw new Error('Member not found');
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Delete member
        setMembers((prev) => prev.filter((member) => member.id !== memberId));

        // Remove from all shifts
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
    [setError, clearError, members]
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
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const location: Location = {
          ...newLocation,
          id: `loc-${Date.now()}`,
        };

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
    [setError, clearError]
  );

  /**
   * Update location details
   */
  const updateLocation = useCallback(
    async (locationId: string, updates: Partial<Location>) => {
      setIsLoading(true);
      try {
        // Validate location exists
        if (!locations.find((l) => l.id === locationId)) {
          throw new Error('Location not found');
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        setLocations((prev) =>
          prev.map((location) =>
            location.id === locationId ? { ...location, ...updates } : location
          )
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
    [setError, clearError, locations]
  );

  /**
   * Delete a location
   * Validates no future shifts exist
   */
  const deleteLocation = useCallback(
    async (locationId: string) => {
      setIsLoading(true);
      try {
        // Validate location exists
        if (!locations.find((l) => l.id === locationId)) {
          throw new Error('Location not found');
        }

        // Check for future shifts
        const today = new Date().toISOString().split('T')[0];
        const futureShifts = shifts.filter(
          (s) => s.locationId === locationId && s.date >= today
        );

        if (futureShifts.length > 0) {
          throw new Error('Cannot delete location with future shifts assigned');
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

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

  // ============ CONGREGATION OPERATIONS ============
  /**
   * Create a new congregation
   */
  const createCongregation = useCallback(
    async (newCongregation: Omit<Congregation, 'id'>) => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const congregation: Congregation = {
          ...newCongregation,
          id: `cong-${Date.now()}`,
        };

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
    [setError, clearError]
  );

  /**
   * Update congregation details
   */
  const updateCongregation = useCallback(
    async (congregationId: string, updates: Partial<Congregation>) => {
      setIsLoading(true);
      try {
        // Validate congregation exists
        if (!congregations.find((c) => c.id === congregationId)) {
          throw new Error('Congregation not found');
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        setCongregations((prev) =>
          prev.map((congregation) =>
            congregation.id === congregationId
              ? { ...congregation, ...updates }
              : congregation
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
    [setError, clearError, congregations]
  );

  /**
   * Delete a congregation
   * Validates no members are assigned
   */
  const deleteCongregation = useCallback(
    async (congregationId: string) => {
      setIsLoading(true);
      try {
        // Validate congregation exists
        if (!congregations.find((c) => c.id === congregationId)) {
          throw new Error('Congregation not found');
        }

        // Check for dependent members
        const dependentMembers = members.filter(
          (m) => m.congregationId === congregationId
        );
        if (dependentMembers.length > 0) {
          throw new Error(
            `Cannot delete congregation with ${dependentMembers.length} active member(s)`
          );
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

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
    [setError, clearError, congregations, members]
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
   * Refetch all data from server
   * In real app, this would call API endpoints
   */
  const refetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In a real app:
      // setCongregations(await api.get('/congregations'))
      // setLocations(await api.get('/locations'))
      // setMembers(await api.get('/members'))
      // setShifts(await api.get('/shifts'))

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
    congregations,
    locations,
    members,
    shifts,
    isLoading,
    error,

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

    // Congregations
    createCongregation,
    updateCongregation,
    deleteCongregation,
    getCongregationById,

    // Utilities
    refetchData,
    setError,
    clearError,
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
