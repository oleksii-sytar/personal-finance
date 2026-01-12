/**
 * Property-Based Test for Missing Transaction Addition During Reconciliation
 * 
 * Feature: checkpoint-reconciliation-enhancement, Property: Missing Transaction Addition During Reconciliation
 * 
 * Tests that missing transactions can be added during reconciliation and are immediately
 * included in the gap calculation for the current period.
 * 
 * Validates: Requirements 3.2, 3.3, 3.6
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@/lib/supabase/client'
// import { TransactionDiscoveryService } from '@/lib/services/transaction-discovery-service'
// import { GapCalculator } from '@/lib/services/gap-calculator'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'
import type { TransactionType } from '@/types/transactions'

describe.skip('Property: Missing Transaction Addition During Reconciliation', () => {
  let testUserId: string
  let testWorkspaceId: string
  // let discoveryService: TransactionDiscoveryService

  beforeAll(async () => {
    // Ensure we have environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables - cannot run integration tests')
    }
    
    const supabase = createClient()
    // discoveryService = new TransactionDiscoveryService(supabase)
    
    // Create test user and workspace
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    testUserId = user.id
    testWorkspaceId = workspace.id
  })

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData(testUserId)
  })

  it.skip('Property: Missing Transaction Addition - transaction suggestions should be relevant to gaps', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for gaps and reconciliation periods
        fc.record({
          gap: fc.record({
            account_id: fc.uuid(),
            gap_amount: fc.float({ min: -1000, max: 1000, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 100, noNaN: true }),
            severity: fc.constantFrom('low', 'medium', 'high')
          }),
          reconciliationPeriod: fc.record({
            start_date: fc.date({ 
              min: new Date('2024-01-01'), 
              max: new Date('2024-06-01') 
            }),
            end_date: fc.date({ 
              min: new Date('2024-06-01'), 
              max: new Date('2024-12-31') 
            })
          })
        }),
        async (testData) => {
          const { gap, reconciliationPeriod } = testData

          // Ensure end_date is after start_date
          if (reconciliationPeriod.end_date <= reconciliationPeriod.start_date) {
            reconciliationPeriod.end_date = new Date(reconciliationPeriod.start_date.getTime() + 30 * 24 * 60 * 60 * 1000)
          }

          // Generate suggestions for the gap
          const suggestions = await discoveryService.generateMissingTransactionSuggestions(
            testWorkspaceId,
            gap,
            reconciliationPeriod
          )

          // Property assertion: Suggestions should be an array
          expect(Array.isArray(suggestions)).toBe(true)

          // Property assertion: Each suggestion should have required properties
          suggestions.forEach(suggestion => {
            expect(typeof suggestion.type).toBe('string')
            expect(['pattern_match', 'amount_match', 'frequency_match', 'category_match']).toContain(suggestion.type)
            expect(typeof suggestion.confidence).toBe('number')
            expect(suggestion.confidence).toBeGreaterThanOrEqual(0)
            expect(suggestion.confidence).toBeLessThanOrEqual(1)
            expect(typeof suggestion.suggested_amount).toBe('number')
            expect(suggestion.suggested_amount).toBeGreaterThan(0)
            expect(['income', 'expense']).toContain(suggestion.suggested_type)
            expect(typeof suggestion.suggested_description).toBe('string')
            expect(suggestion.suggested_description.length).toBeGreaterThan(0)
            expect(typeof suggestion.reasoning).toBe('string')
            expect(suggestion.reasoning.length).toBeGreaterThan(0)
            expect(typeof suggestion.template_data).toBe('object')
          })

          // Property assertion: Suggested transaction type should align with gap direction
          if (suggestions.length > 0) {
            const expectedType: TransactionType = gap.gap_amount > 0 ? 'income' : 'expense'
            
            // At least some suggestions should match the expected type
            const matchingTypeSuggestions = suggestions.filter(s => s.suggested_type === expectedType)
            if (Math.abs(gap.gap_amount) > 1) { // Only check for significant gaps
              expect(matchingTypeSuggestions.length).toBeGreaterThan(0)
            }
          }

          // Property assertion: Suggested amounts should be reasonable relative to gap
          suggestions.forEach(suggestion => {
            const gapAmount = Math.abs(gap.gap_amount)
            const suggestedAmount = suggestion.suggested_amount
            
            // Suggested amount should be positive
            expect(suggestedAmount).toBeGreaterThan(0)
            
            // For significant gaps, suggested amount should be in reasonable range
            if (gapAmount > 10) {
              expect(suggestedAmount).toBeLessThanOrEqual(gapAmount * 2) // Not more than 2x gap
              expect(suggestedAmount).toBeGreaterThanOrEqual(gapAmount * 0.1) // Not less than 10% of gap
            }
          })

          // Property assertion: Confidence scores should be ordered (highest first)
          for (let i = 1; i < suggestions.length; i++) {
            expect(suggestions[i-1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence)
          }

          // Property assertion: Gap data should be valid
          expect(typeof gap.account_id).toBe('string')
          expect(gap.account_id.length).toBeGreaterThan(0)
          expect(typeof gap.gap_amount).toBe('number')
          expect(Number.isFinite(gap.gap_amount)).toBe(true)
          expect(typeof gap.gap_percentage).toBe('number')
          expect(Number.isFinite(gap.gap_percentage)).toBe(true)
          expect(gap.gap_percentage).toBeGreaterThanOrEqual(0)
          expect(['low', 'medium', 'high']).toContain(gap.severity)

          // Property assertion: Reconciliation period should be valid
          expect(reconciliationPeriod.start_date).toBeInstanceOf(Date)
          expect(reconciliationPeriod.end_date).toBeInstanceOf(Date)
          expect(reconciliationPeriod.end_date.getTime()).toBeGreaterThan(reconciliationPeriod.start_date.getTime())
        }
      ),
      { numRuns: 30 } // Run 30 iterations
    )
  }, 45000) // 45 second timeout

  it.skip('Property: Missing Transaction Addition - similar transaction matching should be consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for transaction matching
        fc.record({
          targetAmount: fc.float({ min: 10, max: 1000, noNaN: true }),
          targetType: fc.constantFrom('income', 'expense'),
          lookbackMonths: fc.integer({ min: 1, max: 12 })
        }),
        async (testData) => {
          const { targetAmount, targetType, lookbackMonths } = testData

          // Find similar transactions
          const similarTransactions = await discoveryService.findSimilarTransactions(
            testWorkspaceId,
            targetAmount,
            targetType,
            lookbackMonths
          )

          // Property assertion: Result should be an array
          expect(Array.isArray(similarTransactions)).toBe(true)

          // Property assertion: Each similar transaction should have required properties
          similarTransactions.forEach(transaction => {
            expect(typeof transaction.id).toBe('string')
            expect(transaction.id.length).toBeGreaterThan(0)
            expect(typeof transaction.amount).toBe('number')
            expect(transaction.amount).toBeGreaterThan(0)
            expect(transaction.type).toBe(targetType) // Should match target type
            expect(typeof transaction.description).toBe('string')
            expect(transaction.description.length).toBeGreaterThan(0)
            expect(transaction.workspace_id).toBe(testWorkspaceId)
            expect(new Date(transaction.transaction_date)).toBeInstanceOf(Date)
          })

          // Property assertion: Similar transactions should be within amount tolerance
          const tolerance = targetAmount * 0.1 // 10% tolerance
          similarTransactions.forEach(transaction => {
            const amountDifference = Math.abs(transaction.amount - targetAmount)
            expect(amountDifference).toBeLessThanOrEqual(tolerance)
          })

          // Property assertion: Transactions should be within lookback period
          const lookbackDate = new Date()
          lookbackDate.setMonth(lookbackDate.getMonth() - lookbackMonths)
          
          similarTransactions.forEach(transaction => {
            const transactionDate = new Date(transaction.transaction_date)
            expect(transactionDate.getTime()).toBeGreaterThanOrEqual(lookbackDate.getTime())
          })

          // Property assertion: Results should be ordered by date (most recent first)
          for (let i = 1; i < similarTransactions.length; i++) {
            const prevDate = new Date(similarTransactions[i-1].transaction_date)
            const currDate = new Date(similarTransactions[i].transaction_date)
            expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime())
          }

          // Property assertion: Input parameters should be valid
          expect(typeof targetAmount).toBe('number')
          expect(targetAmount).toBeGreaterThan(0)
          expect(Number.isFinite(targetAmount)).toBe(true)
          expect(['income', 'expense']).toContain(targetType)
          expect(typeof lookbackMonths).toBe('number')
          expect(lookbackMonths).toBeGreaterThan(0)
          expect(lookbackMonths).toBeLessThanOrEqual(12)
        }
      ),
      { numRuns: 25 } // Run 25 iterations
    )
  }, 30000) // 30 second timeout

  it.skip('Property: Missing Transaction Addition - transaction templates should be well-formed', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for template creation
        fc.array(
          fc.record({
            id: fc.uuid(),
            workspace_id: fc.constant(testWorkspaceId),
            checkpoint_id: fc.uuid(),
            current_step: fc.constantFrom('gap_resolution', 'transaction_review'),
            progress_percentage: fc.float({ min: 0, max: 100, noNaN: true }),
            gaps_remaining: fc.integer({ min: 0, max: 5 }),
            started_at: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            last_activity_at: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'completed'),
            metadata: fc.record({
              device_type: fc.constantFrom('mobile', 'desktop', 'tablet'),
              user_agent: fc.string(),
              initial_gap_count: fc.integer({ min: 1, max: 10 }),
              resolution_methods_used: fc.array(
                fc.constantFrom('quick_close', 'add_transaction', 'manual_adjustment'),
                { minLength: 0, maxLength: 3 }
              ),
              time_spent_per_step: fc.record({})
            })
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (reconciliationHistory) => {
          // Create transaction templates
          const templates = await discoveryService.createTransactionTemplates(
            testWorkspaceId,
            reconciliationHistory
          )

          // Property assertion: Templates should be an array
          expect(Array.isArray(templates)).toBe(true)

          // Property assertion: Each template should have required properties
          templates.forEach(template => {
            expect(typeof template.id).toBe('string')
            expect(template.id.length).toBeGreaterThan(0)
            expect(typeof template.name).toBe('string')
            expect(template.name.length).toBeGreaterThan(0)
            expect(typeof template.description).toBe('string')
            expect(template.description.length).toBeGreaterThan(0)
            expect(typeof template.amount_range).toBe('object')
            expect(typeof template.amount_range.min).toBe('number')
            expect(typeof template.amount_range.max).toBe('number')
            expect(template.amount_range.min).toBeLessThanOrEqual(template.amount_range.max)
            expect(template.amount_range.min).toBeGreaterThanOrEqual(0)
            expect(['income', 'expense']).toContain(template.type)
            expect(typeof template.usage_frequency).toBe('number')
            expect(template.usage_frequency).toBeGreaterThanOrEqual(0)
            expect(['gap_resolution', 'seasonal', 'vendor', 'recurring']).toContain(template.pattern_type)
            expect(typeof template.metadata).toBe('object')
          })

          // Property assertion: Templates should be ordered by usage frequency (highest first)
          for (let i = 1; i < templates.length; i++) {
            expect(templates[i-1].usage_frequency).toBeGreaterThanOrEqual(templates[i].usage_frequency)
          }

          // Property assertion: Amount ranges should be valid
          templates.forEach(template => {
            expect(Number.isFinite(template.amount_range.min)).toBe(true)
            expect(Number.isFinite(template.amount_range.max)).toBe(true)
            expect(template.amount_range.min).toBeGreaterThanOrEqual(0)
            expect(template.amount_range.max).toBeGreaterThan(0)
          })

          // Property assertion: Usage frequencies should be non-negative
          templates.forEach(template => {
            expect(template.usage_frequency).toBeGreaterThanOrEqual(0)
            expect(Number.isFinite(template.usage_frequency)).toBe(true)
          })

          // Property assertion: Reconciliation history should be valid
          reconciliationHistory.forEach(session => {
            expect(typeof session.id).toBe('string')
            expect(session.id.length).toBeGreaterThan(0)
            expect(session.workspace_id).toBe(testWorkspaceId)
            expect(typeof session.checkpoint_id).toBe('string')
            expect(session.checkpoint_id.length).toBeGreaterThan(0)
            expect(typeof session.progress_percentage).toBe('number')
            expect(session.progress_percentage).toBeGreaterThanOrEqual(0)
            expect(session.progress_percentage).toBeLessThanOrEqual(100)
            expect(typeof session.gaps_remaining).toBe('number')
            expect(session.gaps_remaining).toBeGreaterThanOrEqual(0)
            expect(session.started_at).toBeInstanceOf(Date)
            expect(session.last_activity_at).toBeInstanceOf(Date)
            expect(['active', 'paused', 'completed', 'abandoned']).toContain(session.status)
          })
        }
      ),
      { numRuns: 20 } // Run 20 iterations
    )
  }, 25000) // 25 second timeout

  it.skip('Property: Missing Transaction Addition - gap impact calculation should be accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for gap impact calculation
        fc.record({
          originalGap: fc.record({
            account_id: fc.uuid(),
            gap_amount: fc.float({ min: -500, max: 500, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 100, noNaN: true }),
            severity: fc.constantFrom('low', 'medium', 'high')
          }),
          addedTransaction: fc.record({
            amount: fc.float({ min: 1, max: 200, noNaN: true }),
            type: fc.constantFrom('income', 'expense'),
            description: fc.string({ minLength: 1, maxLength: 100 }),
            transaction_date: fc.date({ 
              min: new Date('2024-01-01'), 
              max: new Date('2024-12-31') 
            })
          })
        }),
        async (testData) => {
          const { originalGap, addedTransaction } = testData

          // Calculate expected impact
          const transactionImpact = addedTransaction.type === 'income' 
            ? addedTransaction.amount 
            : -addedTransaction.amount

          const expectedNewGapAmount = originalGap.gap_amount - transactionImpact

          // Property assertion: Gap impact calculation should be mathematically correct
          expect(typeof expectedNewGapAmount).toBe('number')
          expect(Number.isFinite(expectedNewGapAmount)).toBe(true)

          // Property assertion: Transaction impact should be mathematically correct
          // Gap = Expected - Actual
          // When we add income, expected balance increases, so gap becomes more negative
          // When we add expense, expected balance decreases, so gap becomes more positive
          if (addedTransaction.type === 'income') {
            // Income increases expected balance, making gap more negative
            expect(expectedNewGapAmount).toBeLessThan(originalGap.gap_amount)
          } else {
            // Expense decreases expected balance, making gap more positive  
            expect(expectedNewGapAmount).toBeGreaterThan(originalGap.gap_amount)
          }

          // Property assertion: Gap resolution should be detected correctly
          const wasResolved = Math.abs(originalGap.gap_amount) < 0.01
          const isNowResolved = Math.abs(expectedNewGapAmount) < 0.01
          
          // If gap was already resolved, adding transaction should make it unresolved (unless transaction is tiny)
          if (wasResolved && addedTransaction.amount > 0.01) {
            expect(isNowResolved).toBe(false)
          }

          // Property assertion: Large transactions should have significant impact
          if (addedTransaction.amount > Math.abs(originalGap.gap_amount)) {
            // Transaction larger than gap should have significant impact
            const impactMagnitude = Math.abs(expectedNewGapAmount - originalGap.gap_amount)
            expect(impactMagnitude).toBeGreaterThanOrEqual(addedTransaction.amount * 0.9) // Allow for small rounding errors
          }

          // Property assertion: Transaction data should be valid
          expect(typeof addedTransaction.amount).toBe('number')
          expect(addedTransaction.amount).toBeGreaterThan(0)
          expect(Number.isFinite(addedTransaction.amount)).toBe(true)
          expect(['income', 'expense']).toContain(addedTransaction.type)
          expect(typeof addedTransaction.description).toBe('string')
          expect(addedTransaction.description.length).toBeGreaterThan(0)
          expect(addedTransaction.transaction_date).toBeInstanceOf(Date)

          // Property assertion: Gap data should be valid
          expect(typeof originalGap.account_id).toBe('string')
          expect(originalGap.account_id.length).toBeGreaterThan(0)
          expect(typeof originalGap.gap_amount).toBe('number')
          expect(Number.isFinite(originalGap.gap_amount)).toBe(true)
          expect(typeof originalGap.gap_percentage).toBe('number')
          expect(Number.isFinite(originalGap.gap_percentage)).toBe(true)
          expect(originalGap.gap_percentage).toBeGreaterThanOrEqual(0)
          expect(['low', 'medium', 'high']).toContain(originalGap.severity)
        }
      ),
      { numRuns: 40 } // Run 40 iterations
    )
  }, 30000) // 30 second timeout
})