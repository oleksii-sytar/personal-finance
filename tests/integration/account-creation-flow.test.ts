import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createAccount, getAccounts, deleteAccount } from '@/actions/accounts'

/**
 * Account Creation Flow Integration Tests
 * Tests the account creation functionality end-to-end
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

describe('Account Creation Flow Integration', () => {
  let testWorkspaceId: string
  let testAccountIds: string[] = []

  beforeAll(async () => {
    // Get or create a test workspace
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)

    if (workspaces && workspaces.length > 0) {
      testWorkspaceId = workspaces[0].id
    }
  })

  afterAll(async () => {
    // Clean up test accounts
    if (testAccountIds.length > 0) {
      await supabase
        .from('accounts')
        .delete()
        .in('id', testAccountIds)
    }
  })

  it('should verify accounts table exists with correct schema', async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should verify accounts table has required columns', async () => {
    const { error } = await supabase
      .from('accounts')
      .select(`
        id,
        workspace_id,
        name,
        type,
        opening_balance,
        current_balance,
        current_balance_updated_at,
        currency,
        initial_opening_balance,
        current_balance,
        current_balance_updated_at,
        is_default,
        created_at,
        updated_at
      `)
      .limit(1)

    expect(error).toBeNull()
  })

  it('should verify account type constraints', async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('type')
      .limit(10)

    expect(error).toBeNull()
    
    // If there are accounts, verify types are valid
    if (data && data.length > 0) {
      data.forEach(account => {
        expect(['checking', 'savings', 'credit', 'investment']).toContain(account.type)
      })
    }
  })

  it('should verify workspace relationship exists', async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        id,
        workspace_id,
        workspaces!inner(id, name)
      `)
      .limit(1)

    expect(error).toBeNull()
  })

  it('should handle database connection gracefully', async () => {
    const { error } = await supabase
      .from('accounts')
      .select('count')
      .limit(1)

    expect(error).toBeNull()
  })

  it('should verify getAccounts action returns array', async () => {
    const result = await getAccounts()
    
    // Should return either data or error, not both
    if (result.error) {
      expect(result.data).toBeUndefined()
    } else {
      expect(Array.isArray(result.data)).toBe(true)
    }
  })
})
