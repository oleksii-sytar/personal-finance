'use server'

import { createClient } from '@/lib/supabase/server'
import type { Workspace, WorkspaceMember, WorkspaceMemberWithProfile, WorkspaceInvitation } from '@/lib/supabase/types'

/**
 * Get workspaces for the current user with server-side security
 * This approach provides security without complex RLS policies
 */
export async function getUserWorkspaces(): Promise<{
  data?: Workspace[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    console.log('Server: Loading workspaces for user:', user.id)

    // Get workspace memberships for the user (server-side filtering)
    const { data: userMemberships, error: membershipsError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)

    console.log('Server: Workspace memberships result:', { userMemberships, membershipsError })

    if (membershipsError) {
      console.error('Server: Error loading workspace memberships:', membershipsError)
      return { error: 'Failed to load workspace memberships' }
    }

    if (!userMemberships || userMemberships.length === 0) {
      console.log('Server: No workspace memberships found')
      return { data: [] }
    }

    // Get workspace details for all memberships (server-side filtering)
    const workspaceIds = userMemberships.map(m => m.workspace_id)
    console.log('Server: Loading workspaces for IDs:', workspaceIds)
    
    const { data: workspacesData, error: workspacesError } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)

    console.log('Server: Workspaces data result:', { workspacesData, workspacesError })

    if (workspacesError) {
      console.error('Server: Error loading workspaces:', workspacesError)
      return { error: 'Failed to load workspaces' }
    }

    return { data: workspacesData || [] }
  } catch (error) {
    console.error('Server: Error in getUserWorkspaces:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get workspace members with profiles for a specific workspace
 * Server-side security ensures users can only access their workspace members
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<{
  data?: WorkspaceMemberWithProfile[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // First verify user is a member of this workspace
    const { data: userMembership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !userMembership) {
      return { error: 'Access denied: Not a member of this workspace' }
    }

    // Get all workspace members
    const { data: workspaceMembers, error: membersError } = await supabase
      .from('workspace_members')
      .select(`
        id,
        user_id,
        workspace_id,
        role,
        joined_at
      `)
      .eq('workspace_id', workspaceId)

    if (membersError) {
      console.error('Error loading workspace members:', membersError)
      return { error: 'Failed to load workspace members' }
    }

    if (!workspaceMembers || workspaceMembers.length === 0) {
      return { data: [] }
    }

    // Get user profiles for all members
    const userIds = workspaceMembers.map(member => member.user_id)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        created_at,
        updated_at
      `)
      .in('id', userIds)

    if (profilesError) {
      console.error('Error loading user profiles:', profilesError)
      return { error: 'Failed to load user profiles' }
    }

    // Combine members with their profiles
    const membersWithProfiles = workspaceMembers.map(member => ({
      ...member,
      user_profiles: userProfiles?.find(profile => profile.id === member.user_id) || null
    })) as WorkspaceMemberWithProfile[]

    return { data: membersWithProfiles }
  } catch (error) {
    console.error('Error in getWorkspaceMembers:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get workspace invitations for a specific workspace
 * Only workspace owners can view invitations
 */
export async function getWorkspaceInvitations(workspaceId: string): Promise<{
  data?: WorkspaceInvitation[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify user is the owner of this workspace
    const { data: userMembership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !userMembership || userMembership.role !== 'owner') {
      return { error: 'Access denied: Only workspace owners can view invitations' }
    }

    // Get pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)

    if (invitationsError) {
      console.error('Error loading invitations:', invitationsError)
      return { error: 'Failed to load invitations' }
    }

    return { data: invitations || [] }
  } catch (error) {
    console.error('Error in getWorkspaceInvitations:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Create a workspace invitation
 * Only workspace owners can create invitations
 */
export async function createWorkspaceInvitation(workspaceId: string, email: string): Promise<{
  data?: WorkspaceInvitation
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify user is the owner of this workspace
    const { data: userMembership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !userMembership || userMembership.role !== 'owner') {
      return { error: 'Only workspace owners can invite members' }
    }

    // Generate invitation token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase().trim(),
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Invitation creation error:', invitationError)
      if (invitationError.code === '23505') { // Unique constraint violation
        return { error: 'User is already invited to this workspace' }
      }
      return { error: 'Failed to create invitation' }
    }

    return { data: invitation }
  } catch (error) {
    console.error('Error in createWorkspaceInvitation:', error)
    return { error: 'An unexpected error occurred' }
  }
}