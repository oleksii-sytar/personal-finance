import { createClient } from './server'
import type { 
  Workspace, 
  WorkspaceMember, 
  WorkspaceInvitation,
  User,
  WorkspaceWithMembers 
} from './types'

/**
 * Database query utilities for authentication and workspace management
 * Following the design document specifications
 */

/**
 * Get current user's profile
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  return profile
}

/**
 * Get user's workspaces with member information
 */
export async function getUserWorkspaces(): Promise<WorkspaceWithMembers[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members (
        *,
        user_profiles (*)
      )
    `)
    .or(`owner_id.eq.${user.id},id.in.(${
      // Get workspace IDs where user is a member
      await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .then(({ data }) => data?.map(m => m.workspace_id).join(',') || 'null')
    })`)

  return workspaces || []
}

/**
 * Get workspace by ID with member information
 */
export async function getWorkspaceById(workspaceId: string): Promise<WorkspaceWithMembers | null> {
  const supabase = await createClient()
  
  const { data: workspace } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members (
        *,
        user_profiles (*)
      )
    `)
    .eq('id', workspaceId)
    .single()

  return workspace
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<(WorkspaceMember & { user_profiles: User })[]> {
  const supabase = await createClient()
  
  const { data: members } = await supabase
    .from('workspace_members')
    .select(`
      *,
      user_profiles (*)
    `)
    .eq('workspace_id', workspaceId)

  return members || []
}

/**
 * Get workspace invitations
 */
export async function getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  const supabase = await createClient()
  
  const { data: invitations } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())

  return invitations || []
}

/**
 * Check if user is workspace owner
 */
export async function isWorkspaceOwner(workspaceId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single()

  return workspace?.owner_id === user.id
}

/**
 * Check if user is workspace member
 */
export async function isWorkspaceMember(workspaceId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  return !!member
}

/**
 * Get user's workspace context (workspace_id and role)
 */
export async function getUserWorkspaceContext(): Promise<{ workspace_id: string; role: string } | null> {
  const supabase = await createClient()
  
  const { data } = await supabase.rpc('get_user_workspace_context')
  
  return data?.[0] || null
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string): Promise<WorkspaceInvitation | null> {
  const supabase = await createClient()
  
  const { data: invitation } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  return invitation
}

/**
 * Check if email has pending invitation for workspace
 */
export async function hasPendingInvitation(workspaceId: string, email: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: invitation } = await supabase
    .from('workspace_invitations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  return !!invitation
}