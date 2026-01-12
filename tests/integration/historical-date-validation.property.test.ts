/**
 * Property Test: Historical Date Validation
 * Feature: checkpoint-reconciliation, Property 4: Historical Date Validation
 * Validates: Requirements 1.1, 1.2, 1.4
 * 
 * Property: Historical date validation should correctly identify valid and invalid dates
 * based on business rules and existing checkpoint constraints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'
import { HistoricalDateValidator } from '@/lib/services/historical-date-validator'
import { createClient } from '@supabase/supabase-js'

describe('Property 4: Historical Date Validation', () => {
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

  it('should reject future dates consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          futureDays: fc.integer({ min: 1, max: 365 }) // 1 to 365 days in the future
        }),
        async ({ futureDays }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)

          // Create future date
          const futureDate = new Date()
          futureDate.setDate(futureDate.getDate() + futureDays)

          // Validate future date
          const result = await HistoricalDateValidator.validateHistoricalDate(
            futureDate,
            workspaceId,
            supabase
          )

          // Property: All future dates should be invalid
          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('Cannot create checkpoint for future date')
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)

  it('should warn about dates too far in the past', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          yearsBack: fc.integer({ min: 3, max: 10 }) // 3 to 10 years back
        }),
        async ({ yearsBack }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)

          // Create date far in the past
          const pastDate = new Date()
          pastDate.setFullYear(pastDate.getFullYear() - yearsBack)

          // Validate past date
          const result = await HistoricalDateValidator.validateHistoricalDate(
            pastDate,
            workspaceId,
            supabase
          )

          // Property: Dates more than 2 years in the past should generate warnings
          expect(result.warnings).toContain('Creating checkpoint more than 2 years in the past may affect accuracy')
        }
      ),
      { numRuns: 15 }
    )
  }, 30000)

  it('should reject dates before existing checkpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          existingCheckpointDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
          daysBefore: fc.integer({ min: 1, max: 30 }) // 1 to 30 days before existing checkpoint
        }),
        async ({ existingCheckpointDate, daysBefore }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)

          // Create existing checkpoint
          await supabase.from('checkpoints').insert({
            workspace_id: workspaceId,
            created_by: userId,
            created_at: existingCheckpointDate.toISOString(),
            account_balances: [],
            expected_balances: [],
            gaps: [],
            status: 'closed'
          })

          // Create date before existing checkpoint
          const beforeDate = new Date(existingCheckpointDate)
          beforeDate.setDate(beforeDate.getDate() - daysBefore)

          // Validate date before existing checkpoint
          const result = await HistoricalDateValidator.validateHistoricalDate(
            beforeDate,
            workspaceId,
            supabase
          )

          // Property: Dates before existing checkpoints should be invalid
          expect(result.isValid).toBe(false)
          expect(result.errors.some(error => 
            error.includes('Cannot create checkpoint before existing checkpoint')
          )).toBe(true)
        }
      ),
      { numRuns: 15 }
    )
  }, 30000)

  it('should accept valid historical dates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          daysBack: fc.integer({ min: 1, max: 365 }) // 1 to 365 days back (within 1 year)
        }),
        async ({ daysBack }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)

          // Create valid historical date (not too far back, no existing checkpoints after)
          const historicalDate = new Date()
          historicalDate.setDate(historicalDate.getDate() - daysBack)

          // Validate historical date
          const result = await HistoricalDateValidator.validateHistoricalDate(
            historicalDate,
            workspaceId,
            supabase
          )

          // Property: Valid historical dates should be accepted
          expect(result.isValid).toBe(true)
          expect(result.errors).toHaveLength(0)
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)

  it('should provide appropriate warnings for dates with limited transaction coverage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          historicalDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
          transactionCount: fc.integer({ min: 0, max: 3 }) // Very few transactions
        }),
        async ({ historicalDate, transactionCount }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)
          await supabase.from('accounts').delete().eq('workspace_id', workspaceId)

          // Create minimal test data if transactions are needed
          if (transactionCount > 0) {
            // Create account
            const { data: account } = await supabase.from('accounts').insert({
              workspace_id: workspaceId,
              name: 'Test Account',
              type: 'checking',
              balance: 0,
              currency: 'UAH'
            }).select().single()

            // Create category
            const { data: category } = await supabase.from('categories').insert({
              workspace_id: workspaceId,
              name: 'Test Category',
              type: 'expense',
              color: '#8B7355',
              icon: '💸',
              is_default: true
            }).select().single()

            // Create few transactions in the period
            const transactions = Array.from({ length: transactionCount }, (_, i) => {
              const transactionDate = new Date(historicalDate.getTime() - (30 - i) * 24 * 60 * 60 * 1000)
              return {
                workspace_id: workspaceId,
                user_id: userId,
                created_by: userId,
                account_id: account.id,
                category_id: category.id,
                amount: 100,
                type: 'expense',
                description: `Test transaction ${i + 1}`,
                transaction_date: transactionDate.toISOString(),
                currency: 'UAH'
              }
            })

            if (transactions.length > 0) {
              await supabase.from('transactions').insert(transactions)
            }
          }

          // Validate historical date
          const result = await HistoricalDateValidator.validateHistoricalDate(
            historicalDate,
            workspaceId,
            supabase
          )

          // Property: Dates with very few transactions should generate warnings
          if (transactionCount < 5) {
            expect(result.warnings.some(warning => 
              warning.includes('Very few transactions found for this period')
            )).toBe(true)
          }
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)

  it('should validate baseline dates correctly for first checkpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baselineDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
        }),
        async ({ baselineDate }) => {
          // Skip invalid dates
          if (isNaN(baselineDate.getTime())) {
            return true // Skip this test case
          }

          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)

          // Test baseline validation (first checkpoint scenario)
          const result = await HistoricalDateValidator.validateBaselineDate(
            baselineDate,
            workspaceId,
            supabase
          )

          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

          // Property: First checkpoint baseline dates should be valid unless more than 1 year old
          if (baselineDate >= oneYearAgo) {
            expect(result.isValid).toBe(true)
          } else {
            expect(result.isValid).toBe(false)
            expect(result.reason).toBe('First checkpoint should not be more than 1 year in the past')
          }
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)

  it('should handle edge cases consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          testCase: fc.constantFrom('today', 'yesterday', 'tomorrow', 'exactly_two_years_ago')
        }),
        async ({ testCase }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)

          let testDate: Date
          const today = new Date()

          switch (testCase) {
            case 'today':
              testDate = new Date(today)
              break
            case 'yesterday':
              testDate = new Date(today)
              testDate.setDate(testDate.getDate() - 1)
              break
            case 'tomorrow':
              testDate = new Date(today)
              testDate.setDate(testDate.getDate() + 1)
              break
            case 'exactly_two_years_ago':
              testDate = new Date(today)
              testDate.setFullYear(testDate.getFullYear() - 2)
              break
          }

          const result = await HistoricalDateValidator.validateHistoricalDate(
            testDate,
            workspaceId,
            supabase
          )

          // Property: Edge cases should be handled consistently
          switch (testCase) {
            case 'today':
            case 'yesterday':
              expect(result.isValid).toBe(true)
              break
            case 'tomorrow':
              expect(result.isValid).toBe(false)
              expect(result.errors).toContain('Cannot create checkpoint for future date')
              break
            case 'exactly_two_years_ago':
              // Should be valid but with warnings
              expect(result.isValid).toBe(true)
              expect(result.warnings.some(w => w.includes('more than 2 years in the past'))).toBe(true)
              break
          }
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)
})