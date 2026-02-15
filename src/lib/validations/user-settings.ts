import { z } from 'zod'

/**
 * User Settings validation schemas
 * Requirements: User Journey Enhancement - Phase 2: Financial Safety Dashboard
 * 
 * Validates user-specific forecast preferences including:
 * - Minimum safe balance threshold
 * - Safety buffer days (1-30 days)
 */

// User settings form schema
export const userSettingsFormSchema = z.object({
  minimum_safe_balance: z
    .coerce
    .number({
      invalid_type_error: 'Minimum safe balance must be a valid number',
    })
    .min(0, 'Minimum safe balance cannot be negative')
    .default(0),
  safety_buffer_days: z
    .coerce
    .number({
      invalid_type_error: 'Safety buffer days must be a valid number',
    })
    .int('Safety buffer days must be a whole number')
    .min(1, 'Safety buffer days must be at least 1 day')
    .max(30, 'Safety buffer days cannot exceed 30 days')
    .default(7),
})

// Server-side schema with user_id and workspace_id
export const createUserSettingsSchema = userSettingsFormSchema.extend({
  user_id: z.string().uuid('Invalid user ID'),
  workspace_id: z.string().uuid('Invalid workspace ID'),
})

// Type exports
export type UserSettingsFormInput = z.infer<typeof userSettingsFormSchema>
export type CreateUserSettingsInput = z.infer<typeof createUserSettingsSchema>
