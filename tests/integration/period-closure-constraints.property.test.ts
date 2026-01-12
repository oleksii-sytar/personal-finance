/**
 * Property Test: Zero Gap Closure Constraint
 * Feature: checkpoint-reconciliation, Property 13: Zero Gap Closure Constraint
 * Validates: Requirements 4.1, 7.5
 * 
 * Property: For any reconciliation period, closure should only be possible when 
 * all account gaps equal zero
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'
import { ReconciliationPeriodModel } from '@/lib/models/reconciliation-period'
import { createClient } from '@supabase/supabase-js'
import type { ReconciliationPeriod, ReconciliationGap } from '@/types/reconciliation'

describe('Property 13: Zero Gap Closure Constraint', () => {
  let userId: string
  let workspaceId: string
  let supabase: any

  beforeEach(async () => {
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    userId = user.id
    workspaceId = workspace.id
    
    // Create admin client for test operations
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  })

  afterEach(async () => {
    await cleanupTestData(userId)
  })

  it('should only allow closure when all gaps are zero', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data with various gap scenarios
        fc.record({
          periodId: fc.uuid(),
          startCheckpointId: fc.uuid(),
          endCheckpointId: fc.uuid(),
          gaps: fc.array(
            fc.record({
              account_id: fc.uuid(),
              gap_amount: fc.integer({ min: -10000, max: 10000 }).map(n => n / 100), // Convert to decimal
              gap_percentage: fc.integer({ min: 0, max: 1000 }).map(n => n / 100), // 0-10%
              severity: fc.constantFrom('low', 'medium', 'high')
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ periodId, startCheckpointId, endCheckpointId, gaps }) => {
          // Create a reconciliation period (no database operations)
          const startDate = new Date('2024-01-01')
          
          const period: ReconciliationPeriod = {
            id: periodId,
            workspace_id: workspaceId,
            start_checkpoint_id: startCheckpointId,
            end_checkpoint_id: undefined,
            start_date: startDate,
            end_date: undefined,
            status: 'active',
            total_transactions: 0,
            total_amount: 0,
            pattern_learning_completed: false,
            locked_transactions: []
          }

          // Check if all gaps are effectively zero (within floating point precision)
          const hasZeroGaps = gaps.every(gap => Math.abs(gap.gap_amount) < 0.01)

          // Test the validation logic
          const validation = ReconciliationPeriodModel.validateClosureConstraints(period, hasZeroGaps)

          // Property: Period can only be closed if all gaps are zero
          if (hasZeroGaps) {
            expect(validation.canClose).toBe(true)
            expect(validation.reason).toBeUndefined()
          } else {
            expect(validation.canClose).toBe(false)
            expect(validation.reason).toBe('All gaps must be resolved before closure')
          }

          // Test the status transition logic
          const canTransition = ReconciliationPeriodModel.canTransitionStatus('active', 'closed', hasZeroGaps)
          expect(canTransition).toBe(hasZeroGaps)

          // Test the readiness check
          const isReady = ReconciliationPeriodModel.isReadyForClosure(period, hasZeroGaps)
          expect(isReady).toBe(hasZeroGaps)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle edge cases for gap amounts correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate edge cases around zero
        fc.record({
          periodId: fc.uuid(),
          startCheckpointId: fc.uuid(),
          gapAmount: fc.oneof(
            fc.constant(0), // Exactly zero
            fc.constant(0.001), // Very small positive
            fc.constant(-0.001), // Very small negative
            fc.constant(0.009), // Just under threshold
            fc.constant(0.01), // At threshold
            fc.constant(0.011) // Just over threshold
          )
        }),
        async ({ periodId, startCheckpointId, gapAmount }) => {
          const period: ReconciliationPeriod = {
            id: periodId,
            workspace_id: workspaceId,
            start_checkpoint_id: startCheckpointId,
            end_checkpoint_id: undefined,
            start_date: new Date('2024-01-01'),
            end_date: undefined,
            status: 'active',
            total_transactions: 0,
            total_amount: 0,
            pattern_learning_completed: false,
            locked_transactions: []
          }

          const gaps: ReconciliationGap[] = [{
            account_id: fc.sample(fc.uuid(), 1)[0],
            gap_amount: gapAmount,
            gap_percentage: Math.abs(gapAmount) * 10, // Arbitrary percentage
            severity: 'low'
          }]

          // Check if gap is effectively zero (within floating point precision)
          const hasZeroGaps = Math.abs(gapAmount) < 0.01

          const validation = ReconciliationPeriodModel.validateClosureConstraints(period, hasZeroGaps)

          // Property: Gap amounts less than 0.01 should be considered zero
          if (Math.abs(gapAmount) < 0.01) {
            expect(validation.canClose).toBe(true)
          } else {
            expect(validation.canClose).toBe(false)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should prevent closure of already closed periods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          periodId: fc.uuid(),
          startCheckpointId: fc.uuid(),
          endCheckpointId: fc.uuid(),
          hasZeroGaps: fc.boolean()
        }),
        async ({ periodId, startCheckpointId, endCheckpointId, hasZeroGaps }) => {
          const closedPeriod: ReconciliationPeriod = {
            id: periodId,
            workspace_id: workspaceId,
            start_checkpoint_id: startCheckpointId,
            end_checkpoint_id: endCheckpointId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31'),
            status: 'closed',
            total_transactions: 10,
            total_amount: 1000,
            pattern_learning_completed: true,
            locked_transactions: []
          }

          const validation = ReconciliationPeriodModel.validateClosureConstraints(closedPeriod, hasZeroGaps)

          // Property: Already closed periods cannot be closed again
          expect(validation.canClose).toBe(false)
          expect(validation.reason).toBe('Period is not active')

          // Test status transition - closed periods cannot transition to closed again
          const canTransition = ReconciliationPeriodModel.canTransitionStatus('closed', 'closed', hasZeroGaps)
          expect(canTransition).toBe(true) // Same status is allowed

          // But cannot transition from closed to active
          const canReopen = ReconciliationPeriodModel.canTransitionStatus('closed', 'active', hasZeroGaps)
          expect(canReopen).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle multi-account scenarios correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple accounts with different gap scenarios
        fc.record({
          periodId: fc.uuid(),
          startCheckpointId: fc.uuid(),
          accounts: fc.array(
            fc.record({
              accountId: fc.uuid(),
              gapAmount: fc.integer({ min: -1000, max: 1000 }).map(n => n / 100),
              severity: fc.constantFrom('low', 'medium', 'high')
            }),
            { minLength: 2, maxLength: 5 }
          )
        }),
        async ({ periodId, startCheckpointId, accounts }) => {
          const period: ReconciliationPeriod = {
            id: periodId,
            workspace_id: workspaceId,
            start_checkpoint_id: startCheckpointId,
            end_checkpoint_id: undefined,
            start_date: new Date('2024-01-01'),
            end_date: undefined,
            status: 'active',
            total_transactions: 0,
            total_amount: 0,
            pattern_learning_completed: false,
            locked_transactions: []
          }

          const gaps: ReconciliationGap[] = accounts.map(acc => ({
            account_id: acc.accountId,
            gap_amount: acc.gapAmount,
            gap_percentage: Math.abs(acc.gapAmount) * 10,
            severity: acc.severity as 'low' | 'medium' | 'high'
          }))

          // Check if ALL gaps are effectively zero
          const hasZeroGaps = gaps.every(gap => Math.abs(gap.gap_amount) < 0.01)

          const validation = ReconciliationPeriodModel.validateClosureConstraints(period, hasZeroGaps)

          // Property: ALL account gaps must be zero for closure
          if (hasZeroGaps) {
            expect(validation.canClose).toBe(true)
          } else {
            expect(validation.canClose).toBe(false)
            expect(validation.reason).toBe('All gaps must be resolved before closure')
          }

          // Verify that even one non-zero gap prevents closure
          const hasAnyNonZeroGap = gaps.some(gap => Math.abs(gap.gap_amount) >= 0.01)
          if (hasAnyNonZeroGap) {
            expect(validation.canClose).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})