'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { WorkspaceMemberWithProfile, WorkspaceInvitation } from '@/lib/supabase/types'

/**
 * Get workspace members with their profiles using server-side security
 * Uses service role client to bypass RLS while maintaining security
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<{
  data?: WorkspaceMemberWithProfile[]
  error?: string
}> {
  try {
    // Use regular client for authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Use service role client to bypass RLS for workspace member queries
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

    // Verify user is a member of the workspace first
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return { error: 'Access denied: Not a member of this workspace' }
    }

    // Get all workspace members
    const { data: members, error: membersError } = await supabaseAdmin
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
      console.error('Server: Error loading workspace members:', membersError)
      return { error: 'Failed to fetch members' }
    }

    if (!members || members.length === 0) {
      return { data: [] }
    }

    // Get user profiles for all members
    const userIds = members.map(m => m.user_id)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) {
      console.error('Server: Error loading member profiles:', profilesError)
      return { error: 'Failed to fetch member profiles' }
    }

    // Combine members with their profiles
    const membersWithProfiles: WorkspaceMemberWithProfile[] = members.map(member => ({
      ...member,
      user_profiles: profiles?.find(p => p.id === member.user_id) || null
    }))

    return { data: membersWithProfiles }
  } catch (error) {
    console.error('Server: Error in getWorkspaceMembers:', error)
    return { error: 'Failed to load workspace members' }
  }
}

/**
 * Get workspace invitations using server-side security
 * Only workspace owners can view invitations
 */
export async function getWorkspaceInvitations(workspaceId: string): Promise<{
  data?: WorkspaceInvitation[]
  error?: string
}> {
  try {
    // Use regular client for authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Use service role client to bypass RLS
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

    // Verify user is the owner of the workspace
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return { error: 'Access denied: Not a member of this workspace' }
    }

    if (membership.role !== 'owner') {
      return { error: 'Only workspace owners can view invitations' }
    }

    // Get workspace invitations
    const { data: invitations, error: invitationsError } = await supabaseAdmin
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)

    if (invitationsError) {
      console.error('Server: Error loading workspace invitations:', invitationsError)
      return { error: 'Failed to fetch invitations' }
    }

    return { data: invitations || [] }
  } catch (error) {
    console.error('Server: Error in getWorkspaceInvitations:', error)
    return { error: 'Failed to load workspace invitations' }
  }
}