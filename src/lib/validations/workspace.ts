import { z } from 'zod'
import { emailSchema } from './auth'

/**
 * Validation schemas for workspace operations
 * Following the requirements from the design document
 */

// Workspace name validation - Requirements 4.2
export const workspaceNameSchema = z
  .string()
  .min(1, 'Workspace name is required')
  .max(100, 'Workspace name must be less than 100 characters')
  .trim()

// Currency validation
export const currencySchema = z
  .string()
  .length(3, 'Currency must be a 3-letter code')
  .toUpperCase()

// Workspace creation schema - Requirements 4.1, 4.2
export const workspaceCreateSchema = z.object({
  name: workspaceNameSchema,
  currency: currencySchema.optional().default('UAH'),
})

// Workspace update schema
export const workspaceUpdateSchema = z.object({
  name: workspaceNameSchema.optional(),
  currency: currencySchema.optional(),
})

// Workspace invitation schema - Requirements 5.1
export const workspaceInvitationSchema = z.object({
  email: emailSchema,
  workspaceId: z.string().uuid('Invalid workspace ID'),
})

// Workspace invitation acceptance schema - Requirements 5.3
export const workspaceInvitationAcceptSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
})

// Workspace member role schema
export const workspaceMemberRoleSchema = z.enum(['owner', 'member'])

// Workspace member update schema - Requirements 6.1, 6.2, 6.3
export const workspaceMemberUpdateSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  role: workspaceMemberRoleSchema.optional(),
})

// Workspace member removal schema - Requirements 6.2
export const workspaceMemberRemovalSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
})

// Workspace ownership transfer schema - Requirements 6.3
export const workspaceOwnershipTransferSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID'),
})

// Workspace switching schema
export const workspaceSwitchSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
})

// Export types for use in components and server actions
export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>
export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>
export type WorkspaceInvitationInput = z.infer<typeof workspaceInvitationSchema>
export type WorkspaceInvitationAcceptInput = z.infer<typeof workspaceInvitationAcceptSchema>
export type WorkspaceMemberUpdateInput = z.infer<typeof workspaceMemberUpdateSchema>
export type WorkspaceMemberRemovalInput = z.infer<typeof workspaceMemberRemovalSchema>
export type WorkspaceOwnershipTransferInput = z.infer<typeof workspaceOwnershipTransferSchema>
export type WorkspaceSwitchInput = z.infer<typeof workspaceSwitchSchema>
export type WorkspaceMemberRole = z.infer<typeof workspaceMemberRoleSchema>