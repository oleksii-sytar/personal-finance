/**
 * Property-Based Test: Adjustment Transaction Type Determination
 * Feature: checkpoint-reconciliation, Property 11: Adjustment Transaction Type Determination
 * Validates: Requirements 3.4, 3.5
 * 
 * Tests that adjustment transaction types are correctly determined based on gap amounts:
 * - Negative gaps (actual < expected) create "Other Expense" transactions
 * - Positive gaps (actual > expected) create "Other Income" transactions
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { AdjustmentTransactionCreator } from '@/lib/services/adjustment-transaction-creator'

describe('Property 11: Adjustment Transaction Type Determination', () => {
  it('should determine correct transaction type based on gap amount sign', () => {
    fc.assert(
      fc.property(
        // Generate gap amounts (excluding near-zero values)
        fc.float({ min: -10000, max: 10000, noNaN: true })
          .filter(amount => Math.abs(amount) >= 0.01),
        (gapAmount) => {
          const adjustmentType = AdjustmentTransactionCreator.determineAdjustmentType(gapAmount)
          
          if (gapAmount > 0) {
            // Property 1: Positive gaps should create income transactions
            // Requirements 3.5: actual > expected = "Other Income"
            expect(adjustmentType.type).toBe('income')
            expect(adjustmentType.categoryType).toBe('income')
            expect(adjustmentType.description).toBe('Reconciliation Adjustment - Other Income')
          } else {
            // Property 2: Negative gaps should create expense transactions
            // Requirements 3.4: actual < expected = "Other Expense"
            expect(adjustmentType.type).toBe('expense')
            expect(adjustmentType.categoryType).toBe('expense')
            expect(adjustmentType.description).toBe('Reconciliation Adjustment - Other Expense')
          }
          
          // Property 3: Type and category type should always match
          expect(adjustmentType.type).toBe(adjustmentType.categoryType)
          
          // Property 4: Description should always be a non-empty string
          expect(adjustmentType.description).toBeTruthy()
          expect(typeof adjustmentType.description).toBe('string')
          expect(adjustmentType.description.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle edge cases in gap amount consistently', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Edge cases: very small positive and negative amounts
          0.01,    // Smallest positive gap
          -0.01,   // Smallest negative gap
          0.001,   // Very small positive
          -0.001,  // Very small negative
          1000,    // Large positive gap
          -1000,   // Large negative gap
          0.1,     // Small positive
          -0.1     // Small negative
        ),
        (gapAmount) => {
          const adjustmentType = AdjustmentTransactionCreator.determineAdjustmentType(gapAmount)
          
          // Property 1: Sign should determine type consistently
          if (gapAmount > 0) {
            expect(adjustmentType.type).toBe('income')
            expect(adjustmentType.categoryType).toBe('income')
          } else {
            expect(adjustmentType.type).toBe('expense')
            expect(adjustmentType.categoryType).toBe('expense')
          }
          
          // Property 2: Result should always have valid structure
          expect(['income', 'expense']).toContain(adjustmentType.type)
          expect(['income', 'expense']).toContain(adjustmentType.categoryType)
          expect(adjustmentType.description).toBeTruthy()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should validate gap resolution state correctly', () => {
    fc.assert(
      fc.property(
        // Generate array of reconciliation gaps
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            gap_amount: fc.float({ min: -100, max: 100, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 50, noNaN: true }),
            severity: fc.constantFrom('low', 'medium', 'high'),
            resolution_method: fc.option(fc.constantFrom('manual_transaction', 'quick_close')),
            adjustment_transaction_id: fc.option(fc.uuid())
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (gaps) => {
          const validation = AdjustmentTransactionCreator.validateGapResolution(gaps)
          
          // Property 1: Resolution status should match gap amounts
          const hasUnresolvedGaps = gaps.some(gap => Math.abs(gap.gap_amount) >= 0.01)
          expect(validation.isResolved).toBe(!hasUnresolvedGaps)
          
          // Property 2: Remaining gaps should only include unresolved ones
          validation.remainingGaps.forEach(gap => {
            expect(Math.abs(gap.gap_amount)).toBeGreaterThanOrEqual(0.01)
          })
          
          // Property 3: Total remaining amount should be sum of remaining gap amounts
          const expectedTotal = validation.remainingGaps.reduce(
            (total, gap) => total + Math.abs(gap.gap_amount), 
            0
          )
          expect(validation.totalRemainingAmount).toBeCloseTo(expectedTotal, 5)
          
          // Property 4: Remaining gaps count should be consistent
          const expectedRemainingCount = gaps.filter(gap => Math.abs(gap.gap_amount) >= 0.01).length
          expect(validation.remainingGaps.length).toBe(expectedRemainingCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate correct gap resolution summary', () => {
    fc.assert(
      fc.property(
        // Generate original and resolved gap arrays
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            gap_amount: fc.float({ min: -100, max: 100, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 50, noNaN: true }),
            severity: fc.constantFrom('low', 'medium', 'high')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            gap_amount: fc.float({ min: -10, max: 10, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 10, noNaN: true }),
            severity: fc.constantFrom('low', 'medium', 'high'),
            resolution_method: fc.option(fc.constantFrom('manual_transaction', 'quick_close')),
            adjustment_transaction_id: fc.option(fc.uuid())
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (originalGaps, resolvedGaps) => {
          const summary = AdjustmentTransactionCreator.getGapResolutionSummary(
            originalGaps, 
            resolvedGaps
          )
          
          // Property 1: Total original gap should be sum of absolute values
          const expectedOriginalTotal = originalGaps.reduce(
            (total, gap) => total + Math.abs(gap.gap_amount), 
            0
          )
          expect(summary.totalOriginalGap).toBeCloseTo(expectedOriginalTotal, 5)
          
          // Property 2: Total resolved gap should be sum of absolute values
          const expectedResolvedTotal = resolvedGaps.reduce(
            (total, gap) => total + Math.abs(gap.gap_amount), 
            0
          )
          expect(summary.totalResolvedGap).toBeCloseTo(expectedResolvedTotal, 5)
          
          // Property 3: Resolution method counts should be non-negative
          expect(summary.resolutionMethods.quick_close).toBeGreaterThanOrEqual(0)
          expect(summary.resolutionMethods.manual_transaction).toBeGreaterThanOrEqual(0)
          expect(summary.resolutionMethods.unresolved).toBeGreaterThanOrEqual(0)
          
          // Property 4: Total resolution methods should equal resolved gaps count
          const totalMethods = summary.resolutionMethods.quick_close + 
                              summary.resolutionMethods.manual_transaction + 
                              summary.resolutionMethods.unresolved
          expect(totalMethods).toBe(resolvedGaps.length)
          
          // Property 5: Adjustment transactions should be valid UUIDs
          summary.adjustmentTransactions.forEach(transactionId => {
            expect(transactionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly determine period closure eligibility', () => {
    fc.assert(
      fc.property(
        // Generate array of gaps with varying amounts
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            gap_amount: fc.float({ min: -10, max: 10, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 20, noNaN: true }),
            severity: fc.constantFrom('low', 'medium', 'high')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (gaps) => {
          const isClosureEnabled = AdjustmentTransactionCreator.isPeriodClosureEnabled(gaps)
          
          // Property 1: Closure should only be enabled when all gaps are resolved
          const allGapsResolved = gaps.every(gap => Math.abs(gap.gap_amount) < 0.01)
          expect(isClosureEnabled).toBe(allGapsResolved)
          
          // Property 2: If any gap is significant, closure should be disabled
          const hasSignificantGap = gaps.some(gap => Math.abs(gap.gap_amount) >= 0.01)
          if (hasSignificantGap) {
            expect(isClosureEnabled).toBe(false)
          }
          
          // Property 3: If all gaps are near zero, closure should be enabled
          const allGapsNearZero = gaps.every(gap => Math.abs(gap.gap_amount) < 0.01)
          if (allGapsNearZero) {
            expect(isClosureEnabled).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle zero gap amounts appropriately', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 0.0, -0.0, 0.001, -0.001, 0.009, -0.009),
        (gapAmount) => {
          // For very small gaps, we might skip adjustment creation
          if (Math.abs(gapAmount) < 0.01) {
            // These should be considered resolved without adjustment
            const gaps = [{
              account_id: 'test-account',
              gap_amount: gapAmount,
              gap_percentage: 0,
              severity: 'low' as const
            }]
            
            const isClosureEnabled = AdjustmentTransactionCreator.isPeriodClosureEnabled(gaps)
            expect(isClosureEnabled).toBe(true)
          } else {
            // These should require adjustment
            const adjustmentType = AdjustmentTransactionCreator.determineAdjustmentType(gapAmount)
            expect(['income', 'expense']).toContain(adjustmentType.type)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})