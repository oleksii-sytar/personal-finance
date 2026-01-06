/**
 * Property Test 10: Search Query Filtering
 * 
 * Validates: Requirements 4.5
 * 
 * This test ensures that search query filtering works correctly across
 * different search terms and transaction data patterns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'

// Create admin client for test operations
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

// Test data generators
const generateSearchableTransaction = fc.record({
  amount: fc.integer({ min: 1, max: 100000 }),
  type: fc.constantFrom('income', 'expense'),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  notes: fc.oneof(
    fc.string({ minLength: 1, maxLength: 200 }),
    fc.constant(null)
  ),
  currency: fc.constant('UAH'),
  transaction_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
})

const generateSearchQuery = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }), // Random search terms
  fc.constantFrom('test', 'grocery', 'salary', 'rent', 'food'), // Common terms
  fc.string({ minLength: 1, maxLength: 5 }) // Short terms
)

describe('Property Test 10: Search Query Filtering', () => {
  let userId: string
  let workspaceId: string

  beforeEach(async () => {
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    userId = user.id
    workspaceId = workspace.id
    
    // Clean up any existing transactions for this workspace to ensure isolation
    await supabase
      .from('transactions')
      .delete()
      .eq('workspace_id', workspaceId)
  })

  afterEach(async () => {
    // Clean up transactions for this workspace first
    await supabase
      .from('transactions')
      .delete()
      .eq('workspace_id', workspaceId)
    
    // Then clean up user and workspace data
    await cleanupTestData(userId)
  })

  it('should filter transactions by search query in notes field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateSearchableTransaction, { minLength: 2, maxLength: 5 }),
        generateSearchQuery,
        async (transactionData, searchQuery) => {
          // Clean up any existing transactions for this workspace to ensure isolation
          await supabase
            .from('transactions')
            .delete()
            .eq('workspace_id', workspaceId)

          // Create transactions with known notes content
          const transactions = []
          for (let i = 0; i < transactionData.length; i++) {
            const data = transactionData[i]
            const notes = i % 3 === 0 ? `Contains ${searchQuery} in notes` : `Random notes ${Math.random()}`
            
            const { data: transaction, error } = await supabase
              .from('transactions')
              .insert({
                ...data,
                notes, // Use our controlled notes value
                workspace_id: workspaceId,
                user_id: userId,
                created_by: userId,
                transaction_date: data.transaction_date.toISOString().split('T')[0]
              })
              .select()
              .single()

            expect(error).toBeNull()
            transactions.push(transaction)
          }

          // Query with search filter
          const { data: filteredTransactions, error: queryError } = await supabase
            .from('transactions')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId) // Additional filter to ensure isolation
            .ilike('notes', `%${searchQuery}%`)
            .order('transaction_date', { ascending: false })

          expect(queryError).toBeNull()
          expect(filteredTransactions).toBeDefined()

          // Verify all returned transactions contain the search query in notes
          for (const transaction of filteredTransactions!) {
            expect(transaction.notes?.toLowerCase()).toContain(searchQuery.toLowerCase())
          }

          // Verify we found the expected transactions
          const expectedCount = transactions.filter(t => 
            t.notes?.toLowerCase().includes(searchQuery.toLowerCase())
          ).length
          expect(filteredTransactions!.length).toBe(expectedCount)
        }
      ),
      { numRuns: 3 }
    )
  })

  it('should handle empty search queries correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateSearchableTransaction, { minLength: 2, maxLength: 4 }),
        async (transactionData) => {
          // Clean up any existing transactions for this workspace to ensure isolation
          await supabase
            .from('transactions')
            .delete()
            .eq('workspace_id', workspaceId)

          // Create transactions
          const transactions = []
          for (const data of transactionData) {
            const { data: transaction, error } = await supabase
              .from('transactions')
              .insert({
                ...data,
                notes: data.notes || null, // Ensure undefined becomes null
                workspace_id: workspaceId,
                user_id: userId,
                created_by: userId,
                transaction_date: data.transaction_date.toISOString().split('T')[0]
              })
              .select()
              .single()

            expect(error).toBeNull()
            transactions.push(transaction)
          }

          // Query without search filter (empty query) - should return only our test transactions
          const { data: allTransactions, error: queryError } = await supabase
            .from('transactions')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId) // Additional filter to ensure isolation
            .order('transaction_date', { ascending: false })

          expect(queryError).toBeNull()
          expect(allTransactions).toBeDefined()
          expect(allTransactions!.length).toBe(transactions.length)
        }
      ),
      { numRuns: 2 }
    )
  })

  it('should be case-insensitive in search', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateSearchQuery,
        async (searchTerm) => {
          // Clean up any existing transactions for this workspace to ensure isolation
          await supabase
            .from('transactions')
            .delete()
            .eq('workspace_id', workspaceId)

          // Create transactions with mixed case notes
          const testCases = [
            `Notes with ${searchTerm.toLowerCase()}`,
            `Notes with ${searchTerm.toUpperCase()}`,
            `Notes with ${searchTerm}`,
            'Notes without the term'
          ]

          const transactions = []
          for (let i = 0; i < testCases.length; i++) {
            const { data: transaction, error } = await supabase
              .from('transactions')
              .insert({
                amount: 1000 + i,
                type: 'expense',
                description: `Test transaction ${i}`,
                notes: testCases[i],
                currency: 'UAH',
                workspace_id: workspaceId,
                user_id: userId,
                created_by: userId,
                transaction_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single()

            expect(error).toBeNull()
            transactions.push(transaction)
          }

          // Search with lowercase term
          const { data: results, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId) // Additional filter to ensure isolation
            .ilike('notes', `%${searchTerm.toLowerCase()}%`)

          expect(error).toBeNull()
          expect(results).toBeDefined()

          // Should find transactions with the term in any case
          const expectedCount = testCases.filter(notes => 
            notes.toLowerCase().includes(searchTerm.toLowerCase())
          ).length

          expect(results!.length).toBe(expectedCount)

          // Verify all results contain the search term (case-insensitive)
          for (const result of results!) {
            expect(result.notes?.toLowerCase()).toContain(searchTerm.toLowerCase())
          }
        }
      ),
      { numRuns: 3 }
    )
  })

  it('should handle special characters in search queries', async () => {
    const specialCharQueries = ['test@email.com', 'price: $100', 'item #1', 'note (important)']
    
    for (const searchQuery of specialCharQueries) {
      // Clean up any existing transactions for this workspace to ensure isolation
      await supabase
        .from('transactions')
        .delete()
        .eq('workspace_id', workspaceId)

      // Create transaction with special characters in notes
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          amount: 1000,
          type: 'expense',
          description: 'Test transaction',
          notes: `Transaction notes containing ${searchQuery}`,
          currency: 'UAH',
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
          transaction_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      expect(error).toBeNull()

      // Search for the special character query
      const { data: results, error: queryError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId) // Additional filter to ensure isolation
        .ilike('notes', `%${searchQuery}%`)

      expect(queryError).toBeNull()
      expect(results).toBeDefined()
      expect(results!.length).toBe(1)
      expect(results![0].notes).toContain(searchQuery)
    }
  })
})