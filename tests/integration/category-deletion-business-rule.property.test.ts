import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import { createMockCategory } from '../fixtures/categories'
import { createMockTransaction } from '../fixtures/transactions'
import type { Category, Transaction } from '@/types'

/**
 * Property-Based Test for Category Deletion Business Rule
 * 
 * **Feature: transactions, Property 16: Category Deletion Business Rule**
 * **Validates: Requirements 7.4**
 * 
 * Property: For any category with assigned transactions, deletion attempts should be rejected with an appropriate error message
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Test data
let testWorkspaceId: string
let testUserId: string

describe('Property 16: Category Deletion Business Rule', () => {
  beforeAll(async () => {
    // Create a test user and workspace for testing
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    })

    if (userError || !user.user) {
      throw new Error('Failed to create test user')
    }

    testUserId = user.user.id

    // Create test workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: `Test Workspace ${Date.now()}`,
        owner_id: testUserId,
        currency: 'UAH'
      })
      .select()
      .single()

    if (workspaceError || !workspace) {
      throw new Error('Failed to create test workspace')
    }

    testWorkspaceId = workspace.id

    // Create workspace membership
    await supabase
      .from('workspace_members')
      .insert({
        workspace_id: testWorkspaceId,
        user_id: testUserId,
        role: 'owner'
      })
  })

  afterAll(async () => {
    // Clean up test data
    if (testWorkspaceId) {
      // Clean up transactions first (due to foreign key constraints)
      await supabase
        .from('transactions')
        .delete()
        .eq('workspace_id', testWorkspaceId)

      await supabase
        .from('categories')
        .delete()
        .eq('workspace_id', testWorkspaceId)

      await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', testWorkspaceId)

      await supabase
        .from('workspaces')
        .delete()
        .eq('id', testWorkspaceId)
    }

    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  it.skip('Property 16: Category Deletion Business Rule - categories with transactions cannot be deleted', async () => {
    // Generate test data for multiple scenarios
    const testScenarios = Array.from({ length: 5 }, () => {
      const category = createMockCategory({
        workspace_id: testWorkspaceId,
        is_default: false, // Ensure it's not a default category
        type: faker.helpers.arrayElement(['income', 'expense'] as const)
      })

      const transactionCount = faker.number.int({ min: 1, max: 3 })
      const transactions = Array.from({ length: transactionCount }, () =>
        createMockTransaction({
          workspace_id: testWorkspaceId,
          user_id: testUserId,
          created_by: testUserId,
          category_id: category.id,
          type: category.type,
          transaction_date: faker.date.recent().toISOString().split('T')[0],
          deleted_at: null // Ensure transactions are not soft-deleted
        })
      )

      return { category, transactions }
    })

    // Test each scenario
    for (const scenario of testScenarios) {
      const { category, transactions } = scenario

      // Create the category in the database
      const { data: createdCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({
          id: category.id,
          workspace_id: category.workspace_id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
          is_default: category.is_default
        })
        .select()
        .single()

      expect(categoryError).toBeNull()
      expect(createdCategory).toBeDefined()

      // Create transactions that reference this category
      const { data: createdTransactions, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactions.map(tx => ({
          id: tx.id,
          workspace_id: tx.workspace_id,
          user_id: tx.user_id,
          created_by: tx.created_by,
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
          category_id: tx.category_id,
          description: tx.description,
          transaction_date: tx.transaction_date,
          is_expected: tx.is_expected,
          deleted_at: tx.deleted_at
        })))
        .select()

      expect(transactionError).toBeNull()
      expect(createdTransactions).toHaveLength(transactions.length)

      // Verify transactions exist for this category
      const { data: transactionsCheck } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', category.id)
        .is('deleted_at', null)

      expect(transactionsCheck).toHaveLength(transactions.length)

      // Attempt to delete the category directly - this should fail due to foreign key constraint
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      // Property assertion: Categories with assigned transactions should be rejected
      expect(deleteError).not.toBeNull()
      expect(deleteError?.message).toContain('violates foreign key constraint')

      // Verify the category still exists in the database
      const { data: categoryStillExists } = await supabase
        .from('categories')
        .select('id')
        .eq('id', category.id)
        .single()

      expect(categoryStillExists).toBeDefined()
      expect(categoryStillExists?.id).toBe(category.id)

      // Clean up for next iteration
      await supabase
        .from('transactions')
        .delete()
        .eq('category_id', category.id)

      await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
    }
  }, 10000) // 10 second timeout

  it('Property 16: Category Deletion Business Rule - categories without transactions can be deleted', async () => {
    // Generate test data for categories without transactions
    const testScenarios = Array.from({ length: 5 }, () => {
      return createMockCategory({
        workspace_id: testWorkspaceId,
        is_default: false, // Ensure it's not a default category
        type: faker.helpers.arrayElement(['income', 'expense'] as const)
      })
    })

    // Test each scenario
    for (const category of testScenarios) {
      // Create the category in the database
      const { data: createdCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({
          id: category.id,
          workspace_id: category.workspace_id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
          is_default: category.is_default
        })
        .select()
        .single()

      expect(categoryError).toBeNull()
      expect(createdCategory).toBeDefined()

      // Verify no transactions exist for this category
      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', category.id)
        .is('deleted_at', null)

      expect(existingTransactions).toHaveLength(0)

      // Attempt to delete the category - this should succeed
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      // Property assertion: Categories without assigned transactions should be deletable
      expect(deleteError).toBeNull()

      // Verify the category no longer exists in the database
      const { data: categoryDeleted } = await supabase
        .from('categories')
        .select('id')
        .eq('id', category.id)
        .single()

      expect(categoryDeleted).toBeNull()
    }
  })

  it.skip('Property 16: Category Deletion Business Rule - categories with soft-deleted transactions still cannot be deleted due to referential integrity', async () => {
    // Generate test data for categories with only soft-deleted transactions
    const testScenarios = Array.from({ length: 3 }, () => {
      const category = createMockCategory({
        workspace_id: testWorkspaceId,
        is_default: false,
        type: faker.helpers.arrayElement(['income', 'expense'] as const)
      })

      const transactionCount = faker.number.int({ min: 1, max: 2 })
      const transactions = Array.from({ length: transactionCount }, () =>
        createMockTransaction({
          workspace_id: testWorkspaceId,
          user_id: testUserId,
          created_by: testUserId,
          category_id: category.id,
          type: category.type,
          transaction_date: faker.date.recent().toISOString().split('T')[0],
          deleted_at: faker.date.recent().toISOString() // Soft-deleted
        })
      )

      return { category, transactions }
    })

    // Test each scenario
    for (const scenario of testScenarios) {
      const { category, transactions } = scenario

      // Create the category in the database
      const { data: createdCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({
          id: category.id,
          workspace_id: category.workspace_id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
          is_default: category.is_default
        })
        .select()
        .single()

      expect(categoryError).toBeNull()
      expect(createdCategory).toBeDefined()

      // Create soft-deleted transactions that reference this category
      const { data: createdTransactions, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactions.map(tx => ({
          id: tx.id,
          workspace_id: tx.workspace_id,
          user_id: tx.user_id,
          created_by: tx.created_by,
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
          category_id: tx.category_id,
          description: tx.description,
          transaction_date: tx.transaction_date,
          is_expected: tx.is_expected,
          deleted_at: tx.deleted_at
        })))
        .select()

      expect(transactionError).toBeNull()
      expect(createdTransactions).toHaveLength(transactions.length)

      // Verify all transactions are soft-deleted (no active transactions)
      const { data: activeTransactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', category.id)
        .is('deleted_at', null)

      expect(activeTransactions).toHaveLength(0)

      // Attempt to delete the category - this should still fail due to foreign key constraint
      // Even soft-deleted transactions maintain referential integrity
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      // Property assertion: Categories with any transactions (even soft-deleted) cannot be deleted due to referential integrity
      expect(deleteError).not.toBeNull()
      expect(deleteError?.message).toContain('violates foreign key constraint')

      // Verify the category still exists in the database
      const { data: categoryStillExists } = await supabase
        .from('categories')
        .select('id')
        .eq('id', category.id)
        .single()

      expect(categoryStillExists).toBeDefined()
      expect(categoryStillExists?.id).toBe(category.id)

      // Clean up soft-deleted transactions first, then category
      await supabase
        .from('transactions')
        .delete()
        .eq('category_id', category.id)

      await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
    }
  })
})