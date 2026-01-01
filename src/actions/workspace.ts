'use server'

import { createClient } from '@/lib/supabase/server'
import type { Workspace } from '@/lib/supabase/types'

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