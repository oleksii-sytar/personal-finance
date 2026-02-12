/**
 * Test helpers for integration tests
 * Provides utilities for creating test users, workspaces, and cleanup
 */

import { createClient } from '@supabase/supabase-js'
import { registerTestUser } from '../setup'

// Create admin client for test operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Create a test user with unique email
 * Automatically registers user for cleanup after tests
 */
export const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true
  })

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  // Register user for automatic cleanup
  registerTestUser(data.user.id)

  return data.user
}

/**
 * Create a test workspace for a user
 */
export const createTestWorkspace = async (userId: string) => {
  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .insert({
      name: `Test Workspace ${Date.now()}`,
      owner_id: userId,
      currency: 'UAH'
    })
    .select()
    .single()

  if (workspaceError) {
    throw new Error(`Failed to create test workspace: ${workspaceError.message}`)
  }

  // Note: Workspace membership is automatically created via database trigger
  // No need for manual membership creation

  return workspace
}

/**
 * Create a test category for a workspace
 */
export const createTestCategory = async (workspaceId: string, name: string, type: 'income' | 'expense' = 'expense', isDefault = false) => {
  const { data: category, error } = await supabaseAdmin
    .from('categories')
    .insert({
      workspace_id: workspaceId,
      name,
      type,
      color: type === 'income' ? '#4E7A58' : '#8B7355',
      icon: type === 'income' ? '💰' : '💸',
      is_default: isDefault
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test category: ${error.message}`)
  }

  return category
}

/**
 * Create a test account for a workspace
 */
export const createTestAccount = async (workspaceId: string, name: string = 'Test Account', type: 'checking' | 'savings' | 'credit' = 'checking') => {
  const { data: account, error } = await supabaseAdmin
    .from('accounts')
    .insert({
      workspace_id: workspaceId,
      name,
      type,
      balance: 0,
      currency: 'UAH'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test account: ${error.message}`)
  }

  return account
}

/**
 * Clean up test data for a user
 */
export const cleanupTestData = async (userId: string) => {
  try {
    // Get user's workspaces
    const { data: workspaces } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)

    if (workspaces) {
      for (const workspace of workspaces) {
        // Delete checkpoints first (they reference workspace)
        await supabaseAdmin
          .from('checkpoints')
          .delete()
          .eq('workspace_id', workspace.id)

        // Delete transactions (they reference categories and accounts)
        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('workspace_id', workspace.id)

        // Delete accounts
        await supabaseAdmin
          .from('accounts')
          .delete()
          .eq('workspace_id', workspace.id)

        // Delete categories
        await supabaseAdmin
          .from('categories')
          .delete()
          .eq('workspace_id', workspace.id)

        // Delete workspace (cascades to remaining data)
        await supabaseAdmin
          .from('workspaces')
          .delete()
          .eq('id', workspace.id)
      }
    }

    // Delete user (only if userId is a valid UUID)
    if (userId && userId.length === 36 && userId.includes('-')) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
    }
  } catch (error) {
    console.warn('Failed to cleanup test data:', error)
  }
}