'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Workspace, WorkspaceMember, WorkspaceMemberWithProfile, WorkspaceInvitation } from '@/lib/supabase/types'

/**
 * Get workspaces for the current user with server-side security
 * Uses service role client to bypass RLS while maintaining security
 */
export async function getUserWorkspaces(): Promise<{
  data?: Workspace[]
  error?: string
}> {
  try {
    // Use regular client for authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    console.log('Server: Loading workspaces for user:', user.id)

    // Use service role client to bypass RLS for workspace membership queries
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get workspace memberships for the user using admin client
    const { data: userMemberships, error: membershipsError } = await supabaseAdmin
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

    // Get workspace details for all memberships using admin client
    const workspaceIds = userMemberships.map(m => m.workspace_id)
    console.log('Server: Loading workspaces for IDs:', workspaceIds)
    
    const { data: workspacesData, error: workspacesError } = await supabaseAdmin
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

    // Get workspace details for email
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    if (workspaceError) {
      console.error('Error fetching workspace:', workspaceError)
      return { error: 'Workspace not found' }
    }

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

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

    // Send invitation email
    try {
      const { sendInvitationEmail } = await import('@/lib/email/invitation-email')
      const emailResult = await sendInvitationEmail({
        to: email.toLowerCase().trim(),
        workspaceName: workspace.name,
        inviterName: inviterProfile?.full_name || 'Someone',
        invitationToken: token
      })

      if (!emailResult.success) {
        console.warn('Failed to send invitation email:', emailResult.error)
        // Don't fail the invitation creation if email fails
      } else {
        console.log('Invitation email sent successfully to:', email)
      }
    } catch (emailError) {
      console.warn('Error sending invitation email:', emailError)
      // Don't fail the invitation creation if email fails
    }

    return { data: invitation }
  } catch (error) {
    console.error('Error in createWorkspaceInvitation:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Create a new workspace
 * Uses service role to ensure proper workspace and membership creation
 */
export async function createWorkspace(name: string): Promise<{
  data?: Workspace
  error?: string
}> {
  try {
    // Use regular client for authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    console.log('Server: Creating workspace for user:', user.id, 'name:', name)

    // Use service role client to bypass RLS for workspace creation
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create workspace using admin client
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: name.trim(),
        owner_id: user.id,
        currency: 'UAH' // Default currency
      })
      .select()
      .single()

    console.log('Server: Workspace creation result:', { workspace, workspaceError })

    if (workspaceError) {
      console.error('Server: Error creating workspace:', workspaceError)
      return { error: 'Failed to create workspace' }
    }

    // The database trigger should automatically add the owner as a member
    // But let's verify the membership was created
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single()

    console.log('Server: Membership verification:', { membership, membershipError })

    if (membershipError) {
      console.warn('Server: Membership not found, creating manually:', membershipError)
      // Create membership manually if trigger didn't work
      const { error: createMembershipError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner'
        })

      if (createMembershipError) {
        console.error('Server: Error creating membership:', createMembershipError)
        // Don't fail the workspace creation for this
      }
    }

    return { data: workspace }
  } catch (error) {
    console.error('Server: Error in createWorkspace:', error)
    return { error: 'An unexpected error occurred' }
  }
}