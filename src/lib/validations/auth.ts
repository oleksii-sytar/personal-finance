import { z } from 'zod'

/**
 * Validation schemas for authentication operations
 * Following the requirements from the design document
 */

// Password validation - Requirements 1.3, 3.7
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number')

// Email validation - Requirements 1.4, 3.2, 5.1
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .toLowerCase()

// Full name validation
export const fullNameSchema = z
  .string()
  .min(1, 'Full name is required')
  .max(100, 'Full name must be less than 100 characters')
  .trim()

// Sign up schema - Requirements 1.2, 1.3, 1.4
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Sign in schema - Requirements 2.1
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
})

// Password reset request schema - Requirements 3.2
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

// Password reset confirmation schema - Requirements 3.7
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Email verification schema - Requirements 8.3
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

// User profile update schema
export const userProfileUpdateSchema = z.object({
  fullName: fullNameSchema.optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

// Export types for use in components and server actions
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>