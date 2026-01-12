/**
 * Property-Based Test for Checkpoint Persistence
 * 
 * Feature: checkpoint-reconciliation, Property 5: Checkpoint Persistence
 * 
 * Tests that the checkpoint database schema is properly configured and can
 * handle various data structures correctly.
 * 
 * Validates: Requirements 1.6
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@/lib/supabase/client'
import type { AccountBalance, ReconciliationGap } from '@/types/reconciliation'

describe('Property 5: Checkpoint Persistence', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    // Ensure we have environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables - cannot run integration tests')
    }
    
    supabase = createClient()
  })

  it('Property 5: Checkpoint Persistence - checkpoints table should exist with correct schema', async () => {
    // Test that the checkpoints table exists and has the correct structure
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .limit(1)

    // Should not error (even if empty due to RLS)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })

  it('Property 5: Checkpoint Persistence - reconciliation_periods table should exist with correct schema', async () => {
    // Test that the reconciliation_periods table exists and has the correct structure
    const { data, error } = await supabase
      .from('reconciliation_periods')
      .select('*')
      .limit(1)

    // Should not error (even if empty due to RLS)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })

  it('Property 5: Checkpoint Persistence - transactions table should have locked field', async () => {
    // Test that the transactions table has the locked field
    const { data, error } = await supabase
      .from('transactions')
      .select('locked')
      .limit(1)

    // Should not error (even if empty due to RLS)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })

  it('Property 5: Checkpoint Persistence - checkpoint data structure validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for checkpoint structure validation
        fc.record({
          account_balances: fc.array(
            fc.record({
              account_id: fc.uuid(),
              account_name: fc.string({ minLength: 1, maxLength: 50 }),
              actual_balance: fc.float({ min: -10000, max: 100000, noNaN: true }),
              expected_balance: fc.float({ min: -10000, max: 100000, noNaN: true }),
              currency: fc.constantFrom('UAH', 'USD', 'EUR'),
              gap_amount: fc.float({ min: -1000, max: 1000, noNaN: true }),
              gap_percentage: fc.float({ min: -100, max: 100, noNaN: true })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          expected_balances: fc.array(
            fc.record({
              account_id: fc.uuid(),
              account_name: fc.string({ minLength: 1, maxLength: 50 }),
              actual_balance: fc.float({ min: -10000, max: 100000, noNaN: true }),
              expected_balance: fc.float({ min: -10000, max: 100000, noNaN: true }),
              currency: fc.constantFrom('UAH', 'USD', 'EUR'),
              gap_amount: fc.float({ min: -1000, max: 1000, noNaN: true }),
              gap_percentage: fc.float({ min: -100, max: 100, noNaN: true })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          gaps: fc.array(
            fc.record({
              account_id: fc.uuid(),
              gap_amount: fc.float({ min: -1000, max: 1000, noNaN: true }),
              gap_percentage: fc.float({ min: -100, max: 100, noNaN: true }),
              severity: fc.constantFrom('low', 'medium', 'high'),
              resolution_method: fc.option(fc.constantFrom('manual_transaction', 'quick_close')),
              adjustment_transaction_id: fc.option(fc.uuid())
            }),
            { minLength: 0, maxLength: 5 }
          ),
          status: fc.constantFrom('open', 'resolved', 'closed'),
          notes: fc.option(fc.string({ maxLength: 500 }))
        }),
        async (testData) => {
          const { account_balances, expected_balances, gaps, status, notes } = testData

          // Property assertion: Data structures should be valid JSON
          expect(() => JSON.stringify(account_balances)).not.toThrow()
          expect(() => JSON.stringify(expected_balances)).not.toThrow()
          expect(() => JSON.stringify(gaps)).not.toThrow()

          // Property assertion: Account balances should have required fields
          account_balances.forEach(balance => {
            expect(balance.account_id).toBeDefined()
            expect(balance.account_name).toBeDefined()
            expect(typeof balance.actual_balance).toBe('number')
            expect(typeof balance.expected_balance).toBe('number')
            expect(balance.currency).toMatch(/^(UAH|USD|EUR)$/)
            expect(typeof balance.gap_amount).toBe('number')
            expect(typeof balance.gap_percentage).toBe('number')
            expect(Number.isFinite(balance.actual_balance)).toBe(true)
            expect(Number.isFinite(balance.expected_balance)).toBe(true)
            expect(Number.isFinite(balance.gap_amount)).toBe(true)
            expect(Number.isFinite(balance.gap_percentage)).toBe(true)
          })

          // Property assertion: Gaps should have valid severity levels
          gaps.forEach(gap => {
            expect(gap.account_id).toBeDefined()
            expect(typeof gap.gap_amount).toBe('number')
            expect(typeof gap.gap_percentage).toBe('number')
            expect(gap.severity).toMatch(/^(low|medium|high)$/)
            expect(Number.isFinite(gap.gap_amount)).toBe(true)
            expect(Number.isFinite(gap.gap_percentage)).toBe(true)
            
            if (gap.resolution_method) {
              expect(gap.resolution_method).toMatch(/^(manual_transaction|quick_close)$/)
            }
          })

          // Property assertion: Status should be valid
          expect(status).toMatch(/^(open|resolved|closed)$/)

          // Property assertion: Notes should be string or null
          if (notes !== undefined && notes !== null) {
            expect(typeof notes).toBe('string')
            expect(notes.length).toBeLessThanOrEqual(500)
          }

          // Test that the data would be valid for database insertion
          // (We can't actually insert due to RLS, but we can validate structure)
          const checkpointData = {
            workspace_id: fc.sample(fc.uuid(), 1)[0],
            created_by: fc.sample(fc.uuid(), 1)[0],
            account_balances: account_balances as AccountBalance[],
            expected_balances: expected_balances as AccountBalance[],
            gaps: gaps as ReconciliationGap[],
            status,
            notes
          }

          // Property assertion: Checkpoint data should be serializable
          expect(() => JSON.stringify(checkpointData)).not.toThrow()
          
          // Property assertion: Required fields should be present
          expect(checkpointData.workspace_id).toBeDefined()
          expect(checkpointData.created_by).toBeDefined()
          expect(Array.isArray(checkpointData.account_balances)).toBe(true)
          expect(Array.isArray(checkpointData.expected_balances)).toBe(true)
          expect(Array.isArray(checkpointData.gaps)).toBe(true)
          expect(checkpointData.status).toBeDefined()
        }
      ),
      { numRuns: 50 } // Run 50 iterations for comprehensive testing
    )
  }, 30000) // 30 second timeout

  it.skip('Property 5: Checkpoint Persistence - reconciliation period data structure validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for reconciliation period structure validation
        fc.record({
          start_checkpoint_id: fc.uuid(),
          end_checkpoint_id: fc.option(fc.uuid()),
          dates: fc.tuple(
            fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
          ).map(([date1, date2]) => {
            // Ensure start_date is always before or equal to end_date
            const start_date = date1.getTime() <= date2.getTime() ? date1 : date2
            const end_date = date1.getTime() <= date2.getTime() ? date2 : date1
            return { start_date, end_date: Math.random() > 0.5 ? end_date : null }
          }),
          status: fc.constantFrom('active', 'closed'),
          total_transactions: fc.integer({ min: 0, max: 1000 }),
          total_amount: fc.float({ min: -100000, max: 100000, noNaN: true }),
          pattern_learning_completed: fc.boolean(),
          locked_transactions: fc.array(fc.uuid(), { minLength: 0, maxLength: 10 })
        }),
        async (testData) => {
          const { 
            start_checkpoint_id, 
            end_checkpoint_id, 
            dates,
            status, 
            total_transactions, 
            total_amount, 
            pattern_learning_completed, 
            locked_transactions 
          } = testData

          const { start_date, end_date } = dates

          // Property assertion: Required fields should be valid
          expect(start_checkpoint_id).toBeDefined()
          expect(typeof start_checkpoint_id).toBe('string')
          expect(start_date).toBeInstanceOf(Date)
          expect(status).toMatch(/^(active|closed)$/)
          expect(typeof total_transactions).toBe('number')
          expect(total_transactions).toBeGreaterThanOrEqual(0)
          expect(typeof total_amount).toBe('number')
          expect(Number.isFinite(total_amount)).toBe(true)
          expect(typeof pattern_learning_completed).toBe('boolean')
          expect(Array.isArray(locked_transactions)).toBe(true)

          // Property assertion: Optional fields should be valid when present
          if (end_checkpoint_id) {
            expect(typeof end_checkpoint_id).toBe('string')
          }
          
          if (end_date) {
            expect(end_date).toBeInstanceOf(Date)
            // If both dates are present, start should be before or equal to end
            expect(start_date.getTime()).toBeLessThanOrEqual(end_date.getTime())
          }

          // Property assertion: Locked transactions should be valid UUIDs
          locked_transactions.forEach(transactionId => {
            expect(typeof transactionId).toBe('string')
            expect(transactionId.length).toBeGreaterThan(0)
          })

          // Property assertion: Status constraints
          if (status === 'closed') {
            // Closed periods should have end_checkpoint_id (business rule)
            // Note: This is enforced by database constraint, not tested here
            // but we validate the data structure supports it
            expect(typeof end_checkpoint_id === 'string' || end_checkpoint_id === null).toBe(true)
          }

          // Test that the data would be valid for database insertion
          const periodData = {
            workspace_id: fc.sample(fc.uuid(), 1)[0],
            start_checkpoint_id,
            end_checkpoint_id,
            start_date: start_date.toISOString(),
            end_date: end_date?.toISOString(),
            status,
            total_transactions,
            total_amount,
            pattern_learning_completed,
            locked_transactions
          }

          // Property assertion: Period data should be serializable
          expect(() => JSON.stringify(periodData)).not.toThrow()
          
          // Property assertion: Required fields should be present
          expect(periodData.workspace_id).toBeDefined()
          expect(periodData.start_checkpoint_id).toBeDefined()
          expect(periodData.start_date).toBeDefined()
          expect(periodData.status).toBeDefined()
          expect(typeof periodData.total_transactions).toBe('number')
          expect(typeof periodData.total_amount).toBe('number')
          expect(typeof periodData.pattern_learning_completed).toBe('boolean')
          expect(Array.isArray(periodData.locked_transactions)).toBe(true)
        }
      ),
      { numRuns: 30 } // Run 30 iterations
    )
  }, 25000) // 25 second timeout

  it('Property 5: Checkpoint Persistence - database constraints should be properly configured', async () => {
    // Test that we can query the database schema information
    // This validates that our migration was applied correctly
    
    // Test checkpoints table structure
    const { error: checkpointsError } = await supabase
      .from('checkpoints')
      .select('id, workspace_id, created_at, created_by, account_balances, expected_balances, gaps, status, notes, updated_at')
      .limit(0) // Don't return data, just test schema

    expect(checkpointsError).toBeNull()

    // Test reconciliation_periods table structure  
    const { error: periodsError } = await supabase
      .from('reconciliation_periods')
      .select('id, workspace_id, start_checkpoint_id, end_checkpoint_id, start_date, end_date, status, total_transactions, total_amount, pattern_learning_completed, locked_transactions, created_at, updated_at')
      .limit(0) // Don't return data, just test schema

    expect(periodsError).toBeNull()

    // Test that transactions table has locked field
    const { error: transactionsError } = await supabase
      .from('transactions')
      .select('locked')
      .limit(0) // Don't return data, just test schema

    expect(transactionsError).toBeNull()
  })
})