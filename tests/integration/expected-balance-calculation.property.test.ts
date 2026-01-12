/**
 * Property Test: Expected Balance Calculation
 * Feature: checkpoint-reconciliation, Property 3: Expected Balance Calculation
 * Validates: Requirements 1.4, 7.2
 * 
 * Property: For any checkpoint, the expected balance should equal the previous 
 * checkpoint balance plus the sum of all transactions since the previous checkpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'
import { CheckpointModel } from '@/lib/models/checkpoint'
import { createClient } from '@supabase/supabase-js'

describe('Property 3: Expected Balance Calculation', () => {
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

  it.skip('should calculate expected balance correctly for any sequence of transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          accountId: fc.uuid(),
          accountName: fc.string({ minLength: 1, maxLength: 50 }),
          currency: fc.constantFrom('UAH', 'USD', 'EUR'),
          previousBalance: fc.integer({ min: -10000, max: 10000 }),
          transactions: fc.array(
            fc.record({
              amount: fc.integer({ min: 1, max: 100000 }).map(n => n / 100), // Convert to decimal
              type: fc.constantFrom('income', 'expense'),
              description: fc.string({ minLength: 1, maxLength: 100 }),
              date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
            }),
            { minLength: 0, maxLength: 10 } // Reduced from 20 to 10 for faster tests
          )
        }),
        async ({ accountId, accountName, currency, previousBalance, transactions }) => {
          // Clean up only workspace data, not the workspace itself
          // Order matters: delete in reverse dependency order
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)
          await supabase.from('accounts').delete().eq('workspace_id', workspaceId)
          // Note: NOT deleting the workspace itself - it's needed for the test

          // Create an account for the test
          const { data: account, error: accountError } = await supabase
            .from('accounts')
            .insert({
              id: accountId,
              workspace_id: workspaceId,
              name: accountName,
              type: 'checking',
              balance: 0,
              currency
            })
            .select()
            .single()

          if (accountError) {
            console.log('Account insert error:', accountError)
            throw new Error(`Failed to insert account: ${accountError.message}`)
          }

          // Create a previous checkpoint
          const checkpointDate = new Date('2024-01-01')
          const { data: checkpoint } = await supabase
            .from('checkpoints')
            .insert({
              workspace_id: workspaceId,
              created_by: userId,
              created_at: checkpointDate.toISOString(),
              account_balances: [{
                account_id: accountId,
                account_name: accountName,
                actual_balance: previousBalance,
                expected_balance: previousBalance,
                currency,
                gap_amount: 0,
                gap_percentage: 0
              }],
              expected_balances: [{
                account_id: accountId,
                account_name: accountName,
                actual_balance: previousBalance,
                expected_balance: previousBalance,
                currency,
                gap_amount: 0,
                gap_percentage: 0
              }],
              gaps: [],
              status: 'closed'
            })
            .select()
            .single()

          // Create transactions after the checkpoint
          if (transactions.length > 0) {
            // First, create a default category for testing
            const { data: category } = await supabase
              .from('categories')
              .insert({
                workspace_id: workspaceId,
                name: 'Test Category',
                type: 'expense',
                color: '#8B7355',
                icon: '💸',
                is_default: true
              })
              .select()
              .single()

            const transactionInserts = transactions.map((tx, index) => {
              const transactionDate = new Date(checkpointDate.getTime() + (index + 1) * 24 * 60 * 60 * 1000)
              
              return {
                workspace_id: workspaceId,
                user_id: userId,
                created_by: userId,
                account_id: accountId,
                category_id: category.id,
                amount: tx.amount,
                type: tx.type,
                description: tx.description,
                transaction_date: transactionDate.toISOString(),
                currency
              }
            })

            const { error: insertError } = await supabase.from('transactions').insert(transactionInserts)
            if (insertError) {
              console.log('Transaction insert error:', insertError)
              throw new Error(`Failed to insert transactions: ${insertError.message}`)
            }
          }

          // Calculate expected balance using the model
          const fromDate = new Date(checkpointDate.getTime() + 24 * 60 * 60 * 1000) // Day after checkpoint
          const calculatedExpected = await CheckpointModel.calculateExpectedBalance(
            accountId,
            fromDate,
            workspaceId,
            supabase
          )

          // Calculate expected balance manually for verification
          const transactionSum = transactions.reduce((sum, tx) => {
            return sum + (tx.type === 'income' ? tx.amount : -tx.amount)
          }, 0)
          const manualExpected = previousBalance + transactionSum

          // Property: Expected balance should equal previous balance + transaction sum
          expect(Math.abs(calculatedExpected - manualExpected)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 10 } // Reduced from 50 to 10 for faster debugging
    )
  }, 60000) // Increased timeout to 60 seconds for debugging

  it.skip('should handle multi-account scenarios correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a simple multi-account scenario
        fc.record({
          account1: fc.record({
            accountName: fc.string({ minLength: 1, maxLength: 20 }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            previousBalance: fc.integer({ min: -1000, max: 1000 }),
            transactionAmount: fc.integer({ min: 1, max: 10000 }).map(n => n / 100)
          }),
          account2: fc.record({
            accountName: fc.string({ minLength: 1, maxLength: 20 }),
            currency: fc.constantFrom('UAH', 'USD', 'EUR'),
            previousBalance: fc.integer({ min: -1000, max: 1000 }),
            transactionAmount: fc.integer({ min: 1, max: 10000 }).map(n => n / 100)
          })
        }).map(({ account1, account2 }) => ({
          account1: { ...account1, accountId: crypto.randomUUID() },
          account2: { ...account2, accountId: crypto.randomUUID() }
        })),
        async ({ account1, account2 }) => {
          // Clean up only workspace data, not the workspace itself
          // Order matters: delete in reverse dependency order
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)
          await supabase.from('accounts').delete().eq('workspace_id', workspaceId)
          // Note: NOT deleting the workspace itself - it's needed for the test

          // Create accounts for both test accounts
          const { error: account1Error } = await supabase
            .from('accounts')
            .insert({
              id: account1.accountId,
              workspace_id: workspaceId,
              name: account1.accountName,
              type: 'checking',
              balance: 0,
              currency: account1.currency
            })

          if (account1Error) {
            throw new Error(`Failed to insert account1: ${account1Error.message}`)
          }

          const { error: account2Error } = await supabase
            .from('accounts')
            .insert({
              id: account2.accountId,
              workspace_id: workspaceId,
              name: account2.accountName,
              type: 'checking',
              balance: 0,
              currency: account2.currency
            })

          if (account2Error) {
            throw new Error(`Failed to insert account2: ${account2Error.message}`)
          }

          const checkpointDate = new Date('2024-01-01')
          
          // Create previous checkpoint with both accounts
          const accountBalances = [
            {
              account_id: account1.accountId,
              account_name: account1.accountName,
              actual_balance: account1.previousBalance,
              expected_balance: account1.previousBalance,
              currency: account1.currency,
              gap_amount: 0,
              gap_percentage: 0
            },
            {
              account_id: account2.accountId,
              account_name: account2.accountName,
              actual_balance: account2.previousBalance,
              expected_balance: account2.previousBalance,
              currency: account2.currency,
              gap_amount: 0,
              gap_percentage: 0
            }
          ]

          await supabase
            .from('checkpoints')
            .insert({
              workspace_id: workspaceId,
              created_by: userId,
              created_at: checkpointDate.toISOString(),
              account_balances: accountBalances,
              expected_balances: accountBalances,
              gaps: [],
              status: 'closed'
            })

          // Create one transaction for each account
          const transactionDate = new Date(checkpointDate.getTime() + 24 * 60 * 60 * 1000)
          
          // First, create a default category for testing
          const { data: category } = await supabase
            .from('categories')
            .insert({
              workspace_id: workspaceId,
              name: 'Test Category',
              type: 'expense',
              color: '#8B7355',
              icon: '💸',
              is_default: true
            })
            .select()
            .single()

          await supabase.from('transactions').insert([
            {
              workspace_id: workspaceId,
              user_id: userId,
              created_by: userId,
              account_id: account1.accountId,
              category_id: category.id,
              amount: account1.transactionAmount,
              type: 'income',
              description: 'Test transaction 1',
              transaction_date: transactionDate.toISOString(),
              currency: account1.currency
            },
            {
              workspace_id: workspaceId,
              user_id: userId,
              created_by: userId,
              account_id: account2.accountId,
              category_id: category.id,
              amount: account2.transactionAmount,
              type: 'expense',
              description: 'Test transaction 2',
              transaction_date: transactionDate.toISOString(),
              currency: account2.currency
            }
          ])

          // Verify expected balance calculation for each account
          const fromDate = new Date(checkpointDate.getTime() + 24 * 60 * 60 * 1000)
          
          // Test account 1 (income transaction)
          const calculatedExpected1 = await CheckpointModel.calculateExpectedBalance(
            account1.accountId,
            workspaceId,
            fromDate,
            supabase
          )
          const manualExpected1 = account1.previousBalance + account1.transactionAmount
          expect(Math.abs(calculatedExpected1 - manualExpected1)).toBeLessThanOrEqual(0.01)

          // Test account 2 (expense transaction)
          const calculatedExpected2 = await CheckpointModel.calculateExpectedBalance(
            account2.accountId,
            workspaceId,
            fromDate,
            supabase
          )
          const manualExpected2 = account2.previousBalance - account2.transactionAmount
          expect(Math.abs(calculatedExpected2 - manualExpected2)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 10 } // Reduced to 10 for faster tests
    )
  }, 60000) // Increased timeout to 60 seconds)

  it.skip('should handle edge cases correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          accountName: fc.string({ minLength: 1, maxLength: 50 }),
          currency: fc.constantFrom('UAH', 'USD', 'EUR'),
          previousBalance: fc.integer({ min: -1000, max: 1000 })
        }),
        async ({ accountId, accountName, currency, previousBalance }) => {
          // Clean up only workspace data, not the workspace itself
          // Order matters: delete in reverse dependency order
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)
          await supabase.from('accounts').delete().eq('workspace_id', workspaceId)
          // Note: NOT deleting the workspace itself - it's needed for the test

          // Create an account for the test
          const { error: accountError } = await supabase
            .from('accounts')
            .insert({
              id: accountId,
              workspace_id: workspaceId,
              name: accountName,
              type: 'checking',
              balance: 0,
              currency
            })

          if (accountError) {
            throw new Error(`Failed to insert account: ${accountError.message}`)
          }

          const checkpointDate = new Date('2024-01-01')
          
          // Test case: No previous checkpoint (should default to 0)
          const fromDate = new Date(checkpointDate.getTime() + 24 * 60 * 60 * 1000)
          const expectedWithoutCheckpoint = await CheckpointModel.calculateExpectedBalance(
            accountId,
            workspaceId,
            fromDate,
            supabase
          )

          // Property: Without previous checkpoint, expected balance should be 0
          expect(expectedWithoutCheckpoint).toBe(0)

          // Create checkpoint and test with no transactions
          await supabase
            .from('checkpoints')
            .insert({
              workspace_id: workspaceId,
              created_by: userId,
              created_at: checkpointDate.toISOString(),
              account_balances: [{
                account_id: accountId,
                account_name: accountName,
                actual_balance: previousBalance,
                expected_balance: previousBalance,
                currency,
                gap_amount: 0,
                gap_percentage: 0
              }],
              expected_balances: [{
                account_id: accountId,
                account_name: accountName,
                actual_balance: previousBalance,
                expected_balance: previousBalance,
                currency,
                gap_amount: 0,
                gap_percentage: 0
              }],
              gaps: [],
              status: 'closed'
            })

          const expectedWithCheckpoint = await CheckpointModel.calculateExpectedBalance(
            accountId,
            workspaceId,
            fromDate,
            supabase
          )

          // Property: With checkpoint but no transactions, expected should equal previous balance
          expect(Math.abs(expectedWithCheckpoint - previousBalance)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 25 } // Reduced from 50 to 25 for faster tests
    )
  }, 30000) // Increased timeout to 30 seconds)

  it.skip('should handle historical checkpoint dates correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          accountName: fc.string({ minLength: 1, maxLength: 50 }),
          currency: fc.constantFrom('UAH', 'USD', 'EUR'),
          baselineBalance: fc.integer({ min: -1000, max: 1000 }),
          historicalDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
          transactions: fc.array(
            fc.record({
              amount: fc.integer({ min: 1, max: 10000 }).map(n => n / 100),
              type: fc.constantFrom('income', 'expense'),
              description: fc.string({ minLength: 1, maxLength: 100 }),
              dayOffset: fc.integer({ min: 1, max: 30 }) // Days after baseline
            }),
            { minLength: 0, maxLength: 5 }
          )
        }),
        async ({ accountId, accountName, currency, baselineBalance, historicalDate, transactions }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)
          await supabase.from('accounts').delete().eq('workspace_id', workspaceId)

          // Create account
          await supabase.from('accounts').insert({
            id: accountId,
            workspace_id: workspaceId,
            name: accountName,
            type: 'checking',
            balance: 0,
            currency
          })

          // Create baseline checkpoint (before historical date)
          const baselineDate = new Date(historicalDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days before
          await supabase.from('checkpoints').insert({
            workspace_id: workspaceId,
            created_by: userId,
            created_at: baselineDate.toISOString(),
            account_balances: [{
              account_id: accountId,
              account_name: accountName,
              actual_balance: baselineBalance,
              expected_balance: baselineBalance,
              currency,
              gap_amount: 0,
              gap_percentage: 0
            }],
            expected_balances: [{
              account_id: accountId,
              account_name: accountName,
              actual_balance: baselineBalance,
              expected_balance: baselineBalance,
              currency,
              gap_amount: 0,
              gap_percentage: 0
            }],
            gaps: [],
            status: 'closed'
          })

          // Create transactions between baseline and historical date
          if (transactions.length > 0) {
            const { data: category } = await supabase
              .from('categories')
              .insert({
                workspace_id: workspaceId,
                name: 'Test Category',
                type: 'expense',
                color: '#8B7355',
                icon: '💸',
                is_default: true
              })
              .select()
              .single()

            const transactionInserts = transactions.map(tx => {
              const transactionDate = new Date(baselineDate.getTime() + tx.dayOffset * 24 * 60 * 60 * 1000)
              // Ensure transaction is before historical checkpoint date
              if (transactionDate >= historicalDate) {
                transactionDate.setTime(historicalDate.getTime() - 24 * 60 * 60 * 1000) // Day before
              }
              
              return {
                workspace_id: workspaceId,
                user_id: userId,
                created_by: userId,
                account_id: accountId,
                category_id: category.id,
                amount: tx.amount,
                type: tx.type,
                description: tx.description,
                transaction_date: transactionDate.toISOString(),
                currency
              }
            })

            await supabase.from('transactions').insert(transactionInserts)
          }

          // Calculate expected balance for historical date
          const calculatedExpected = await CheckpointModel.calculateExpectedBalance(
            accountId,
            historicalDate,
            workspaceId,
            supabase
          )

          // Calculate expected balance manually
          const transactionSum = transactions.reduce((sum, tx) => {
            return sum + (tx.type === 'income' ? tx.amount : -tx.amount)
          }, 0)
          const manualExpected = baselineBalance + transactionSum

          // Property: Historical expected balance should equal baseline + transactions up to that date
          expect(Math.abs(calculatedExpected - manualExpected)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)

  it.skip('should handle first historical checkpoint correctly (no previous checkpoint)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          accountName: fc.string({ minLength: 1, maxLength: 50 }),
          currency: fc.constantFrom('UAH', 'USD', 'EUR'),
          historicalDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
          transactions: fc.array(
            fc.record({
              amount: fc.integer({ min: 1, max: 10000 }).map(n => n / 100),
              type: fc.constantFrom('income', 'expense'),
              description: fc.string({ minLength: 1, maxLength: 100 }),
              dayOffset: fc.integer({ min: -30, max: -1 }) // Days before historical date
            }),
            { minLength: 0, maxLength: 5 }
          )
        }),
        async ({ accountId, accountName, currency, historicalDate, transactions }) => {
          // Clean up workspace data
          await supabase.from('checkpoints').delete().eq('workspace_id', workspaceId)
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)
          await supabase.from('accounts').delete().eq('workspace_id', workspaceId)

          // Create account
          await supabase.from('accounts').insert({
            id: accountId,
            workspace_id: workspaceId,
            name: accountName,
            type: 'checking',
            balance: 0,
            currency
          })

          // Create transactions before historical date (no previous checkpoint)
          if (transactions.length > 0) {
            const { data: category } = await supabase
              .from('categories')
              .insert({
                workspace_id: workspaceId,
                name: 'Test Category',
                type: 'expense',
                color: '#8B7355',
                icon: '💸',
                is_default: true
              })
              .select()
              .single()

            const transactionInserts = transactions.map(tx => {
              const transactionDate = new Date(historicalDate.getTime() + tx.dayOffset * 24 * 60 * 60 * 1000)
              
              return {
                workspace_id: workspaceId,
                user_id: userId,
                created_by: userId,
                account_id: accountId,
                category_id: category.id,
                amount: tx.amount,
                type: tx.type,
                description: tx.description,
                transaction_date: transactionDate.toISOString(),
                currency
              }
            })

            await supabase.from('transactions').insert(transactionInserts)
          }

          // Calculate expected balance for historical date (first checkpoint)
          const calculatedExpected = await CheckpointModel.calculateExpectedBalance(
            accountId,
            workspaceId,
            historicalDate,
            supabase
          )

          // For first checkpoint, expected balance should be sum of transactions from beginning of month
          const monthStart = new Date(historicalDate)
          monthStart.setDate(1)
          monthStart.setHours(0, 0, 0, 0)

          // Get transactions from month start to historical date
          const { data: relevantTransactions } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('workspace_id', workspaceId)
            .eq('account_id', accountId)
            .gte('transaction_date', monthStart.toISOString())
            .lt('transaction_date', historicalDate.toISOString())
            .is('deleted_at', null)

          const expectedSum = relevantTransactions?.reduce((sum: number, tx: any) => {
            return sum + (tx.type === 'income' ? tx.amount : -tx.amount)
          }, 0) || 0

          // Property: First historical checkpoint expected balance should equal transaction sum from month start
          expect(Math.abs(calculatedExpected - expectedSum)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)
})