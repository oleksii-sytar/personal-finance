import { z } from 'zod'

/**
 * Workspace validation schemas
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

export const workspaceCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be less than 100 characters')
    .trim(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .default('UAH'),
})

export const workspaceUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be less than 100 characters')
    .trim()
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .optional(),
})

export const workspaceInviteSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
})

export const workspaceInvitationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  workspaceId: z
    .string()
    .uuid('Invalid workspace ID'),
})

export const workspaceMemberRemovalSchema = z.object({
  memberId: z
    .string()
    .uuid('Invalid member ID'),
})

export const workspaceOwnershipTransferSchema = z.object({
  newOwnerId: z
    .string()
    .uuid('Invalid user ID'),
})

export const workspaceMemberRoleSchema = z.object({
  role: z.enum(['owner', 'member'], {
    errorMap: () => ({ message: 'Role must be either owner or member' }),
  }),
})

// Inferred types
export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>
export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>
export type WorkspaceInviteInput = z.infer<typeof workspaceInviteSchema>
export type WorkspaceInvitationInput = z.infer<typeof workspaceInvitationSchema>
export type WorkspaceMemberRemovalInput = z.infer<typeof workspaceMemberRemovalSchema>
export type WorkspaceOwnershipTransferInput = z.infer<typeof workspaceOwnershipTransferSchema>
export type WorkspaceMemberRoleInput = z.infer<typeof workspaceMemberRoleSchema>

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]['code']