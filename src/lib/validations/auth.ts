import { z } from 'zod'

/**
 * Validation schemas for authentication operations
 * Following the requirements from the design document
 */

// Password validation - Requirements 1.3, 3.7
export const passwordSchema = z
  .string()
  .min(8, "Пароль має містити щонайменше 8 символів")
  .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Пароль має містити хоча б одну літеру та одну цифру")

// Email validation - Requirements 1.4, 3.2, 5.1
export const emailSchema = z
  .string()
  .email("Введіть коректну електронну адресу")
  .toLowerCase()

// Full name validation
export const fullNameSchema = z
  .string()
  .min(1, "Укажіть ім’я та прізвище")
  .max(100, "Ім’я та прізвище мають містити менше ніж 100 символів")
  .trim()

// Sign up schema - Requirements 1.2, 1.3, 1.4
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  confirmPassword: z.string(),
  invitationToken: z.string().uuid().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Паролі не збігаються",
  path: ["confirmPassword"],
})

// Sign in schema - Requirements 2.1
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Уведіть пароль"),
  rememberMe: z.boolean().optional().default(false),
})

// Password reset request schema - Requirements 3.2
export const resetPasswordSchema = z.object({
  email: emailSchema,
})

// Password reset request schema - Requirements 3.2
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

// Password reset confirmation schema - Requirements 3.7
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Потрібен токен відновлення пароля"),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Паролі не збігаються",
  path: ["confirmPassword"],
})

// Email verification schema - Requirements 8.3
export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Потрібен токен підтвердження"),
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