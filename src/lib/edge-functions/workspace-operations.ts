import { createClient } from '@/lib/supabase/client'
import type { WorkspaceMemberWithProfile, WorkspaceInvitation } from '@/lib/supabase/types'

/**
 * Client for interacting with the workspace-operations Edge Function
 * This provides secure access to workspace data while maintaining RLS
 */
class WorkspaceOperationsClient {
  private supabase = createClient()

  private async callEdgeFunction(operation: string, data: any) {
    const { data: { session } } = await this.supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Authentication required')
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/workspace-operations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation, ...data }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Edge function call failed')
    }

    return response.json()
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
    const result = await this.callEdgeFunction('get_members', { workspace_id: workspaceId })
    return result.data || []
  }

  async getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    const result = await this.callEdgeFunction('get_invitations', { workspace_id: workspaceId })
    return result.data || []
  }

  async createWorkspaceInvitation(workspaceId: string, email: string): Promise<WorkspaceInvitation> {
    const result = await this.callEdgeFunction('create_invitation', { 
      workspace_id: workspaceId, 
      email 
    })
    return result.data
  }
}

export const workspaceOperations = new WorkspaceOperationsClient()