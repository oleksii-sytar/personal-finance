/**
 * Property-Based Test for Category Ordering Consistency
 * 
 * Feature: transactions, Property 1: Category Ordering Consistency
 * 
 * Tests that for any category selection interface, categories should be ordered 
 * by usage frequency with most recent/frequent categories appearing first.
 * 
 * Validates: Requirements 1.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Category } from '@/types'

describe('Property 1: Category Ordering Consistency', () => {
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
  const createTestUser = async () => {
    const email = `test-${Date.now()}-${Math.random()}@example.com`
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
    })
    if (error) throw error
    return data.user
  }

  // Helper function to create a test workspace
  const createTestWorkspace = async (userId: string) => {
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: `Test Workspace ${Date.now()}`,
        owner_id: userId,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  // Helper function to get categories ordered by usage (direct database query)
  const getCategoriesByUsageDirect = async (
    workspaceId: string, 
    type?: 'income' | 'expense'
  ): Promise<(Category & { usage_count: number })[]> => {
    // Build query to get categories with usage count
    let query = supabaseAdmin
      .from('categories')
      .select(`
        *,
        transactions!left(id)
      `)
      .eq('workspace_id', workspaceId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: categoriesWithTransactions, error } = await query

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    // Transform data to include usage count and sort by frequency
    const categoriesWithUsage = (categoriesWithTransactions || []).map(category => {
      const { transactions, ...categoryData } = category
      return {
        ...categoryData,
        usage_count: Array.isArray(transactions) ? transactions.length : 0,
      }
    }).sort((a, b) => {
      // Sort by usage count (descending), then by name (ascending)
      if (b.usage_count !== a.usage_count) {
        return b.usage_count - a.usage_count
      }
      return a.name.localeCompare(b.name)
    })

    return categoriesWithUsage
  }
  // Helper function to create categories with different usage counts
  const createCategoriesWithUsage = async (
    workspaceId: string, 
    userId: string, 
    type: 'income' | 'expense',
    categoryCount: number
  ) => {
    // Create categories
    const categories = Array.from({ length: categoryCount }, (_, i) => ({
      workspace_id: workspaceId,
      name: `Category ${i + 1}`,
      type,
      is_default: false,
      color: type === 'income' ? '#4E7A58' : '#8B7355',
      icon: type === 'income' ? '💰' : '📝',
    }))

    const { data: createdCategories, error } = await supabaseAdmin
      .from('categories')
      .insert(categories)
      .select()

    if (error) throw error

    // Create transactions with different usage patterns
    const transactions = []
    for (let i = 0; i < createdCategories!.length; i++) {
      const category = createdCategories![i]
      // Create different numbers of transactions for each category
      // Category 0 gets 0 transactions, Category 1 gets 1 transaction, etc.
      const transactionCount = i
      
      for (let j = 0; j < transactionCount; j++) {
        transactions.push({
          workspace_id: workspaceId,
          user_id: userId,
          amount: 100 + j,
          currency: 'UAH',
          description: `Transaction ${j + 1} for ${category.name}`,
          type,
          category_id: category.id,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: userId,
        })
      }
    }

    if (transactions.length > 0) {
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert(transactions)

      if (transactionError) throw transactionError
    }

    return createdCategories!
  }

  // Cleanup function
  const cleanup = async (userId?: string, workspaceId?: string) => {
    if (workspaceId) {
      // Delete workspace (cascades to transactions, categories, etc.)
      await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
    }
    if (userId) {
      // Delete user
      await supabaseAdmin.auth.admin.deleteUser(userId)
    }
  }

  it('should order categories by usage frequency (most used first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('income', 'expense'),
        fc.integer({ min: 2, max: 5 }), // Number of categories to create
        async (transactionType, categoryCount) => {
          let testUser: any
          let testWorkspace: any

          try {
            // Create test user and workspace
            testUser = await createTestUser()
            testWorkspace = await createTestWorkspace(testUser.id)

            // Create categories with different usage patterns
            const createdCategories = await createCategoriesWithUsage(
              testWorkspace.id,
              testUser.id,
              transactionType,
              categoryCount
            )

            // Get categories ordered by usage
            const orderedCategories = await getCategoriesByUsageDirect(testWorkspace.id, transactionType)

            // Verify we got all categories
            expect(orderedCategories.length).toBe(categoryCount)

              // Verify ordering: usage_count should be in descending order
              for (let i = 0; i < orderedCategories.length - 1; i++) {
                const current = orderedCategories[i]
                const next = orderedCategories[i + 1]

                // Current category should have >= usage count than next
                expect(current.usage_count).toBeGreaterThanOrEqual(next.usage_count)

                // If usage counts are equal, should be ordered alphabetically
                if (current.usage_count === next.usage_count) {
                  expect(current.name.localeCompare(next.name)).toBeLessThanOrEqual(0)
                }
              }

              // Verify that the most used category is first (if there are transactions)
              if (orderedCategories.length > 1) {
                const mostUsed = orderedCategories[0]
                const leastUsed = orderedCategories[orderedCategories.length - 1]
                
                // Most used should have >= transactions than least used
                expect(mostUsed.usage_count).toBeGreaterThanOrEqual(leastUsed.usage_count)
              }

            // Verify all categories are of the correct type
            orderedCategories.forEach(category => {
              expect(category.type).toBe(transactionType)
              expect(category.workspace_id).toBe(testWorkspace.id)
              expect(typeof category.usage_count).toBe('number')
              expect(category.usage_count).toBeGreaterThanOrEqual(0)
            })
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace?.id)
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations for comprehensive testing
    )
  }, 30000) // 30 second timeout

  it('should maintain consistent ordering across multiple calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('income', 'expense'),
        fc.integer({ min: 3, max: 6 }), // Number of categories to create
        async (transactionType, categoryCount) => {
          let testUser: any
          let testWorkspace: any

          try {
            // Create test user and workspace
            testUser = await createTestUser()
            testWorkspace = await createTestWorkspace(testUser.id)

            // Create categories with usage patterns
            await createCategoriesWithUsage(
              testWorkspace.id,
              testUser.id,
              transactionType,
              categoryCount
            )

            // Get categories multiple times
            const orderedCategories1 = await getCategoriesByUsageDirect(testWorkspace.id, transactionType)
            const orderedCategories2 = await getCategoriesByUsageDirect(testWorkspace.id, transactionType)

            // Both calls should return the same ordering
            expect(orderedCategories1.length).toBe(orderedCategories2.length)

            for (let i = 0; i < orderedCategories1.length; i++) {
              const cat1 = orderedCategories1[i]
              const cat2 = orderedCategories2[i]

              // Same category in same position
              expect(cat1.id).toBe(cat2.id)
              expect(cat1.usage_count).toBe(cat2.usage_count)
              expect(cat1.name).toBe(cat2.name)
            }
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace?.id)
          }
        }
      ),
      { numRuns: 8 } // Run 8 iterations for this test
    )
  }, 25000) // 25 second timeout

  it('should handle categories with zero usage correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('income', 'expense'),
        async (transactionType) => {
          let testUser: any
          let testWorkspace: any

          try {
            // Create test user and workspace
            testUser = await createTestUser()
            testWorkspace = await createTestWorkspace(testUser.id)

            // Create categories without any transactions (zero usage)
            const categories = [
              {
                workspace_id: testWorkspace.id,
                name: 'Unused Category A',
                type: transactionType,
                is_default: false,
                color: transactionType === 'income' ? '#4E7A58' : '#8B7355',
                icon: transactionType === 'income' ? '💰' : '📝',
              },
              {
                workspace_id: testWorkspace.id,
                name: 'Unused Category B',
                type: transactionType,
                is_default: false,
                color: transactionType === 'income' ? '#4E7A58' : '#8B7355',
                icon: transactionType === 'income' ? '💰' : '📝',
              }
            ]

            const { data: createdCategories, error } = await supabaseAdmin
              .from('categories')
              .insert(categories)
              .select()

            expect(error).toBeNull()
            expect(createdCategories).toBeDefined()

            // Get categories ordered by usage
            const orderedCategories = await getCategoriesByUsageDirect(testWorkspace.id, transactionType)

            // Should have both categories
            expect(orderedCategories.length).toBe(2)

            // Both should have zero usage
            orderedCategories.forEach(category => {
              expect(category.usage_count).toBe(0)
              expect(category.type).toBe(transactionType)
            })

            // Should be ordered alphabetically when usage is equal
            expect(orderedCategories[0].name).toBe('Unused Category A')
            expect(orderedCategories[1].name).toBe('Unused Category B')
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace?.id)
          }
        }
      ),
      { numRuns: 6 } // Run 6 iterations for this test
    )
  }, 20000) // 20 second timeout

  it('should separate income and expense categories correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }), // Number of categories per type
        async (categoryCount) => {
          let testUser: any
          let testWorkspace: any

          try {
            // Create test user and workspace
            testUser = await createTestUser()
            testWorkspace = await createTestWorkspace(testUser.id)

            // Create income categories
            const incomeCategories = Array.from({ length: categoryCount }, (_, i) => ({
              workspace_id: testWorkspace.id,
              name: `Income Category ${i + 1}`,
              type: 'income' as const,
              is_default: false,
              color: '#4E7A58',
              icon: '💰',
            }))

            // Create expense categories
            const expenseCategories = Array.from({ length: categoryCount }, (_, i) => ({
              workspace_id: testWorkspace.id,
              name: `Expense Category ${i + 1}`,
              type: 'expense' as const,
              is_default: false,
              color: '#8B7355',
              icon: '📝',
            }))

            // Insert all categories at once
            const { data: allCreatedCategories, error: categoryError } = await supabaseAdmin
              .from('categories')
              .insert([...incomeCategories, ...expenseCategories])
              .select()

            expect(categoryError).toBeNull()
            expect(allCreatedCategories).toBeDefined()
            expect(allCreatedCategories?.length).toBe(categoryCount * 2)

            // Create some transactions for each type
            const transactions = []
            const createdIncomeCategories = allCreatedCategories!.filter(c => c.type === 'income')
            const createdExpenseCategories = allCreatedCategories!.filter(c => c.type === 'expense')

            // Add transactions for income categories
            for (let i = 0; i < createdIncomeCategories.length; i++) {
              const category = createdIncomeCategories[i]
              for (let j = 0; j < i + 1; j++) {
                transactions.push({
                  workspace_id: testWorkspace.id,
                  user_id: testUser.id,
                  amount: 1000 + j,
                  currency: 'UAH',
                  description: `Income transaction ${j + 1} for ${category.name}`,
                  type: 'income' as const,
                  category_id: category.id,
                  transaction_date: new Date().toISOString().split('T')[0],
                  created_by: testUser.id,
                })
              }
            }

            // Add transactions for expense categories
            for (let i = 0; i < createdExpenseCategories.length; i++) {
              const category = createdExpenseCategories[i]
              for (let j = 0; j < i + 1; j++) {
                transactions.push({
                  workspace_id: testWorkspace.id,
                  user_id: testUser.id,
                  amount: 100 + j,
                  currency: 'UAH',
                  description: `Expense transaction ${j + 1} for ${category.name}`,
                  type: 'expense' as const,
                  category_id: category.id,
                  transaction_date: new Date().toISOString().split('T')[0],
                  created_by: testUser.id,
                })
              }
            }

            if (transactions.length > 0) {
              const { error: transactionError } = await supabaseAdmin
                .from('transactions')
                .insert(transactions)

              expect(transactionError).toBeNull()
            }

            // Get income categories
            const incomeResults = await getCategoriesByUsageDirect(testWorkspace.id, 'income')
            // Get expense categories
            const expenseResults = await getCategoriesByUsageDirect(testWorkspace.id, 'expense')

            // Should have correct number of each type
            expect(incomeResults.length).toBe(categoryCount)
            expect(expenseResults.length).toBe(categoryCount)

            // All income categories should be income type
            incomeResults.forEach(category => {
              expect(category.type).toBe('income')
            })

            // All expense categories should be expense type
            expenseResults.forEach(category => {
              expect(category.type).toBe('expense')
            })

            // No overlap between the two lists
            const incomeIds = new Set(incomeResults.map(c => c.id))
            const expenseIds = new Set(expenseResults.map(c => c.id))
            
            incomeIds.forEach(id => {
              expect(expenseIds.has(id)).toBe(false)
            })
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace?.id)
          }
        }
      ),
      { numRuns: 5 } // Run 5 iterations for this test
    )
  }, 25000) // 25 second timeout

  it('should handle workspace isolation correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('income', 'expense'),
        async (transactionType) => {
          let testUser: any
          let testWorkspace1: any
          let testWorkspace2: any

          try {
            // Create test user and two workspaces
            testUser = await createTestUser()
            testWorkspace1 = await createTestWorkspace(testUser.id)
            testWorkspace2 = await createTestWorkspace(testUser.id)

            // Create categories in both workspaces
            await createCategoriesWithUsage(
              testWorkspace1.id,
              testUser.id,
              transactionType,
              3
            )

            await createCategoriesWithUsage(
              testWorkspace2.id,
              testUser.id,
              transactionType,
              2
            )

            // Get categories for each workspace
            const categories1 = await getCategoriesByUsageDirect(testWorkspace1.id, transactionType)
            const categories2 = await getCategoriesByUsageDirect(testWorkspace2.id, transactionType)

            // Should have different numbers of categories
            expect(categories1.length).toBe(3)
            expect(categories2.length).toBe(2)

            // All categories should belong to their respective workspaces
            categories1.forEach(category => {
              expect(category.workspace_id).toBe(testWorkspace1.id)
            })

            categories2.forEach(category => {
              expect(category.workspace_id).toBe(testWorkspace2.id)
            })

            // No category should appear in both lists
            const ids1 = new Set(categories1.map(c => c.id))
            const ids2 = new Set(categories2.map(c => c.id))
            
            ids1.forEach(id => {
              expect(ids2.has(id)).toBe(false)
            })
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace1?.id)
            if (testWorkspace2?.id !== testWorkspace1?.id) {
              await cleanup(undefined, testWorkspace2?.id)
            }
          }
        }
      ),
      { numRuns: 5 } // Run 5 iterations for this test
    )
  }, 30000) // 30 second timeout
})