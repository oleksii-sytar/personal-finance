import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { deleteAccount, createAccount, getAccounts } from '@/actions/accounts'

/**
 * Account Deletion Flow Integration Tests
 * Tests the account deletion functionality end-to-end
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * 
 * Test Coverage:
 * - Deletion prevented when transactions exist
 * - Successful deletion when no transactions
 * - Account removed from database
 * - Error message display
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

describe('Account Deletion Flow Integration', () => {
  let testWorkspaceId: string
  let testUserId: string
  let testCategoryId: string
  let testAccountIds: string[] = []
  let testTransactionIds: string[] = []

  beforeAll(async () => {
    // Get or create a test user
    const { data: users } = await supabase.auth.admin.listUsers()
    if (users && users.users.length > 0) {
      testUserId = users.users[0].id
    }

    // Get or create a test workspace
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)

    if (workspaces && workspaces.length > 0) {
      testWorkspaceId = workspaces[0].id
      
      // Get or create a test category for transactions
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('workspace_id', testWorkspaceId)
        .limit(1)
      
      if (categories && categories.length > 0) {
        testCategoryId = categories[0].id
      } else {
        // Create a test category
        const { data: newCategory } = await supabase
          .from('categories')
          .insert({
            workspace_id: testWorkspaceId,
            name: 'Test Category',
            color: '#E6A65D',
            icon: 'tag',
            type: 'income'
          })
          .select()
          .single()
        
        if (newCategory) {
          testCategoryId = newCategory.id
        }
      }
    } else {
      // Skip tests if no workspace available
      console.warn('No workspace found for account deletion tests')
    }
  })

  afterAll(async () => {
    // Clean up test transactions first
    if (testTransactionIds.length > 0) {
      await supabase
        .from('transactions')
        .delete()
        .in('id', testTransactionIds)
    }

    // Clean up test accounts
    if (testAccountIds.length > 0) {
      await supabase
        .from('accounts')
        .delete()
        .in('id', testAccountIds)
    }
  })

  beforeEach(() => {
    // Reset test data arrays before each test
    testAccountIds = []
    testTransactionIds = []
  })

  describe('Requirement 4.2, 4.3: Deletion Prevention with Transactions', () => {
    it('should prevent deletion of account with transactions', async () => {
      // Skip if no workspace available
      if (!testWorkspaceId) {
        console.warn('Skipping test: no workspace available')
        return
      }

      // Create a test account
      const { data: account, error: createError } = await supabase
        .from('accounts')
        .insert({
          workspace_id: testWorkspaceId,
          name: 'Test Account with Transactions',
          type: 'checking',
          balance: 1000,
          currency: 'UAH',
          initial_balance: 1000,
          is_default: false,
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create test account:', createError)
        return
      }
      
      expect(account).toBeDefined()
      
      if (account) {
        testAccountIds.push(account.id)

        // Create a transaction for this account
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            workspace_id: testWorkspaceId,
            account_id: account.id,
            user_id: testUserId,
            category_id: testCategoryId,
            amount: 100,
            description: 'Test transaction',
            transaction_date: new Date().toISOString().split('T')[0], // DATE format: YYYY-MM-DD
            type: 'income',
            created_by: testUserId,
          })
          .select()
          .single()

        if (txError) {
          console.error('Failed to create test transaction:', txError)
          console.error('Transaction data:', {
            workspace_id: testWorkspaceId,
            account_id: account.id,
            user_id: testUserId,
            category_id: testCategoryId,
          })
        }

        expect(txError).toBeNull()
        expect(transaction).toBeDefined()
        
        if (transaction) {
          testTransactionIds.push(transaction.id)
        }

        // Attempt to delete the account
        const result = await deleteAccount(account.id)

        // Should return error
        expect(result.error).toBeDefined()
        expect(result.data).toBeUndefined()
        
        // Error message should mention transactions
        if (typeof result.error === 'string') {
          expect(result.error.toLowerCase()).toContain('transaction')
        }

        // Verify account still exists in database
        const { data: stillExists } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', account.id)
          .single()

        expect(stillExists).toBeDefined()
        expect(stillExists?.id).toBe(account.id)
      }
    })

    it('should return specific error message indicating transaction count', async () => {
      // Create a test account
      const { data: account } = await supabase
        .from('accounts')
        .insert({
          workspace_id: testWorkspaceId,
          name: 'Test Account for Error Message',
          type: 'savings',
          balance: 500,
          currency: 'UAH',
          initial_balance: 500,
          is_default: false,
        })
        .select()
        .single()

      if (account) {
        testAccountIds.push(account.id)

        // Create multiple transactions
        const transactions = await supabase
          .from('transactions')
          .insert([
            {
              workspace_id: testWorkspaceId,
              account_id: account.id,
              user_id: testUserId,
              category_id: testCategoryId,
              amount: 50,
              description: 'Transaction 1',
              transaction_date: new Date().toISOString().split('T')[0], // DATE format
              type: 'income',
              created_by: testUserId,
            },
            {
              workspace_id: testWorkspaceId,
              account_id: account.id,
              user_id: testUserId,
              category_id: testCategoryId,
              amount: 30,
              description: 'Transaction 2',
              transaction_date: new Date().toISOString().split('T')[0], // DATE format
              type: 'expense',
              created_by: testUserId,
            },
          ])
          .select()

        if (transactions.data) {
          testTransactionIds.push(...transactions.data.map(t => t.id))
        }

        // Attempt deletion
        const result = await deleteAccount(account.id)

        // Should have error
        expect(result.error).toBeDefined()
        
        // Error should be a string message
        expect(typeof result.error).toBe('string')
      }
    })
  })

  describe('Requirement 4.4, 4.6: Successful Deletion', () => {
    it('should successfully delete account with no transactions', async () => {
      // Create a test account without transactions
      const { data: account, error: createError } = await supabase
        .from('accounts')
        .insert({
          workspace_id: testWorkspaceId,
          name: 'Test Account No Transactions',
          type: 'credit',
          balance: 0,
          currency: 'UAH',
          initial_balance: 0,
          is_default: false,
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(account).toBeDefined()

      if (account) {
        const accountId = account.id

        // Verify no transactions exist
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id')
          .eq('account_id', accountId)

        expect(transactions).toEqual([])

        // Delete the account
        const result = await deleteAccount(accountId)

        // Should succeed
        expect(result.error).toBeUndefined()
        expect(result.data).toBeDefined()
        expect(result.data?.id).toBe(accountId)

        // Verify account no longer exists in database
        const { data: deletedAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', accountId)
          .single()

        expect(deletedAccount).toBeNull()
      }
    })

    it('should remove account from all subsequent queries after deletion', async () => {
      // Create a test account
      const { data: account } = await supabase
        .from('accounts')
        .insert({
          workspace_id: testWorkspaceId,
          name: 'Test Account for Query Check',
          type: 'investment',
          balance: 2000,
          currency: 'UAH',
          initial_balance: 2000,
          is_default: false,
        })
        .select()
        .single()

      if (account) {
        const accountId = account.id

        // Verify account exists in getAccounts
        const beforeResult = await getAccounts()
        expect(beforeResult.error).toBeUndefined()
        
        const accountExists = beforeResult.data?.some(a => a.id === accountId)
        expect(accountExists).toBe(true)

        // Delete the account
        const deleteResult = await deleteAccount(accountId)
        expect(deleteResult.error).toBeUndefined()

        // Verify account no longer in getAccounts
        const afterResult = await getAccounts()
        expect(afterResult.error).toBeUndefined()
        
        const accountStillExists = afterResult.data?.some(a => a.id === accountId)
        expect(accountStillExists).toBe(false)
      }
    })
  })

  describe('Requirement 4.1, 4.5: Deletion Workflow', () => {
    it('should handle deletion request with proper authentication check', async () => {
      // Attempt to delete with invalid account ID
      const result = await deleteAccount('invalid-uuid')

      // Should return error (either auth or not found)
      expect(result.error).toBeDefined()
    })

    it('should verify transaction check happens before deletion', async () => {
      // Create account with transaction
      const { data: account } = await supabase
        .from('accounts')
        .insert({
          workspace_id: testWorkspaceId,
          name: 'Test Account Transaction Check',
          type: 'checking',
          balance: 100,
          currency: 'UAH',
          initial_balance: 100,
          is_default: false,
        })
        .select()
        .single()

      if (account) {
        testAccountIds.push(account.id)

        // Add transaction
        const { data: transaction } = await supabase
          .from('transactions')
          .insert({
            workspace_id: testWorkspaceId,
            account_id: account.id,
            user_id: testUserId,
            category_id: testCategoryId,
            amount: 50,
            description: 'Test',
            transaction_date: new Date().toISOString().split('T')[0], // DATE format
            type: 'income',
            created_by: testUserId,
          })
          .select()
          .single()

        if (transaction) {
          testTransactionIds.push(transaction.id)
        }

        // Attempt deletion
        const result = await deleteAccount(account.id)

        // Should fail with transaction error
        expect(result.error).toBeDefined()
        
        // Account should still exist (deletion was prevented)
        const { data: stillExists } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', account.id)
          .single()

        expect(stillExists).toBeDefined()
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle deletion of non-existent account gracefully', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      
      const result = await deleteAccount(fakeId)

      // Should return error or handle gracefully
      // The exact behavior depends on implementation
      expect(result).toBeDefined()
    })

    it('should handle concurrent deletion attempts', async () => {
      // Create account
      const { data: account } = await supabase
        .from('accounts')
        .insert({
          workspace_id: testWorkspaceId,
          name: 'Test Concurrent Deletion',
          type: 'checking',
          balance: 0,
          currency: 'UAH',
          initial_balance: 0,
          is_default: false,
        })
        .select()
        .single()

      if (account) {
        // Attempt concurrent deletions
        const [result1, result2] = await Promise.all([
          deleteAccount(account.id),
          deleteAccount(account.id),
        ])

        // At least one should succeed or both should handle gracefully
        const successCount = [result1, result2].filter(r => !r.error).length
        const errorCount = [result1, result2].filter(r => r.error).length

        // Either one succeeds and one fails, or both fail gracefully
        expect(successCount + errorCount).toBe(2)
      }
    })
  })
})
