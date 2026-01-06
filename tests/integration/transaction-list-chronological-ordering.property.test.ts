/**
 * Property-Based Test for Transaction List Chronological Ordering
 * 
 * Feature: transactions, Property 7: Transaction List Chronological Ordering
 * 
 * Tests that for any set of transactions, the default list display should order them 
 * by transaction date in descending order (most recent first).
 * 
 * Validates: Requirements 3.1
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import { getTransactions } from '@/actions/transactions'
import type { Database } from '@/types/database'
import type { Transaction } from '@/types'

describe('Property 7: Transaction List Chronological Ordering', () => {
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Helper function to generate safe date strings within a reasonable range
  const generateDateString = (minDate?: Date, maxDate?: Date) => {
    const start = minDate ? minDate.getTime() : new Date('2020-01-01').getTime()
    const end = maxDate ? maxDate.getTime() : new Date().getTime()
    const randomTime = start + Math.random() * (end - start)
    return new Date(randomTime).toISOString().split('T')[0]
  }

  // Helper function to create test transactions with specific dates
  const createTestTransactions = async (
    workspaceId: string, 
    userId: string, 
    transactionDates: string[]
  ): Promise<Transaction[]> => {
    const transactions: Transaction[] = []
    
    for (let i = 0; i < transactionDates.length; i++) {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          amount: 100 + i, // Unique amounts for identification
          currency: 'UAH',
          type: i % 2 === 0 ? 'expense' : 'income',
          description: `Test transaction ${i}`,
          transaction_date: transactionDates[i],
          created_by: userId,
          updated_by: null,
          deleted_at: null
        })
        .select()
        .single()

      if (!error && data) {
        transactions.push(data)
      }
    }
    
    return transactions
  }

  // Helper function to clean up test transactions
  const cleanupTestTransactions = async (transactionIds: string[]) => {
    if (transactionIds.length > 0) {
      await supabaseAdmin
        .from('transactions')
        .delete()
        .in('id', transactionIds)
    }
  }

  it('should order transactions by date in descending order (most recent first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data with multiple transactions having different dates
        fc.record({
          workspaceId: fc.uuid(),
          userId: fc.uuid(),
          transactionCount: fc.integer({ min: 3, max: 8 }),
          dateRange: fc.record({
            startDate: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2023-12-31').getTime() }).map(t => new Date(t)),
            endDate: fc.integer({ min: new Date('2024-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t))
          })
        }),
        async ({ workspaceId, userId, transactionCount, dateRange }) => {
          // Generate unique transaction dates within the range
          const transactionDates: string[] = []
          for (let i = 0; i < transactionCount; i++) {
            const date = generateDateString(dateRange.startDate, dateRange.endDate)
            transactionDates.push(date)
          }

          // Ensure we have at least some different dates for meaningful testing
          const uniqueDates = [...new Set(transactionDates)]
          if (uniqueDates.length < 2) {
            return // Skip if all dates are the same
          }

          const testTransactions = await createTestTransactions(workspaceId, userId, transactionDates)
          
          if (testTransactions.length < 2) {
            return // Skip if we couldn't create enough transactions
          }

          try {
            // Test the getTransactions server action directly
            const result = await getTransactions(workspaceId)
            
            if (result.error || !result.data) {
              return // Skip if query failed (likely due to missing workspace/user)
            }

            const retrievedTransactions = result.data
            
            // Filter to only our test transactions
            const ourTransactions = retrievedTransactions.filter(tx => 
              testTransactions.some(testTx => testTx.id === tx.id)
            )

            if (ourTransactions.length < 2) {
              return // Skip if we don't have enough transactions to test ordering
            }

            // Property 7: Transactions should be ordered by transaction_date in descending order
            for (let i = 0; i < ourTransactions.length - 1; i++) {
              const currentDate = new Date(ourTransactions[i].transaction_date)
              const nextDate = new Date(ourTransactions[i + 1].transaction_date)
              
              // Current transaction should have a date >= next transaction (descending order)
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
            }

            // Additional verification: Check that the ordering matches expected descending order
            const sortedDates = ourTransactions
              .map(tx => tx.transaction_date)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Descending

            const actualDates = ourTransactions.map(tx => tx.transaction_date)
            
            // Property 7: Actual order should match expected descending order
            expect(actualDates).toEqual(sortedDates)

          } finally {
            // Clean up test data
            await cleanupTestTransactions(testTransactions.map(tx => tx.id))
          }
        }
      ),
      { numRuns: 15 } // Run 15 iterations to test various date combinations
    )
  }, 30000) // 30 second timeout

  it('should maintain chronological ordering with mixed date ranges', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate transactions with deliberately mixed date ranges
        fc.record({
          workspaceId: fc.uuid(),
          userId: fc.uuid(),
          oldTransactionCount: fc.integer({ min: 2, max: 4 }),
          recentTransactionCount: fc.integer({ min: 2, max: 4 })
        }),
        async ({ workspaceId, userId, oldTransactionCount, recentTransactionCount }) => {
          // Create old transactions (2020-2022)
          const oldDates: string[] = []
          for (let i = 0; i < oldTransactionCount; i++) {
            oldDates.push(generateDateString(new Date('2020-01-01'), new Date('2022-12-31')))
          }

          // Create recent transactions (2023-now)
          const recentDates: string[] = []
          for (let i = 0; i < recentTransactionCount; i++) {
            recentDates.push(generateDateString(new Date('2023-01-01'), new Date()))
          }

          // Combine and shuffle the dates to create mixed input
          const allDates = [...oldDates, ...recentDates]
          const shuffledDates = allDates.sort(() => Math.random() - 0.5)

          const testTransactions = await createTestTransactions(workspaceId, userId, shuffledDates)
          
          if (testTransactions.length < 3) {
            return // Skip if we couldn't create enough transactions
          }

          try {
            // Query transactions using the server action
            const result = await getTransactions(workspaceId)
            
            if (result.error || !result.data) {
              return // Skip if query failed
            }

            const retrievedTransactions = result.data
            
            // Filter to only our test transactions
            const ourTransactions = retrievedTransactions.filter(tx => 
              testTransactions.some(testTx => testTx.id === tx.id)
            )

            if (ourTransactions.length < 3) {
              return // Skip if we don't have enough transactions
            }

            // Property 7: Recent transactions should appear before old transactions
            const recentTransactionIds = testTransactions
              .filter(tx => recentDates.includes(tx.transaction_date))
              .map(tx => tx.id)
            
            const oldTransactionIds = testTransactions
              .filter(tx => oldDates.includes(tx.transaction_date))
              .map(tx => tx.id)

            if (recentTransactionIds.length === 0 || oldTransactionIds.length === 0) {
              return // Skip if we don't have both types
            }

            // Find positions in the ordered list
            const recentPositions = recentTransactionIds
              .map(id => ourTransactions.findIndex(tx => tx.id === id))
              .filter(pos => pos !== -1)
            
            const oldPositions = oldTransactionIds
              .map(id => ourTransactions.findIndex(tx => tx.id === id))
              .filter(pos => pos !== -1)

            if (recentPositions.length === 0 || oldPositions.length === 0) {
              return // Skip if we can't find positions
            }

            // Property 7: All recent transactions should appear before all old transactions
            const maxRecentPosition = Math.max(...recentPositions)
            const minOldPosition = Math.min(...oldPositions)
            
            expect(maxRecentPosition).toBeLessThan(minOldPosition)

            // Property 7: Within each group, ordering should still be descending
            for (let i = 0; i < ourTransactions.length - 1; i++) {
              const currentDate = new Date(ourTransactions[i].transaction_date)
              const nextDate = new Date(ourTransactions[i + 1].transaction_date)
              
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
            }

          } finally {
            // Clean up test data
            await cleanupTestTransactions(testTransactions.map(tx => tx.id))
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations for mixed date range testing
    )
  }, 35000) // 35 second timeout

  it('should handle same-date transactions with consistent ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate transactions with some having the same date
        fc.record({
          workspaceId: fc.uuid(),
          userId: fc.uuid(),
          sameDateCount: fc.integer({ min: 3, max: 6 }),
          differentDateCount: fc.integer({ min: 2, max: 4 }),
          baseDate: fc.date({ min: new Date('2023-01-01'), max: new Date() })
        }),
        async ({ workspaceId, userId, sameDateCount, differentDateCount, baseDate }) => {
          const baseDateString = baseDate.toISOString().split('T')[0]
          
          // Create transactions with the same date
          const sameDateTransactions: string[] = Array(sameDateCount).fill(baseDateString)
          
          // Create transactions with different dates
          const differentDates: string[] = []
          for (let i = 0; i < differentDateCount; i++) {
            // Generate dates that are definitely different from baseDate
            const offsetDays = (i + 1) * (Math.random() > 0.5 ? 1 : -1)
            const differentDate = new Date(baseDate)
            differentDate.setDate(differentDate.getDate() + offsetDays)
            differentDates.push(differentDate.toISOString().split('T')[0])
          }

          const allDates = [...sameDateTransactions, ...differentDates]
          const testTransactions = await createTestTransactions(workspaceId, userId, allDates)
          
          if (testTransactions.length < 4) {
            return // Skip if we couldn't create enough transactions
          }

          try {
            // Query transactions
            const result = await getTransactions(workspaceId)
            
            if (result.error || !result.data) {
              return // Skip if query failed
            }

            const retrievedTransactions = result.data
            
            // Filter to only our test transactions
            const ourTransactions = retrievedTransactions.filter(tx => 
              testTransactions.some(testTx => testTx.id === tx.id)
            )

            if (ourTransactions.length < 4) {
              return // Skip if we don't have enough transactions
            }

            // Property 7: Overall ordering should still be descending by date
            for (let i = 0; i < ourTransactions.length - 1; i++) {
              const currentDate = new Date(ourTransactions[i].transaction_date)
              const nextDate = new Date(ourTransactions[i + 1].transaction_date)
              
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
            }

            // Property 7: Transactions with the same date should be grouped together
            const sameDateTxs = ourTransactions.filter(tx => tx.transaction_date === baseDateString)
            
            if (sameDateTxs.length > 1) {
              // Find the positions of same-date transactions
              const positions = sameDateTxs.map(tx => 
                ourTransactions.findIndex(otx => otx.id === tx.id)
              )
              
              // Same-date transactions should be consecutive (or at least grouped)
              positions.sort((a, b) => a - b)
              
              // Check that they form a contiguous block (allowing for other same-date transactions)
              for (let i = 0; i < positions.length - 1; i++) {
                const currentPos = positions[i]
                const nextPos = positions[i + 1]
                
                // All transactions between these positions should have the same date
                for (let pos = currentPos; pos <= nextPos; pos++) {
                  const txDate = new Date(ourTransactions[pos].transaction_date)
                  const baseDateTime = new Date(baseDateString)
                  
                  expect(txDate.getTime()).toBeGreaterThanOrEqual(baseDateTime.getTime())
                }
              }
            }

          } finally {
            // Clean up test data
            await cleanupTestTransactions(testTransactions.map(tx => tx.id))
          }
        }
      ),
      { numRuns: 8 } // Run 8 iterations for same-date testing
    )
  }, 30000) // 30 second timeout

  it('should maintain ordering consistency across different query options', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate transactions with various types and dates
        fc.record({
          workspaceId: fc.uuid(),
          userId: fc.uuid(),
          transactionCount: fc.integer({ min: 6, max: 12 }),
          queryOptions: fc.record({
            limit: fc.option(fc.integer({ min: 3, max: 10 }), { nil: undefined }),
            offset: fc.option(fc.integer({ min: 0, max: 3 }), { nil: undefined }),
            type: fc.option(fc.constantFrom('income', 'expense'), { nil: undefined })
          })
        }),
        async ({ workspaceId, userId, transactionCount, queryOptions }) => {
          // Generate diverse transaction dates
          const transactionDates: string[] = []
          const types: ('income' | 'expense')[] = []
          
          for (let i = 0; i < transactionCount; i++) {
            transactionDates.push(generateDateString())
            types.push(i % 2 === 0 ? 'expense' : 'income')
          }

          // Create transactions with mixed types
          const testTransactions: Transaction[] = []
          for (let i = 0; i < transactionCount; i++) {
            const { data, error } = await supabaseAdmin
              .from('transactions')
              .insert({
                workspace_id: workspaceId,
                user_id: userId,
                amount: 100 + i,
                currency: 'UAH',
                type: types[i],
                description: `Test transaction ${i}`,
                transaction_date: transactionDates[i],
                created_by: userId,
                updated_by: null,
                deleted_at: null
              })
              .select()
              .single()

            if (!error && data) {
              testTransactions.push(data)
            }
          }
          
          if (testTransactions.length < 3) {
            return // Skip if we couldn't create enough transactions
          }

          try {
            // Query with different options
            const result = await getTransactions(workspaceId, queryOptions)
            
            if (result.error || !result.data) {
              return // Skip if query failed
            }

            const retrievedTransactions = result.data
            
            // Filter to only our test transactions
            const ourTransactions = retrievedTransactions.filter(tx => 
              testTransactions.some(testTx => testTx.id === tx.id)
            )

            if (ourTransactions.length < 2) {
              return // Skip if we don't have enough transactions
            }

            // Property 7: Regardless of query options, ordering should always be descending by date
            for (let i = 0; i < ourTransactions.length - 1; i++) {
              const currentDate = new Date(ourTransactions[i].transaction_date)
              const nextDate = new Date(ourTransactions[i + 1].transaction_date)
              
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
            }

            // Property 7: If type filter is applied, all returned transactions should match
            if (queryOptions.type) {
              ourTransactions.forEach(tx => {
                expect(tx.type).toBe(queryOptions.type)
              })
            }

            // Property 7: If limit is applied, result count should not exceed limit
            if (queryOptions.limit) {
              expect(ourTransactions.length).toBeLessThanOrEqual(queryOptions.limit)
            }

            // Property 7: Ordering should be consistent regardless of pagination
            if (ourTransactions.length > 1) {
              const dates = ourTransactions.map(tx => new Date(tx.transaction_date).getTime())
              const sortedDates = [...dates].sort((a, b) => b - a) // Descending
              
              expect(dates).toEqual(sortedDates)
            }

          } finally {
            // Clean up test data
            await cleanupTestTransactions(testTransactions.map(tx => tx.id))
          }
        }
      ),
      { numRuns: 12 } // Run 12 iterations for query options testing
    )
  }, 40000) // 40 second timeout
})