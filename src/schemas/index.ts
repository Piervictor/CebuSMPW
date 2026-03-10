/**
 * Validation Schemas using Zod
 * Defines data validation rules for all entities
 * Used for form validation and API request validation
 */

import { z } from 'zod';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

/**
 * Custom Zod resolver for react-hook-form.
 * Bypasses @hookform/resolvers/zod which has a Vite bundling bug:
 * the resolver imports zod/v4/core's $ZodError but Vite tree-shakes it
 * to the wrong class (plain vs Error subclass), so instanceof always fails.
 * This uses Zod's classic .safeParseAsync() API which avoids the issue.
 */
export function zodFormResolver<T extends z.ZodType>(
  schema: T,
): Resolver<z.infer<T>> {
  return async (values: FieldValues) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data, errors: {} as FieldErrors };
    }
    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join('.');
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = { type: issue.code, message: issue.message };
      }
    }
    return { values: {}, errors: fieldErrors };
  };
}

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
 * CIRCUIT SCHEMA
 */
export const CircuitSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Circuit name must be at least 2 characters')
    .max(100, 'Circuit name is too long'),
  city: z
    .string()
    .max(50, 'City name is too long')
    .optional()
    .default(''),
  coordinator: z
    .string()
    .min(2, 'Coordinator name must be at least 2 characters')
    .max(100, 'Coordinator name is too long'),
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .optional()
    .default(''),
});

export const CreateCircuitSchema = CircuitSchema.omit({ id: true });
export const UpdateCircuitSchema = CircuitSchema.partial().omit({ id: true });

export type CircuitFormData = z.infer<typeof CreateCircuitSchema>;
export type CircuitUpdateData = z.infer<typeof UpdateCircuitSchema>;

/**
 * DAY OF WEEK
 */
export const DayOfWeekSchema = z.enum([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]);

/**
 * TIMESLOT SCHEMA
 */
export const TimeslotSchema = z.object({
  id: z.string().optional(),
  locationId: z.string().min(1, 'Location is required'),
  dayOfWeek: DayOfWeekSchema,
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
  requiredPublishers: z
    .number()
    .min(2, 'At least 2 publishers required')
    .max(6, 'Maximum 6 publishers')
    .int('Must be a whole number')
    .default(2),
  active: z.boolean().default(true),
});

export const CreateTimeslotSchema = TimeslotSchema.omit({ id: true });
export const UpdateTimeslotSchema = TimeslotSchema.partial().omit({ id: true });

export type TimeslotFormData = z.infer<typeof CreateTimeslotSchema>;
export type TimeslotUpdateData = z.infer<typeof UpdateTimeslotSchema>;

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
 * Member Status validation
 */
export const MemberStatusSchema = z.enum(['Active', 'Inactive']);

/**
 * Member Appearance validation
 */
export const MemberAppearanceSchema = z.enum(['Excellent', 'Good', 'Average']);

/**
 * Weekday Availability validation
 */
export const WeekdayAvailabilitySchema = z.enum(['Morning', 'Half Day Morning', 'Half Day Afternoon', 'Afternoon', 'Full Day', 'Evening', 'NA']);

/**
 * Member Availability schema
 */
export const MemberAvailabilitySchema = z.object({
  monday: WeekdayAvailabilitySchema.default('NA'),
  tuesday: WeekdayAvailabilitySchema.default('NA'),
  wednesday: WeekdayAvailabilitySchema.default('NA'),
  thursday: WeekdayAvailabilitySchema.default('NA'),
  friday: WeekdayAvailabilitySchema.default('NA'),
  saturdayDays: z.number().min(0).max(5).int().default(0),
  sundayDays: z.number().min(0).max(5).int().default(0),
});

/**
 * MEMBER SCHEMA
 */
export const MemberSchema = z.object({
  id: z.string().optional(),
  surname: z
    .string()
    .min(1, 'Surname is required')
    .max(100, 'Surname is too long'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  middleInitial: z
    .string()
    .max(5, 'Middle initial is too long')
    .optional()
    .or(z.literal('')),
  name: z.string().optional(), // computed field
  circuitId: z
    .string()
    .min(1, 'Circuit is required'),
  congregationId: z
    .string()
    .min(1, 'Congregation is required'),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal('')),
  age: z
    .number()
    .optional(),
  status: MemberStatusSchema.default('Active'),
  appearance: MemberAppearanceSchema,
  language: z
    .string()
    .optional()
    .or(z.literal('')),
  availability: MemberAvailabilitySchema.default({
    monday: 'NA', tuesday: 'NA', wednesday: 'NA', thursday: 'NA', friday: 'NA',
    saturdayDays: 0, sundayDays: 0,
  }),
  // Legacy / scheduling fields
  ageGroup: MemberAgeGroupSchema.default('Adult'),
  experience: MemberExperienceSchema.default('New'),
  weeklyReservations: z
    .number()
    .min(0, 'Cannot be negative')
    .int('Must be a whole number')
    .default(0),
  monthlyReservations: z
    .number()
    .min(0, 'Cannot be negative')
    .int('Must be a whole number')
    .default(0),
  weeklyLimit: z
    .number()
    .min(1, 'Weekly limit must be at least 1')
    .max(7, 'Weekly limit cannot exceed 7')
    .int('Must be a whole number')
    .default(2),
  monthlyLimit: z
    .number()
    .min(1, 'Monthly limit must be at least 1')
    .max(30, 'Monthly limit cannot exceed 30')
    .int('Must be a whole number')
    .default(8),
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
    .optional()
    .or(z.literal('')),
  languageGroup: z
    .string()
    .optional(),
  preferredDays: z
    .array(z.string())
    .default([]),
  preferredTimes: z
    .array(z.string())
    .default([]),
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
  circuitId: z
    .string()
    .min(1, 'Circuit is required'),
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
  ageGroup: AgeGroupSchema.optional().default('All ages'),
  experienceLevel: ExperienceLevelSchema.optional().default('Any'),
  maxPublishers: z
    .number()
    .min(1, 'Maximum publishers must be at least 1')
    .max(10, 'Maximum publishers cannot exceed 10')
    .int('Must be a whole number')
    .optional()
    .default(3),
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .optional()
    .default(''),
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
  circuitId: z
    .string()
    .min(1, 'Circuit is required'),
  name: z
    .string()
    .min(2, 'Congregation name must be at least 2 characters')
    .max(100, 'Name is too long'),
  city: z
    .string()
    .max(50, 'City name is too long')
    .optional()
    .default(''),
  overseers: z
    .array(z.string())
    .default([]),
  publisherCount: z
    .number()
    .min(0, 'Publisher count cannot be negative')
    .int('Must be a whole number')
    .optional()
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
      error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { root: 'Validation failed' } };
  }
}
