'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './auth-context'
import { ensureUserProfile } from '@/actions/user-profile'
import type { 
  Workspace, 
  WorkspaceMember, 
  WorkspaceMemberWithProfile,
  WorkspaceInvitation,
  WorkspaceResult 
} from '@/lib/supabase/types'

/**
 * Workspace context types following the design document specifications
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
interface WorkspaceContextType {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  members: WorkspaceMemberWithProfile[]
  invitations: WorkspaceInvitation[]
  loading: boolean
  createWorkspace: (name: string) => Promise<WorkspaceResult<Workspace>>
  switchWorkspace: (workspaceId: string) => Promise<void>
  inviteMember: (email: string) => Promise<WorkspaceResult<WorkspaceInvitation>>
  removeMember: (memberId: string) => Promise<void>
  transferOwnership: (memberId: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
}

interface WorkspaceProviderProps {
  children: ReactNode
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

/**
 * WorkspaceProvider component that manages workspace state
 * Implements workspace state management with automatic loading
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  
  const { user, session } = useAuth()
  const supabase = createClient()

  // Load workspaces when user is authenticated
  useEffect(() => {
    if (user && session) {
      loadWorkspaces()
    } else {
      // Clear workspace data when user logs out
      setCurrentWorkspace(null)
      setWorkspaces([])
      setMembers([])
      setInvitations([])
      setLoading(false)
    }
  }, [user, session])

  // Load current workspace details when currentWorkspace changes
  useEffect(() => {
    if (currentWorkspace) {
      loadWorkspaceDetails(currentWorkspace.id)
    } else {
      setMembers([])
      setInvitations([])
    }
  }, [currentWorkspace])

  /**
   * Load all workspaces for the current user
   * Requirements: 4.1, 4.3
   * Security: Server-side filtering ensures users only see their workspaces
   */
  const loadWorkspaces = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log('Loading workspaces for user:', user.id)

      // Use server action for secure workspace loading
      const { getUserWorkspaces } = await import('@/actions/workspace')
      const result = await getUserWorkspaces()

      if (result.error) {
        console.error('Error loading workspaces:', result.error)
        return
      }

      const workspacesList: Workspace[] = result.data || []
      console.log('Setting workspaces:', workspacesList)
      setWorkspaces(workspacesList)

      // Set current workspace (first one if none selected)
      if (workspacesList.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(workspacesList[0])
      }
    } catch (error) {
      console.error('Error in loadWorkspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load members and invitations for a specific workspace
   * Requirements: 5.6, 6.1
   */
  const loadWorkspaceDetails = async (workspaceId: string) => {
    if (!user) return

    try {
      // First, ensure the current user has a profile
      console.log('Ensuring user profile exists...')
      await ensureUserProfile()

      // Load workspace members first
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
        setMembers([])
        return
      }

      if (!workspaceMembers || workspaceMembers.length === 0) {
        console.log('No workspace members found')
        setMembers([])
        return
      }

      // Get all user IDs from members
      const userIds = workspaceMembers.map(member => member.user_id)
      
      // Load user profiles for all members
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
      }

      // Combine members with their profiles
      const membersWithProfiles = workspaceMembers.map(member => ({
        ...member,
        user_profiles: userProfiles?.find(profile => profile.id === member.user_id) || null
      })) as WorkspaceMemberWithProfile[]

      console.log('Members with profiles:', membersWithProfiles)
      setMembers(membersWithProfiles)

      // Load pending invitations (only if user is owner)
      const currentMember = workspaceMembers?.find(m => m.user_id === user.id)
      if (currentMember?.role === 'owner') {
        const { data: pendingInvitations, error: invitationsError } = await supabase
          .from('workspace_invitations')
          .select('*')
          .eq('workspace_id', workspaceId)
          .is('accepted_at', null)

        if (invitationsError) {
          console.error('Error loading invitations:', invitationsError)
        } else {
          setInvitations(pendingInvitations || [])
        }
      }
    } catch (error) {
      console.error('Error in loadWorkspaceDetails:', error)
    }
  }

  /**
   * Create a new workspace
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  const createWorkspace = async (name: string): Promise<WorkspaceResult<Workspace>> => {
    if (!user) {
      return { error: 'Authentication required' }
    }

    try {
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: name.trim(),
          owner_id: user.id,
          currency: 'UAH' // Default currency
        })
        .select()
        .single()

      if (workspaceError) {
        console.error('Error creating workspace:', workspaceError)
        return { error: 'Failed to create workspace' }
      }

      // The database trigger should automatically add the owner as a member
      // Refresh workspaces to include the new one
      await loadWorkspaces()

      return { data: workspace }
    } catch (error) {
      console.error('Error in createWorkspace:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  /**
   * Switch to a different workspace
   * Requirements: 4.1
   */
  const switchWorkspace = async (workspaceId: string): Promise<void> => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
    }
  }

  /**
   * Invite a member to the current workspace
   * Requirements: 5.1, 5.2
   */
  const inviteMember = async (email: string): Promise<WorkspaceResult<WorkspaceInvitation>> => {
    console.log('inviteMember called with:', { email, user: user?.id, currentWorkspace: currentWorkspace?.id })
    
    if (!user || !currentWorkspace) {
      console.error('Missing user or workspace:', { user: !!user, currentWorkspace: !!currentWorkspace })
      return { error: 'Authentication and workspace required' }
    }

    // Check if user is owner
    const currentMember = members.find(m => m.user_id === user.id)
    console.log('Current member check:', { currentMember, members: members.length })
    
    if (currentMember?.role !== 'owner') {
      console.error('User is not owner:', { role: currentMember?.role })
      return { error: 'Only workspace owners can invite members' }
    }

    try {
      // Generate invitation token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

      console.log('Creating invitation with:', {
        workspace_id: currentWorkspace.id,
        email: email.toLowerCase().trim(),
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })

      const { data: invitation, error: invitationError } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: currentWorkspace.id,
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

      console.log('Invitation created successfully:', invitation)

      // Refresh invitations
      await loadWorkspaceDetails(currentWorkspace.id)

      return { data: invitation }
    } catch (error) {
      console.error('Error in inviteMember:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  /**
   * Remove a member from the current workspace
   * Requirements: 6.2, 6.4
   */
  const removeMember = async (memberId: string): Promise<void> => {
    if (!user || !currentWorkspace) return

    // Check if user is owner
    const currentMember = members.find(m => m.user_id === user.id)
    if (currentMember?.role !== 'owner') {
      throw new Error('Only workspace owners can remove members')
    }

    // Prevent removing the owner
    const memberToRemove = members.find(m => m.id === memberId)
    if (memberToRemove?.role === 'owner') {
      throw new Error('Cannot remove workspace owner')
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        console.error('Error removing member:', error)
        throw new Error('Failed to remove member')
      }

      // Refresh workspace details
      await loadWorkspaceDetails(currentWorkspace.id)
    } catch (error) {
      console.error('Error in removeMember:', error)
      throw error
    }
  }

  /**
   * Transfer ownership of the current workspace
   * Requirements: 6.3
   */
  const transferOwnership = async (memberId: string): Promise<void> => {
    if (!user || !currentWorkspace) return

    // Check if user is current owner
    const currentMember = members.find(m => m.user_id === user.id)
    if (currentMember?.role !== 'owner') {
      throw new Error('Only workspace owners can transfer ownership')
    }

    const newOwnerMember = members.find(m => m.id === memberId)
    if (!newOwnerMember) {
      throw new Error('Member not found')
    }

    try {
      // Update workspace owner
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .update({ owner_id: newOwnerMember.user_id })
        .eq('id', currentWorkspace.id)

      if (workspaceError) {
        console.error('Error updating workspace owner:', workspaceError)
        throw new Error('Failed to transfer ownership')
      }

      // Update member roles
      const { error: memberError } = await supabase
        .from('workspace_members')
        .update({ role: 'owner' })
        .eq('id', memberId)

      if (memberError) {
        console.error('Error updating member role:', memberError)
        throw new Error('Failed to update member role')
      }

      // Update current user role to member
      const { error: currentMemberError } = await supabase
        .from('workspace_members')
        .update({ role: 'member' })
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspace.id)

      if (currentMemberError) {
        console.error('Error updating current member role:', currentMemberError)
        throw new Error('Failed to update current member role')
      }

      // Refresh workspace data
      await loadWorkspaces()
      await loadWorkspaceDetails(currentWorkspace.id)
    } catch (error) {
      console.error('Error in transferOwnership:', error)
      throw error
    }
  }

  /**
   * Refresh workspaces data
   */
  const refreshWorkspaces = async (): Promise<void> => {
    await loadWorkspaces()
  }

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    members,
    invitations,
    loading,
    createWorkspace,
    switchWorkspace,
    inviteMember,
    removeMember,
    transferOwnership,
    refreshWorkspaces,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

/**
 * Hook to consume workspace context
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext)
  
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  
  return context
}