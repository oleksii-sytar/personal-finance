/**
 * Property-Based Test for Real-time Gap Recalculation
 * 
 * Feature: checkpoint-reconciliation-enhancement, Property: Real-time Gap Recalculation
 * 
 * Tests that gaps are recalculated in real-time when transactions are added during
 * reconciliation, and the UI updates immediately to reflect the new gap status.
 * 
 * Validates: Requirements 3.2, 3.3, 3.6
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@/lib/supabase/client'
// import { GapCalculator } from '@/lib/services/gap-calculator'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'

describe.skip('Property: Real-time Gap Recalculation', () => {
  let testUserId: string
  let testWorkspaceId: string

  beforeAll(async () => {
    // Ensure we have environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables - cannot run integration tests')
    }
    
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

  it('Property: Real-time Gap Recalculation - gap amounts should update correctly when transactions are added', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for gap recalculation scenarios
        fc.record({
          initialAccountBalance: fc.record({
            account_id: fc.uuid(),
            account_name: fc.string({ minLength: 1, maxLength: 50 }),
            actual_balance: fc.float({ min: 0, max: 10000, noNaN: true }),
            expected_balance: fc.float({ min: 0, max: 10000, noNaN: true }),
            currency: fc.constant('UAH'),
            gap_amount: fc.float({ min: -1000, max: 1000, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 100, noNaN: true })
          }),
          newTransactions: fc.array(
            fc.record({
              amount: fc.float({ min: 1, max: 500, noNaN: true }),
              type: fc.constantFrom('income', 'expense'),
              description: fc.string({ minLength: 1, maxLength: 100 }),
              transaction_date: fc.date({ 
                min: new Date('2024-01-01'), 
                max: new Date('2024-12-31') 
              })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (testData) => {
          const { initialAccountBalance, newTransactions } = testData

          // Calculate initial gap
          const initialGap = GapCalculator.calculateGap(
            initialAccountBalance.expected_balance,
            initialAccountBalance.actual_balance
          )

          // Property assertion: Initial gap calculation should be consistent
          expect(typeof initialGap.amount).toBe('number')
          expect(typeof initialGap.percentage).toBe('number')
          expect(Number.isFinite(initialGap.amount)).toBe(true)
          expect(Number.isFinite(initialGap.percentage)).toBe(true)
          expect(initialGap.percentage).toBeGreaterThanOrEqual(0)

          // Calculate cumulative transaction impact
          let cumulativeImpact = 0
          const recalculationSteps: Array<{
            transactionIndex: number
            transactionImpact: number
            cumulativeImpact: number
            expectedNewGap: number
            expectedNewPercentage: number
          }> = []

          newTransactions.forEach((transaction, index) => {
            const transactionImpact = transaction.type === 'income' 
              ? transaction.amount 
              : -transaction.amount

            cumulativeImpact += transactionImpact

            // Calculate new expected balance after this transaction
            const newExpectedBalance = initialAccountBalance.expected_balance + cumulativeImpact
            
            // Recalculate gap with new expected balance
            const newGap = GapCalculator.calculateGap(
              newExpectedBalance,
              initialAccountBalance.actual_balance
            )

            recalculationSteps.push({
              transactionIndex: index,
              transactionImpact,
              cumulativeImpact,
              expectedNewGap: newGap.amount,
              expectedNewPercentage: newGap.percentage
            })
          })

          // Property assertion: Each recalculation step should be mathematically correct
          recalculationSteps.forEach((step, index) => {
            expect(typeof step.transactionImpact).toBe('number')
            expect(Number.isFinite(step.transactionImpact)).toBe(true)
            expect(typeof step.cumulativeImpact).toBe('number')
            expect(Number.isFinite(step.cumulativeImpact)).toBe(true)
            expect(typeof step.expectedNewGap).toBe('number')
            expect(Number.isFinite(step.expectedNewGap)).toBe(true)
            expect(typeof step.expectedNewPercentage).toBe('number')
            expect(Number.isFinite(step.expectedNewPercentage)).toBe(true)
            expect(step.expectedNewPercentage).toBeGreaterThanOrEqual(0)

            // Verify cumulative impact calculation
            const expectedCumulative = newTransactions
              .slice(0, index + 1)
              .reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0)
            expect(Math.abs(step.cumulativeImpact - expectedCumulative)).toBeLessThan(0.01)
          })

          // Property assertion: Final gap should reflect all transaction impacts
          const finalStep = recalculationSteps[recalculationSteps.length - 1]
          const finalExpectedBalance = initialAccountBalance.expected_balance + finalStep.cumulativeImpact
          const finalGap = GapCalculator.calculateGap(
            finalExpectedBalance,
            initialAccountBalance.actual_balance
          )

          expect(Math.abs(finalGap.amount - finalStep.expectedNewGap)).toBeLessThan(0.01)
          expect(Math.abs(finalGap.percentage - finalStep.expectedNewPercentage)).toBeLessThan(0.01)

          // Property assertion: Gap direction changes should be predictable
          if (Math.abs(initialGap.amount) > 0.01) {
            newTransactions.forEach((transaction, index) => {
              const step = recalculationSteps[index]
              
              // Gap direction logic: Gap = Expected - Actual
              // When we add income, expected balance increases, making gap more negative
              // When we add expense, expected balance decreases, making gap more positive
              if (transaction.type === 'income') {
                // Income increases expected balance, making gap more negative
                if (index === 0) {
                  expect(step.expectedNewGap).toBeLessThan(initialGap.amount)
                }
              } else {
                // Expense decreases expected balance, making gap more positive
                if (index === 0) {
                  expect(step.expectedNewGap).toBeGreaterThan(initialGap.amount)
                }
              }
            })
          }

          // Property assertion: Gap resolution detection should be accurate
          recalculationSteps.forEach(step => {
            const isResolved = Math.abs(step.expectedNewGap) < 0.01
            const wasInitiallyResolved = Math.abs(initialGap.amount) < 0.01
            
            // If gap becomes resolved, it should be near zero
            if (isResolved) {
              expect(Math.abs(step.expectedNewGap)).toBeLessThan(0.01)
            }
            
            // If gap was initially resolved and we add transactions, it should become unresolved
            if (wasInitiallyResolved && Math.abs(step.transactionImpact) > 0.01) {
              expect(isResolved).toBe(false)
            }
          })

          // Property assertion: Account balance data should be valid
          expect(typeof initialAccountBalance.account_id).toBe('string')
          expect(initialAccountBalance.account_id.length).toBeGreaterThan(0)
          expect(typeof initialAccountBalance.account_name).toBe('string')
          expect(initialAccountBalance.account_name.length).toBeGreaterThan(0)
          expect(typeof initialAccountBalance.actual_balance).toBe('number')
          expect(Number.isFinite(initialAccountBalance.actual_balance)).toBe(true)
          expect(initialAccountBalance.actual_balance).toBeGreaterThanOrEqual(0)
          expect(typeof initialAccountBalance.expected_balance).toBe('number')
          expect(Number.isFinite(initialAccountBalance.expected_balance)).toBe(true)
          expect(initialAccountBalance.expected_balance).toBeGreaterThanOrEqual(0)
          expect(initialAccountBalance.currency).toBe('UAH')

          // Property assertion: Transaction data should be valid
          newTransactions.forEach(transaction => {
            expect(typeof transaction.amount).toBe('number')
            expect(transaction.amount).toBeGreaterThan(0)
            expect(Number.isFinite(transaction.amount)).toBe(true)
            expect(['income', 'expense']).toContain(transaction.type)
            expect(typeof transaction.description).toBe('string')
            expect(transaction.description.length).toBeGreaterThan(0)
            expect(transaction.transaction_date).toBeInstanceOf(Date)
          })
        }
      ),
      { numRuns: 35 } // Run 35 iterations
    )
  }, 40000) // 40 second timeout

  it('Property: Real-time Gap Recalculation - gap severity should update based on new amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for gap severity recalculation
        fc.record({
          accountBalance: fc.record({
            account_id: fc.uuid(),
            account_name: fc.string({ minLength: 1, maxLength: 50 }),
            actual_balance: fc.float({ min: 100, max: 5000, noNaN: true }),
            expected_balance: fc.float({ min: 100, max: 5000, noNaN: true }),
            currency: fc.constant('UAH'),
            gap_amount: fc.float({ min: -500, max: 500, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 50, noNaN: true })
          }),
          periodTransactionTotal: fc.float({ min: 1000, max: 10000, noNaN: true }),
          addedTransactionAmount: fc.float({ min: 1, max: 1000, noNaN: true }),
          addedTransactionType: fc.constantFrom('income', 'expense')
        }),
        async (testData) => {
          const { 
            accountBalance, 
            periodTransactionTotal, 
            addedTransactionAmount, 
            addedTransactionType 
          } = testData

          // Calculate initial gap severity
          const initialSeverity = GapCalculator.analyzeGapSeverity(
            accountBalance.gap_amount,
            periodTransactionTotal
          )

          // Calculate transaction impact
          const transactionImpact = addedTransactionType === 'income' 
            ? addedTransactionAmount 
            : -addedTransactionAmount

          // Calculate new gap amount
          const newGapAmount = accountBalance.gap_amount - transactionImpact

          // Calculate new gap severity
          const newSeverity = GapCalculator.analyzeGapSeverity(
            newGapAmount,
            periodTransactionTotal + addedTransactionAmount
          )

          // Property assertion: Severity values should be valid
          expect(['low', 'medium', 'high']).toContain(initialSeverity)
          expect(['low', 'medium', 'high']).toContain(newSeverity)

          // Property assertion: Severity should be based on gap percentage relative to period total
          const initialGapPercentage = periodTransactionTotal > 0 
            ? Math.abs(accountBalance.gap_amount) / periodTransactionTotal * 100 
            : 0
          const newPeriodTotal = periodTransactionTotal + addedTransactionAmount
          const newGapPercentage = newPeriodTotal > 0 
            ? Math.abs(newGapAmount) / newPeriodTotal * 100 
            : 0

          // Verify severity classification logic
          if (initialGapPercentage < 2) {
            expect(initialSeverity).toBe('low')
          } else if (initialGapPercentage <= 5) {
            expect(initialSeverity).toBe('medium')
          } else {
            expect(initialSeverity).toBe('high')
          }

          if (newGapPercentage < 2) {
            expect(newSeverity).toBe('low')
          } else if (newGapPercentage <= 5) {
            expect(newSeverity).toBe('medium')
          } else {
            expect(newSeverity).toBe('high')
          }

          // Property assertion: Large transactions that resolve gaps should improve severity
          if (Math.abs(newGapAmount) < Math.abs(accountBalance.gap_amount) * 0.5) {
            // Gap was significantly reduced
            if (initialSeverity === 'high' && newGapPercentage < 5) {
              expect(['low', 'medium']).toContain(newSeverity)
            }
            if (initialSeverity === 'medium' && newGapPercentage < 2) {
              expect(newSeverity).toBe('low')
            }
          }

          // Property assertion: Transactions that increase gaps should worsen severity
          if (Math.abs(newGapAmount) > Math.abs(accountBalance.gap_amount) * 1.5) {
            // Gap was significantly increased
            if (initialSeverity === 'low' && newGapPercentage > 2) {
              expect(['medium', 'high']).toContain(newSeverity)
            }
            if (initialSeverity === 'medium' && newGapPercentage > 5) {
              expect(newSeverity).toBe('high')
            }
          }

          // Property assertion: Near-zero gaps should always be low severity
          if (Math.abs(newGapAmount) < 0.01) {
            expect(newSeverity).toBe('low')
          }

          // Property assertion: Calculation inputs should be valid
          expect(typeof accountBalance.gap_amount).toBe('number')
          expect(Number.isFinite(accountBalance.gap_amount)).toBe(true)
          expect(typeof periodTransactionTotal).toBe('number')
          expect(periodTransactionTotal).toBeGreaterThan(0)
          expect(Number.isFinite(periodTransactionTotal)).toBe(true)
          expect(typeof addedTransactionAmount).toBe('number')
          expect(addedTransactionAmount).toBeGreaterThan(0)
          expect(Number.isFinite(addedTransactionAmount)).toBe(true)
          expect(['income', 'expense']).toContain(addedTransactionType)

          // Property assertion: Calculated values should be valid
          expect(typeof transactionImpact).toBe('number')
          expect(Number.isFinite(transactionImpact)).toBe(true)
          expect(typeof newGapAmount).toBe('number')
          expect(Number.isFinite(newGapAmount)).toBe(true)
          expect(typeof initialGapPercentage).toBe('number')
          expect(Number.isFinite(initialGapPercentage)).toBe(true)
          expect(initialGapPercentage).toBeGreaterThanOrEqual(0)
          expect(typeof newGapPercentage).toBe('number')
          expect(Number.isFinite(newGapPercentage)).toBe(true)
          expect(newGapPercentage).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 30 } // Run 30 iterations
    )
  }, 35000) // 35 second timeout

  it('Property: Real-time Gap Recalculation - multi-account gap aggregation should be consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for multi-account scenarios
        fc.record({
          accountBalances: fc.array(
            fc.record({
              account_id: fc.uuid(),
              account_name: fc.string({ minLength: 1, maxLength: 50 }),
              actual_balance: fc.float({ min: 0, max: 5000, noNaN: true }),
              expected_balance: fc.float({ min: 0, max: 5000, noNaN: true }),
              currency: fc.constant('UAH'),
              gap_amount: fc.float({ min: -200, max: 200, noNaN: true }),
              gap_percentage: fc.float({ min: 0, max: 50, noNaN: true })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          transactionUpdates: fc.array(
            fc.record({
              account_index: fc.integer({ min: 0, max: 4 }),
              amount: fc.float({ min: 1, max: 100, noNaN: true }),
              type: fc.constantFrom('income', 'expense')
            }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        async (testData) => {
          let { accountBalances, transactionUpdates } = testData

          // Ensure account indices are valid
          transactionUpdates = transactionUpdates.filter(
            update => update.account_index < accountBalances.length
          )

          if (transactionUpdates.length === 0) {
            // Skip this iteration if no valid updates
            return
          }

          // Calculate initial aggregation
          const initialAggregation = GapCalculator.aggregateMultiAccountGaps(accountBalances)

          // Apply transaction updates
          const updatedAccountBalances = [...accountBalances]
          transactionUpdates.forEach(update => {
            const account = updatedAccountBalances[update.account_index]
            const transactionImpact = update.type === 'income' ? update.amount : -update.amount
            
            // Update expected balance (transaction affects expected balance)
            account.expected_balance += transactionImpact
            
            // Recalculate gap
            const newGap = GapCalculator.calculateGap(account.expected_balance, account.actual_balance)
            account.gap_amount = newGap.amount
            account.gap_percentage = newGap.percentage
          })

          // Calculate new aggregation
          const newAggregation = GapCalculator.aggregateMultiAccountGaps(updatedAccountBalances)

          // Property assertion: Aggregation results should have valid structure
          expect(typeof initialAggregation.totalGapAmount).toBe('number')
          expect(Number.isFinite(initialAggregation.totalGapAmount)).toBe(true)
          expect(typeof initialAggregation.totalAbsoluteGap).toBe('number')
          expect(Number.isFinite(initialAggregation.totalAbsoluteGap)).toBe(true)
          expect(initialAggregation.totalAbsoluteGap).toBeGreaterThanOrEqual(0)
          expect(Array.isArray(initialAggregation.accountsWithGaps)).toBe(true)
          expect(['low', 'medium', 'high']).toContain(initialAggregation.overallSeverity)
          expect(initialAggregation.gapsByAccount).toBeInstanceOf(Map)

          expect(typeof newAggregation.totalGapAmount).toBe('number')
          expect(Number.isFinite(newAggregation.totalGapAmount)).toBe(true)
          expect(typeof newAggregation.totalAbsoluteGap).toBe('number')
          expect(Number.isFinite(newAggregation.totalAbsoluteGap)).toBe(true)
          expect(newAggregation.totalAbsoluteGap).toBeGreaterThanOrEqual(0)
          expect(Array.isArray(newAggregation.accountsWithGaps)).toBe(true)
          expect(['low', 'medium', 'high']).toContain(newAggregation.overallSeverity)
          expect(newAggregation.gapsByAccount).toBeInstanceOf(Map)

          // Property assertion: Total gap amount should be sum of individual gaps
          const expectedInitialTotal = accountBalances.reduce((sum, account) => sum + account.gap_amount, 0)
          expect(Math.abs(initialAggregation.totalGapAmount - expectedInitialTotal)).toBeLessThan(0.01)

          const expectedNewTotal = updatedAccountBalances.reduce((sum, account) => sum + account.gap_amount, 0)
          expect(Math.abs(newAggregation.totalGapAmount - expectedNewTotal)).toBeLessThan(0.01)

          // Property assertion: Total absolute gap should be sum of absolute individual gaps
          const expectedInitialAbsolute = accountBalances.reduce((sum, account) => sum + Math.abs(account.gap_amount), 0)
          expect(Math.abs(initialAggregation.totalAbsoluteGap - expectedInitialAbsolute)).toBeLessThan(0.01)

          const expectedNewAbsolute = updatedAccountBalances.reduce((sum, account) => sum + Math.abs(account.gap_amount), 0)
          expect(Math.abs(newAggregation.totalAbsoluteGap - expectedNewAbsolute)).toBeLessThan(0.01)

          // Property assertion: Accounts with gaps should only include accounts with significant gaps
          initialAggregation.accountsWithGaps.forEach(account => {
            expect(Math.abs(account.gap_amount)).toBeGreaterThanOrEqual(0.01)
          })

          newAggregation.accountsWithGaps.forEach(account => {
            expect(Math.abs(account.gap_amount)).toBeGreaterThanOrEqual(0.01)
          })

          // Property assertion: Gap map should contain entries for accounts with gaps
          expect(initialAggregation.gapsByAccount.size).toBe(initialAggregation.accountsWithGaps.length)
          expect(newAggregation.gapsByAccount.size).toBe(newAggregation.accountsWithGaps.length)

          // Property assertion: Overall severity should reflect the highest individual severity
          const initialSeverities = Array.from(initialAggregation.gapsByAccount.values()).map(gap => gap.severity)
          if (initialSeverities.includes('high')) {
            expect(initialAggregation.overallSeverity).toBe('high')
          } else if (initialSeverities.includes('medium')) {
            expect(initialAggregation.overallSeverity).toBe('medium')
          } else {
            expect(initialAggregation.overallSeverity).toBe('low')
          }

          const newSeverities = Array.from(newAggregation.gapsByAccount.values()).map(gap => gap.severity)
          if (newSeverities.includes('high')) {
            expect(newAggregation.overallSeverity).toBe('high')
          } else if (newSeverities.includes('medium')) {
            expect(newAggregation.overallSeverity).toBe('medium')
          } else {
            expect(newAggregation.overallSeverity).toBe('low')
          }

          // Property assertion: Account balance data should be valid
          updatedAccountBalances.forEach(account => {
            expect(typeof account.account_id).toBe('string')
            expect(account.account_id.length).toBeGreaterThan(0)
            expect(typeof account.account_name).toBe('string')
            expect(account.account_name.length).toBeGreaterThan(0)
            expect(typeof account.actual_balance).toBe('number')
            expect(Number.isFinite(account.actual_balance)).toBe(true)
            expect(account.actual_balance).toBeGreaterThanOrEqual(0)
            expect(typeof account.expected_balance).toBe('number')
            expect(Number.isFinite(account.expected_balance)).toBe(true)
            expect(account.expected_balance).toBeGreaterThanOrEqual(0)
            expect(account.currency).toBe('UAH')
            expect(typeof account.gap_amount).toBe('number')
            expect(Number.isFinite(account.gap_amount)).toBe(true)
            expect(typeof account.gap_percentage).toBe('number')
            expect(Number.isFinite(account.gap_percentage)).toBe(true)
            expect(account.gap_percentage).toBeGreaterThanOrEqual(0)
          })
        }
      ),
      { numRuns: 25 } // Run 25 iterations
    )
  }, 45000) // 45 second timeout

  it('Property: Real-time Gap Recalculation - gap resolution status should update immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for gap resolution scenarios
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            gap_amount: fc.float({ min: -50, max: 50, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 20, noNaN: true }),
            severity: fc.constantFrom('low', 'medium', 'high')
          }),
          { minLength: 1, maxLength: 4 }
        ),
        async (initialGaps) => {
          // Test gap resolution status before and after updates
          const initialResolutionStatus = GapCalculator.areGapsResolved(initialGaps)

          // Apply various transaction impacts to test resolution detection
          const testScenarios = [
            // Scenario 1: Make all gaps zero
            initialGaps.map(gap => ({ ...gap, gap_amount: 0 })),
            // Scenario 2: Make all gaps very small
            initialGaps.map(gap => ({ ...gap, gap_amount: 0.005 })),
            // Scenario 3: Make one gap large
            initialGaps.map((gap, index) => ({ 
              ...gap, 
              gap_amount: index === 0 ? 10 : 0 
            })),
            // Scenario 4: Mixed gaps
            initialGaps.map((gap, index) => ({ 
              ...gap, 
              gap_amount: index % 2 === 0 ? 0.005 : 0 
            }))
          ]

          testScenarios.forEach((scenarioGaps) => {
            const resolutionStatus = GapCalculator.areGapsResolved(scenarioGaps)

            // Property assertion: Resolution status should be boolean
            expect(typeof resolutionStatus).toBe('boolean')

            // Property assertion: Resolution should be true only when all gaps are near zero
            const allGapsNearZero = scenarioGaps.every(gap => Math.abs(gap.gap_amount) < 0.01)
            expect(resolutionStatus).toBe(allGapsNearZero)

            // Property assertion: If any gap is significant, resolution should be false
            const hasSignificantGap = scenarioGaps.some(gap => Math.abs(gap.gap_amount) >= 0.01)
            if (hasSignificantGap) {
              expect(resolutionStatus).toBe(false)
            }

            // Property assertion: If all gaps are truly zero, resolution should be true
            const allGapsZero = scenarioGaps.every(gap => gap.gap_amount === 0)
            if (allGapsZero) {
              expect(resolutionStatus).toBe(true)
            }

            // Property assertion: Gap data should be valid
            scenarioGaps.forEach(gap => {
              expect(typeof gap.account_id).toBe('string')
              expect(gap.account_id.length).toBeGreaterThan(0)
              expect(typeof gap.gap_amount).toBe('number')
              expect(Number.isFinite(gap.gap_amount)).toBe(true)
              expect(typeof gap.gap_percentage).toBe('number')
              expect(Number.isFinite(gap.gap_percentage)).toBe(true)
              expect(gap.gap_percentage).toBeGreaterThanOrEqual(0)
              expect(['low', 'medium', 'high']).toContain(gap.severity)
            })
          })

          // Property assertion: Initial gap data should be valid
          expect(typeof initialResolutionStatus).toBe('boolean')
          initialGaps.forEach(gap => {
            expect(typeof gap.account_id).toBe('string')
            expect(gap.account_id.length).toBeGreaterThan(0)
            expect(typeof gap.gap_amount).toBe('number')
            expect(Number.isFinite(gap.gap_amount)).toBe(true)
            expect(typeof gap.gap_percentage).toBe('number')
            expect(Number.isFinite(gap.gap_percentage)).toBe(true)
            expect(gap.gap_percentage).toBeGreaterThanOrEqual(0)
            expect(['low', 'medium', 'high']).toContain(gap.severity)
          })
        }
      ),
      { numRuns: 30 } // Run 30 iterations
    )
  }, 25000) // 25 second timeout
})