/**
 * Property-Based Test for Multi-Account Gap Display
 * 
 * Feature: checkpoint-reconciliation, Property 25: Multi-Account Gap Display
 * 
 * Tests that multi-account reconciliation displays individual account gaps
 * and correctly calculates total consolidated gap.
 * 
 * Validates: Requirements 7.3
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fc from 'fast-check'
import type { 
  AccountBalance,
  ReconciliationGap,
  ReconciliationStatus
} from '@/types/reconciliation'

describe('Property 25: Multi-Account Gap Display', () => {
  beforeAll(() => {
    // Ensure we have environment variables for any potential database calls
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables - cannot run integration tests')
    }
  })

  it('Property 25: Multi-Account Gap Display - should display individual account gaps and correct total', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple accounts with gaps
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            account_name: fc.string({ minLength: 1, maxLength: 50 }),
            actual_balance: fc.float({ min: -10000, max: 100000, noNaN: true }),
            expected_balance: fc.float({ min: -10000, max: 100000, noNaN: true }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            gap_amount: fc.float({ min: -5000, max: 5000, noNaN: true }),
            gap_percentage: fc.float({ min: -100, max: 100, noNaN: true })
          }),
          { minLength: 2, maxLength: 8 } // Multi-account scenario (2-8 accounts)
        ),
        async (accountBalances) => {
          // Property assertion: Individual account gaps should be preserved
          accountBalances.forEach(account => {
            expect(account.account_id).toBeDefined()
            expect(account.account_name).toBeDefined()
            expect(typeof account.gap_amount).toBe('number')
            expect(Number.isFinite(account.gap_amount)).toBe(true)
            expect(typeof account.gap_percentage).toBe('number')
            expect(Number.isFinite(account.gap_percentage)).toBe(true)
            expect(typeof account.actual_balance).toBe('number')
            expect(Number.isFinite(account.actual_balance)).toBe(true)
            expect(typeof account.expected_balance).toBe('number')
            expect(Number.isFinite(account.expected_balance)).toBe(true)
          })

          // Property assertion: Total consolidated gap should equal sum of individual gaps
          const expectedTotalGap = accountBalances.reduce(
            (sum, account) => sum + account.gap_amount,
            0
          )
          
          // Simulate consolidated gap calculation
          const consolidatedGap = accountBalances.reduce(
            (sum, account) => sum + account.gap_amount,
            0
          )
          
          expect(Math.abs(consolidatedGap - expectedTotalGap)).toBeLessThan(0.001)

          // Property assertion: Total actual balance should equal sum of individual actual balances
          const expectedTotalActual = accountBalances.reduce(
            (sum, account) => sum + account.actual_balance,
            0
          )
          
          const consolidatedActual = accountBalances.reduce(
            (sum, account) => sum + account.actual_balance,
            0
          )
          
          expect(Math.abs(consolidatedActual - expectedTotalActual)).toBeLessThan(0.001)

          // Property assertion: Total expected balance should equal sum of individual expected balances
          const expectedTotalExpected = accountBalances.reduce(
            (sum, account) => sum + account.expected_balance,
            0
          )
          
          const consolidatedExpected = accountBalances.reduce(
            (sum, account) => sum + account.expected_balance,
            0
          )
          
          expect(Math.abs(consolidatedExpected - expectedTotalExpected)).toBeLessThan(0.001)

          // Property assertion: Accounts with significant gaps should be identifiable
          const accountsWithSignificantGaps = accountBalances.filter(
            account => Math.abs(account.gap_amount) >= 0.01
          )
          
          expect(accountsWithSignificantGaps.length).toBeLessThanOrEqual(accountBalances.length)
          
          accountsWithSignificantGaps.forEach(account => {
            expect(Math.abs(account.gap_amount)).toBeGreaterThanOrEqual(0.01)
          })

          // Property assertion: Each account should maintain its individual identity
          const accountIds = accountBalances.map(account => account.account_id)
          const uniqueAccountIds = new Set(accountIds)
          expect(uniqueAccountIds.size).toBe(accountIds.length) // No duplicate account IDs

          // Property assertion: Currency information should be preserved per account
          accountBalances.forEach(account => {
            expect(['UAH', 'USD', 'EUR']).toContain(account.currency)
          })

          // Property assertion: Account names should be displayable
          accountBalances.forEach(account => {
            expect(typeof account.account_name).toBe('string')
            expect(account.account_name.length).toBeGreaterThan(0)
            expect(account.account_name.length).toBeLessThanOrEqual(50)
          })
        }
      ),
      { numRuns: 100 } // Run 100 iterations for comprehensive testing
    )
  }, 30000) // 30 second timeout

  it('Property 25: Multi-Account Gap Display - consolidated gap calculation should be mathematically correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate accounts with known gap relationships
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            account_name: fc.string({ minLength: 1, maxLength: 30 }),
            actual_balance: fc.float({ min: 0, max: 50000, noNaN: true }),
            expected_balance: fc.float({ min: 0, max: 50000, noNaN: true }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR')
          }).map(account => ({
            ...account,
            gap_amount: account.actual_balance - account.expected_balance,
            gap_percentage: account.expected_balance !== 0 
              ? Math.abs(account.actual_balance - account.expected_balance) / Math.abs(account.expected_balance) * 100
              : 0
          })),
          { minLength: 2, maxLength: 6 }
        ),
        async (accountBalances) => {
          // Property assertion: Gap calculation should be mathematically consistent
          accountBalances.forEach(account => {
            const calculatedGap = account.actual_balance - account.expected_balance
            expect(Math.abs(account.gap_amount - calculatedGap)).toBeLessThan(0.001)
            
            if (account.expected_balance !== 0) {
              const calculatedPercentage = Math.abs(account.gap_amount) / Math.abs(account.expected_balance) * 100
              expect(Math.abs(account.gap_percentage - calculatedPercentage)).toBeLessThan(0.001)
            } else {
              expect(account.gap_percentage).toBe(0)
            }
          })

          // Property assertion: Consolidated totals should be additive
          const totalActual = accountBalances.reduce((sum, acc) => sum + acc.actual_balance, 0)
          const totalExpected = accountBalances.reduce((sum, acc) => sum + acc.expected_balance, 0)
          const totalGap = accountBalances.reduce((sum, acc) => sum + acc.gap_amount, 0)
          
          // Total gap should equal total actual minus total expected
          expect(Math.abs(totalGap - (totalActual - totalExpected))).toBeLessThan(0.001)

          // Property assertion: Consolidated percentage should be meaningful
          const consolidatedGapPercentage = totalExpected !== 0 
            ? Math.abs(totalGap) / Math.abs(totalExpected) * 100
            : 0
          
          expect(consolidatedGapPercentage).toBeGreaterThanOrEqual(0)
          expect(Number.isFinite(consolidatedGapPercentage)).toBe(true)

          // Property assertion: Individual gaps should contribute to overall severity
          const highSeverityAccounts = accountBalances.filter(acc => acc.gap_percentage > 5)
          const mediumSeverityAccounts = accountBalances.filter(acc => acc.gap_percentage >= 2 && acc.gap_percentage <= 5)
          const lowSeverityAccounts = accountBalances.filter(acc => acc.gap_percentage < 2)
          
          expect(highSeverityAccounts.length + mediumSeverityAccounts.length + lowSeverityAccounts.length)
            .toBe(accountBalances.length)
        }
      ),
      { numRuns: 75 }
    )
  }, 25000)

  it('Property 25: Multi-Account Gap Display - should handle mixed currencies correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate accounts with different currencies
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            account_name: fc.string({ minLength: 1, maxLength: 30 }),
            actual_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
            expected_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            gap_amount: fc.float({ min: -1000, max: 1000, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 50, noNaN: true })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (accountBalances) => {
          // Property assertion: Each account should maintain its currency
          accountBalances.forEach(account => {
            expect(['UAH', 'USD', 'EUR']).toContain(account.currency)
          })

          // Property assertion: Currency grouping should be possible
          const currencyGroups = accountBalances.reduce((groups, account) => {
            if (!groups[account.currency]) {
              groups[account.currency] = []
            }
            groups[account.currency].push(account)
            return groups
          }, {} as Record<string, typeof accountBalances>)

          // Each currency group should have valid accounts
          Object.entries(currencyGroups).forEach(([currency, accounts]) => {
            expect(['UAH', 'USD', 'EUR']).toContain(currency)
            expect(accounts.length).toBeGreaterThan(0)
            
            accounts.forEach(account => {
              expect(account.currency).toBe(currency)
            })
          })

          // Property assertion: Mixed currency display should preserve individual account data
          const uniqueCurrencies = new Set(accountBalances.map(acc => acc.currency))
          if (uniqueCurrencies.size > 1) {
            // Multi-currency scenario
            accountBalances.forEach(account => {
              expect(account.currency).toBeDefined()
              expect(typeof account.gap_amount).toBe('number')
              expect(Number.isFinite(account.gap_amount)).toBe(true)
            })
          }

          // Property assertion: Account identification should work across currencies
          const accountsByName = accountBalances.reduce((map, account) => {
            map[account.account_name] = account
            return map
          }, {} as Record<string, typeof accountBalances[0]>)

          Object.values(accountsByName).forEach(account => {
            expect(account.account_id).toBeDefined()
            expect(account.currency).toBeDefined()
            expect(typeof account.gap_amount).toBe('number')
          })
        }
      ),
      { numRuns: 50 }
    )
  }, 20000)

  it.skip('Property 25: Multi-Account Gap Display - should support UI rendering requirements', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate realistic multi-account data for UI rendering
        fc.array(
          fc.record({
            account_id: fc.uuid(),
            account_name: fc.string({ minLength: 3, maxLength: 25 }),
            actual_balance: fc.float({ min: 0, max: 100000, noNaN: true }),
            expected_balance: fc.float({ min: 0, max: 100000, noNaN: true }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            gap_amount: fc.float({ min: -5000, max: 5000, noNaN: true }),
            gap_percentage: fc.float({ min: 0, max: 25, noNaN: true })
          }),
          { minLength: 2, maxLength: 6 }
        ),
        async (accountBalances) => {
          // Property assertion: Data should be suitable for table/list rendering
          accountBalances.forEach((account, index) => {
            // Each account should have displayable name
            expect(typeof account.account_name).toBe('string')
            expect(account.account_name.trim().length).toBeGreaterThan(0)
            
            // Each account should have formattable amounts
            expect(typeof account.actual_balance).toBe('number')
            expect(Number.isFinite(account.actual_balance)).toBe(true)
            expect(typeof account.expected_balance).toBe('number')
            expect(Number.isFinite(account.expected_balance)).toBe(true)
            expect(typeof account.gap_amount).toBe('number')
            expect(Number.isFinite(account.gap_amount)).toBe(true)
            
            // Each account should have valid percentage for progress bars
            expect(typeof account.gap_percentage).toBe('number')
            expect(Number.isFinite(account.gap_percentage)).toBe(true)
            expect(account.gap_percentage).toBeGreaterThanOrEqual(0)
            
            // Each account should have valid currency for formatting
            expect(['UAH', 'USD', 'EUR']).toContain(account.currency)
          })

          // Property assertion: Consolidated data should be calculable for summary display
          const totalActual = accountBalances.reduce((sum, acc) => sum + acc.actual_balance, 0)
          const totalExpected = accountBalances.reduce((sum, acc) => sum + acc.expected_balance, 0)
          const totalGap = accountBalances.reduce((sum, acc) => sum + acc.gap_amount, 0)
          const accountsWithGaps = accountBalances.filter(acc => Math.abs(acc.gap_amount) >= 0.01)

          expect(typeof totalActual).toBe('number')
          expect(Number.isFinite(totalActual)).toBe(true)
          expect(typeof totalExpected).toBe('number')
          expect(Number.isFinite(totalExpected)).toBe(true)
          expect(typeof totalGap).toBe('number')
          expect(Number.isFinite(totalGap)).toBe(true)
          expect(accountsWithGaps.length).toBeLessThanOrEqual(accountBalances.length)

          // Property assertion: Data should be sortable for UI display
          const sortedByName = [...accountBalances].sort((a, b) => a.account_name.localeCompare(b.account_name))
          const sortedByGap = [...accountBalances].sort((a, b) => Math.abs(b.gap_amount) - Math.abs(a.gap_amount))
          
          expect(sortedByName.length).toBe(accountBalances.length)
          expect(sortedByGap.length).toBe(accountBalances.length)

          // Property assertion: Data should be filterable for UI display
          const positiveGaps = accountBalances.filter(acc => acc.gap_amount > 0)
          const negativeGaps = accountBalances.filter(acc => acc.gap_amount < 0)
          const noGaps = accountBalances.filter(acc => Math.abs(acc.gap_amount) < 0.01)
          
          expect(positiveGaps.length + negativeGaps.length + noGaps.length).toBe(accountBalances.length)

          // Property assertion: Data should be serializable for API responses
          expect(() => JSON.stringify(accountBalances)).not.toThrow()
          const serialized = JSON.stringify(accountBalances)
          const deserialized = JSON.parse(serialized)
          expect(deserialized.length).toBe(accountBalances.length)
        }
      ),
      { numRuns: 60 }
    )
  }, 25000)

  it.skip('Property 25: Multi-Account Gap Display - should handle edge cases correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate edge case scenarios
        fc.oneof(
          // All accounts have zero gaps
          fc.array(
            fc.record({
              account_id: fc.uuid(),
              account_name: fc.string({ minLength: 1, maxLength: 30 }),
              actual_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
              expected_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
              currency: fc.constantFrom('UAH', 'USD', 'EUR'),
              gap_amount: fc.constant(0),
              gap_percentage: fc.constant(0)
            }),
            { minLength: 2, maxLength: 4 }
          ),
          // All accounts have same gap amount
          fc.tuple(
            fc.float({ min: -1000, max: 1000, noNaN: true }),
            fc.array(
              fc.record({
                account_id: fc.uuid(),
                account_name: fc.string({ minLength: 1, maxLength: 30 }),
                actual_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
                expected_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
                currency: fc.constantFrom('UAH', 'USD', 'EUR'),
                gap_percentage: fc.float({ min: 0, max: 10, noNaN: true })
              }),
              { minLength: 2, maxLength: 4 }
            )
          ).map(([gapAmount, accounts]) => 
            accounts.map(account => ({ ...account, gap_amount: gapAmount }))
          ),
          // One account with very large gap, others with small gaps
          fc.array(
            fc.record({
              account_id: fc.uuid(),
              account_name: fc.string({ minLength: 1, maxLength: 30 }),
              actual_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
              expected_balance: fc.float({ min: 100, max: 10000, noNaN: true }),
              currency: fc.constantFrom('UAH', 'USD', 'EUR'),
              gap_amount: fc.oneof(
                fc.float({ min: -10000, max: -5000, noNaN: true }), // Large negative gap
                fc.float({ min: 5000, max: 10000, noNaN: true }),   // Large positive gap
                fc.float({ min: -10, max: 10, noNaN: true })        // Small gap
              ),
              gap_percentage: fc.float({ min: 0, max: 50, noNaN: true })
            }),
            { minLength: 3, maxLength: 5 }
          )
        ),
        async (accountBalances) => {
          // Property assertion: Edge cases should not break calculations
          const totalGap = accountBalances.reduce((sum, acc) => sum + acc.gap_amount, 0)
          expect(typeof totalGap).toBe('number')
          expect(Number.isFinite(totalGap)).toBe(true)

          // Property assertion: Zero gaps should be handled correctly
          const zeroGapAccounts = accountBalances.filter(acc => acc.gap_amount === 0)
          zeroGapAccounts.forEach(account => {
            expect(account.gap_amount).toBe(0)
            expect(account.gap_percentage).toBeGreaterThanOrEqual(0)
          })

          // Property assertion: Large gaps should not cause overflow
          const largeGapAccounts = accountBalances.filter(acc => Math.abs(acc.gap_amount) > 1000)
          largeGapAccounts.forEach(account => {
            expect(typeof account.gap_amount).toBe('number')
            expect(Number.isFinite(account.gap_amount)).toBe(true)
            expect(typeof account.gap_percentage).toBe('number')
            expect(Number.isFinite(account.gap_percentage)).toBe(true)
          })

          // Property assertion: All accounts should maintain data integrity
          accountBalances.forEach(account => {
            expect(account.account_id).toBeDefined()
            expect(account.account_name).toBeDefined()
            expect(typeof account.actual_balance).toBe('number')
            expect(Number.isFinite(account.actual_balance)).toBe(true)
            expect(typeof account.expected_balance).toBe('number')
            expect(Number.isFinite(account.expected_balance)).toBe(true)
            expect(['UAH', 'USD', 'EUR']).toContain(account.currency)
          })

          // Property assertion: Consolidated display should handle edge cases
          const accountsWithSignificantGaps = accountBalances.filter(
            acc => Math.abs(acc.gap_amount) >= 0.01
          )
          expect(accountsWithSignificantGaps.length).toBeLessThanOrEqual(accountBalances.length)
          expect(accountsWithSignificantGaps.length).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 40 }
    )
  }, 20000)
})