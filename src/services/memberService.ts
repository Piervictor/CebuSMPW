/**
 * Member Service
 * Handles all member-related operations and business logic
 */

import { Member } from '../app/data/mockData';
import { apiService } from './api';

export const memberService = {
  /**
   * Get all members
   */
  getAllMembers: async (): Promise<Member[]> => {
    try {
      const members = await apiService.members.getAll();
      return members || [];
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  },

  /**
   * Get member by ID
   */
  getMemberById: async (memberId: string): Promise<Member | null> => {
    try {
      const member = await apiService.members.getById(memberId);
      return member || null;
    } catch (error) {
      console.error(`Error fetching member ${memberId}:`, error);
      throw error;
    }
  },

  /**
   * Get all members in a congregation
   */
  getMembersByCongregation: async (congregationId: string): Promise<Member[]> => {
    try {
      const members = await apiService.members.getByCongregation(congregationId);
      return members || [];
    } catch (error) {
      console.error(`Error fetching members for congregation ${congregationId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new member
   * Validates required fields and data format
   */
  createMember: async (memberData: Omit<Member, 'id'>): Promise<Member> => {
    try {
      // Validation
      if (!memberData.name?.trim()) {
        throw new Error('Member name is required');
      }
      if (!memberData.congregationId) {
        throw new Error('Congregation assignment is required');
      }
      if (!memberData.ageGroup) {
        throw new Error('Age group is required');
      }
      if (!memberData.experience) {
        throw new Error('Experience level is required');
      }

      // Set default limits if not provided
      const dataWithDefaults = {
        ...memberData,
        weeklyLimit: memberData.weeklyLimit || 3,
        monthlyLimit: memberData.monthlyLimit || 12,
        weeklyReservations: memberData.weeklyReservations || 0,
        monthlyReservations: memberData.monthlyReservations || 0,
        preferredDays: memberData.preferredDays || [],
        preferredTimes: memberData.preferredTimes || [],
        preferredLocations: memberData.preferredLocations || [],
      };

      const newMember = await apiService.members.create(dataWithDefaults);
      return newMember;
    } catch (error) {
      console.error('Error creating member:', error);
      throw error;
    }
  },

  /**
   * Update member details
   */
  updateMember: async (
    memberId: string,
    updates: Partial<Member>
  ): Promise<Member | null> => {
    try {
      // Validate member exists
      const member = await memberService.getMemberById(memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      // Validate name if updating
      if (updates.name && !updates.name.trim()) {
        throw new Error('Member name cannot be empty');
      }

      const updatedMember = await apiService.members.update(memberId, updates);
      return updatedMember || null;
    } catch (error) {
      console.error(`Error updating member ${memberId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a member
   * Note: Service layer only deletes, context handles removing from shifts
   */
  deleteMember: async (memberId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Validate member exists
      const member = await memberService.getMemberById(memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      await apiService.members.delete(memberId);
      return { success: true, message: 'Member deleted successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Deletion failed';
      console.error(`Error deleting member ${memberId}:`, error);
      return { success: false, message: errorMsg };
    }
  },

  /**
   * Get member activity metrics (for reports/dashboard)
   */
  getMemberStats: async (memberId: string) => {
    try {
      const member = await memberService.getMemberById(memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      return {
        id: member.id,
        name: member.name,
        weeklyUsage: member.weeklyReservations,
        weeklyLimit: member.weeklyLimit,
        weeklyPercentage: (member.weeklyReservations / member.weeklyLimit) * 100,
        monthlyUsage: member.monthlyReservations,
        monthlyLimit: member.monthlyLimit,
        monthlyPercentage: (member.monthlyReservations / member.monthlyLimit) * 100,
        experience: member.experience,
        ageGroup: member.ageGroup,
      };
    } catch (error) {
      console.error(`Error calculating member stats for ${memberId}:`, error);
      throw error;
    }
  },

  /**
   * Get members matching location criteria
   * Filters by age, experience, and congregation link
   */
  getEligibleMembers: async (
    locationId: string,
    locationRequirements: {
      ageGroup: string;
      experienceLevel: string;
      linkedCongregations: string[];
    }
  ): Promise<Member[]> => {
    try {
      const allMembers = await memberService.getAllMembers();

      return allMembers.filter((member) => {
        // Check congregation link
        if (!locationRequirements.linkedCongregations.includes(member.congregationId)) {
          return false;
        }

        // Check age requirement
        if (locationRequirements.ageGroup === 'Seniors excluded' && member.ageGroup === 'Senior') {
          return false;
        }
        if (locationRequirements.ageGroup === 'Adults only' && member.ageGroup === 'Youth') {
          return false;
        }

        // Check experience requirement
        if (
          locationRequirements.experienceLevel === 'Experienced only' &&
          member.experience !== 'Experienced'
        ) {
          return false;
        }
        if (
          locationRequirements.experienceLevel === 'Intermediate' &&
          member.experience === 'New'
        ) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error('Error filtering eligible members:', error);
      throw error;
    }
  },
};
