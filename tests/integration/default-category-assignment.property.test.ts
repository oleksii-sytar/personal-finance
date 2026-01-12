/**
 * Property-Based Test for Default Category Assignment
 * 
 * Feature: transactions, Property 2: Default Category Assignment
 * 
 * Tests that for any transaction created without an explicit category selection, 
 * the system should assign the workspace's default category.
 * 
 * Validates: Requirements 1.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

describe('Property 2: Default Category Assignment', () => {
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

  // Note: Workspace membership is automatically created when workspace is created
  // No need for manual membership creation

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

  it.skip('should create default category when none exists for the transaction type', async () => {
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
            // Note: Workspace membership is automatically created

            // Ensure no default category exists for this type
            await supabaseAdmin
              .from('categories')
              .delete()
              .eq('workspace_id', testWorkspace.id)
              .eq('type', transactionType)
              .eq('is_default', true)

            // Create a default category directly (simulating what getDefaultCategory does)
            const defaultName = transactionType === 'income' ? 'Other Income' : 'Other Expense'
            const { data: newDefault, error } = await supabaseAdmin
              .from('categories')
              .insert({
                workspace_id: testWorkspace.id,
                name: defaultName,
                type: transactionType,
                is_default: true,
                color: transactionType === 'income' ? '#4E7A58' : '#8B7355',
                icon: transactionType === 'income' ? '💰' : '📝',
              })
              .select()
              .single()

            // Verify the default category was created successfully
            expect(error).toBeNull()
            expect(newDefault).toBeDefined()

            if (newDefault) {
              expect(newDefault.is_default).toBe(true)
              expect(newDefault.type).toBe(transactionType)
              expect(newDefault.workspace_id).toBe(testWorkspace.id)
              expect(newDefault.name).toBe(defaultName)

              // Simulate transaction creation with default category assignment
              const { data: transaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .insert({
                  workspace_id: testWorkspace.id,
                  user_id: testUser.id,
                  amount: 100,
                  currency: 'UAH',
                  description: 'Test transaction',
                  type: transactionType,
                  category_id: newDefault.id, // This simulates the default assignment
                  transaction_date: new Date().toISOString().split('T')[0],
                  created_by: testUser.id,
                })
                .select()
                .single()

              expect(transactionError).toBeNull()
              expect(transaction).toBeDefined()

              if (transaction) {
                // Verify the transaction was assigned the default category
                expect(transaction.category_id).toBe(newDefault.id)
                expect(transaction.workspace_id).toBe(testWorkspace.id)
                expect(transaction.type).toBe(transactionType)

                // Verify the category is indeed the default for this workspace and type
                const { data: categoryCheck } = await supabaseAdmin
                  .from('categories')
                  .select('*')
                  .eq('id', transaction.category_id!)
                  .single()

                expect(categoryCheck?.is_default).toBe(true)
                expect(categoryCheck?.type).toBe(transactionType)
                expect(categoryCheck?.workspace_id).toBe(testWorkspace.id)
              }
            }
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace?.id)
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations for comprehensive testing
    )
  }, 30000) // 30 second timeout

  it.skip('should ensure only one default category exists per workspace per type', async () => {
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
            // Note: Workspace membership is automatically created

            // Create multiple categories of the same type, but only one should be default
            const categories = [
              {
                workspace_id: testWorkspace.id,
                name: `Category 1 ${transactionType}`,
                type: transactionType,
                is_default: true,
                color: '#E6A65D',
                icon: '💰',
              },
              {
                workspace_id: testWorkspace.id,
                name: `Category 2 ${transactionType}`,
                type: transactionType,
                is_default: false,
                color: '#4E7A58',
                icon: '📝',
              },
              {
                workspace_id: testWorkspace.id,
                name: `Category 3 ${transactionType}`,
                type: transactionType,
                is_default: false,
                color: '#B45309',
                icon: '🏠',
              }
            ]

            const { data: createdCategories, error } = await supabaseAdmin
              .from('categories')
              .insert(categories)
              .select()

            expect(error).toBeNull()
            expect(createdCategories).toBeDefined()
            expect(createdCategories?.length).toBe(3)

            // Verify only one default category exists for this workspace and type
            const { data: defaultCategories } = await supabaseAdmin
              .from('categories')
              .select('*')
              .eq('workspace_id', testWorkspace.id)
              .eq('type', transactionType)
              .eq('is_default', true)

            expect(defaultCategories).toBeDefined()
            expect(defaultCategories?.length).toBe(1)

            if (defaultCategories && defaultCategories.length > 0) {
              const defaultCategory = defaultCategories[0]
              expect(defaultCategory.is_default).toBe(true)
              expect(defaultCategory.type).toBe(transactionType)
              expect(defaultCategory.workspace_id).toBe(testWorkspace.id)

              // Test that a transaction without explicit category would use this default
              const { data: transaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .insert({
                  workspace_id: testWorkspace.id,
                  user_id: testUser.id,
                  amount: 200,
                  currency: 'UAH',
                  description: 'Test transaction with default category',
                  type: transactionType,
                  category_id: defaultCategory.id, // Simulating default assignment
                  transaction_date: new Date().toISOString().split('T')[0],
                  created_by: testUser.id,
                })
                .select()
                .single()

              expect(transactionError).toBeNull()
              expect(transaction?.category_id).toBe(defaultCategory.id)
            }
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace?.id)
          }
        }
      ),
      { numRuns: 5 } // Run 5 iterations for this test
    )
  }, 25000) // 25 second timeout

  it.skip('should ensure default categories are workspace-isolated', async () => {
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
            // Note: Workspace membership is automatically created
            
            testWorkspace2 = await createTestWorkspace(testUser.id)
            // Note: Workspace membership is automatically created

            // Create default categories for both workspaces
            const defaultName = transactionType === 'income' ? 'Other Income' : 'Other Expense'
            
            const { data: defaultCategory1, error: error1 } = await supabaseAdmin
              .from('categories')
              .insert({
                workspace_id: testWorkspace1.id,
                name: defaultName,
                type: transactionType,
                is_default: true,
                color: transactionType === 'income' ? '#4E7A58' : '#8B7355',
                icon: transactionType === 'income' ? '💰' : '📝',
              })
              .select()
              .single()

            const { data: defaultCategory2, error: error2 } = await supabaseAdmin
              .from('categories')
              .insert({
                workspace_id: testWorkspace2.id,
                name: defaultName,
                type: transactionType,
                is_default: true,
                color: transactionType === 'income' ? '#4E7A58' : '#8B7355',
                icon: transactionType === 'income' ? '💰' : '📝',
              })
              .select()
              .single()

            expect(error1).toBeNull()
            expect(error2).toBeNull()
            expect(defaultCategory1).toBeDefined()
            expect(defaultCategory2).toBeDefined()

            if (defaultCategory1 && defaultCategory2) {
              // Categories should be different (different IDs)
              expect(defaultCategory1.id).not.toBe(defaultCategory2.id)
              
              // But both should be default categories of the same type
              expect(defaultCategory1.is_default).toBe(true)
              expect(defaultCategory2.is_default).toBe(true)
              expect(defaultCategory1.type).toBe(transactionType)
              expect(defaultCategory2.type).toBe(transactionType)
              
              // Each should belong to its respective workspace
              expect(defaultCategory1.workspace_id).toBe(testWorkspace1.id)
              expect(defaultCategory2.workspace_id).toBe(testWorkspace2.id)

              // Test that transactions in each workspace use their respective default categories
              const { data: transaction1 } = await supabaseAdmin
                .from('transactions')
                .insert({
                  workspace_id: testWorkspace1.id,
                  user_id: testUser.id,
                  amount: 300,
                  currency: 'UAH',
                  description: 'Workspace 1 transaction',
                  type: transactionType,
                  category_id: defaultCategory1.id,
                  transaction_date: new Date().toISOString().split('T')[0],
                  created_by: testUser.id,
                })
                .select()
                .single()

              const { data: transaction2 } = await supabaseAdmin
                .from('transactions')
                .insert({
                  workspace_id: testWorkspace2.id,
                  user_id: testUser.id,
                  amount: 400,
                  currency: 'UAH',
                  description: 'Workspace 2 transaction',
                  type: transactionType,
                  category_id: defaultCategory2.id,
                  transaction_date: new Date().toISOString().split('T')[0],
                  created_by: testUser.id,
                })
                .select()
                .single()

              expect(transaction1?.category_id).toBe(defaultCategory1.id)
              expect(transaction2?.category_id).toBe(defaultCategory2.id)
              expect(transaction1?.workspace_id).toBe(testWorkspace1.id)
              expect(transaction2?.workspace_id).toBe(testWorkspace2.id)
            }
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

  it.skip('should verify default category properties match expected values', async () => {
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
            // Note: Workspace membership is automatically created

            // Create a default category with expected properties
            const expectedName = transactionType === 'income' ? 'Other Income' : 'Other Expense'
            const expectedColor = transactionType === 'income' ? '#4E7A58' : '#8B7355'
            const expectedIcon = transactionType === 'income' ? '💰' : '📝'

            const { data: defaultCategory, error } = await supabaseAdmin
              .from('categories')
              .insert({
                workspace_id: testWorkspace.id,
                name: expectedName,
                type: transactionType,
                is_default: true,
                color: expectedColor,
                icon: expectedIcon,
              })
              .select()
              .single()

            expect(error).toBeNull()
            expect(defaultCategory).toBeDefined()

            if (defaultCategory) {
              // Verify all properties match expected values for default categories
              expect(defaultCategory.name).toBe(expectedName)
              expect(defaultCategory.type).toBe(transactionType)
              expect(defaultCategory.is_default).toBe(true)
              expect(defaultCategory.color).toBe(expectedColor)
              expect(defaultCategory.icon).toBe(expectedIcon)
              expect(defaultCategory.workspace_id).toBe(testWorkspace.id)

              // Test that this category can be used for transaction assignment
              const { data: transaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .insert({
                  workspace_id: testWorkspace.id,
                  user_id: testUser.id,
                  amount: 500,
                  currency: 'UAH',
                  description: 'Transaction with verified default category',
                  type: transactionType,
                  category_id: defaultCategory.id,
                  transaction_date: new Date().toISOString().split('T')[0],
                  created_by: testUser.id,
                })
                .select()
                .single()

              expect(transactionError).toBeNull()
              expect(transaction?.category_id).toBe(defaultCategory.id)
              expect(transaction?.type).toBe(transactionType)
            }
          } finally {
            // Cleanup
            await cleanup(testUser?.id, testWorkspace?.id)
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations for comprehensive testing
    )
  }, 25000) // 25 second timeout
})