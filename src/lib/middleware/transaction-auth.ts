/**
 * Transaction Authorization Middleware
 * 
 * Provides middleware functions for authorizing transaction operations
 * based on workspace membership. Implements Requirements 10.1, 10.2, 10.3, 10.4.
 */

import { createClient } from '@/lib/supabase/server'
import { 
  validateWorkspaceAccess,
  verifyTransactionAccess,
  getCurrentUserWorkspaceContext
} from '@/lib/access-control'

export interface AuthorizationResult {
  authorized: boolean
  userId?: string
  workspaceId?: string
  error?: string
}

/**
 * Middleware to authorize transaction creation operations
 * Verifies user has access to the target workspace
 * 
 * @param workspaceId - Workspace ID for the transaction
 * @returns AuthorizationResult with authorization status
 */
export async function authorizeTransactionCreate(
  workspaceId: string
): Promise<AuthorizationResult> {
  try {
    const validation = await validateWorkspaceAccess(workspaceId)
    
    if (!validation.isValid) {
      return {
        authorized: false,
        error: validation.error || 'Access denied to workspace'
      }
    }

    return {
      authorized: true,
      userId: validation.userId,
      workspaceId
    }
  } catch (error) {
    console.error('Error in authorizeTransactionCreate:', error)
    return {
      authorized: false,
      error: 'Authorization failed'
    }
  }
}

/**
 * Middleware to authorize transaction read operations
 * Verifies user has access to transactions in the workspace
 * 
 * @param workspaceId - Workspace ID to read transactions from
 * @returns AuthorizationResult with authorization status
 */
export async function authorizeTransactionRead(
  workspaceId: string
): Promise<AuthorizationResult> {
  // Same logic as create - users can read transactions in workspaces they're members of
  return await authorizeTransactionCreate(workspaceId)
}

/**
 * Middleware to authorize transaction update operations
 * Verifies user has access to the specific transaction
 * 
 * @param transactionId - Transaction ID to update
 * @returns AuthorizationResult with authorization status
 */
export async function authorizeTransactionUpdate(
  transactionId: string
): Promise<AuthorizationResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        authorized: false,
        error: 'Authentication required'
      }
    }

    const accessResult = await verifyTransactionAccess(user.id, transactionId)
    
    if (!accessResult.hasAccess) {
      return {
        authorized: false,
        error: accessResult.error || 'Access denied to transaction'
      }
    }

    return {
      authorized: true,
      userId: user.id,
      workspaceId: accessResult.membership?.workspace_id
    }
  } catch (error) {
    console.error('Error in authorizeTransactionUpdate:', error)
    return {
      authorized: false,
      error: 'Authorization failed'
    }
  }
}

/**
 * Middleware to authorize transaction delete operations
 * Verifies user has access to the specific transaction
 * 
 * @param transactionId - Transaction ID to delete
 * @returns AuthorizationResult with authorization status
 */
export async function authorizeTransactionDelete(
  transactionId: string
): Promise<AuthorizationResult> {
  // Same logic as update - users can delete transactions they have access to
  return await authorizeTransactionUpdate(transactionId)
}

/**
 * Middleware to get user's current workspace context
 * Used for operations that need to determine the user's active workspace
 * 
 * @returns AuthorizationResult with user's workspace context
 */
export async function getUserWorkspaceContext(): Promise<AuthorizationResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        authorized: false,
        error: 'Authentication required'
      }
    }

    const workspaceContext = await getCurrentUserWorkspaceContext(user.id)
    
    if (!workspaceContext) {
      return {
        authorized: false,
        error: 'No workspace found for user'
      }
    }

    return {
      authorized: true,
      userId: user.id,
      workspaceId: workspaceContext.workspace_id
    }
  } catch (error) {
    console.error('Error in getUserWorkspaceContext:', error)
    return {
      authorized: false,
      error: 'Failed to get workspace context'
    }
  }
}

/**
 * Higher-order function to wrap server actions with workspace authorization
 * 
 * @param workspaceId - Workspace ID to authorize
 * @param action - Server action to execute if authorized
 * @returns Wrapped server action with authorization
 */
export function withWorkspaceAuth<T extends any[], R>(
  workspaceId: string,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | { error: string }> => {
    const auth = await authorizeTransactionCreate(workspaceId)
    
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied' } as R
    }

    return await action(...args)
  }
}

/**
 * Higher-order function to wrap server actions with transaction authorization
 * 
 * @param transactionId - Transaction ID to authorize
 * @param action - Server action to execute if authorized
 * @returns Wrapped server action with authorization
 */
export function withTransactionAuth<T extends any[], R>(
  transactionId: string,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | { error: string }> => {
    const auth = await authorizeTransactionUpdate(transactionId)
    
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied' } as R
    }

    return await action(...args)
  }
}