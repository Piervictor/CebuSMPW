/**
 * Congregation Service
 * Handles all congregation-related operations and business logic
 */

import { Congregation } from '../app/data/mockData';
import { apiService } from './api';

export const congregationService = {
  /**
   * Get all congregations
   */
  getAllCongregations: async (): Promise<Congregation[]> => {
    try {
      const congregations = await apiService.congregations.getAll();
      return congregations || [];
    } catch (error) {
      console.error('Error fetching congregations:', error);
      throw error;
    }
  },

  /**
   * Get congregation by ID
   */
  getCongregationById: async (congregationId: string): Promise<Congregation | null> => {
    try {
      const congregation = await apiService.congregations.getById(congregationId);
      return congregation || null;
    } catch (error) {
      console.error(`Error fetching congregation ${congregationId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new congregation
   * Validates required fields
   */
  createCongregation: async (
    congregationData: Omit<Congregation, 'id'>
  ): Promise<Congregation> => {
    try {
      // Validation
      if (!congregationData.name?.trim()) {
        throw new Error('Congregation name is required');
      }
      if (congregationData.publisherCount != null && congregationData.publisherCount < 0) {
        throw new Error('Publisher count cannot be negative');
      }

      // Set defaults
      const dataWithDefaults = {
        ...congregationData,
        overseers: congregationData.overseers || [],
        shiftsServed: congregationData.shiftsServed || 0,
        coverageRate: congregationData.coverageRate || 0,
      };

      const newCongregation = await apiService.congregations.create(dataWithDefaults);
      return newCongregation;
    } catch (error) {
      console.error('Error creating congregation:', error);
      throw error;
    }
  },

  /**
   * Update congregation details
   */
  updateCongregation: async (
    congregationId: string,
    updates: Partial<Congregation>
  ): Promise<Congregation | null> => {
    try {
      // Validate congregation exists
      const congregation = await congregationService.getCongregationById(congregationId);
      if (!congregation) {
        throw new Error('Congregation not found');
      }

      // Validate name if updating
      if (updates.name && !updates.name.trim()) {
        throw new Error('Congregation name cannot be empty');
      }

      // Validate publisher count if updating
      if (updates.publisherCount !== undefined && updates.publisherCount < 0) {
        throw new Error('Publisher count cannot be negative');
      }

      const updatedCongregation = await apiService.congregations.update(congregationId, updates);
      return updatedCongregation || null;
    } catch (error) {
      console.error(`Error updating congregation ${congregationId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a congregation
   * Note: Context layer validates no members are assigned
   */
  deleteCongregation: async (
    congregationId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Validate congregation exists
      const congregation = await congregationService.getCongregationById(congregationId);
      if (!congregation) {
        throw new Error('Congregation not found');
      }

      await apiService.congregations.delete(congregationId);
      return { success: true, message: 'Congregation deleted successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Deletion failed';
      console.error(`Error deleting congregation ${congregationId}:`, error);
      return { success: false, message: errorMsg };
    }
  },

  /**
   * Add overseer to congregation
   */
  addOverseer: async (congregationId: string, overseerName: string): Promise<Congregation | null> => {
    try {
      if (!overseerName?.trim()) {
        throw new Error('Overseer name is required');
      }

      const congregation = await congregationService.getCongregationById(congregationId);
      if (!congregation) {
        throw new Error('Congregation not found');
      }

      // Check for duplicates
      if (congregation.overseers.includes(overseerName)) {
        throw new Error('Overseer already assigned to this congregation');
      }

      const updatedCongregation = await apiService.congregations.update(congregationId, {
        overseers: [...congregation.overseers, overseerName],
      });
      return updatedCongregation || null;
    } catch (error) {
      console.error(`Error adding overseer to congregation ${congregationId}:`, error);
      throw error;
    }
  },

  /**
   * Remove overseer from congregation
   */
  removeOverseer: async (congregationId: string, overseerName: string): Promise<Congregation | null> => {
    try {
      const congregation = await congregationService.getCongregationById(congregationId);
      if (!congregation) {
        throw new Error('Congregation not found');
      }

      if (!congregation.overseers.includes(overseerName)) {
        throw new Error('Overseer not found in congregation');
      }

      const updatedCongregation = await apiService.congregations.update(congregationId, {
        overseers: congregation.overseers.filter((o) => o !== overseerName),
      });
      return updatedCongregation || null;
    } catch (error) {
      console.error(`Error removing overseer from congregation ${congregationId}:`, error);
      throw error;
    }
  },

  /**
   * Get congregation statistics (for reports/dashboard)
   */
  getCongregationStats: async (congregationId: string) => {
    try {
      const congregation = await congregationService.getCongregationById(congregationId);
      if (!congregation) {
        throw new Error('Congregation not found');
      }

      return {
        id: congregation.id,
        name: congregation.name,
        city: congregation.city,
        publisherCount: congregation.publisherCount,
        overseerCount: congregation.overseers.length,
        shiftsServed: congregation.shiftsServed,
        coverageRate: congregation.coverageRate,
        overseers: congregation.overseers,
      };
    } catch (error) {
      console.error(`Error calculating congregation stats for ${congregationId}:`, error);
      throw error;
    }
  },

  /**
   * Search congregations by name or city
   */
  searchCongregations: async (query: string): Promise<Congregation[]> => {
    try {
      const allCongregations = await congregationService.getAllCongregations();
      const lowerQuery = query.toLowerCase();

      return allCongregations.filter((cong) =>
        cong.name.toLowerCase().includes(lowerQuery) ||
        (cong.city || '').toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching congregations:', error);
      throw error;
    }
  },

  /**
   * Get congregations by city
   */
  getCongregationsByCity: async (city: string): Promise<Congregation[]> => {
    try {
      const allCongregations = await congregationService.getAllCongregations();
      return allCongregations.filter((cong) => (cong.city || '').toLowerCase() === city.toLowerCase());
    } catch (error) {
      console.error(`Error fetching congregations for city ${city}:`, error);
      throw error;
    }
  },
};
