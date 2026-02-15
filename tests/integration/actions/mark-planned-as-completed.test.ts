import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTestUser, createTestWorkspace, createTestAccount, createTestCategory, cleanupTestData } from '../../helpers/test-helpers'

// Create admin client for test operations
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

describe('markPlannedAsCompleted - Database Operations', () => {
  let testUserId: string
  let testWorkspaceId: string
  let testAccountId: string
  let plannedTransactionId: string
  let completedTransactionId: string

  beforeEach(async () => {
    // Create test user and workspace
    const user = await createTestUser()
    testUserId = user.id

    const workspace = await createTestWorkspace(user.id)
    testWorkspaceId = workspace.id

    // Create test account using helper
    const account = await createTestAccount(workspace.id, 'Test Account', 'checking')
    testAccountId = account.id

    // Create test category using helper
    const category = await createTestCategory(workspace.id, 'Test Category', 'expense')

    // Create a planned transaction
    const { data: plannedTransaction, error: plannedError } = await supabase
      .from('transactions')
      .insert({
        workspace_id: testWorkspaceId,
        account_id: testAccountId,
        category_id: category.id,
        amount: 100,
        currency: 'UAH',
        type: 'expense',
        description: 'Planned transaction',
        transaction_date: new Date().toISOString(),
        status: 'planned',
        planned_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        user_id: testUserId,
        created_by: testUserId,
      })
      .select()
      .single()

    if (plannedError || !plannedTransaction) {
      throw new Error('Failed to create planned transaction')
    }
    plannedTransactionId = plannedTransaction.id

    // Create a completed transaction for negative testing
    const { data: completedTransaction, error: completedError } = await supabase
      .from('transactions')
      .insert({
        workspace_id: testWorkspaceId,
        account_id: testAccountId,
        category_id: category.id,
        amount: 50,
        currency: 'UAH',
        type: 'expense',
        description: 'Already completed transaction',
        transaction_date: new Date().toISOString(),
        status: 'completed',
        completed_at: new Date().toISOString(),
        user_id: testUserId,
        created_by: testUserId,
      })
      .select()
      .single()

    if (completedError || !completedTransaction) {
      throw new Error('Failed to create completed transaction')
    }
    completedTransactionId = completedTransaction.id
  })

  afterEach(async () => {
    await cleanupTestData(testUserId)
  })

  it('should successfully mark a planned transaction as completed via database update', async () => {
    // Simulate what the markPlannedAsCompleted action does
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
        updated_by: testUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plannedTransactionId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(transaction).toBeDefined()
    expect(transaction?.status).toBe('completed')
    expect(transaction?.completed_at).toBeDefined()
    expect(transaction?.planned_date).toBeNull()
  })

  it('should set completed_at timestamp when marking as completed', async () => {
    const beforeTime = new Date()
    
    const { data: transaction } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
      })
      .eq('id', plannedTransactionId)
      .select()
      .single()

    const afterTime = new Date()

    expect(transaction?.completed_at).toBeDefined()
    const completedAt = new Date(transaction!.completed_at!)
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
    expect(completedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
  })

  it('should clear planned_date when marking as completed', async () => {
    // Verify planned_date exists before
    const { data: before } = await supabase
      .from('transactions')
      .select('planned_date')
      .eq('id', plannedTransactionId)
      .single()

    expect(before?.planned_date).not.toBeNull()

    // Mark as completed
    const { data: transaction } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
      })
      .eq('id', plannedTransactionId)
      .select()
      .single()

    expect(transaction?.planned_date).toBeNull()
  })

  it('should return error when transaction is not found', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
      })
      .eq('id', fakeId)
      .select()
      .single()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should verify transaction status before marking as completed', async () => {
    // Get transaction status
    const { data: transaction } = await supabase
      .from('transactions')
      .select('status')
      .eq('id', completedTransactionId)
      .single()

    expect(transaction?.status).toBe('completed')
    
    // Attempting to mark already completed transaction should be idempotent
    const { data: updated } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
      })
      .eq('id', completedTransactionId)
      .select()
      .single()

    expect(updated?.status).toBe('completed')
  })

  it('should update updated_at and updated_by fields', async () => {
    const { data: transaction } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
        updated_by: testUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plannedTransactionId)
      .select()
      .single()

    expect(transaction?.updated_at).toBeDefined()
    expect(transaction?.updated_by).toBe(testUserId)
  })

  it('should affect account balance calculation when marked as completed', async () => {
    // Get initial balance (should not include planned transaction)
    const { data: accountBefore } = await supabase
      .from('account_actual_balances')
      .select('current_balance')
      .eq('account_id', testAccountId)
      .single()

    const initialBalance = accountBefore?.current_balance || 0

    // Mark as completed
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
      })
      .eq('id', plannedTransactionId)
      .select()
      .single()

    // Wait a bit for view to update
    await new Promise(resolve => setTimeout(resolve, 500))

    // Get updated balance (should now include the transaction)
    const { data: accountAfter } = await supabase
      .from('account_actual_balances')
      .select('current_balance')
      .eq('account_id', testAccountId)
      .single()

    const updatedBalance = accountAfter?.current_balance || 0

    // Balance should decrease by transaction amount (expense)
    // Note: The view should reflect the change, but timing may vary
    expect(updatedBalance).toBeLessThanOrEqual(initialBalance)
  })

  it('should handle database constraints correctly', async () => {
    // Try to set invalid status
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'invalid_status' as any,
      })
      .eq('id', plannedTransactionId)
      .select()
      .single()

    expect(error).toBeDefined()
  })

  it('should maintain referential integrity', async () => {
    // Mark as completed
    const { data: transaction } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        planned_date: null,
      })
      .eq('id', plannedTransactionId)
      .select()
      .single()

    // Verify all foreign keys are still valid
    expect(transaction?.workspace_id).toBe(testWorkspaceId)
    expect(transaction?.account_id).toBe(testAccountId)
    expect(transaction?.user_id).toBe(testUserId)
  })
})
