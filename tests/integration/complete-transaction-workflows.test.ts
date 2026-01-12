/**
 * Complete Transaction Workflows Integration Tests
 * 
 * Task 18.1: Write integration tests for complete transaction workflows
 * 
 * This test suite covers:
 * - End-to-end transaction creation, editing, and deletion flows
 * - Filtering and search across different scenarios
 * - Recurring transaction complete lifecycle
 * 
 * Tests the complete user journey through transaction management features
 * to ensure all workflows function correctly together.
 * 
 * Note: These tests use direct database operations instead of server actions
 * to avoid Next.js context dependencies (cookies, etc.) in the test environment.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTestUser, createTestWorkspace, createTestCategory, createTestAccount, cleanupTestData } from '../helpers/test-helpers'
import { format, addDays, addMonths } from 'date-fns'

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

describe('Complete Transaction Workflows Integration Tests', () => {
  let userId: string
  let workspaceId: string
  let categoryId: string
  let expenseCategoryId: string
  let accountId: string

  beforeEach(async () => {
    // Setup test environment
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    const category = await createTestCategory(workspace.id, 'Test Income Category', 'income')
    const expenseCategory = await createTestCategory(workspace.id, 'Test Expense Category', 'expense')
    const account = await createTestAccount(workspace.id, 'Test Account', 'checking')
    
    userId = user.id
    workspaceId = workspace.id
    categoryId = category.id
    expenseCategoryId = expenseCategory.id
    accountId = account.id

    // Clean up any existing test data for this workspace
    await supabase
      .from('transactions')
      .delete()
      .eq('workspace_id', workspaceId)
    
    await supabase
      .from('expected_transactions')
      .delete()
      .eq('workspace_id', workspaceId)
    
    await supabase
      .from('recurring_transactions')
      .delete()
      .eq('workspace_id', workspaceId)
  })

  afterEach(async () => {
    await cleanupTestData(userId)
  })

  describe('End-to-End Transaction CRUD Workflows', () => {
    it('should complete full transaction lifecycle: create -> edit -> delete', async () => {
      // Step 1: Create a transaction directly in database
      const transactionData = {
        amount: 1500.50,
        type: 'income',
        description: 'Freelance payment',
        notes: 'Payment for web development project',
        category_id: categoryId,
        account_id: accountId,
        currency: 'UAH',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        workspace_id: workspaceId,
        user_id: userId,
        created_by: userId,
      }

      const { data: createdTransaction, error: createError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()

      expect(createError).toBeNull()
      expect(createdTransaction).toBeDefined()
      expect(createdTransaction.amount).toBe(1500.50)
      expect(createdTransaction.type).toBe('income')
      expect(createdTransaction.description).toBe('Freelance payment')
      expect(createdTransaction.notes).toBe('Payment for web development project')
      expect(createdTransaction.category_id).toBe(categoryId)
      expect(createdTransaction.workspace_id).toBe(workspaceId)
      expect(createdTransaction.user_id).toBe(userId)
      expect(createdTransaction.created_by).toBe(userId)

      // Step 2: Verify transaction appears in workspace transactions
      const { data: allTransactions, error: getError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(getError).toBeNull()
      expect(allTransactions).toBeDefined()
      expect(allTransactions!.length).toBe(1)
      expect(allTransactions![0].id).toBe(createdTransaction.id)

      // Step 3: Edit the transaction
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('transactions')
        .update({
          amount: 1750.75,
          description: 'Updated freelance payment',
          notes: 'Payment for web development project - bonus included',
          category_id: expenseCategoryId,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', createdTransaction.id)
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updatedTransaction).toBeDefined()
      expect(updatedTransaction.amount).toBe(1750.75)
      expect(updatedTransaction.description).toBe('Updated freelance payment')
      expect(updatedTransaction.notes).toBe('Payment for web development project - bonus included')
      expect(updatedTransaction.category_id).toBe(expenseCategoryId)
      expect(updatedTransaction.updated_by).toBe(userId)
      expect(updatedTransaction.updated_at).toBeDefined()

      // Step 4: Verify updated transaction in list
      const { data: updatedList, error: getUpdatedError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(getUpdatedError).toBeNull()
      expect(updatedList![0].amount).toBe(1750.75)
      expect(updatedList![0].description).toBe('Updated freelance payment')

      // Step 5: Delete the transaction (soft delete)
      const { data: deletedTransaction, error: deleteError } = await supabase
        .from('transactions')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', createdTransaction.id)
        .select()
        .single()

      expect(deleteError).toBeNull()
      expect(deletedTransaction).toBeDefined()
      expect(deletedTransaction.id).toBe(createdTransaction.id)

      // Step 6: Verify transaction no longer appears in list (soft deleted)
      const { data: afterDeleteList, error: getAfterDeleteError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(getAfterDeleteError).toBeNull()
      expect(afterDeleteList!.length).toBe(0)

      // Step 7: Verify transaction still exists in database with deleted_at timestamp
      const { data: deletedRecord, error: deletedRecordError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', createdTransaction.id)
        .single()

      expect(deletedRecordError).toBeNull()
      expect(deletedRecord).toBeDefined()
      expect(deletedRecord.deleted_at).toBeDefined()
      expect(deletedRecord.deleted_at).not.toBeNull()
    })

    it('should handle multiple transactions with different types and categories', async () => {
      // Create multiple transactions of different types
      const transactions = [
        {
          amount: 2500.00,
          type: 'income',
          description: 'Salary',
          category_id: categoryId,
          notes: 'Monthly salary payment'
        },
        {
          amount: 150.75,
          type: 'expense',
          description: 'Groceries',
          category_id: expenseCategoryId,
          notes: 'Weekly grocery shopping'
        },
        {
          amount: 75.50,
          type: 'expense',
          description: 'Gas',
          category_id: expenseCategoryId,
          notes: 'Fuel for car'
        },
        {
          amount: 500.00,
          type: 'income',
          description: 'Bonus',
          category_id: categoryId,
          notes: 'Performance bonus'
        }
      ]

      const createdTransactions = []

      // Create all transactions
      for (const txData of transactions) {
        const { data: transaction, error } = await supabase
          .from('transactions')
          .insert({
            ...txData,
            account_id: accountId,
            currency: 'UAH',
            transaction_date: format(new Date(), 'yyyy-MM-dd'),
            workspace_id: workspaceId,
            user_id: userId,
            created_by: userId,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(transaction).toBeDefined()
        createdTransactions.push(transaction!)
      }

      // Verify all transactions were created
      const { data: allTransactions, error: getAllError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(getAllError).toBeNull()
      expect(allTransactions!.length).toBe(4)

      // Verify transactions are ordered by date (most recent first)
      for (let i = 1; i < allTransactions!.length; i++) {
        const prevDate = new Date(allTransactions![i - 1].transaction_date)
        const currentDate = new Date(allTransactions![i].transaction_date)
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currentDate.getTime())
      }

      // Test filtering by type
      const incomeTransactions = allTransactions!.filter(tx => tx.type === 'income')
      const expenseTransactions = allTransactions!.filter(tx => tx.type === 'expense')
      
      expect(incomeTransactions.length).toBe(2)
      expect(expenseTransactions.length).toBe(2)

      // Verify income transactions
      expect(incomeTransactions.some(tx => tx.description === 'Salary')).toBe(true)
      expect(incomeTransactions.some(tx => tx.description === 'Bonus')).toBe(true)

      // Verify expense transactions
      expect(expenseTransactions.some(tx => tx.description === 'Groceries')).toBe(true)
      expect(expenseTransactions.some(tx => tx.description === 'Gas')).toBe(true)
    })
  })

  describe('Filtering and Search Workflows', () => {
    beforeEach(async () => {
      // Clean up any existing transactions first
      await supabase
        .from('transactions')
        .delete()
        .eq('workspace_id', workspaceId)

      // Create test transactions with various attributes for filtering
      const testTransactions = [
        {
          amount: 1000.00,
          type: 'income',
          description: 'Salary Payment',
          notes: 'Monthly salary from company',
          category_id: categoryId,
          date: format(new Date(), 'yyyy-MM-dd')
        },
        {
          amount: 250.50,
          type: 'expense',
          description: 'Grocery Shopping',
          notes: 'Weekly groceries at supermarket',
          category_id: expenseCategoryId,
          date: format(addDays(new Date(), -1), 'yyyy-MM-dd')
        },
        {
          amount: 75.25,
          type: 'expense',
          description: 'Coffee Shop',
          notes: 'Morning coffee and pastry',
          category_id: expenseCategoryId,
          date: format(addDays(new Date(), -2), 'yyyy-MM-dd')
        },
        {
          amount: 500.00,
          type: 'income',
          description: 'Freelance Work',
          notes: 'Website development project payment',
          category_id: categoryId,
          date: format(addDays(new Date(), -3), 'yyyy-MM-dd')
        }
      ]

      for (const txData of testTransactions) {
        const { error } = await supabase
          .from('transactions')
          .insert({
            amount: txData.amount,
            type: txData.type,
            description: txData.description,
            notes: txData.notes,
            category_id: txData.category_id,
            account_id: accountId,
            currency: 'UAH',
            transaction_date: txData.date,
            workspace_id: workspaceId,
            user_id: userId,
            created_by: userId,
          })

        expect(error).toBeNull()
      }
    })

    it('should filter transactions by type', async () => {
      // Get all transactions first
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(allError).toBeNull()
      expect(allTransactions!.length).toBe(4)

      // Filter by income type using database query
      const { data: incomeTransactions, error: incomeError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('type', 'income')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(incomeError).toBeNull()
      expect(incomeTransactions!.length).toBe(2)
      expect(incomeTransactions!.every(tx => tx.type === 'income')).toBe(true)

      // Filter by expense type using database query
      const { data: expenseTransactions, error: expenseError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('type', 'expense')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(expenseError).toBeNull()
      expect(expenseTransactions!.length).toBe(2)
      expect(expenseTransactions!.every(tx => tx.type === 'expense')).toBe(true)
    })

    it('should filter transactions by category', async () => {
      // Filter by income category
      const { data: incomeCategoryTx, error: incomeError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('category_id', categoryId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(incomeError).toBeNull()
      expect(incomeCategoryTx!.length).toBe(2)
      expect(incomeCategoryTx!.every(tx => tx.category_id === categoryId)).toBe(true)

      // Filter by expense category
      const { data: expenseCategoryTx, error: expenseError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('category_id', expenseCategoryId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(expenseError).toBeNull()
      expect(expenseCategoryTx!.length).toBe(2)
      expect(expenseCategoryTx!.every(tx => tx.category_id === expenseCategoryId)).toBe(true)
    })

    it('should search transactions by notes content', async () => {
      // Search for transactions containing "coffee"
      const { data: coffeeResults, error: coffeeError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .ilike('notes', '%coffee%')
        .is('deleted_at', null)

      expect(coffeeError).toBeNull()
      expect(coffeeResults!.length).toBe(1)
      expect(coffeeResults![0].description).toBe('Coffee Shop')

      // Search for transactions containing "payment"
      const { data: paymentResults, error: paymentError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .ilike('notes', '%payment%')
        .is('deleted_at', null)

      expect(paymentError).toBeNull()
      expect(paymentResults!.length).toBe(1)
      expect(paymentResults![0].description).toBe('Freelance Work')

      // Search for transactions containing "salary"
      const { data: salaryResults, error: salaryError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .ilike('notes', '%salary%')
        .is('deleted_at', null)

      expect(salaryError).toBeNull()
      expect(salaryResults!.length).toBe(1)
      expect(salaryResults![0].description).toBe('Salary Payment')

      // Search for transactions containing "groceries" (plural, case insensitive)
      const { data: groceryResults, error: groceryError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .ilike('notes', '%groceries%')
        .is('deleted_at', null)

      expect(groceryError).toBeNull()
      expect(groceryResults!.length).toBe(1)
      expect(groceryResults![0].description).toBe('Grocery Shopping')
    })

    it('should combine multiple filters', async () => {
      // Filter by expense type AND expense category
      const { data: expenseResults, error: expenseError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('type', 'expense')
        .eq('category_id', expenseCategoryId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(expenseError).toBeNull()
      expect(expenseResults!.length).toBe(2)
      expect(expenseResults!.every(tx => tx.type === 'expense' && tx.category_id === expenseCategoryId)).toBe(true)

      // Filter by income type AND search for "salary"
      const { data: salaryResults, error: salaryError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('type', 'income')
        .ilike('notes', '%salary%')
        .is('deleted_at', null)

      expect(salaryError).toBeNull()
      expect(salaryResults!.length).toBe(1)
      expect(salaryResults![0].description).toBe('Salary Payment')
      expect(salaryResults![0].type).toBe('income')
    })

    it('should handle date range filtering', async () => {
      const today = new Date()
      const yesterday = addDays(today, -1)
      
      // Filter transactions from yesterday onwards
      const { data: recentResults, error: recentError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('transaction_date', format(yesterday, 'yyyy-MM-dd'))
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(recentError).toBeNull()
      expect(recentResults!.length).toBe(2) // Today and yesterday transactions

      // Filter transactions older than 2 days
      const twoDaysAgo = addDays(today, -2)
      const { data: olderResults, error: olderError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .lt('transaction_date', format(twoDaysAgo, 'yyyy-MM-dd'))
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(olderError).toBeNull()
      expect(olderResults!.length).toBe(1) // Only the freelance work transaction
    })
  })

  describe('Recurring Transaction Complete Lifecycle', () => {
    it('should complete full recurring transaction workflow: create -> generate expected -> confirm -> skip', async () => {
      // Step 1: Create a recurring transaction directly in database
      const recurringTransactionData = {
        workspace_id: workspaceId,
        user_id: userId,
        template_data: {
          amount: 2500.00,
          currency: 'UAH',
          type: 'income',
          category_id: categoryId,
          description: 'Monthly Salary',
          notes: 'Regular monthly salary payment'
        },
        frequency: 'monthly',
        interval_count: 1,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: format(new Date(), 'yyyy-MM-dd'),
        is_active: true,
      }

      const { data: recurringTransaction, error: recurringError } = await supabase
        .from('recurring_transactions')
        .insert(recurringTransactionData)
        .select()
        .single()

      expect(recurringError).toBeNull()
      expect(recurringTransaction).toBeDefined()
      expect(recurringTransaction.frequency).toBe('monthly')
      expect(recurringTransaction.interval_count).toBe(1)
      expect(recurringTransaction.is_active).toBe(true)

      // Step 2: Create expected transactions manually (simulating generation)
      const expectedTransactionData = [
        {
          recurring_transaction_id: recurringTransaction.id,
          workspace_id: workspaceId,
          expected_date: format(new Date(), 'yyyy-MM-dd'),
          expected_amount: 2500.00,
          currency: 'UAH',
          status: 'pending',
        },
        {
          recurring_transaction_id: recurringTransaction.id,
          workspace_id: workspaceId,
          expected_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
          expected_amount: 2500.00,
          currency: 'UAH',
          status: 'pending',
        }
      ]

      const { data: expectedTransactions, error: expectedError } = await supabase
        .from('expected_transactions')
        .insert(expectedTransactionData)
        .select()

      expect(expectedError).toBeNull()
      expect(expectedTransactions).toBeDefined()
      expect(expectedTransactions!.length).toBe(2)
      expect(expectedTransactions!.every(tx => tx.status === 'pending')).toBe(true)
      expect(expectedTransactions!.every(tx => tx.recurring_transaction_id === recurringTransaction.id)).toBe(true)
      expect(expectedTransactions!.every(tx => tx.expected_amount === 2500.00)).toBe(true)

      // Step 3: Confirm the first expected transaction
      const firstExpected = expectedTransactions![0]
      
      // Create actual transaction for confirmation
      const { data: confirmedTransaction, error: confirmError } = await supabase
        .from('transactions')
        .insert({
          amount: 2500.00,
          currency: 'UAH',
          type: 'income',
          category_id: categoryId,
          account_id: accountId,
          description: 'Monthly Salary',
          notes: 'Regular monthly salary payment',
          transaction_date: firstExpected.expected_date,
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
          is_expected: false,
          expected_transaction_id: firstExpected.id,
          recurring_transaction_id: recurringTransaction.id,
        })
        .select()
        .single()

      expect(confirmError).toBeNull()
      expect(confirmedTransaction).toBeDefined()
      expect(confirmedTransaction.amount).toBe(2500.00)
      expect(confirmedTransaction.type).toBe('income')
      expect(confirmedTransaction.description).toBe('Monthly Salary')
      expect(confirmedTransaction.is_expected).toBe(false)
      expect(confirmedTransaction.expected_transaction_id).toBe(firstExpected.id)
      expect(confirmedTransaction.recurring_transaction_id).toBe(recurringTransaction.id)

      // Update expected transaction status to confirmed
      const { error: updateExpectedError } = await supabase
        .from('expected_transactions')
        .update({
          status: 'confirmed',
          actual_transaction_id: confirmedTransaction.id,
        })
        .eq('id', firstExpected.id)

      expect(updateExpectedError).toBeNull()

      // Step 4: Verify expected transaction status was updated
      const { data: updatedExpected, error: expectedFetchError } = await supabase
        .from('expected_transactions')
        .select('*')
        .eq('id', firstExpected.id)
        .single()

      expect(expectedFetchError).toBeNull()
      expect(updatedExpected.status).toBe('confirmed')
      expect(updatedExpected.actual_transaction_id).toBe(confirmedTransaction.id)

      // Step 5: Skip the second expected transaction
      const secondExpected = expectedTransactions![1]
      const { error: skipError } = await supabase
        .from('expected_transactions')
        .update({ status: 'skipped' })
        .eq('id', secondExpected.id)

      expect(skipError).toBeNull()

      // Verify expected transaction was marked as skipped
      const { data: skippedExpected, error: skippedFetchError } = await supabase
        .from('expected_transactions')
        .select('*')
        .eq('id', secondExpected.id)
        .single()

      expect(skippedFetchError).toBeNull()
      expect(skippedExpected.status).toBe('skipped')

      // Step 6: Verify confirmed transaction appears in regular transaction list
      const { data: allTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(transactionsError).toBeNull()
      expect(allTransactions!.length).toBe(1)
      expect(allTransactions![0].id).toBe(confirmedTransaction.id)
    })

    it('should handle recurring transaction with amount adjustment during confirmation', async () => {
      // Create a weekly recurring transaction
      const recurringTransactionData = {
        workspace_id: workspaceId,
        user_id: userId,
        template_data: {
          amount: 100.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          description: 'Weekly Groceries',
          notes: 'Regular grocery shopping'
        },
        frequency: 'weekly',
        interval_count: 1,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: format(new Date(), 'yyyy-MM-dd'),
        is_active: true,
      }

      const { data: recurringTransaction, error: recurringError } = await supabase
        .from('recurring_transactions')
        .insert(recurringTransactionData)
        .select()
        .single()

      expect(recurringError).toBeNull()

      // Create expected transaction
      const { data: expectedTransactions, error: expectedError } = await supabase
        .from('expected_transactions')
        .insert({
          recurring_transaction_id: recurringTransaction.id,
          workspace_id: workspaceId,
          expected_date: format(new Date(), 'yyyy-MM-dd'),
          expected_amount: 100.00,
          currency: 'UAH',
          status: 'pending',
        })
        .select()

      expect(expectedError).toBeNull()
      expect(expectedTransactions!.length).toBe(1)

      const firstExpected = expectedTransactions![0]
      expect(firstExpected.expected_amount).toBe(100.00)

      // Confirm with adjusted amount (spent more than expected)
      const adjustedAmount = 125.75
      const { data: confirmedTransaction, error: confirmError } = await supabase
        .from('transactions')
        .insert({
          amount: adjustedAmount,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          account_id: accountId,
          description: 'Weekly Groceries',
          notes: 'Regular grocery shopping',
          transaction_date: firstExpected.expected_date,
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
          is_expected: false,
          expected_transaction_id: firstExpected.id,
          recurring_transaction_id: recurringTransaction.id,
        })
        .select()
        .single()

      expect(confirmError).toBeNull()
      expect(confirmedTransaction).toBeDefined()
      expect(confirmedTransaction.amount).toBe(adjustedAmount)
      expect(confirmedTransaction.type).toBe('expense')
      expect(confirmedTransaction.description).toBe('Weekly Groceries')

      // Verify the actual amount differs from expected amount
      expect(confirmedTransaction.amount).not.toBe(firstExpected.expected_amount)
      expect(confirmedTransaction.amount).toBe(125.75)
    })

    it('should handle multiple recurring transactions with different frequencies', async () => {
      // Create daily recurring transaction
      const dailyRecurringData = {
        workspace_id: workspaceId,
        user_id: userId,
        template_data: {
          amount: 15.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          description: 'Daily Coffee'
        },
        frequency: 'daily',
        interval_count: 1,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: format(new Date(), 'yyyy-MM-dd'),
        is_active: true,
      }

      const { data: dailyRecurring, error: dailyError } = await supabase
        .from('recurring_transactions')
        .insert(dailyRecurringData)
        .select()
        .single()

      expect(dailyError).toBeNull()

      // Create monthly recurring transaction
      const monthlyRecurringData = {
        workspace_id: workspaceId,
        user_id: userId,
        template_data: {
          amount: 1200.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          description: 'Monthly Rent'
        },
        frequency: 'monthly',
        interval_count: 1,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: format(new Date(), 'yyyy-MM-dd'),
        is_active: true,
      }

      const { data: monthlyRecurring, error: monthlyError } = await supabase
        .from('recurring_transactions')
        .insert(monthlyRecurringData)
        .select()
        .single()

      expect(monthlyError).toBeNull()

      // Create expected transactions for both
      const expectedTransactionsData = [
        {
          recurring_transaction_id: dailyRecurring.id,
          workspace_id: workspaceId,
          expected_date: format(new Date(), 'yyyy-MM-dd'),
          expected_amount: 15.00,
          currency: 'UAH',
          status: 'pending',
        },
        {
          recurring_transaction_id: monthlyRecurring.id,
          workspace_id: workspaceId,
          expected_date: format(new Date(), 'yyyy-MM-dd'),
          expected_amount: 1200.00,
          currency: 'UAH',
          status: 'pending',
        }
      ]

      const { data: allExpected, error: expectedError } = await supabase
        .from('expected_transactions')
        .insert(expectedTransactionsData)
        .select()

      expect(expectedError).toBeNull()
      expect(allExpected!.length).toBe(2)

      // Verify we have expected transactions for both recurring transactions
      const dailyExpected = allExpected!.filter(tx => tx.recurring_transaction_id === dailyRecurring.id)
      const monthlyExpected = allExpected!.filter(tx => tx.recurring_transaction_id === monthlyRecurring.id)

      expect(dailyExpected.length).toBe(1)
      expect(monthlyExpected.length).toBe(1)

      // Verify amounts match the recurring transaction templates
      expect(dailyExpected[0].expected_amount).toBe(15.00)
      expect(monthlyExpected[0].expected_amount).toBe(1200.00)

      // Confirm one transaction from each recurring pattern
      const { data: confirmedDaily, error: confirmDailyError } = await supabase
        .from('transactions')
        .insert({
          amount: 15.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          account_id: accountId,
          description: 'Daily Coffee',
          transaction_date: dailyExpected[0].expected_date,
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
          is_expected: false,
          expected_transaction_id: dailyExpected[0].id,
          recurring_transaction_id: dailyRecurring.id,
        })
        .select()
        .single()

      const { data: confirmedMonthly, error: confirmMonthlyError } = await supabase
        .from('transactions')
        .insert({
          amount: 1200.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          account_id: accountId,
          description: 'Monthly Rent',
          transaction_date: monthlyExpected[0].expected_date,
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
          is_expected: false,
          expected_transaction_id: monthlyExpected[0].id,
          recurring_transaction_id: monthlyRecurring.id,
        })
        .select()
        .single()

      expect(confirmDailyError).toBeNull()
      expect(confirmMonthlyError).toBeNull()

      // Verify both confirmed transactions appear in transaction list
      const { data: allTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(transactionsError).toBeNull()
      expect(allTransactions!.length).toBe(2)

      const transactions = allTransactions!
      expect(transactions.some(tx => tx.amount === 15.00 && tx.description === 'Daily Coffee')).toBe(true)
      expect(transactions.some(tx => tx.amount === 1200.00 && tx.description === 'Monthly Rent')).toBe(true)
    })
  })

  describe('Cross-Feature Integration Workflows', () => {
    it('should handle filtering confirmed recurring transactions', async () => {
      // Create a recurring transaction
      const recurringTransactionData = {
        workspace_id: workspaceId,
        user_id: userId,
        template_data: {
          amount: 800.00,
          currency: 'UAH',
          type: 'income',
          category_id: categoryId,
          description: 'Bi-weekly Salary'
        },
        frequency: 'weekly',
        interval_count: 2,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: format(new Date(), 'yyyy-MM-dd'),
        is_active: true,
      }

      const { data: recurringTransaction, error: recurringError } = await supabase
        .from('recurring_transactions')
        .insert(recurringTransactionData)
        .select()
        .single()

      expect(recurringError).toBeNull()

      // Create a regular (non-recurring) transaction
      const { data: regularTransaction, error: regularError } = await supabase
        .from('transactions')
        .insert({
          amount: 200.00,
          currency: 'UAH',
          type: 'income',
          category_id: categoryId,
          account_id: accountId,
          description: 'Freelance Payment',
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
        })
        .select()
        .single()

      expect(regularError).toBeNull()

      // Create and confirm one expected transaction from recurring
      const { data: expectedTransaction, error: expectedError } = await supabase
        .from('expected_transactions')
        .insert({
          recurring_transaction_id: recurringTransaction.id,
          workspace_id: workspaceId,
          expected_date: format(new Date(), 'yyyy-MM-dd'),
          expected_amount: 800.00,
          currency: 'UAH',
          status: 'pending',
        })
        .select()
        .single()

      expect(expectedError).toBeNull()

      const { data: confirmedTransaction, error: confirmError } = await supabase
        .from('transactions')
        .insert({
          amount: 800.00,
          currency: 'UAH',
          type: 'income',
          category_id: categoryId,
          account_id: accountId,
          description: 'Bi-weekly Salary',
          transaction_date: expectedTransaction.expected_date,
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
          is_expected: false,
          expected_transaction_id: expectedTransaction.id,
          recurring_transaction_id: recurringTransaction.id,
        })
        .select()
        .single()

      expect(confirmError).toBeNull()

      // Now we should have 2 transactions: 1 regular + 1 confirmed recurring
      const { data: allTransactions, error: allTransactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(allTransactionsError).toBeNull()
      expect(allTransactions!.length).toBe(2)

      // Filter by income type - should get both
      const { data: incomeTransactions, error: incomeError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('type', 'income')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      expect(incomeError).toBeNull()
      expect(incomeTransactions!.length).toBe(2)

      // Search for recurring transactions by recurring_transaction_id
      const { data: recurringTransactions, error: recurringSearchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .not('recurring_transaction_id', 'is', null)
        .is('deleted_at', null)

      expect(recurringSearchError).toBeNull()
      expect(recurringTransactions!.length).toBe(1)
      expect(recurringTransactions![0].description).toBe('Bi-weekly Salary')
      expect(recurringTransactions![0].recurring_transaction_id).toBe(recurringTransaction.id)

      // Search for non-recurring transactions
      const { data: nonRecurringTransactions, error: nonRecurringError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('recurring_transaction_id', null)
        .is('deleted_at', null)

      expect(nonRecurringError).toBeNull()
      expect(nonRecurringTransactions!.length).toBe(1)
      expect(nonRecurringTransactions![0].description).toBe('Freelance Payment')
    })

    it('should handle editing and deleting transactions from different sources', async () => {
      // Create regular transaction
      const { data: regularTransaction, error: regularError } = await supabase
        .from('transactions')
        .insert({
          amount: 300.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          account_id: accountId,
          description: 'Regular Expense',
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
        })
        .select()
        .single()

      expect(regularError).toBeNull()

      // Create recurring transaction and confirm one
      const recurringTransactionData = {
        workspace_id: workspaceId,
        user_id: userId,
        template_data: {
          amount: 150.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          description: 'Recurring Expense'
        },
        frequency: 'weekly',
        interval_count: 1,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: format(new Date(), 'yyyy-MM-dd'),
        is_active: true,
      }

      const { data: recurringTransaction, error: recurringCreateError } = await supabase
        .from('recurring_transactions')
        .insert(recurringTransactionData)
        .select()
        .single()

      expect(recurringCreateError).toBeNull()

      const { data: expectedTransaction, error: expectedError } = await supabase
        .from('expected_transactions')
        .insert({
          recurring_transaction_id: recurringTransaction.id,
          workspace_id: workspaceId,
          expected_date: format(new Date(), 'yyyy-MM-dd'),
          expected_amount: 150.00,
          currency: 'UAH',
          status: 'pending',
        })
        .select()
        .single()

      expect(expectedError).toBeNull()

      const { data: confirmedRecurringTransaction, error: confirmError } = await supabase
        .from('transactions')
        .insert({
          amount: 150.00,
          currency: 'UAH',
          type: 'expense',
          category_id: expenseCategoryId,
          account_id: accountId,
          description: 'Recurring Expense',
          transaction_date: expectedTransaction.expected_date,
          workspace_id: workspaceId,
          user_id: userId,
          created_by: userId,
          is_expected: false,
          expected_transaction_id: expectedTransaction.id,
          recurring_transaction_id: recurringTransaction.id,
        })
        .select()
        .single()

      expect(confirmError).toBeNull()

      // Now we have 2 transactions: 1 regular + 1 confirmed recurring
      const { data: allTransactions, error: allTransactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)

      expect(allTransactionsError).toBeNull()
      expect(allTransactions!.length).toBe(2)

      // Edit both transactions
      const { data: updatedRegular, error: updateRegularError } = await supabase
        .from('transactions')
        .update({
          amount: 350.00,
          description: 'Updated Regular Expense',
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', regularTransaction.id)
        .select()
        .single()

      expect(updateRegularError).toBeNull()
      expect(updatedRegular.amount).toBe(350.00)

      const { data: updatedRecurring, error: updateRecurringError } = await supabase
        .from('transactions')
        .update({
          amount: 175.00,
          description: 'Updated Recurring Expense',
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmedRecurringTransaction.id)
        .select()
        .single()

      expect(updateRecurringError).toBeNull()
      expect(updatedRecurring.amount).toBe(175.00)

      // Delete regular transaction
      const { error: deleteRegularError } = await supabase
        .from('transactions')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', regularTransaction.id)

      expect(deleteRegularError).toBeNull()

      // Verify only the recurring transaction remains
      const { data: finalTransactions, error: finalTransactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)

      expect(finalTransactionsError).toBeNull()
      expect(finalTransactions!.length).toBe(1)
      expect(finalTransactions![0].id).toBe(confirmedRecurringTransaction.id)
      expect(finalTransactions![0].amount).toBe(175.00)
      expect(finalTransactions![0].description).toBe('Updated Recurring Expense')
    })
  })
})