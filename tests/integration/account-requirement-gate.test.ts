import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration tests for account requirement gate functionality
 * 
 * Tests the real flow of checking for accounts before allowing access to features
 * Requirements: 2.2.2 - Transactions page requires workspace AND at least one account
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for integration tests')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

describe('Account Requirement Gate Integration', () => {
  let testUserId: string
  let testWorkspaceId: string

  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-account-gate-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })

    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`)
    }

    testUserId = userData.user.id

    // Create test workspace
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: `Test Workspace ${Date.now()}`,
        owner_id: testUserId,
        currency: 'UAH',
      })
      .select()
      .single()

    if (workspaceError || !workspaceData) {
      throw new Error(`Failed to create test workspace: ${workspaceError?.message}`)
    }

    testWorkspaceId = workspaceData.id

    // Note: workspace_members entry is automatically created by database trigger
  })

  afterAll(async () => {
    // Cleanup: Delete workspace (cascades to members)
    if (testWorkspaceId) {
      await supabase.from('workspaces').delete().eq('id', testWorkspaceId)
    }

    // Cleanup: Delete test user
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  it('should return empty array when workspace has no accounts', async () => {
    // This simulates the state where AccountRequirementGate should block access
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('workspace_id', testWorkspaceId)

    expect(error).toBeNull()
    expect(accounts).toBeDefined()
    expect(Array.isArray(accounts)).toBe(true)
    expect(accounts?.length).toBe(0)
  })

  it('should return accounts when workspace has accounts', async () => {
    // Create an account for the workspace
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .insert({
        workspace_id: testWorkspaceId,
        name: 'Test Account',
        type: 'checking',
        opening_balance: 1000,
        current_balance: 1000,
        currency: 'UAH',
      })
      .select()
      .single()

    expect(accountError).toBeNull()
    expect(accountData).toBeDefined()

    // Now query should return the account
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('workspace_id', testWorkspaceId)

    expect(error).toBeNull()
    expect(accounts).toBeDefined()
    expect(Array.isArray(accounts)).toBe(true)
    expect(accounts?.length).toBeGreaterThan(0)
    expect(accounts?.[0].name).toBe('Test Account')

    // Cleanup: Delete the account
    await supabase.from('accounts').delete().eq('id', accountData.id)
  })

  it('should handle account requirement check gracefully', async () => {
    // Test that the account check doesn't throw errors
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('workspace_id', testWorkspaceId)

    // Should always return either data or error, never both
    if (error) {
      expect(accounts).toBeNull()
    } else {
      expect(accounts).toBeDefined()
      expect(Array.isArray(accounts)).toBe(true)
    }
  })
})
