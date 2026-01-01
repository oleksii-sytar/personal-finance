'use server'

import { createClient } from '@supabase/supabase-js'
import type { WorkspaceInvitation, Workspace } from '@/lib/supabase/types'

export interface InvitationData {
  invitation: WorkspaceInvitation
  workspace: Workspace
  inviterName: string
}

/**
 * Create admin client that bypasses RLS
 */
function createAdminClient() {
  return createClient(
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
 * Get invitation data by token (bypasses RLS for invitation validation)
 */
export async function getInvitationByToken(token: string): Promise<{
  data?: InvitationData
  error?: string
}> {
  console.log('getInvitationByToken server action called with token:', token)
  
  // Use admin client to bypass RLS for invitation validation
  const adminSupabase = createAdminClient()

  try {
    // Get invitation using admin client (bypasses RLS)
    console.log('Querying workspace_invitations table with admin client...')
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    console.log('Invitation query result:', { invitation, invitationError })

    if (invitationError) {
      console.error('Invitation query error:', invitationError)
      if (invitationError.code === 'PGRST116') {
        return { error: 'Invitation not found or already accepted' }
      }
      return { error: 'Failed to query invitation' }
    }

    if (!invitation) {
      console.log('No invitation found for token:', token)
      return { error: 'Invitation not found' }
    }

    console.log('Found invitation:', invitation)

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    console.log('Expiry check:', { now: now.toISOString(), expiresAt: expiresAt.toISOString(), expired: now > expiresAt })
    
    if (now > expiresAt) {
      console.log('Invitation is expired')
      return { error: 'This invitation has expired' }
    }

    // Get workspace details
    console.log('Querying workspaces table for workspace_id:', invitation.workspace_id)
    const { data: workspace, error: workspaceError } = await adminSupabase
      .from('workspaces')
      .select('*')
      .eq('id', invitation.workspace_id)
      .single()

    console.log('Workspace query result:', { workspace, workspaceError })

    if (workspaceError) {
      console.error('Workspace query error:', workspaceError)
      return { error: 'Workspace not found' }
    }

    if (!workspace) {
      console.log('No workspace found for id:', invitation.workspace_id)
      return { error: 'Workspace not found' }
    }

    // Get inviter name
    console.log('Querying user_profiles for inviter:', invitation.invited_by)
    const { data: inviterProfile } = await adminSupabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', invitation.invited_by)
      .single()

    console.log('Inviter profile result:', inviterProfile)

    const result = {
      data: {
        invitation,
        workspace,
        inviterName: inviterProfile?.full_name || 'Someone'
      }
    }

    console.log('Returning successful result:', result)
    return result
  } catch (error) {
    console.error('Error getting invitation:', error)
    return { error: 'Failed to load invitation details' }
  }
}

/**
 * Accept workspace invitation
 */
export async function acceptInvitation(token: string): Promise<{
  success?: boolean
  error?: string
}> {
  // Use regular client for user operations
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Use admin client to get invitation data
  const adminSupabase = createAdminClient()

  try {
    // Get invitation data first using admin client
    const invitationResult = await getInvitationByToken(token)
    if (invitationResult.error || !invitationResult.data) {
      return { error: invitationResult.error || 'Invalid invitation' }
    }

    const { invitation, workspace } = invitationResult.data

    // Check if user is already a member (use regular client)
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return { error: 'You are already a member of this workspace' }
    }

    // Add user as workspace member (use regular client)
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'member'
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      return { error: 'Failed to join workspace' }
    }

    // Mark invitation as accepted (use admin client to bypass RLS)
    const { error: acceptError } = await adminSupabase
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    if (acceptError) {
      console.error('Error marking invitation as accepted:', acceptError)
      // Don't fail here as the user is already added
    }

    return { success: true }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { error: 'An unexpected error occurred' }
  }
}