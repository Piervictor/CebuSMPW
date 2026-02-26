/**
 * Validation Schemas using Zod
 * Defines data validation rules for all entities
 * Used for form validation and API request validation
 */

import { z } from 'zod';

/**
 * User/Member Role validation
 */
export const UserRoleSchema = z.enum(['circuit-admin', 'congregation-admin', 'member']);

/**
 * Location Category validation
 */
export const LocationCategorySchema = z.enum(['Hospital', 'Plaza', 'Terminal', 'Mall']);

/**
 * Age Group validation
 */
export const AgeGroupSchema = z.enum(['All ages', 'Adults only', 'Seniors excluded']);

/**
 * Experience Level validation
 */
export const ExperienceLevelSchema = z.enum(['Any', 'Experienced only', 'Intermediate']);

/**
 * Member Age Group validation
 */
export const MemberAgeGroupSchema = z.enum(['Youth', 'Adult', 'Senior']);

/**
 * Member Experience validation
 */
export const MemberExperienceSchema = z.enum(['New', 'Intermediate', 'Experienced']);

/**
 * SHIFT SCHEMA
 */
export const ShiftSchema = z.object({
  id: z.string(),
  locationId: z.string().min(1, 'Location is required'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
  requiredCount: z
    .number()
    .min(1, 'At least 1 publisher is required')
    .max(10, 'Maximum 10 publishers per shift'),
  assignedMembers: z.array(z.string()),
  assignedBy: z.enum(['admin', 'self']).optional(),
  status: z.enum(['open', 'partial', 'filled']),
});

export type ShiftFormData = z.infer<typeof ShiftSchema>;

/**
 * MEMBER SCHEMA
 */
export const MemberSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  congregationId: z
    .string()
    .min(1, 'Congregation is required'),
  ageGroup: MemberAgeGroupSchema,
  experience: MemberExperienceSchema,
  weeklyReservations: z
    .number()
    .min(0, 'Cannot be negative')
    .int('Must be a whole number'),
  monthlyReservations: z
    .number()
    .min(0, 'Cannot be negative')
    .int('Must be a whole number'),
  weeklyLimit: z
    .number()
    .min(1, 'Weekly limit must be at least 1')
    .max(7, 'Weekly limit cannot exceed 7')
    .int('Must be a whole number'),
  monthlyLimit: z
    .number()
    .min(1, 'Monthly limit must be at least 1')
    .max(30, 'Monthly limit cannot exceed 30')
    .int('Must be a whole number'),
  telegramHandle: z
    .string()
    .regex(/^@?[\w]{3,32}$/, 'Invalid Telegram handle')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  languageGroup: z
    .string()
    .optional(),
  preferredDays: z
    .array(z.string())
    .min(1, 'Select at least one preferred day'),
  preferredTimes: z
    .array(z.string())
    .min(1, 'Select at least one preferred time'),
  preferredLocations: z
    .array(z.string())
    .optional(),
});

export const CreateMemberSchema = MemberSchema.omit({ id: true });
export const UpdateMemberSchema = MemberSchema.partial().omit({ id: true });

export type MemberFormData = z.infer<typeof CreateMemberSchema>;
export type MemberUpdateData = z.infer<typeof UpdateMemberSchema>;

/**
 * LOCATION SCHEMA
 */
export const LocationSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Location name must be at least 2 characters')
    .max(100, 'Name is too long'),
  category: LocationCategorySchema,
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City name is too long'),
  linkedCongregations: z
    .array(z.string())
    .min(1, 'At least one congregation must be linked'),
  active: z
    .boolean()
    .default(true),
  ageGroup: AgeGroupSchema.default('All ages'),
  experienceLevel: ExperienceLevelSchema.default('Any'),
  maxPublishers: z
    .number()
    .min(1, 'Maximum publishers must be at least 1')
    .max(10, 'Maximum publishers cannot exceed 10')
    .int('Must be a whole number'),
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .optional()
    .or(z.literal('')),
});

export const CreateLocationSchema = LocationSchema.omit({ id: true });
export const UpdateLocationSchema = LocationSchema.partial().omit({ id: true });

export type LocationFormData = z.infer<typeof CreateLocationSchema>;
export type LocationUpdateData = z.infer<typeof UpdateLocationSchema>;

/**
 * CONGREGATION SCHEMA
 */
export const CongregationSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Congregation name must be at least 2 characters')
    .max(100, 'Name is too long'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City name is too long'),
  overseers: z
    .array(z.string())
    .default([]),
  publisherCount: z
    .number()
    .min(0, 'Publisher count cannot be negative')
    .int('Must be a whole number')
    .default(0),
  shiftsServed: z
    .number()
    .min(0, 'Shifts served cannot be negative')
    .int('Must be a whole number')
    .default(0),
  coverageRate: z
    .number()
    .min(0, 'Coverage rate cannot be negative')
    .max(100, 'Coverage rate cannot exceed 100')
    .default(0),
});

export const CreateCongregationSchema = CongregationSchema.omit({ id: true });
export const UpdateCongregationSchema = CongregationSchema.partial().omit({ id: true });

export type CongregationFormData = z.infer<typeof CreateCongregationSchema>;
export type CongregationUpdateData = z.infer<typeof UpdateCongregationSchema>;

/**
 * ASSIGNMENT VALIDATION SCHEMA
 * Used when assigning a member to a shift
 */
export const ShiftAssignmentSchema = z.object({
  shiftId: z.string().min(1, 'Shift ID is required'),
  memberId: z.string().min(1, 'Member ID is required'),
});

export type ShiftAssignmentData = z.infer<typeof ShiftAssignmentSchema>;

/**
 * Helper function to validate and parse data
 * Returns { success, data, errors }
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { root: 'Validation failed' } };
  }
}
