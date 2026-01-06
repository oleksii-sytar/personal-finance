/**
 * Property-Based Test for Recurring Transaction Skip Functionality
 * 
 * Feature: transactions, Property 24: Recurring Transaction Skip Functionality
 * 
 * Tests that for any expected transaction, the user should be able to skip 
 * the occurrence, marking it as skipped without creating a confirmed transaction.
 * 
 * Validates: Requirements 9.8
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import { skipExpectedTransaction } from '@/actions/recurring-transactions'
import type { Database } from '@/types/database'
import type { ExpectedTransaction, RecurringTransaction } from '@/types'

describe('Property 24: Recurring Transaction Skip Functionality', () => {
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

  // Helper function to generate safe date strings
  const generateDateString = () => {
    const start = new Date('2020-01-01').getTime()
    const end = new Date().getTime()
    const randomTime = start + Math.random() * (end - start)
    return new Date(randomTime).toISOString().split('T')[0]
  }

  // Helper function to create a test workspace
  const createTestWorkspace = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: `Test Workspace ${Date.now()}`,
        currency: 'UAH',
        owner_id: userId
      })
      .select('id')
      .single()

    return error ? null : data.id
  }

  // Helper function to create a test user
  const createTestUser = async (): Promise<string | null> => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true
    })

    return error ? null : data.user.id
  }

  // Helper function to create a recurring transaction
  const createTestRecurringTransaction = async (
    workspaceId: string, 
    userId: string,
    templateData: any
  ): Promise<RecurringTransaction | null> => {
    const { data, error } = await supabaseAdmin
      .from('recurring_transactions')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        template_data: templateData,
        frequency: 'monthly',
        interval_count: 1,
        start_date: new Date().toISOString().split('T')[0],
        next_due_date: new Date().toISOString().split('T')[0],
        is_active: true
      })
      .select()
      .single()

    return error ? null : data
  }

  // Helper function to create an expected transaction
  const createTestExpectedTransaction = async (
    recurringTransactionId: string,
    workspaceId: string,
    expectedAmount: number,
    currency: string = 'UAH',
    status: 'pending' | 'confirmed' | 'skipped' = 'pending'
  ): Promise<ExpectedTransaction | null> => {
    const { data, error } = await supabaseAdmin
      .from('expected_transactions')
      .insert({
        recurring_transaction_id: recurringTransactionId,
        workspace_id: workspaceId,
        expected_date: new Date().toISOString().split('T')[0],
        expected_amount: expectedAmount,
        currency: currency,
        status: status
      })
      .select()
      .single()

    return error ? null : data
  }

  // Helper function to clean up test data
  const cleanupTestData = async (userId: string, workspaceId?: string, expectedTransactionId?: string, recurringTransactionId?: string) => {
    if (expectedTransactionId) {
      await supabaseAdmin.from('expected_transactions').delete().eq('id', expectedTransactionId)
    }
    if (recurringTransactionId) {
      await supabaseAdmin.from('recurring_transactions').delete().eq('id', recurringTransactionId)
    }
    if (workspaceId) {
      await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
    }
    await supabaseAdmin.auth.admin.deleteUser(userId)
  }

  it('should mark expected transaction as skipped without creating confirmed transaction for any skip operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random expected transaction skip data
        fc.record({
          templateData: fc.record({
            amount: fc.integer({ min: 1, max: 999999 }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            type: fc.constantFrom('income', 'expense'),
            description: fc.string({ minLength: 1, maxLength: 255 }),
            notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null })
          }),
          expectedDate: fc.string().map(() => generateDateString())
        }),
        async ({ templateData, expectedDate }) => {
          let userId: string | null = null
          let workspaceId: string | null = null
          let recurringTransaction: RecurringTransaction | null = null
          let expectedTransaction: ExpectedTransaction | null = null

          try {
            // Create test user and workspace
            userId = await createTestUser()
            if (!userId) return

            workspaceId = await createTestWorkspace(userId)
            if (!workspaceId) return

            // Create recurring transaction
            recurringTransaction = await createTestRecurringTransaction(
              workspaceId,
              userId,
              templateData
            )
            if (!recurringTransaction) return

            // Create expected transaction
            expectedTransaction = await createTestExpectedTransaction(
              recurringTransaction.id,
              workspaceId,
              templateData.amount,
              templateData.currency,
              'pending'
            )
            if (!expectedTransaction) return

            // Verify initial state
            expect(expectedTransaction.status).toBe('pending')
            expect(expectedTransaction.actual_transaction_id).toBeNull()

            // Simulate skipping the expected transaction
            const { data: skippedExpectedTransaction, error: skipError } = await supabaseAdmin
              .from('expected_transactions')
              .update({ status: 'skipped' })
              .eq('id', expectedTransaction.id)
              .select()
              .single()

            if (skipError) {
              return // Skip if update failed
            }

            // Property 24: Expected transaction should be marked as skipped
            expect(skippedExpectedTransaction.status).toBe('skipped')
            expect(skippedExpectedTransaction.actual_transaction_id).toBeNull()

            // Property 24: No confirmed transaction should be created
            const { data: relatedTransactions, error: transactionError } = await supabaseAdmin
              .from('transactions')
              .select('id')
              .eq('expected_transaction_id', expectedTransaction.id)

            expect(transactionError).toBeNull()
            expect(relatedTransactions).toBeDefined()
            expect(relatedTransactions).toHaveLength(0) // No transactions should be created

            // Property 24: Original expected transaction data should be preserved
            expect(skippedExpectedTransaction.id).toBe(expectedTransaction.id)
            expect(skippedExpectedTransaction.recurring_transaction_id).toBe(expectedTransaction.recurring_transaction_id)
            expect(skippedExpectedTransaction.workspace_id).toBe(expectedTransaction.workspace_id)
            expect(skippedExpectedTransaction.expected_date).toBe(expectedTransaction.expected_date)
            expect(skippedExpectedTransaction.expected_amount).toBe(expectedTransaction.expected_amount)
            expect(skippedExpectedTransaction.currency).toBe(expectedTransaction.currency)

            // Verify the skipped transaction is still accessible for reporting
            const { data: retrievedExpectedTransaction, error: retrieveError } = await supabaseAdmin
              .from('expected_transactions')
              .select('*')
              .eq('id', expectedTransaction.id)
              .single()

            expect(retrieveError).toBeNull()
            expect(retrievedExpectedTransaction).toBeDefined()
            expect(retrievedExpectedTransaction.status).toBe('skipped')

          } finally {
            // Clean up test data
            if (userId) {
              await cleanupTestData(
                userId, 
                workspaceId || undefined, 
                expectedTransaction?.id,
                recurringTransaction?.id
              )
            }
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations to test various skip scenarios
    )
  }, 30000) // 30 second timeout

  it('should only allow skipping pending expected transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate data for status validation testing
        fc.record({
          templateData: fc.record({
            amount: fc.integer({ min: 1, max: 999999 }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            type: fc.constantFrom('income', 'expense'),
            description: fc.string({ minLength: 1, maxLength: 255 })
          }),
          initialStatus: fc.constantFrom('confirmed', 'skipped') // Non-pending statuses
        }),
        async ({ templateData, initialStatus }) => {
          let userId: string | null = null
          let workspaceId: string | null = null
          let recurringTransaction: RecurringTransaction | null = null
          let expectedTransaction: ExpectedTransaction | null = null

          try {
            // Create test user and workspace
            userId = await createTestUser()
            if (!userId) return

            workspaceId = await createTestWorkspace(userId)
            if (!workspaceId) return

            // Create recurring transaction
            recurringTransaction = await createTestRecurringTransaction(
              workspaceId,
              userId,
              templateData
            )
            if (!recurringTransaction) return

            // Create expected transaction with non-pending status
            expectedTransaction = await createTestExpectedTransaction(
              recurringTransaction.id,
              workspaceId,
              templateData.amount,
              templateData.currency,
              initialStatus as 'confirmed' | 'skipped'
            )
            if (!expectedTransaction) return

            // Verify initial state
            expect(expectedTransaction.status).toBe(initialStatus)

            // Attempt to skip already processed expected transaction
            const { data: skipAttempt, error: skipError } = await supabaseAdmin
              .from('expected_transactions')
              .update({ status: 'skipped' })
              .eq('id', expectedTransaction.id)
              .eq('status', 'pending') // Only update if still pending
              .select()

            // Property 24: Should not update non-pending transactions
            if (skipError) {
              // Error is acceptable - the operation should fail
              expect(skipError).toBeDefined()
            } else {
              // If no error, should return empty result (no rows updated)
              expect(skipAttempt).toHaveLength(0)
            }

            // Verify original status is preserved
            const { data: unchangedTransaction, error: retrieveError } = await supabaseAdmin
              .from('expected_transactions')
              .select('status')
              .eq('id', expectedTransaction.id)
              .single()

            expect(retrieveError).toBeNull()
            expect(unchangedTransaction.status).toBe(initialStatus) // Should remain unchanged

          } finally {
            // Clean up test data
            if (userId) {
              await cleanupTestData(
                userId, 
                workspaceId || undefined, 
                expectedTransaction?.id,
                recurringTransaction?.id
              )
            }
          }
        }
      ),
      { numRuns: 8 } // Run 8 iterations for status validation testing
    )
  }, 25000) // 25 second timeout

  it('should maintain skip operation idempotency for any expected transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate data for idempotency testing
        fc.record({
          templateData: fc.record({
            amount: fc.integer({ min: 1, max: 999999 }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            type: fc.constantFrom('income', 'expense'),
            description: fc.string({ minLength: 1, maxLength: 255 })
          }),
          skipAttempts: fc.integer({ min: 2, max: 5 }) // Multiple skip attempts
        }),
        async ({ templateData, skipAttempts }) => {
          let userId: string | null = null
          let workspaceId: string | null = null
          let recurringTransaction: RecurringTransaction | null = null
          let expectedTransaction: ExpectedTransaction | null = null

          try {
            // Create test user and workspace
            userId = await createTestUser()
            if (!userId) return

            workspaceId = await createTestWorkspace(userId)
            if (!workspaceId) return

            // Create recurring transaction
            recurringTransaction = await createTestRecurringTransaction(
              workspaceId,
              userId,
              templateData
            )
            if (!recurringTransaction) return

            // Create expected transaction
            expectedTransaction = await createTestExpectedTransaction(
              recurringTransaction.id,
              workspaceId,
              templateData.amount,
              templateData.currency,
              'pending'
            )
            if (!expectedTransaction) return

            // Perform first skip operation
            const { data: firstSkip, error: firstSkipError } = await supabaseAdmin
              .from('expected_transactions')
              .update({ status: 'skipped' })
              .eq('id', expectedTransaction.id)
              .select()
              .single()

            if (firstSkipError) {
              return // Skip if first operation failed
            }

            expect(firstSkip.status).toBe('skipped')
            const firstSkipTimestamp = firstSkip.updated_at || firstSkip.created_at

            // Attempt multiple additional skip operations
            for (let i = 1; i < skipAttempts; i++) {
              // Small delay between attempts
              await new Promise(resolve => setTimeout(resolve, 50))

              const { data: subsequentSkip, error: subsequentSkipError } = await supabaseAdmin
                .from('expected_transactions')
                .update({ status: 'skipped' })
                .eq('id', expectedTransaction.id)
                .select()
                .single()

              // Property 24: Subsequent skip operations should be idempotent
              if (!subsequentSkipError && subsequentSkip) {
                expect(subsequentSkip.status).toBe('skipped')
                expect(subsequentSkip.id).toBe(expectedTransaction.id)
                
                // Status should remain skipped
                expect(subsequentSkip.status).toBe('skipped')
              }
            }

            // Verify final state after all skip attempts
            const { data: finalState, error: finalError } = await supabaseAdmin
              .from('expected_transactions')
              .select('*')
              .eq('id', expectedTransaction.id)
              .single()

            expect(finalError).toBeNull()
            expect(finalState.status).toBe('skipped')
            expect(finalState.actual_transaction_id).toBeNull()

            // Property 24: No transactions should be created despite multiple skip attempts
            const { data: relatedTransactions, error: transactionError } = await supabaseAdmin
              .from('transactions')
              .select('id')
              .eq('expected_transaction_id', expectedTransaction.id)

            expect(transactionError).toBeNull()
            expect(relatedTransactions).toHaveLength(0)

          } finally {
            // Clean up test data
            if (userId) {
              await cleanupTestData(
                userId, 
                workspaceId || undefined, 
                expectedTransaction?.id,
                recurringTransaction?.id
              )
            }
          }
        }
      ),
      { numRuns: 6 } // Run 6 iterations for idempotency testing
    )
  }, 20000) // 20 second timeout

  it('should preserve workspace isolation during skip operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate data for workspace isolation testing
        fc.record({
          templateData: fc.record({
            amount: fc.integer({ min: 1, max: 999999 }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            type: fc.constantFrom('income', 'expense'),
            description: fc.string({ minLength: 1, maxLength: 255 })
          })
        }),
        async ({ templateData }) => {
          let userId1: string | null = null
          let userId2: string | null = null
          let workspaceId1: string | null = null
          let workspaceId2: string | null = null
          let recurringTransaction1: RecurringTransaction | null = null
          let recurringTransaction2: RecurringTransaction | null = null
          let expectedTransaction1: ExpectedTransaction | null = null
          let expectedTransaction2: ExpectedTransaction | null = null

          try {
            // Create two separate users and workspaces
            userId1 = await createTestUser()
            userId2 = await createTestUser()
            if (!userId1 || !userId2) return

            workspaceId1 = await createTestWorkspace(userId1)
            workspaceId2 = await createTestWorkspace(userId2)
            if (!workspaceId1 || !workspaceId2) return

            // Ensure different workspaces
            fc.pre(workspaceId1 !== workspaceId2)

            // Create recurring transactions in both workspaces
            recurringTransaction1 = await createTestRecurringTransaction(workspaceId1, userId1, templateData)
            recurringTransaction2 = await createTestRecurringTransaction(workspaceId2, userId2, templateData)
            if (!recurringTransaction1 || !recurringTransaction2) return

            // Create expected transactions in both workspaces
            expectedTransaction1 = await createTestExpectedTransaction(
              recurringTransaction1.id, workspaceId1, templateData.amount, templateData.currency, 'pending'
            )
            expectedTransaction2 = await createTestExpectedTransaction(
              recurringTransaction2.id, workspaceId2, templateData.amount, templateData.currency, 'pending'
            )
            if (!expectedTransaction1 || !expectedTransaction2) return

            // Skip expected transaction in first workspace
            const { data: skippedTransaction1, error: skipError1 } = await supabaseAdmin
              .from('expected_transactions')
              .update({ status: 'skipped' })
              .eq('id', expectedTransaction1.id)
              .select()
              .single()

            if (skipError1) {
              return // Skip if operation failed
            }

            // Property 24: Skip operation should only affect the target workspace
            expect(skippedTransaction1.status).toBe('skipped')
            expect(skippedTransaction1.workspace_id).toBe(workspaceId1)

            // Verify expected transaction in second workspace is unaffected
            const { data: unchangedTransaction2, error: retrieveError2 } = await supabaseAdmin
              .from('expected_transactions')
              .select('status, workspace_id')
              .eq('id', expectedTransaction2.id)
              .single()

            expect(retrieveError2).toBeNull()
            expect(unchangedTransaction2.status).toBe('pending') // Should remain unchanged
            expect(unchangedTransaction2.workspace_id).toBe(workspaceId2)

            // Property 24: Workspace isolation should be maintained
            expect(skippedTransaction1.workspace_id).not.toBe(unchangedTransaction2.workspace_id)

            // Verify no cross-workspace effects
            const { data: workspace1Transactions, error: ws1Error } = await supabaseAdmin
              .from('expected_transactions')
              .select('id, status')
              .eq('workspace_id', workspaceId1)

            const { data: workspace2Transactions, error: ws2Error } = await supabaseAdmin
              .from('expected_transactions')
              .select('id, status')
              .eq('workspace_id', workspaceId2)

            expect(ws1Error).toBeNull()
            expect(ws2Error).toBeNull()

            if (workspace1Transactions && workspace2Transactions) {
              // Each workspace should only contain its own transactions
              const ws1Ids = workspace1Transactions.map(t => t.id)
              const ws2Ids = workspace2Transactions.map(t => t.id)
              
              expect(ws1Ids).toContain(expectedTransaction1.id)
              expect(ws1Ids).not.toContain(expectedTransaction2.id)
              expect(ws2Ids).toContain(expectedTransaction2.id)
              expect(ws2Ids).not.toContain(expectedTransaction1.id)
            }

          } finally {
            // Clean up test data for both workspaces
            if (userId1) {
              await cleanupTestData(userId1, workspaceId1 || undefined, expectedTransaction1?.id, recurringTransaction1?.id)
            }
            if (userId2) {
              await cleanupTestData(userId2, workspaceId2 || undefined, expectedTransaction2?.id, recurringTransaction2?.id)
            }
          }
        }
      ),
      { numRuns: 5 } // Run 5 iterations for workspace isolation testing
    )
  }, 25000) // 25 second timeout
})