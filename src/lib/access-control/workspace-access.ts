/**
 * Workspace Access Control Utilities
 * 
 * Provides utilities for verifying workspace membership and authorization
 * for transaction operations. Implements Requirements 10.1, 10.2, 10.3, 10.4.
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export interface WorkspaceMembership {
  workspace_id: string
  role: 'owner' | 'member'
  user_id: string
}

export interface AccessControlResult {
  hasAccess: boolean
  membership?: WorkspaceMembership
  error?: string
}

/**
 * Verifies if a user is a member of a specific workspace
 * 
 * @param userId - User ID to check
 * @param workspaceId - Workspace ID to verify access to
 * @returns AccessControlResult with membership details
 */
export async function verifyWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<AccessControlResult> {
  try {
    // Use service role client to bypass RLS for membership verification
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

    const { data: membership, error } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role, user_id')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !membership) {
      return {
        hasAccess: false,
        error: 'User is not a member of this workspace'
      }
    }

    return {
      hasAccess: true,
      membership: membership as WorkspaceMembership
    }
  } catch (error) {
    console.error('Error verifying workspace membership:', error)
    return {
      hasAccess: false,
      error: 'Failed to verify workspace membership'
    }
  }
}

/**
 * Gets all workspaces a user has access to
 * 
 * @param userId - User ID to get workspaces for
 * @returns Array of workspace memberships
 */
export async function getUserWorkspaceMemberships(
  userId: string
): Promise<WorkspaceMembership[]> {
  try {
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

    const { data: memberships, error } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role, user_id')
      .eq('user_id', userId)

    if (error) {
      console.error('Error getting user workspace memberships:', error)
      return []
    }

    return (memberships || []) as WorkspaceMembership[]
  } catch (error) {
    console.error('Error in getUserWorkspaceMemberships:', error)
    return []
  }
}

/**
 * Verifies if a user has access to a specific transaction
 * 
 * @param userId - User ID to check
 * @param transactionId - Transaction ID to verify access to
 * @returns AccessControlResult with access details
 */
export async function verifyTransactionAccess(
  userId: string,
  transactionId: string
): Promise<AccessControlResult> {
  try {
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

    // Get transaction workspace
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('workspace_id')
      .eq('id', transactionId)
      .single()

    if (transactionError || !transaction) {
      return {
        hasAccess: false,
        error: 'Transaction not found'
      }
    }

    // Verify workspace membership
    return await verifyWorkspaceMembership(userId, transaction.workspace_id)
  } catch (error) {
    console.error('Error verifying transaction access:', error)
    return {
      hasAccess: false,
      error: 'Failed to verify transaction access'
    }
  }
}

/**
 * Middleware function to verify workspace access for transaction operations
 * 
 * @param userId - User ID performing the operation
 * @param workspaceId - Workspace ID for the operation
 * @returns Promise<boolean> - true if access is granted
 */
export async function authorizeWorkspaceOperation(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const result = await verifyWorkspaceMembership(userId, workspaceId)
  return result.hasAccess
}

/**
 * Middleware function to verify transaction operation authorization
 * 
 * @param userId - User ID performing the operation
 * @param transactionId - Transaction ID for the operation
 * @returns Promise<boolean> - true if access is granted
 */
export async function authorizeTransactionOperation(
  userId: string,
  transactionId: string
): Promise<boolean> {
  const result = await verifyTransactionAccess(userId, transactionId)
  return result.hasAccess
}

/**
 * Gets the current user's active workspace context
 * For now, returns the first workspace the user is a member of
 * 
 * @param userId - User ID to get context for
 * @returns WorkspaceMembership or null if no workspace found
 */
export async function getCurrentUserWorkspaceContext(
  userId: string
): Promise<WorkspaceMembership | null> {
  const memberships = await getUserWorkspaceMemberships(userId)
  
  // For now, return the first workspace (owner role preferred)
  const ownerWorkspace = memberships.find(m => m.role === 'owner')
  return ownerWorkspace || memberships[0] || null
}

/**
 * Validates that a workspace ID belongs to the authenticated user
 * Used in server actions to ensure workspace isolation
 * 
 * @param workspaceId - Workspace ID to validate
 * @returns Promise<{ isValid: boolean; userId?: string; error?: string }>
 */
export async function validateWorkspaceAccess(workspaceId: string): Promise<{
  isValid: boolean
  userId?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        isValid: false,
        error: 'Authentication required'
      }
    }

    const accessResult = await verifyWorkspaceMembership(user.id, workspaceId)
    
    if (!accessResult.hasAccess) {
      return {
        isValid: false,
        error: accessResult.error || 'Access denied to workspace'
      }
    }

    return {
      isValid: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Error validating workspace access:', error)
    return {
      isValid: false,
      error: 'Failed to validate workspace access'
    }
  }
}

/**
 * Authorizes workspace access for the current authenticated user
 * Simplified interface for server actions
 * 
 * @param workspaceId - Workspace ID to authorize access to
 * @returns Promise<{ authorized: boolean; userId?: string; error?: string }>
 */
export async function authorizeWorkspaceAccess(workspaceId: string): Promise<{
  authorized: boolean
  userId?: string
  error?: string
}> {
  const result = await validateWorkspaceAccess(workspaceId)
  return {
    authorized: result.isValid,
    userId: result.userId,
    error: result.error
  }
}