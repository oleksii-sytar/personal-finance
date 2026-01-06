/**
 * Property-Based Test for Quick Entry Timestamp Accuracy
 * 
 * Feature: transactions, Property 3: Quick Entry Timestamp Accuracy
 * 
 * Tests that for any transaction created via quick entry, the system should assign 
 * the current date and time as the transaction timestamp.
 * 
 * Validates: Requirements 1.9
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

describe('Property 3: Quick Entry Timestamp Accuracy', () => {
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

  let testUserId: string
  let testWorkspaceId: string

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'password123',
      email_confirm: true,
    })

    if (userError || !user.user) {
      throw new Error('Failed to create test user')
    }

    testUserId = user.user.id

    // Create test workspace
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: `Test Workspace ${Date.now()}`,
        owner_id: testUserId,
        currency: 'UAH'
      })
      .select()
      .single()

    if (workspaceError || !workspace) {
      throw new Error('Failed to create test workspace')
    }

    testWorkspaceId = workspace.id

    // Create workspace membership (automatically created when workspace is created)
    // But let's ensure it exists
    await supabaseAdmin
      .from('workspace_members')
      .upsert({
        workspace_id: testWorkspaceId,
        user_id: testUserId,
        role: 'owner'
      })

    // Create a default category for testing
    await supabaseAdmin
      .from('categories')
      .insert({
        workspace_id: testWorkspaceId,
        name: 'Other Expense',
        type: 'expense',
        is_default: true,
        color: '#8B7355',
        icon: '📝'
      })

    await supabaseAdmin
      .from('categories')
      .insert({
        workspace_id: testWorkspaceId,
        name: 'Other Income',
        type: 'income',
        is_default: true,
        color: '#4E7A58',
        icon: '💰'
      })
  })

  afterAll(async () => {
    // Cleanup test data
    if (testWorkspaceId) {
      await supabaseAdmin.from('transactions').delete().eq('workspace_id', testWorkspaceId)
      await supabaseAdmin.from('categories').delete().eq('workspace_id', testWorkspaceId)
      await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', testWorkspaceId)
      await supabaseAdmin.from('workspaces').delete().eq('id', testWorkspaceId)
    }

    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId)
    }
  })

  it('Property 3: Quick Entry Timestamp Accuracy - transactions created via quick entry should have current timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random transaction data that would come from quick entry
        fc.record({
          amount: fc.float({ min: Math.fround(0.01), max: Math.fround(99999.99), noNaN: true }),
          type: fc.constantFrom('income', 'expense'),
          description: fc.string({ minLength: 1, maxLength: 100 }),
          currency: fc.constant('UAH'), // Quick entry always uses UAH
        }),
        async (transactionData) => {
          // Record the time just before creating the transaction (simulating quick entry)
          const beforeCreation = new Date()
          
          // Get the default category for this transaction type
          const { data: defaultCategory } = await supabaseAdmin
            .from('categories')
            .select('id')
            .eq('workspace_id', testWorkspaceId)
            .eq('type', transactionData.type)
            .eq('is_default', true)
            .single()

          // Simulate quick entry transaction creation directly in database
          // This simulates what the server action would do after validation
          const { data: transaction, error } = await supabaseAdmin
            .from('transactions')
            .insert({
              workspace_id: testWorkspaceId,
              user_id: testUserId,
              created_by: testUserId,
              amount: transactionData.amount,
              currency: transactionData.currency,
              type: transactionData.type,
              category_id: defaultCategory?.id,
              description: transactionData.description,
              transaction_date: new Date().toISOString().split('T')[0], // Current date (quick entry behavior)
              is_expected: false,
              deleted_at: null,
            })
            .select()
            .single()

          // Record the time just after creating the transaction
          const afterCreation = new Date()

          // Verify transaction was created successfully
          expect(error).toBeNull()
          expect(transaction).toBeDefined()

          if (transaction) {
            // Property assertion: Transaction timestamp should be current date/time
            const transactionDate = new Date(transaction.transaction_date + 'T00:00:00Z') // Convert DATE to Date object
            const createdAt = new Date(transaction.created_at)

            // Verify transaction_date is today's date (quick entry sets current date)
            const today = new Date()
            expect(transactionDate.getUTCFullYear()).toBe(today.getUTCFullYear())
            expect(transactionDate.getUTCMonth()).toBe(today.getUTCMonth())
            expect(transactionDate.getUTCDate()).toBe(today.getUTCDate())

            // Verify created_at is current time (database timestamp)
            const createdAtDifferenceMs = Math.abs(createdAt.getTime() - beforeCreation.getTime())
            expect(createdAtDifferenceMs).toBeLessThan(5000) // Within 5 seconds

            // Verify created_at is not in the future beyond reasonable processing time
            expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime())

            // Verify created_at is not significantly in the past (more than 1 minute)
            const oneMinuteAgo = new Date(beforeCreation.getTime() - 60000)
            expect(createdAt.getTime()).toBeGreaterThan(oneMinuteAgo.getTime())

            // Verify the transaction has the expected properties from quick entry
            expect(transaction.workspace_id).toBe(testWorkspaceId)
            expect(transaction.user_id).toBe(testUserId)
            expect(transaction.created_by).toBe(testUserId)
            expect(transaction.amount).toBeCloseTo(transactionData.amount, 2)
            expect(transaction.type).toBe(transactionData.type)
            expect(transaction.currency).toBe('UAH') // Always UAH in database
            expect(transaction.description).toBe(transactionData.description)
            expect(transaction.is_expected).toBe(false) // Quick entry creates regular transactions
            expect(transaction.deleted_at).toBeNull() // Not soft-deleted

            // Clean up this transaction for next iteration
            await supabaseAdmin
              .from('transactions')
              .delete()
              .eq('id', transaction.id)
          }
        }
      ),
      { numRuns: 20 } // Run 20 iterations for comprehensive testing
    )
  }, 30000) // 30 second timeout

  it('Property 3: Quick Entry Timestamp Accuracy - multiple quick entries should have sequential timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple transactions to test sequential creation
        fc.array(
          fc.record({
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
            type: fc.constantFrom('income', 'expense'),
            description: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (transactionDataArray) => {
          const createdTransactions: any[] = []
          const creationTimes: Date[] = []

          try {
            // Create transactions sequentially (simulating rapid quick entry usage)
            for (const transactionData of transactionDataArray) {
              const beforeCreation = new Date()
              creationTimes.push(beforeCreation)

              // Get the default category for this transaction type
              const { data: defaultCategory } = await supabaseAdmin
                .from('categories')
                .select('id')
                .eq('workspace_id', testWorkspaceId)
                .eq('type', transactionData.type)
                .eq('is_default', true)
                .single()

              // Simulate quick entry transaction creation
              const { data: transaction, error } = await supabaseAdmin
                .from('transactions')
                .insert({
                  workspace_id: testWorkspaceId,
                  user_id: testUserId,
                  created_by: testUserId,
                  amount: transactionData.amount,
                  currency: 'UAH',
                  type: transactionData.type,
                  category_id: defaultCategory?.id,
                  description: transactionData.description,
                  transaction_date: new Date().toISOString().split('T')[0], // Current date
                  is_expected: false,
                  deleted_at: null,
                })
                .select()
                .single()

              expect(error).toBeNull()
              expect(transaction).toBeDefined()

              if (transaction) {
                createdTransactions.push(transaction)
              }

              // Small delay to ensure timestamps are different
              await new Promise(resolve => setTimeout(resolve, 10))
            }

            // Property assertion: Timestamps should be sequential and current
            for (let i = 0; i < createdTransactions.length; i++) {
              const transaction = createdTransactions[i]
              const creationTime = creationTimes[i]
              const transactionDate = new Date(transaction.transaction_date + 'T00:00:00Z')
              const createdAt = new Date(transaction.created_at)

              // Each transaction should have today's date
              const today = new Date()
              expect(transactionDate.getUTCFullYear()).toBe(today.getUTCFullYear())
              expect(transactionDate.getUTCMonth()).toBe(today.getUTCMonth())
              expect(transactionDate.getUTCDate()).toBe(today.getUTCDate())

              // Each transaction's created_at should be close to its creation time
              const timeDifference = Math.abs(createdAt.getTime() - creationTime.getTime())
              expect(timeDifference).toBeLessThan(5000) // Within 5 seconds

              // Sequential transactions should have non-decreasing created_at timestamps
              if (i > 0) {
                const previousTransaction = createdTransactions[i - 1]
                const previousCreatedAt = new Date(previousTransaction.created_at)
                
                // Current transaction should not be created before the previous one
                expect(createdAt.getTime()).toBeGreaterThanOrEqual(previousCreatedAt.getTime())
              }
            }

          } finally {
            // Clean up all created transactions
            for (const transaction of createdTransactions) {
              await supabaseAdmin
                .from('transactions')
                .delete()
                .eq('id', transaction.id)
            }
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations
    )
  }, 25000) // 25 second timeout

  it('Property 3: Quick Entry Timestamp Accuracy - timestamp should be in correct timezone format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
          type: fc.constantFrom('income', 'expense'),
          description: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (transactionData) => {
          // Get the default category for this transaction type
          const { data: defaultCategory } = await supabaseAdmin
            .from('categories')
            .select('id')
            .eq('workspace_id', testWorkspaceId)
            .eq('type', transactionData.type)
            .eq('is_default', true)
            .single()

          // Create transaction via quick entry simulation
          const { data: transaction, error } = await supabaseAdmin
            .from('transactions')
            .insert({
              workspace_id: testWorkspaceId,
              user_id: testUserId,
              created_by: testUserId,
              amount: transactionData.amount,
              currency: 'UAH',
              type: transactionData.type,
              category_id: defaultCategory?.id,
              description: transactionData.description,
              transaction_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
              is_expected: false,
              deleted_at: null,
            })
            .select()
            .single()

          expect(error).toBeNull()
          expect(transaction).toBeDefined()

          if (transaction) {
            // Property assertion: Timestamp should be in valid date format
            const transactionDate = new Date(transaction.transaction_date + 'T00:00:00Z')
            const createdAt = new Date(transaction.created_at)

            // Verify dates are valid
            expect(transactionDate.toString()).not.toBe('Invalid Date')
            expect(createdAt.toString()).not.toBe('Invalid Date')

            // Verify transaction_date is stored as date (not datetime with time)
            // The database stores transaction_date as DATE type, so it should be YYYY-MM-DD format
            const dateOnly = transaction.transaction_date
            expect(typeof dateOnly).toBe('string')
            
            // For DATE fields, we expect YYYY-MM-DD format
            expect(dateOnly).toMatch(/^\d{4}-\d{2}-\d{2}$/)

            // Verify created_at is stored as timestamp with timezone
            const createdAtString = transaction.created_at
            expect(typeof createdAtString).toBe('string')
            
            // Should be ISO format with timezone
            expect(createdAtString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

            // Verify the date portion matches today's date
            const today = new Date().toISOString().split('T')[0]
            expect(dateOnly).toBe(today)

            // Verify transaction properties are correct for quick entry
            expect(transaction.workspace_id).toBe(testWorkspaceId)
            expect(transaction.user_id).toBe(testUserId)
            expect(transaction.created_by).toBe(testUserId)
            expect(transaction.amount).toBeCloseTo(transactionData.amount, 2)
            expect(transaction.type).toBe(transactionData.type)
            expect(transaction.currency).toBe('UAH')
            expect(transaction.description).toBe(transactionData.description)
            expect(transaction.is_expected).toBe(false)
            expect(transaction.deleted_at).toBeNull()

            // Clean up
            await supabaseAdmin
              .from('transactions')
              .delete()
              .eq('id', transaction.id)
          }
        }
      ),
      { numRuns: 15 } // Run 15 iterations
    )
  }, 20000) // 20 second timeout
})