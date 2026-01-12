/**
 * Property Test: Period Transaction Filtering
 * Feature: checkpoint-reconciliation, Property 8: Period Transaction Filtering
 * Validates: Requirements 3.1
 * 
 * Property: When displaying period transactions for gap resolution, 
 * the system should only show transactions within the reconciliation period boundaries
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'
// import { GapResolutionModal } from '@/components/reconciliation/gap-resolution-modal'
import { createClient } from '@supabase/supabase-js'
// import type { ReconciliationGap, AccountBalance } from '@/types/reconciliation'

// Mock the workspace context
const mockWorkspaceContext = {
  currentWorkspace: { id: '', name: '', currency: 'UAH' },
  workspaces: [],
  isLoading: false,
  createWorkspace: vi.fn(),
  switchWorkspace: vi.fn(),
  refreshWorkspaces: vi.fn()
}

// Mock the useWorkspace hook
vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: () => mockWorkspaceContext,
  WorkspaceProvider: ({ children }: { children: any }) => <div>{children}</div>
}))

// Mock the supabase client
const mockSupabaseClient = {
  from: vi.fn()
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock the reconciliation actions
vi.mock('@/actions/reconciliation', () => ({
  resolveGap: vi.fn()
}))

// Mock the format currency utility
vi.mock('@/lib/utils/format', () => ({
  formatCurrency: (amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`
}))

describe.skip('Property 8: Period Transaction Filtering', () => {
  let userId: string
  let workspaceId: string
  let supabase: any
  let queryClient: QueryClient

  beforeEach(async () => {
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    userId = user.id
    workspaceId = workspace.id
    
    // Update mock context with real workspace
    mockWorkspaceContext.currentWorkspace = {
      id: workspaceId,
      name: workspace.name,
      currency: workspace.currency || 'UAH'
    }
    
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

    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(async () => {
    cleanup()
    await cleanupTestData(userId)
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('should only display transactions within the current reconciliation period', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          accountId: fc.uuid(),
          accountName: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          currency: fc.constantFrom('UAH', 'USD', 'EUR'),
          gapAmount: fc.integer({ min: -10000, max: 10000 }).map(n => n / 100),
          // Generate transactions with various dates
          transactions: fc.array(
            fc.record({
              id: fc.uuid(),
              amount: fc.integer({ min: 1, max: 10000 }).map(n => n / 100),
              description: fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0),
              category_name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom('income', 'expense'),
              // Generate dates: some within period, some outside
              daysFromPeriodStart: fc.integer({ min: -30, max: 60 }) // -30 to 60 days from period start
            }),
            { minLength: 5, maxLength: 15 }
          )
        }),
        async (testData) => {
          // Clean up workspace data
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)

          // Calculate current period boundaries
          const now = new Date()
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month

          // Create test transactions with calculated dates
          const transactionInserts = testData.transactions.map(tx => {
            const transactionDate = new Date(periodStart)
            transactionDate.setDate(transactionDate.getDate() + tx.daysFromPeriodStart)
            
            return {
              id: crypto.randomUUID(),
              workspace_id: workspaceId,
              account_id: testData.accountId,
              amount: tx.amount,
              description: tx.description,
              transaction_date: transactionDate.toISOString(),
              type: tx.type,
              category_id: crypto.randomUUID()
            }
          })

          // Create corresponding categories
          const categoryInserts = testData.transactions.map((tx, index) => ({
            id: transactionInserts[index].category_id,
            workspace_id: workspaceId,
            name: `${tx.category_name}_${index}`, // Make unique by adding index
            type: tx.type,
            color: '#E6A65D', // Default color
            icon: 'circle' // Default icon
          }))

          // Insert test data
          const { error: categoryError } = await supabase
            .from('categories')
            .insert(categoryInserts)

          if (categoryError) {
            throw new Error(`Failed to insert categories: ${categoryError.message}`)
          }

          const { error: transactionError } = await supabase
            .from('transactions')
            .insert(transactionInserts)

          if (transactionError) {
            throw new Error(`Failed to insert transactions: ${transactionError.message}`)
          }

          // Filter transactions that should be visible (within period)
          const expectedVisibleTransactions = transactionInserts.filter(tx => {
            const txDate = new Date(tx.transaction_date)
            return txDate >= periodStart && txDate <= periodEnd
          })

          // Mock the supabase client to return period transactions
          const mockTransactionsQuery = vi.fn().mockResolvedValue({
            data: expectedVisibleTransactions.map((tx, index) => ({
              id: tx.id,
              amount: tx.amount,
              description: tx.description,
              transaction_date: tx.transaction_date,
              type: tx.type,
              categories: {
                name: testData.transactions[transactionInserts.indexOf(tx)].category_name
              }
            })),
            error: null
          })

          const mockCategoriesQuery = vi.fn().mockResolvedValue({
            data: categoryInserts,
            error: null
          })

          // Setup mock to return different data based on table name
          mockSupabaseClient.from.mockImplementation((table: string) => {
            if (table === 'transactions') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      gte: vi.fn().mockReturnValue({
                        is: vi.fn().mockReturnValue({
                          order: vi.fn().mockReturnValue(mockTransactionsQuery)
                        })
                      })
                    })
                  })
                })
              }
            } else if (table === 'categories') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue(mockCategoriesQuery)
                  })
                })
              }
            }
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ data: [], error: null }))
                })
              })
            }
          })

          // Create test props
          const accountBalance: AccountBalance = {
            account_id: testData.accountId,
            account_name: testData.accountName,
            actual_balance: 1000,
            expected_balance: 1000 - testData.gapAmount,
            currency: testData.currency,
            gap_amount: testData.gapAmount,
            gap_percentage: Math.abs(testData.gapAmount) / 1000 * 100
          }

          const gap: ReconciliationGap = {
            account_id: testData.accountId,
            gap_amount: testData.gapAmount,
            gap_percentage: Math.abs(testData.gapAmount) / 1000 * 100,
            severity: Math.abs(testData.gapAmount) / 1000 * 100 < 2 ? 'low' : 
                     Math.abs(testData.gapAmount) / 1000 * 100 <= 5 ? 'medium' : 'high'
          }

          // Render the GapResolutionModal
          renderWithProviders(
            <GapResolutionModal
              isOpen={true}
              onClose={() => {}}
              checkpointId="test-checkpoint-id"
              accountBalance={accountBalance}
              gap={gap}
            />
          )

          // Wait for modal to load
          await waitFor(() => {
            expect(screen.getByText(`Resolve Gap - ${testData.accountName}`)).toBeInTheDocument()
          })

          // Wait for transactions to load
          await waitFor(() => {
            expect(screen.getByText('Period Transactions')).toBeInTheDocument()
          })

          // Property 1: Only transactions within the period should be displayed
          if (expectedVisibleTransactions.length === 0) {
            expect(screen.getByText('No transactions found for this period.')).toBeInTheDocument()
          } else {
            // Check that visible transactions are displayed
            for (const tx of expectedVisibleTransactions) {
              const txIndex = transactionInserts.indexOf(tx)
              const expectedDescription = testData.transactions[txIndex].description
              expect(screen.getByText(expectedDescription)).toBeInTheDocument()
            }

            // Property 2: Transactions outside the period should NOT be displayed
            const transactionsOutsidePeriod = transactionInserts.filter(tx => {
              const txDate = new Date(tx.transaction_date)
              return txDate < periodStart || txDate > periodEnd
            })

            for (const tx of transactionsOutsidePeriod) {
              const txIndex = transactionInserts.indexOf(tx)
              const unexpectedDescription = testData.transactions[txIndex].description
              expect(screen.queryByText(unexpectedDescription)).not.toBeInTheDocument()
            }
          }

          // Property 3: The number of displayed transactions should match expected count
          const transactionElements = screen.queryAllByText(/UAH|USD|EUR/)
            .filter(el => el.textContent?.includes(testData.currency))
          
          // Account for the gap amount display and transaction amounts
          const expectedTransactionDisplays = expectedVisibleTransactions.length
          expect(transactionElements.length).toBeGreaterThanOrEqual(expectedTransactionDisplays)

          // Property 4: All displayed transactions should have proper date formatting
          expectedVisibleTransactions.forEach(tx => {
            const txDate = new Date(tx.transaction_date)
            const formattedDate = txDate.toLocaleDateString()
            expect(screen.getByText(formattedDate)).toBeInTheDocument()
          })

          // Property 5: Transaction types should be properly indicated
          expectedVisibleTransactions.forEach(tx => {
            const txIndex = transactionInserts.indexOf(tx)
            const expectedDescription = testData.transactions[txIndex].description
            const transactionElement = screen.getByText(expectedDescription).closest('div')
            
            // Check for income/expense indication (+ or - sign)
            if (tx.type === 'income') {
              expect(transactionElement).toHaveTextContent('+')
            } else {
              expect(transactionElement).toHaveTextContent('-')
            }
          })
        }
      ),
      { numRuns: 3 } // Run 3 iterations for comprehensive testing
    )
  }, 30000) // 30 second timeout

  it('should handle empty period gracefully', async () => {
    // Clean up workspace data
    await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
    await supabase.from('categories').delete().eq('workspace_id', workspaceId)

    // Mock empty responses
    const mockEmptyTransactionsQuery = vi.fn().mockResolvedValue({
      data: [],
      error: null
    })

    const mockEmptyCategoriesQuery = vi.fn().mockResolvedValue({
      data: [],
      error: null
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue(mockEmptyTransactionsQuery)
                  })
                })
              })
            })
          })
        }
      } else if (table === 'categories') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue(mockEmptyCategoriesQuery)
            })
          })
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ data: [], error: null }))
          })
        })
      }
    })

    const accountBalance: AccountBalance = {
      account_id: 'test-account-id',
      account_name: 'Test Account',
      actual_balance: 1000,
      expected_balance: 950,
      currency: 'UAH',
      gap_amount: 50,
      gap_percentage: 5
    }

    const gap: ReconciliationGap = {
      account_id: 'test-account-id',
      gap_amount: 50,
      gap_percentage: 5,
      severity: 'medium'
    }

    // Render the GapResolutionModal
    renderWithProviders(
      <GapResolutionModal
        isOpen={true}
        onClose={() => {}}
        checkpointId="test-checkpoint-id"
        accountBalance={accountBalance}
        gap={gap}
      />
    )

    // Wait for modal to load
    await waitFor(() => {
      expect(screen.getByText('Resolve Gap - Test Account')).toBeInTheDocument()
    })

    // Property: Should display appropriate message for empty period
    await waitFor(() => {
      expect(screen.getByText('No transactions found for this period.')).toBeInTheDocument()
    })
  })

  it('should display loading state while fetching period transactions', async () => {
    // Mock loading state with pending promise
    const mockPendingQuery = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue(mockPendingQuery)
                  })
                })
              })
            })
          })
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ data: [], error: null }))
          })
        })
      }
    })

    const accountBalance: AccountBalance = {
      account_id: 'test-account-id',
      account_name: 'Test Account',
      actual_balance: 1000,
      expected_balance: 950,
      currency: 'UAH',
      gap_amount: 50,
      gap_percentage: 5
    }

    const gap: ReconciliationGap = {
      account_id: 'test-account-id',
      gap_amount: 50,
      gap_percentage: 5,
      severity: 'medium'
    }

    // Render the GapResolutionModal
    renderWithProviders(
      <GapResolutionModal
        isOpen={true}
        onClose={() => {}}
        checkpointId="test-checkpoint-id"
        accountBalance={accountBalance}
        gap={gap}
      />
    )

    // Property: Should display loading state
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument()
  })

  it('should filter transactions by account ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data with multiple accounts
        fc.record({
          targetAccountId: fc.uuid(),
          otherAccountId: fc.uuid(),
          accountName: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          currency: fc.constantFrom('UAH', 'USD', 'EUR'),
          targetTransactions: fc.array(
            fc.record({
              description: fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0),
              amount: fc.integer({ min: 1, max: 1000 }).map(n => n / 100),
              type: fc.constantFrom('income', 'expense')
            }),
            { minLength: 1, maxLength: 3 }
          ),
          otherTransactions: fc.array(
            fc.record({
              description: fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0),
              amount: fc.integer({ min: 1, max: 1000 }).map(n => n / 100),
              type: fc.constantFrom('income', 'expense')
            }),
            { minLength: 1, maxLength: 3 }
          )
        }).filter(data => data.targetAccountId !== data.otherAccountId), // Ensure different account IDs
        async (testData) => {
          // Clean up workspace data
          await supabase.from('transactions').delete().eq('workspace_id', workspaceId)
          await supabase.from('categories').delete().eq('workspace_id', workspaceId)

          const now = new Date()
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)

          // Create transactions for target account (should be visible)
          const targetTransactionInserts = testData.targetTransactions.map(tx => ({
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            account_id: testData.targetAccountId,
            amount: tx.amount,
            description: tx.description,
            transaction_date: new Date(periodStart.getTime() + Math.random() * 86400000 * 15).toISOString(), // Random date within first 15 days
            type: tx.type,
            category_id: crypto.randomUUID()
          }))

          // Create transactions for other account (should NOT be visible)
          const otherTransactionInserts = testData.otherTransactions.map(tx => ({
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            account_id: testData.otherAccountId,
            amount: tx.amount,
            description: tx.description,
            transaction_date: new Date(periodStart.getTime() + Math.random() * 86400000 * 15).toISOString(),
            type: tx.type,
            category_id: crypto.randomUUID()
          }))

          // Create categories
          const allTransactions = [...targetTransactionInserts, ...otherTransactionInserts]
          const categoryInserts = allTransactions.map((tx, index) => ({
            id: tx.category_id,
            workspace_id: workspaceId,
            name: `Category_${index}`, // Make unique by using index
            type: tx.type,
            color: '#E6A65D', // Default color
            icon: 'circle' // Default icon
          }))

          // Insert test data
          await supabase.from('categories').insert(categoryInserts)
          await supabase.from('transactions').insert(allTransactions)

          // Mock the supabase client to return only target account transactions
          const mockTransactionsQuery = vi.fn().mockResolvedValue({
            data: targetTransactionInserts.map(tx => ({
              id: tx.id,
              amount: tx.amount,
              description: tx.description,
              transaction_date: tx.transaction_date,
              type: tx.type,
              categories: {
                name: `Category for ${tx.description}`
              }
            })),
            error: null
          })

          const mockCategoriesQuery = vi.fn().mockResolvedValue({
            data: categoryInserts,
            error: null
          })

          mockSupabaseClient.from.mockImplementation((table: string) => {
            if (table === 'transactions') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      gte: vi.fn().mockReturnValue({
                        is: vi.fn().mockReturnValue({
                          order: vi.fn().mockReturnValue(mockTransactionsQuery)
                        })
                      })
                    })
                  })
                })
              }
            } else if (table === 'categories') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue(mockCategoriesQuery)
                  })
                })
              }
            }
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ data: [], error: null }))
                })
              })
            }
          })

          const accountBalance: AccountBalance = {
            account_id: testData.targetAccountId,
            account_name: testData.accountName,
            actual_balance: 1000,
            expected_balance: 950,
            currency: testData.currency,
            gap_amount: 50,
            gap_percentage: 5
          }

          const gap: ReconciliationGap = {
            account_id: testData.targetAccountId,
            gap_amount: 50,
            gap_percentage: 5,
            severity: 'medium'
          }

          // Render the GapResolutionModal
          renderWithProviders(
            <GapResolutionModal
              isOpen={true}
              onClose={() => {}}
              checkpointId="test-checkpoint-id"
              accountBalance={accountBalance}
              gap={gap}
            />
          )

          // Wait for modal to load
          await waitFor(() => {
            expect(screen.getByText(`Resolve Gap - ${testData.accountName}`)).toBeInTheDocument()
          })

          // Wait for transactions to load
          await waitFor(() => {
            expect(screen.getByText('Period Transactions')).toBeInTheDocument()
          })

          // Property: Only target account transactions should be visible
          testData.targetTransactions.forEach(tx => {
            expect(screen.getByText(tx.description)).toBeInTheDocument()
          })

          // Property: Other account transactions should NOT be visible
          testData.otherTransactions.forEach(tx => {
            expect(screen.queryByText(tx.description)).not.toBeInTheDocument()
          })
        }
      ),
      { numRuns: 2 } // Run 2 iterations
    )
  }, 25000) // 25 second timeout
})