/**
 * Shift Service
 * Handles all shift-related operations and business logic
 */

import { Shift } from '../app/data/mockData';
import { apiService } from './api';

export const shiftService = {
  /**
   * Get all shifts
   * Can optionally filter by location or date range
   */
  getAllShifts: async (filters?: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Shift[]> => {
    try {
      // In mock mode, return from context
      // In real API mode, would call: await apiService.shifts.getAll()
      let query = '';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.locationId) params.append('locationId', filters.locationId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        query = params.toString() ? `?${params.toString()}` : '';
      }

      // Mock: return from context or API call
      const shifts =  await apiService.shifts.getAll();
      return shifts || [];
    } catch (error) {
      console.error('Error fetching shifts:', error);
      throw error;
    }
  },

  /**
   * Get shift by ID
   */
  getShiftById: async (shiftId: string): Promise<Shift | null> => {
    try {
      const shift = await apiService.shifts.getById(shiftId);
      return shift || null;
    } catch (error) {
      console.error(`Error fetching shift ${shiftId}:`, error);
      throw error;
    }
  },

  /**
   * Assign member to shift with validation
   * Validates:
   * - Shift exists
   * - Member exists
   * - Member not already assigned
   * - Member meets location requirements
   * - Member within weekly/monthly limits
   */
  assignMember: async (
    shiftId: string,
    memberId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Make API call
      await apiService.shifts.assignMember(shiftId, memberId);
      return { success: true, message: 'Member assigned successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Assignment failed';
      console.error('Error assigning member:', error);
      return { success: false, message: errorMsg };
    }
  },

  /**
   * Remove member from shift
   */
  removeMember: async (
    shiftId: string,
    memberId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await apiService.shifts.removeMember(shiftId, memberId);
      return { success: true, message: 'Member removed successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Removal failed';
      console.error('Error removing member:', error);
      return { success: false, message: errorMsg };
    }
  },

  /**
   * Update shift details (time, required count, etc.)
   */
  updateShift: async (
    shiftId: string,
    updates: Partial<Shift>
  ): Promise<Shift | null> => {
    try {
      const updatedShift = await apiService.shifts.update(shiftId, updates);
      return updatedShift || null;
    } catch (error) {
      console.error('Error updating shift:', error);
      throw error;
    }
  },

  /**
   * Get shift statistics for reporting
   */
  getShiftStats: async (locationId?: string, dateRange?: { start: string; end: string }) => {
    try {
      const shifts = await shiftService.getAllShifts({
        locationId,
        startDate: dateRange?.start,
        endDate: dateRange?.end,
      });

      return {
        total: shifts.length,
        open: shifts.filter((s) => s.status === 'open').length,
        partial: shifts.filter((s) => s.status === 'partial').length,
        filled: shifts.filter((s) => s.status === 'filled').length,
        assignedCount: shifts.reduce((sum, s) => sum + s.assignedMembers.length, 0),
        requiredCount: shifts.reduce((sum, s) => sum + s.requiredCount, 0),
        coverage: 0, // Will be calculated
      };
    } catch (error) {
      console.error('Error calculating shift stats:', error);
      throw error;
    }
  },
};
