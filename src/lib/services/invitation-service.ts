'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { WorkspaceInvitation } from '@/lib/supabase/types'

export interface PendingInvitation {
  id: string
  workspace_id: string
  email: string
  invited_by: string
  token: string
  expires_at: string
  created_at: string
  workspace: {
    id: string
    name: string
    currency: string
  }
  inviter: {
    id: string
    full_name: string
  }
}

/**
 * Create admin client that bypasses RLS
 */
function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Get all pending invitations for a user's email address
 * This is the core function that enables post-login invitation detection
 */
export async function getUserPendingInvitations(userEmail: string): Promise<{
  data?: PendingInvitation[]
  error?: string
}> {
  try {
    // Use admin client to bypass RLS for invitation lookup
    const adminSupabase = createAdminClient()

    // Get all pending invitations for this email
    const { data: invitations, error: invitationsError } = await adminSupabase
      .from('workspace_invitations')
      .select(`
        id,
        workspace_id,
        email,
        invited_by,
        token,
        expires_at,
        created_at
      `)
      .eq('email', userEmail.toLowerCase().trim())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()) // Only non-expired invitations

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return { error: 'Failed to fetch invitations' }
    }

    if (!invitations || invitations.length === 0) {
      return { data: [] }
    }

    // Get workspace details for all invitations
    const workspaceIds = invitations.map(inv => inv.workspace_id)
    const { data: workspaces, error: workspacesError } = await adminSupabase
      .from('workspaces')
      .select('id, name, currency')
      .in('id', workspaceIds)

    if (workspacesError) {
      console.error('Error fetching workspaces:', workspacesError)
      return { error: 'Failed to fetch workspace details' }
    }

    // Get inviter details for all invitations
    const inviterIds = invitations.map(inv => inv.invited_by)
    const { data: inviters, error: invitersError } = await adminSupabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', inviterIds)

    if (invitersError) {
      console.error('Error fetching inviters:', invitersError)
      return { error: 'Failed to fetch inviter details' }
    }

    // Combine all data
    const pendingInvitations: PendingInvitation[] = invitations.map(invitation => {
      const workspace = workspaces?.find(w => w.id === invitation.workspace_id)
      const inviter = inviters?.find(i => i.id === invitation.invited_by)

      return {
        ...invitation,
        workspace: workspace || {
          id: invitation.workspace_id,
          name: 'Unknown Workspace',
          currency: 'UAH'
        },
        inviter: inviter || {
          id: invitation.invited_by,
          full_name: 'Unknown User'
        }
      }
    })

    return { data: pendingInvitations }
  } catch (error) {
    console.error('Error in getUserPendingInvitations:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Accept multiple invitations at once
 */
export async function acceptMultipleInvitations(invitationIds: string[]): Promise<{
  success?: boolean
  acceptedCount?: number
  error?: string
}> {
  try {
    // Use regular client for user operations
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Use admin client for invitation operations
    const adminSupabase = createAdminClient()

    let acceptedCount = 0
    const errors: string[] = []

    for (const invitationId of invitationIds) {
      try {
        // Get invitation details
        const { data: invitation, error: invitationError } = await adminSupabase
          .from('workspace_invitations')
          .select('workspace_id, email, expires_at, accepted_at')
          .eq('id', invitationId)
          .single()

        if (invitationError || !invitation) {
          errors.push(`Invitation ${invitationId}: Not found`)
          continue
        }

        // Verify invitation is for this user's email
        if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
          errors.push(`Invitation ${invitationId}: Not for your email`)
          continue
        }

        // Check if already accepted
        if (invitation.accepted_at) {
          errors.push(`Invitation ${invitationId}: Already accepted`)
          continue
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
          errors.push(`Invitation ${invitationId}: Expired`)
          continue
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', invitation.workspace_id)
          .eq('user_id', user.id)
          .single()

        if (existingMember) {
          errors.push(`Invitation ${invitationId}: Already a member`)
          continue
        }

        // Add user as workspace member
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: invitation.workspace_id,
            user_id: user.id,
            role: 'member'
          })

        if (memberError) {
          console.error('Error adding member:', memberError)
          errors.push(`Invitation ${invitationId}: Failed to join workspace`)
          continue
        }

        // Mark invitation as accepted
        const { error: acceptError } = await adminSupabase
          .from('workspace_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitationId)

        if (acceptError) {
          console.error('Error marking invitation as accepted:', acceptError)
          // Don't fail here as the user is already added
        }

        acceptedCount++
      } catch (error) {
        console.error(`Error processing invitation ${invitationId}:`, error)
        errors.push(`Invitation ${invitationId}: Unexpected error`)
      }
    }

    if (errors.length > 0) {
      console.warn('Some invitations failed:', errors)
    }

    return { 
      success: true, 
      acceptedCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    }
  } catch (error) {
    console.error('Error in acceptMultipleInvitations:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Decline multiple invitations at once
 */
export async function declineMultipleInvitations(invitationIds: string[]): Promise<{
  success?: boolean
  declinedCount?: number
  error?: string
}> {
  try {
    // Use regular client for authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Use admin client for invitation operations
    const adminSupabase = createAdminClient()

    // Delete the invitations (this effectively declines them)
    const { error: deleteError } = await adminSupabase
      .from('workspace_invitations')
      .delete()
      .in('id', invitationIds)
      .eq('email', user.email?.toLowerCase() || '')

    if (deleteError) {
      console.error('Error declining invitations:', deleteError)
      return { error: 'Failed to decline invitations' }
    }

    return { 
      success: true, 
      declinedCount: invitationIds.length
    }
  } catch (error) {
    console.error('Error in declineMultipleInvitations:', error)
    return { error: 'An unexpected error occurred' }
  }
}