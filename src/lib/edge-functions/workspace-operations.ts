import { createClient } from '@/lib/supabase/client'
import type { WorkspaceMemberWithProfile, WorkspaceInvitation } from '@/lib/supabase/types'

/**
 * Client for interacting with the workspace-operations Edge Function
 * This provides secure access to workspace data while maintaining RLS
 */
class WorkspaceOperationsClient {
  private supabase = createClient()

  private async callEdgeFunction(operation: string, data: any) {
    console.log('🔧 Edge Function client called:', { operation, data })
    
    const { data: { session } } = await this.supabase.auth.getSession()
    console.log('🔑 Session details:', { 
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length,
      expiresAt: session?.expires_at,
      currentTime: Math.floor(Date.now() / 1000)
    })
    
    if (!session) {
      console.error('❌ No session found for Edge Function call')
      throw new Error('Authentication required')
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/workspace-operations`
    console.log('📡 Calling Edge Function URL:', url)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation, ...data }),
      })

      console.log('📨 Edge Function response:', { status: response.status, ok: response.ok })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Edge Function error response text:', errorText)
        
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }
        
        console.error('❌ Edge Function error parsed:', error)
        throw new Error(error.error || `HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Edge Function success result:', result)
      return result
    } catch (fetchError) {
      console.error('❌ Edge Function fetch error:', fetchError)
      throw fetchError
    }
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