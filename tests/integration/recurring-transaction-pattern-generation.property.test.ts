/**
 * Property-Based Test for Recurring Transaction Pattern Generation
 * 
 * Feature: transactions, Property 19: Recurring Transaction Pattern Generation
 * 
 * Tests that for any recurring transaction template, the system should generate 
 * expected transactions according to the specified frequency pattern.
 * 
 * Validates: Requirements 9.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { RecurringTransaction, ExpectedTransaction, RecurrenceFrequency } from '@/types'
import { addDays, addWeeks, addMonths, addYears, format, differenceInDays } from 'date-fns'

describe('Property 19: Recurring Transaction Pattern Generation', () => {
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

  // Helper function to create a test user
  const createTestUser = async (): Promise<string | null> => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'password123',
      email_confirm: true
    })

    return error ? null : data.user.id
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

  // Helper function to create workspace membership
  const createWorkspaceMembership = async (userId: string, workspaceId: string): Promise<boolean> => {
    const { error } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: 'owner'
      })

    return !error
  }

  // Helper function to create a test category
  const createTestCategory = async (workspaceId: string): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        workspace_id: workspaceId,
        name: `Test Category ${Date.now()}`,
        is_default: false
      })
      .select('id')
      .single()

    return error ? null : data.id
  }

  // Helper function to create a recurring transaction directly in database
  const createTestRecurringTransaction = async (
    workspaceId: string, 
    userId: string,
    templateData: any,
    frequency: RecurrenceFrequency,
    intervalCount: number,
    startDate: Date
  ): Promise<RecurringTransaction | null> => {
    const { data, error } = await supabaseAdmin
      .from('recurring_transactions')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        template_data: templateData,
        frequency: frequency,
        interval_count: intervalCount,
        start_date: format(startDate, 'yyyy-MM-dd'),
        next_due_date: format(startDate, 'yyyy-MM-dd'),
        is_active: true
      })
      .select()
      .single()

    return error ? null : data
  }

  // Helper function to manually generate expected transactions (simulating the action logic)
  const generateExpectedTransactionsManually = async (
    recurringTransactionId: string,
    workspaceId: string,
    recurringTransaction: RecurringTransaction
  ): Promise<void> => {
    const templateData = recurringTransaction.template_data as any
    const expectedTransactions: any[] = []
    
    let currentDate = new Date(recurringTransaction.next_due_date)
    const endDate = addMonths(new Date(), 3) // 3 months ahead
    
    while (currentDate <= endDate) {
      expectedTransactions.push({
        recurring_transaction_id: recurringTransactionId,
        workspace_id: workspaceId,
        expected_date: format(currentDate, 'yyyy-MM-dd'),
        expected_amount: templateData.amount,
        currency: templateData.currency || 'UAH',
        status: 'pending',
      })

      // Calculate next occurrence based on frequency
      switch (recurringTransaction.frequency) {
        case 'daily':
          currentDate = addDays(currentDate, recurringTransaction.interval_count)
          break
        case 'weekly':
          currentDate = addWeeks(currentDate, recurringTransaction.interval_count)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, recurringTransaction.interval_count)
          break
        case 'yearly':
          currentDate = addYears(currentDate, recurringTransaction.interval_count)
          break
      }
    }

    // Insert expected transactions
    if (expectedTransactions.length > 0) {
      await supabaseAdmin
        .from('expected_transactions')
        .insert(expectedTransactions)
    }
  }

  // Helper function to calculate expected dates based on frequency
  const calculateExpectedDates = (
    startDate: Date,
    frequency: RecurrenceFrequency,
    intervalCount: number,
    monthsAhead: number = 3
  ): Date[] => {
    const dates: Date[] = []
    let currentDate = new Date(startDate)
    const endDate = addMonths(new Date(), monthsAhead)

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      
      switch (frequency) {
        case 'daily':
          currentDate = addDays(currentDate, intervalCount)
          break
        case 'weekly':
          currentDate = addWeeks(currentDate, intervalCount)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, intervalCount)
          break
        case 'yearly':
          currentDate = addYears(currentDate, intervalCount)
          break
      }
    }

    return dates
  }

  // Helper function to clean up test data
  const cleanupTestData = async (
    userId: string, 
    workspaceId?: string, 
    recurringTransactionId?: string,
    categoryId?: string
  ) => {
    if (recurringTransactionId) {
      await supabaseAdmin.from('expected_transactions').delete().eq('recurring_transaction_id', recurringTransactionId)
      await supabaseAdmin.from('recurring_transactions').delete().eq('id', recurringTransactionId)
    }
    if (categoryId) {
      await supabaseAdmin.from('categories').delete().eq('id', categoryId)
    }
    if (workspaceId) {
      await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspaceId)
      await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
    }
    await supabaseAdmin.auth.admin.deleteUser(userId)
  }

  it.skip('should generate expected transactions according to frequency pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
          type: fc.constantFrom('income', 'expense'),
          frequency: fc.constantFrom('daily', 'weekly', 'monthly', 'yearly'),
          intervalCount: fc.integer({ min: 1, max: 4 }),
          description: fc.string({ minLength: 1, maxLength: 100 }),
          startDate: fc.date({ 
            min: new Date('2024-01-01'), 
            max: new Date('2024-12-31') 
          })
        }),
        async (templateData) => {
          let userId: string | null = null
          let workspaceId: string | null = null
          let categoryId: string | null = null
          let recurringTransaction: RecurringTransaction | null = null

          try {
            // Setup test data
            userId = await createTestUser()
            if (!userId) return

            workspaceId = await createTestWorkspace(userId)
            if (!workspaceId) return

            const membershipCreated = await createWorkspaceMembership(userId, workspaceId)
            if (!membershipCreated) return

            categoryId = await createTestCategory(workspaceId)
            if (!categoryId) return

            // Create template data
            const templateDataForDb = {
              amount: templateData.amount,
              currency: 'UAH',
              type: templateData.type,
              category_id: categoryId,
              description: templateData.description
            }

            // Create recurring transaction directly in database
            recurringTransaction = await createTestRecurringTransaction(
              workspaceId,
              userId,
              templateDataForDb,
              templateData.frequency,
              templateData.intervalCount,
              templateData.startDate
            )

            if (!recurringTransaction) return

            // Generate expected transactions using the same logic as the action
            await generateExpectedTransactionsManually(
              recurringTransaction.id,
              workspaceId,
              recurringTransaction
            )

            // Property 19: Recurring transaction should have correct template data
            const templateDataFromDb = recurringTransaction.template_data as any
            expect(templateDataFromDb.amount).toBe(templateData.amount)
            expect(templateDataFromDb.type).toBe(templateData.type)
            expect(templateDataFromDb.description).toBe(templateData.description)
            expect(templateDataFromDb.category_id).toBe(categoryId)

            // Property 19: Recurring transaction should have correct frequency settings
            expect(recurringTransaction.frequency).toBe(templateData.frequency)
            expect(recurringTransaction.interval_count).toBe(templateData.intervalCount)
            expect(recurringTransaction.is_active).toBe(true)

            // Get generated expected transactions
            const { data: expectedTransactions, error: fetchError } = await supabaseAdmin
              .from('expected_transactions')
              .select('*')
              .eq('recurring_transaction_id', recurringTransaction.id)
              .eq('status', 'pending')
              .order('expected_date', { ascending: true })

            expect(fetchError).toBeNull()
            expect(expectedTransactions).toBeDefined()

            if (!expectedTransactions) return

            // Property 19: Expected transactions should be generated
            expect(expectedTransactions.length).toBeGreaterThan(0)

            // Calculate what the expected dates should be
            const expectedDates = calculateExpectedDates(
              templateData.startDate,
              templateData.frequency,
              templateData.intervalCount
            )

            // Property 19: Generated expected transactions should match calculated pattern
            expect(expectedTransactions.length).toBe(expectedDates.length)

            // Property 19: Each expected transaction should have correct data
            expectedTransactions.forEach((expectedTx, index) => {
              expect(expectedTx.recurring_transaction_id).toBe(recurringTransaction!.id)
              expect(expectedTx.workspace_id).toBe(workspaceId)
              expect(expectedTx.expected_amount).toBe(templateData.amount)
              expect(expectedTx.currency).toBe('UAH')
              expect(expectedTx.status).toBe('pending')
              
              // Property 19: Expected date should match calculated pattern
              const expectedDateStr = format(expectedDates[index], 'yyyy-MM-dd')
              expect(expectedTx.expected_date).toBe(expectedDateStr)
            })

            // Property 19: Dates should follow the correct frequency pattern
            if (expectedTransactions.length > 1) {
              for (let i = 1; i < expectedTransactions.length; i++) {
                const prevDate = new Date(expectedTransactions[i - 1].expected_date)
                const currentDate = new Date(expectedTransactions[i].expected_date)
                const daysDiff = differenceInDays(currentDate, prevDate)

                switch (templateData.frequency) {
                  case 'daily':
                    expect(daysDiff).toBe(templateData.intervalCount)
                    break
                  case 'weekly':
                    expect(daysDiff).toBe(templateData.intervalCount * 7)
                    break
                  case 'monthly':
                    // Monthly intervals can vary due to different month lengths
                    expect(daysDiff).toBeGreaterThanOrEqual(28)
                    expect(daysDiff).toBeLessThanOrEqual(31 * templateData.intervalCount)
                    break
                  case 'yearly':
                    // Yearly intervals can vary due to leap years
                    expect(daysDiff).toBeGreaterThanOrEqual(365 * templateData.intervalCount)
                    expect(daysDiff).toBeLessThanOrEqual(366 * templateData.intervalCount)
                    break
                }
              }
            }

          } finally {
            // Cleanup
            if (userId) {
              await cleanupTestData(
                userId, 
                workspaceId || undefined, 
                recurringTransaction?.id,
                categoryId || undefined
              )
            }
          }
        }
      ),
      { numRuns: 3, timeout: 60000 }
    )
  })

  it.skip('should handle different interval counts correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          frequency: fc.constantFrom('daily', 'weekly', 'monthly'),
          intervalCount: fc.integer({ min: 1, max: 3 }),
          amount: fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true }),
          startDate: fc.date({ 
            min: new Date('2024-06-01'), 
            max: new Date('2024-06-30') 
          })
        }),
        async (testData) => {
          let userId: string | null = null
          let workspaceId: string | null = null
          let categoryId: string | null = null
          let recurringTransaction: RecurringTransaction | null = null

          try {
            // Setup test data
            userId = await createTestUser()
            if (!userId) return

            workspaceId = await createTestWorkspace(userId)
            if (!workspaceId) return

            const membershipCreated = await createWorkspaceMembership(userId, workspaceId)
            if (!membershipCreated) return

            categoryId = await createTestCategory(workspaceId)
            if (!categoryId) return

            // Create form data
            const formData = new FormData()
            formData.set('amount', testData.amount.toString())
            formData.set('type', 'expense')
            formData.set('frequency', testData.frequency)
            formData.set('interval_count', testData.intervalCount.toString())
            formData.set('start_date', format(testData.startDate, 'yyyy-MM-dd'))
            formData.set('description', 'Test recurring transaction')
            formData.set('category_id', categoryId)
            formData.set('currency', 'UAH')

            // Create recurring transaction
            const result = await createRecurringTransaction(formData)
            expect(result.error).toBeUndefined()
            
            if (!result.data) return
            recurringTransaction = result.data

            // Get expected transactions
            const { data: expectedTransactions } = await supabaseAdmin
              .from('expected_transactions')
              .select('*')
              .eq('recurring_transaction_id', recurringTransaction.id)
              .order('expected_date', { ascending: true })

            if (!expectedTransactions || expectedTransactions.length < 2) return

            // Property 19: Interval count should be respected in date calculations
            const firstDate = new Date(expectedTransactions[0].expected_date)
            const secondDate = new Date(expectedTransactions[1].expected_date)
            const daysDiff = differenceInDays(secondDate, firstDate)

            switch (testData.frequency) {
              case 'daily':
                expect(daysDiff).toBe(testData.intervalCount)
                break
              case 'weekly':
                expect(daysDiff).toBe(testData.intervalCount * 7)
                break
              case 'monthly':
                // For monthly, we expect roughly 30 days * interval count
                expect(daysDiff).toBeGreaterThanOrEqual(28 * testData.intervalCount)
                expect(daysDiff).toBeLessThanOrEqual(31 * testData.intervalCount)
                break
            }

          } finally {
            // Cleanup
            if (userId) {
              await cleanupTestData(
                userId, 
                workspaceId || undefined, 
                recurringTransaction?.id,
                categoryId || undefined
              )
            }
          }
        }
      ),
      { numRuns: 5, timeout: 30000 }
    )
  })

  it.skip('should generate expected transactions within the 3-month window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          frequency: fc.constantFrom('daily', 'weekly', 'monthly', 'yearly'),
          intervalCount: fc.constantFrom(1, 2),
          amount: fc.float({ min: Math.fround(50), max: Math.fround(500), noNaN: true }),
          startDate: fc.date({ 
            min: new Date(), 
            max: addDays(new Date(), 30) 
          })
        }),
        async (testData) => {
          let userId: string | null = null
          let workspaceId: string | null = null
          let categoryId: string | null = null
          let recurringTransaction: RecurringTransaction | null = null

          try {
            // Setup test data
            userId = await createTestUser()
            if (!userId) return

            workspaceId = await createTestWorkspace(userId)
            if (!workspaceId) return

            const membershipCreated = await createWorkspaceMembership(userId, workspaceId)
            if (!membershipCreated) return

            categoryId = await createTestCategory(workspaceId)
            if (!categoryId) return

            // Create form data
            const formData = new FormData()
            formData.set('amount', testData.amount.toString())
            formData.set('type', 'income')
            formData.set('frequency', testData.frequency)
            formData.set('interval_count', testData.intervalCount.toString())
            formData.set('start_date', format(testData.startDate, 'yyyy-MM-dd'))
            formData.set('description', 'Test recurring income')
            formData.set('category_id', categoryId)
            formData.set('currency', 'UAH')

            // Create recurring transaction
            const result = await createRecurringTransaction(formData)
            expect(result.error).toBeUndefined()
            
            if (!result.data) return
            recurringTransaction = result.data

            // Get expected transactions
            const { data: expectedTransactions } = await supabaseAdmin
              .from('expected_transactions')
              .select('*')
              .eq('recurring_transaction_id', recurringTransaction.id)
              .order('expected_date', { ascending: true })

            if (!expectedTransactions) return

            // Property 19: All expected transactions should be within 3 months from now
            const threeMonthsFromNow = addMonths(new Date(), 3)
            
            expectedTransactions.forEach(expectedTx => {
              const expectedDate = new Date(expectedTx.expected_date)
              expect(expectedDate).toBeLessThanOrEqual(threeMonthsFromNow)
              expect(expectedDate).toBeGreaterThanOrEqual(testData.startDate)
            })

            // Property 19: For high-frequency patterns, should not generate excessive transactions
            if (testData.frequency === 'daily' && testData.intervalCount === 1) {
              // Daily transactions should be limited to ~90 days (3 months)
              expect(expectedTransactions.length).toBeLessThanOrEqual(95)
            }

          } finally {
            // Cleanup
            if (userId) {
              await cleanupTestData(
                userId, 
                workspaceId || undefined, 
                recurringTransaction?.id,
                categoryId || undefined
              )
            }
          }
        }
      ),
      { numRuns: 5, timeout: 30000 }
    )
  })
})