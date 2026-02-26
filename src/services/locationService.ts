/**
 * Location Service
 * Handles all location-related operations and business logic
 */

import { Location } from '../app/data/mockData';
import { apiService } from './api';

export const locationService = {
  /**
   * Get all locations
   */
  getAllLocations: async (): Promise<Location[]> => {
    try {
      const locations = await apiService.locations.getAll();
      return locations || [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },

  /**
   * Get location by ID
   */
  getLocationById: async (locationId: string): Promise<Location | null> => {
    try {
      const location = await apiService.locations.getById(locationId);
      return location || null;
    } catch (error) {
      console.error(`Error fetching location ${locationId}:`, error);
      throw error;
    }
  },

  /**
   * Get active locations only
   */
  getActiveLocations: async (): Promise<Location[]> => {
    try {
      const allLocations = await locationService.getAllLocations();
      return allLocations.filter((loc) => loc.active);
    } catch (error) {
      console.error('Error fetching active locations:', error);
      throw error;
    }
  },

  /**
   * Create a new location
   * Validates required fields and constraints
   */
  createLocation: async (locationData: Omit<Location, 'id'>): Promise<Location> => {
    try {
      // Validation
      if (!locationData.name?.trim()) {
        throw new Error('Location name is required');
      }
      if (!locationData.city?.trim()) {
        throw new Error('City is required');
      }
      if (!locationData.category) {
        throw new Error('Category is required');
      }
      if (!locationData.linkedCongregations || locationData.linkedCongregations.length === 0) {
        throw new Error('At least one congregation must be linked');
      }
      if (locationData.maxPublishers < 1) {
        throw new Error('Maximum publishers must be at least 1');
      }

      // Set defaults
      const dataWithDefaults = {
        ...locationData,
        active: locationData.active ?? true,
        ageGroup: locationData.ageGroup || 'All ages',
        experienceLevel: locationData.experienceLevel || 'Any',
        notes: locationData.notes || '',
      };

      const newLocation = await apiService.locations.create(dataWithDefaults);
      return newLocation;
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  },

  /**
   * Update location details
   */
  updateLocation: async (
    locationId: string,
    updates: Partial<Location>
  ): Promise<Location | null> => {
    try {
      // Validate location exists
      const location = await locationService.getLocationById(locationId);
      if (!location) {
        throw new Error('Location not found');
      }

      // Validate name if updating
      if (updates.name && !updates.name.trim()) {
        throw new Error('Location name cannot be empty');
      }

      // Validate congregations if updating
      if (updates.linkedCongregations && updates.linkedCongregations.length === 0) {
        throw new Error('At least one congregation must be linked');
      }

      const updatedLocation = await apiService.locations.update(locationId, updates);
      return updatedLocation || null;
    } catch (error) {
      console.error(`Error updating location ${locationId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a location
   * Note: Context layer validates no future shifts exist
   */
  deleteLocation: async (locationId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Validate location exists
      const location = await locationService.getLocationById(locationId);
      if (!location) {
        throw new Error('Location not found');
      }

      await apiService.locations.delete(locationId);
      return { success: true, message: 'Location deleted successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Deletion failed';
      console.error(`Error deleting location ${locationId}:`, error);
      return { success: false, message: errorMsg };
    }
  },

  /**
   * Toggle location active status
   */
  toggleLocationStatus: async (locationId: string): Promise<Location | null> => {
    try {
      const location = await locationService.getLocationById(locationId);
      if (!location) {
        throw new Error('Location not found');
      }

      const updatedLocation = await apiService.locations.update(locationId, {
        active: !location.active,
      });
      return updatedLocation || null;
    } catch (error) {
      console.error(`Error toggling location status for ${locationId}:`, error);
      throw error;
    }
  },

  /**
   * Get locations by city
   */
  getLocationsByCity: async (city: string): Promise<Location[]> => {
    try {
      const allLocations = await locationService.getAllLocations();
      return allLocations.filter((loc) => loc.city.toLowerCase() === city.toLowerCase());
    } catch (error) {
      console.error(`Error fetching locations for city ${city}:`, error);
      throw error;
    }
  },

  /**
   * Get locations by category
   */
  getLocationsByCategory: async (category: string): Promise<Location[]> => {
    try {
      const allLocations = await locationService.getAllLocations();
      return allLocations.filter((loc) => loc.category === category);
    } catch (error) {
      console.error(`Error fetching locations for category ${category}:`, error);
      throw error;
    }
  },

  /**
   * Get location statistics (for reports)
   */
  getLocationStats: async (locationId: string) => {
    try {
      const location = await locationService.getLocationById(locationId);
      if (!location) {
        throw new Error('Location not found');
      }

      return {
        id: location.id,
        name: location.name,
        category: location.category,
        city: location.city,
        maxPublishers: location.maxPublishers,
        linkedCongregations: location.linkedCongregations,
        ageGroup: location.ageGroup,
        experienceLevel: location.experienceLevel,
        active: location.active,
        // Additional stats would be calculated with shifts data
        totalShiftsCreated: 0,
        shiftsCovered: 0,
        coverageRate: 0,
      };
    } catch (error) {
      console.error(`Error calculating location stats for ${locationId}:`, error);
      throw error;
    }
  },

  /**
   * Search locations
   */
  searchLocations: async (query: string): Promise<Location[]> => {
    try {
      const allLocations = await locationService.getAllLocations();
      const lowerQuery = query.toLowerCase();

      return allLocations.filter((loc) =>
        loc.name.toLowerCase().includes(lowerQuery) ||
        loc.city.toLowerCase().includes(lowerQuery) ||
        loc.category.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching locations:', error);
      throw error;
    }
  },
};
