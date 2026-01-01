'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { 
  workspaceCreateSchema,
  workspaceInvitationSchema,
  workspaceMemberRemovalSchema,
  workspaceOwnershipTransferSchema 
} from '@/lib/validations/workspace'
import type { WorkspaceResult } from '@/lib/supabase/types'
import type { 
  Workspace, 
  WorkspaceInvitation
} from '@/lib/supabase/types'

/**
 * Create a new workspace and initialize with default categories
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export async function createWorkspaceAction(
  formData: FormData
): Promise<WorkspaceResult<Workspace>> {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate form data
  const validated = workspaceCreateSchema.safeParse({
    name: formData.get('name'),
    currency: formData.get('currency') || 'UAH'
  })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  try {
    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: validated.data.name,
        owner_id: user.id,
        currency: validated.data.currency
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('Error creating workspace:', workspaceError)
      return { error: 'Failed to create workspace' }
    }

    // Initialize default categories for the workspace
    await initializeDefaultCategories(workspace.id)

    revalidatePath('/dashboard')
    return { data: workspace }
  } catch (error) {
    console.error('Error in createWorkspaceAction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Initialize default categories for a new workspace
 * Requirements: 4.4
 */
async function initializeDefaultCategories(workspaceId: string): Promise<void> {
  const supabase = await createClient()

  const defaultCategories = [
    // Income categories
    { name: 'Salary', type: 'income', icon: '💼', color: '#4E7A58' },
    { name: 'Freelance', type: 'income', icon: '💻', color: '#4E7A58' },
    { name: 'Investment', type: 'income', icon: '📈', color: '#4E7A58' },
    { name: 'Other Income', type: 'income', icon: '💰', color: '#4E7A58' },

    // Expense categories
    { name: 'Food & Dining', type: 'expense', icon: '🍽️', color: '#E6A65D' },
    { name: 'Transportation', type: 'expense', icon: '🚗', color: '#E6A65D' },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#E6A65D' },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#E6A65D' },
    { name: 'Bills & Utilities', type: 'expense', icon: '⚡', color: '#E6A65D' },
    { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#E6A65D' },
    { name: 'Education', type: 'expense', icon: '📚', color: '#E6A65D' },
    { name: 'Home & Garden', type: 'expense', icon: '🏠', color: '#E6A65D' },
    { name: 'Personal Care', type: 'expense', icon: '💅', color: '#E6A65D' },
    { name: 'Travel', type: 'expense', icon: '✈️', color: '#E6A65D' },
    { name: 'Insurance', type: 'expense', icon: '🛡️', color: '#E6A65D' },
    { name: 'Taxes', type: 'expense', icon: '📋', color: '#E6A65D' },
    { name: 'Other Expenses', type: 'expense', icon: '📦', color: '#E6A65D' },

    // Transfer category
    { name: 'Transfer', type: 'transfer', icon: '🔄', color: '#5C3A21' }
  ]

  try {
    const { error } = await supabase
      .from('categories')
      .insert(
        defaultCategories.map(category => ({
          ...category,
          workspace_id: workspaceId
        }))
      )

    if (error) {
      console.error('Error creating default categories:', error)
    }
  } catch (error) {
    console.error('Error in initializeDefaultCategories:', error)
  }
}

/**
 * Invite a member to a workspace
 * Requirements: 5.1, 5.2
 */
export async function inviteMemberAction(
  formData: FormData
): Promise<WorkspaceResult<WorkspaceInvitation>> {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate form data
  const validated = workspaceInvitationSchema.safeParse({
    email: formData.get('email'),
    workspaceId: formData.get('workspaceId')
  })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  try {
    // Check if user is workspace owner
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', validated.data.workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.role !== 'owner') {
      return { error: 'Only workspace owners can invite members' }
    }

    // Generate invitation token and expiration
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: validated.data.workspaceId,
        email: validated.data.email.toLowerCase().trim(),
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      if (invitationError.code === '23505') { // Unique constraint violation
        return { error: 'User is already invited to this workspace' }
      }
      console.error('Error creating invitation:', invitationError)
      return { error: 'Failed to create invitation' }
    }

    revalidatePath('/dashboard')
    return { data: invitation }
  } catch (error) {
    console.error('Error in inviteMemberAction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Remove a member from a workspace
 * Requirements: 6.2, 6.4
 */
export async function removeMemberAction(
  formData: FormData
): Promise<WorkspaceResult<void>> {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate form data
  const validated = workspaceMemberRemovalSchema.safeParse({
    memberId: formData.get('memberId')
  })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  try {
    // Get member details and check permissions
    const { data: memberToRemove, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, user_id, role')
      .eq('id', validated.data.memberId)
      .single()

    if (memberError || !memberToRemove) {
      return { error: 'Member not found' }
    }

    // Check if current user is workspace owner
    const { data: currentMembership, error: currentMembershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', memberToRemove.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (currentMembershipError || currentMembership?.role !== 'owner') {
      return { error: 'Only workspace owners can remove members' }
    }

    // Prevent removing the owner
    if (memberToRemove.role === 'owner') {
      return { error: 'Cannot remove workspace owner' }
    }

    // Remove member
    const { error: removeError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', validated.data.memberId)

    if (removeError) {
      console.error('Error removing member:', removeError)
      return { error: 'Failed to remove member' }
    }

    revalidatePath('/dashboard')
    return { data: undefined }
  } catch (error) {
    console.error('Error in removeMemberAction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Transfer ownership of a workspace
 * Requirements: 6.3
 */
export async function transferOwnershipAction(
  formData: FormData
): Promise<WorkspaceResult<void>> {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate form data
  const validated = workspaceOwnershipTransferSchema.safeParse({
    newOwnerId: formData.get('newOwnerId')
  })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  try {
    // Get current user's membership to find workspace
    const { data: currentMembership, error: currentMembershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single()

    if (currentMembershipError || !currentMembership) {
      return { error: 'Only workspace owners can transfer ownership' }
    }

    // Get new owner's membership
    const { data: newOwnerMembership, error: newOwnerError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', currentMembership.workspace_id)
      .eq('user_id', validated.data.newOwnerId)
      .single()

    if (newOwnerError || !newOwnerMembership) {
      return { error: 'New owner must be a member of the workspace' }
    }

    // Update workspace owner
    const { error: workspaceError } = await supabase
      .from('workspaces')
      .update({ owner_id: validated.data.newOwnerId })
      .eq('id', currentMembership.workspace_id)

    if (workspaceError) {
      console.error('Error updating workspace owner:', workspaceError)
      return { error: 'Failed to transfer ownership' }
    }

    // Update new owner's role
    const { error: newOwnerRoleError } = await supabase
      .from('workspace_members')
      .update({ role: 'owner' })
      .eq('id', newOwnerMembership.id)

    if (newOwnerRoleError) {
      console.error('Error updating new owner role:', newOwnerRoleError)
      return { error: 'Failed to update new owner role' }
    }

    // Update current user's role to member
    const { error: currentUserRoleError } = await supabase
      .from('workspace_members')
      .update({ role: 'member' })
      .eq('user_id', user.id)
      .eq('workspace_id', currentMembership.workspace_id)

    if (currentUserRoleError) {
      console.error('Error updating current user role:', currentUserRoleError)
      return { error: 'Failed to update current user role' }
    }

    revalidatePath('/dashboard')
    return { data: undefined }
  } catch (error) {
    console.error('Error in transferOwnershipAction:', error)
    return { error: 'An unexpected error occurred' }
  }
}