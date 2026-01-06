import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Category Management System Integration Tests
 * Tests the complete category management functionality
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

describe('Category Management System Integration', () => {
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

  it('should create default categories for a workspace', async () => {
    // Test that default categories can be created
    const defaultCategories = [
      { name: 'Food & Dining', type: 'expense', icon: '🍽️', color: '#8B7355', is_default: false },
      { name: 'Other Income', type: 'income', icon: '💰', color: '#4E7A58', is_default: true },
      { name: 'Other Expense', type: 'expense', icon: '📝', color: '#8B7355', is_default: true },
    ]

    const { data: categories, error } = await supabase
      .from('categories')
      .insert(
        defaultCategories.map(cat => ({
          ...cat,
          workspace_id: testWorkspaceId,
        }))
      )
      .select()

    expect(error).toBeNull()
    expect(categories).toHaveLength(3)
    expect(categories?.some(c => c.is_default && c.type === 'income')).toBe(true)
    expect(categories?.some(c => c.is_default && c.type === 'expense')).toBe(true)
  })

  it('should enforce category type constraints', async () => {
    // Test that only valid types are accepted
    const { error } = await supabase
      .from('categories')
      .insert({
        workspace_id: testWorkspaceId,
        name: 'Invalid Category',
        type: 'invalid_type_that_is_too_long', // This should fail due to length and constraint
        color: '#000000',
        icon: '❌'
      })

    expect(error).not.toBeNull()
    // The error could be either a check constraint violation or length violation
    expect(error?.message).toMatch(/(violates check constraint|value too long for type)/)
  })

  it('should enforce workspace isolation', async () => {
    // Create another workspace
    const { data: otherWorkspace } = await supabase
      .from('workspaces')
      .insert({
        name: `Other Workspace ${Date.now()}`,
        owner_id: testUserId,
        currency: 'UAH'
      })
      .select()
      .single()

    if (!otherWorkspace) {
      throw new Error('Failed to create other workspace')
    }

    // Create category in first workspace
    const { data: category1 } = await supabase
      .from('categories')
      .insert({
        workspace_id: testWorkspaceId,
        name: 'Workspace 1 Category',
        type: 'expense',
        color: '#000000',
        icon: '📁'
      })
      .select()
      .single()

    // Create category in second workspace
    const { data: category2 } = await supabase
      .from('categories')
      .insert({
        workspace_id: otherWorkspace.id,
        name: 'Workspace 2 Category',
        type: 'expense',
        color: '#000000',
        icon: '📂'
      })
      .select()
      .single()

    // Verify categories are isolated by workspace
    const { data: workspace1Categories } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', testWorkspaceId)

    const { data: workspace2Categories } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', otherWorkspace.id)

    expect(workspace1Categories?.some(c => c.id === category1?.id)).toBe(true)
    expect(workspace1Categories?.some(c => c.id === category2?.id)).toBe(false)
    expect(workspace2Categories?.some(c => c.id === category2?.id)).toBe(true)
    expect(workspace2Categories?.some(c => c.id === category1?.id)).toBe(false)

    // Clean up
    await supabase.from('categories').delete().eq('workspace_id', otherWorkspace.id)
    await supabase.from('workspaces').delete().eq('id', otherWorkspace.id)
  })

  it('should support category usage tracking through transactions', async () => {
    // Create a category
    const { data: category } = await supabase
      .from('categories')
      .insert({
        workspace_id: testWorkspaceId,
        name: 'Usage Test Category',
        type: 'expense',
        color: '#000000',
        icon: '📊'
      })
      .select()
      .single()

    expect(category).toBeDefined()

    // Create some transactions using this category
    const { data: transactions } = await supabase
      .from('transactions')
      .insert([
        {
          workspace_id: testWorkspaceId,
          user_id: testUserId,
          created_by: testUserId,
          amount: 100,
          currency: 'UAH',
          type: 'expense',
          category_id: category?.id,
          description: 'Test transaction 1',
          transaction_date: new Date().toISOString().split('T')[0]
        },
        {
          workspace_id: testWorkspaceId,
          user_id: testUserId,
          created_by: testUserId,
          amount: 200,
          currency: 'UAH',
          type: 'expense',
          category_id: category?.id,
          description: 'Test transaction 2',
          transaction_date: new Date().toISOString().split('T')[0]
        }
      ])
      .select()

    expect(transactions).toHaveLength(2)

    // Query category with transaction count
    const { data: categoryWithUsage } = await supabase
      .from('categories')
      .select(`
        *,
        transactions!left(id)
      `)
      .eq('id', category?.id)
      .single()

    expect(categoryWithUsage).toBeDefined()
    expect(Array.isArray(categoryWithUsage?.transactions)).toBe(true)
    expect(categoryWithUsage?.transactions).toHaveLength(2)

    // Clean up transactions
    await supabase
      .from('transactions')
      .delete()
      .eq('category_id', category?.id)
  })

  it('should handle category deletion constraints', async () => {
    // Create a category
    const { data: category } = await supabase
      .from('categories')
      .insert({
        workspace_id: testWorkspaceId,
        name: 'Deletion Test Category',
        type: 'expense',
        color: '#000000',
        icon: '🗑️'
      })
      .select()
      .single()

    // Create a transaction using this category
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        workspace_id: testWorkspaceId,
        user_id: testUserId,
        created_by: testUserId,
        amount: 100,
        currency: 'UAH',
        type: 'expense',
        category_id: category?.id,
        description: 'Test transaction for deletion',
        transaction_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    expect(transaction).toBeDefined()

    // Try to delete category with transactions - should fail due to foreign key constraint
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', category?.id)

    expect(deleteError).not.toBeNull()
    expect(deleteError?.message).toContain('violates foreign key constraint')

    // Clean up transaction first, then category
    await supabase.from('transactions').delete().eq('id', transaction?.id)
    const { error: deleteAfterCleanup } = await supabase
      .from('categories')
      .delete()
      .eq('id', category?.id)

    expect(deleteAfterCleanup).toBeNull()
  })
})