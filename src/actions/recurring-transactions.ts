'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { 
  recurringTransactionSchema, 
  expectedTransactionSchema,
  createTransactionSchema 
} from '@/lib/validations/transaction'
import { 
  getUserWorkspaceContext,
  authorizeTransactionCreate 
} from '@/lib/middleware'
import type { 
  ActionResult, 
  RecurringTransaction, 
  ExpectedTransaction, 
  Transaction,
  RecurrenceFrequency 
} from '@/types'
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns'

/**
 * Creates a new recurring transaction template
 * Implements Requirements 9.1, 9.2: Mark transactions as recurring with frequency options
 * 
 * @param formData - Form data containing recurring transaction details
 * @returns ActionResult with created recurring transaction or error
 */
export async function createRecurringTransaction(
  formData: FormData
): Promise<ActionResult<RecurringTransaction>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get workspace context
    const contextResult = await getUserWorkspaceContext()
    if (!contextResult.authorized || !contextResult.workspaceId) {
      return { error: contextResult.error || 'No workspace found' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    
    // Parse template data from form
    const templateData = {
      amount: Number(rawData.amount),
      currency: (rawData.currency as string) || 'UAH',
      type: rawData.type as 'income' | 'expense',
      category_id: rawData.category_id as string || undefined,
      description: rawData.description as string || undefined,
      notes: rawData.notes as string || undefined,
    }

    const validated = recurringTransactionSchema.safeParse({
      workspace_id: contextResult.workspaceId,
      user_id: user.id,
      template_data: templateData,
      frequency: rawData.frequency as RecurrenceFrequency,
      interval_count: Number(rawData.interval_count) || 1,
      start_date: new Date(rawData.start_date as string),
      end_date: rawData.end_date ? new Date(rawData.end_date as string) : undefined,
      next_due_date: new Date(rawData.start_date as string), // Initially same as start date
      is_active: true,
    })

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Authorize workspace access
    const authResult = await authorizeTransactionCreate(contextResult.workspaceId)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Create recurring transaction
    const { data: recurringTransaction, error } = await supabase
      .from('recurring_transactions')
      .insert(validated.data)
      .select()
      .single()

    if (error) {
      console.error('Recurring transaction creation error:', error)
      return { error: 'Failed to create recurring transaction' }
    }

    // Generate initial expected transactions (next 3 months)
    await generateExpectedTransactions(recurringTransaction.id, contextResult.workspaceId)

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: recurringTransaction }
  } catch (error) {
    console.error('Error in createRecurringTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Updates an existing recurring transaction
 * 
 * @param id - Recurring transaction ID to update
 * @param formData - Form data with updated values
 * @returns ActionResult with updated recurring transaction or error
 */
export async function updateRecurringTransaction(
  id: string,
  formData: FormData
): Promise<ActionResult<RecurringTransaction>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get existing recurring transaction to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return { error: 'Recurring transaction not found' }
    }

    // Authorize workspace access
    const authResult = await authorizeTransactionCreate(existing.workspace_id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Parse and validate update data
    const rawData = Object.fromEntries(formData)
    const updateData: Partial<typeof existing> = {}

    if (rawData.frequency) {
      updateData.frequency = rawData.frequency as RecurrenceFrequency
    }
    
    if (rawData.interval_count) {
      updateData.interval_count = Number(rawData.interval_count)
    }
    
    if (rawData.end_date) {
      updateData.end_date = rawData.end_date as string
    }
    
    if (rawData.is_active !== undefined) {
      updateData.is_active = rawData.is_active === 'true'
    }

    // Update template data if provided
    if (rawData.amount || rawData.description || rawData.category_id) {
      const currentTemplate = existing.template_data as any
      updateData.template_data = {
        ...currentTemplate,
        ...(rawData.amount && { amount: Number(rawData.amount) }),
        ...(rawData.description && { description: rawData.description }),
        ...(rawData.category_id && { category_id: rawData.category_id }),
        ...(rawData.notes && { notes: rawData.notes }),
      }
    }

    // Update recurring transaction
    const { data: recurringTransaction, error } = await supabase
      .from('recurring_transactions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Recurring transaction update error:', error)
      return { error: 'Failed to update recurring transaction' }
    }

    // Regenerate expected transactions if frequency or interval changed
    if (updateData.frequency || updateData.interval_count) {
      await generateExpectedTransactions(id, existing.workspace_id)
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: recurringTransaction }
  } catch (error) {
    console.error('Error in updateRecurringTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Deletes a recurring transaction and its expected transactions
 * 
 * @param id - Recurring transaction ID to delete
 * @returns ActionResult with success status or error
 */
export async function deleteRecurringTransaction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get existing recurring transaction to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('workspace_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return { error: 'Recurring transaction not found' }
    }

    // Authorize workspace access
    const authResult = await authorizeTransactionCreate(existing.workspace_id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Delete expected transactions first (cascade will handle this, but being explicit)
    await supabase
      .from('expected_transactions')
      .delete()
      .eq('recurring_transaction_id', id)

    // Delete recurring transaction
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Recurring transaction deletion error:', error)
      return { error: 'Failed to delete recurring transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: { id } }
  } catch (error) {
    console.error('Error in deleteRecurringTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Confirms an expected transaction by creating an actual transaction
 * Implements Requirements 9.6, 9.7: Allow confirmation with amount adjustment
 * 
 * @param expectedTransactionId - Expected transaction ID to confirm
 * @param actualAmount - Optional actual amount (if different from expected)
 * @returns ActionResult with created transaction or error
 */
export async function confirmExpectedTransaction(
  expectedTransactionId: string,
  actualAmount?: number
): Promise<ActionResult<Transaction>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get expected transaction with recurring transaction template
    const { data: expectedTransaction, error: fetchError } = await supabase
      .from('expected_transactions')
      .select(`
        *,
        recurring_transactions (
          template_data,
          workspace_id
        )
      `)
      .eq('id', expectedTransactionId)
      .eq('status', 'pending')
      .single()

    if (fetchError || !expectedTransaction) {
      return { error: 'Expected transaction not found or already processed' }
    }

    const recurringTransaction = expectedTransaction.recurring_transactions as any
    if (!recurringTransaction) {
      return { error: 'Associated recurring transaction not found' }
    }

    // Authorize workspace access
    const authResult = await authorizeTransactionCreate(recurringTransaction.workspace_id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Use actual amount if provided, otherwise use expected amount
    const finalAmount = actualAmount || expectedTransaction.expected_amount
    const templateData = recurringTransaction.template_data as any

    // Create the actual transaction
    const transactionData = {
      amount: finalAmount,
      currency: expectedTransaction.currency,
      type: templateData.type,
      category_id: templateData.category_id,
      description: templateData.description || 'Recurring transaction',
      notes: templateData.notes,
      transaction_date: expectedTransaction.expected_date,
      workspace_id: recurringTransaction.workspace_id,
      user_id: user.id,
      created_by: user.id,
      is_expected: false, // This is now a confirmed transaction
      expected_transaction_id: expectedTransactionId,
      recurring_transaction_id: expectedTransaction.recurring_transaction_id,
    }

    const { data: transaction, error: createError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single()

    if (createError) {
      console.error('Transaction creation error:', createError)
      return { error: 'Failed to create transaction' }
    }

    // Update expected transaction status to confirmed
    const { error: updateError } = await supabase
      .from('expected_transactions')
      .update({
        status: 'confirmed',
        actual_transaction_id: transaction.id,
      })
      .eq('id', expectedTransactionId)

    if (updateError) {
      console.error('Expected transaction update error:', updateError)
      // Don't fail the whole operation, just log the error
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: transaction }
  } catch (error) {
    console.error('Error in confirmExpectedTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Skips an expected transaction occurrence
 * Implements Requirement 9.8: Allow user to skip occurrence if transaction doesn't happen
 * 
 * @param expectedTransactionId - Expected transaction ID to skip
 * @returns ActionResult with success status or error
 */
export async function skipExpectedTransaction(
  expectedTransactionId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get expected transaction to verify ownership
    const { data: expectedTransaction, error: fetchError } = await supabase
      .from('expected_transactions')
      .select('workspace_id, status')
      .eq('id', expectedTransactionId)
      .single()

    if (fetchError || !expectedTransaction) {
      return { error: 'Expected transaction not found' }
    }

    if (expectedTransaction.status !== 'pending') {
      return { error: 'Expected transaction is already processed' }
    }

    // Authorize workspace access
    const authResult = await authorizeTransactionCreate(expectedTransaction.workspace_id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Update expected transaction status to skipped
    const { error } = await supabase
      .from('expected_transactions')
      .update({ status: 'skipped' })
      .eq('id', expectedTransactionId)

    if (error) {
      console.error('Expected transaction skip error:', error)
      return { error: 'Failed to skip expected transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: { id: expectedTransactionId } }
  } catch (error) {
    console.error('Error in skipExpectedTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Gets all recurring transactions for a workspace
 * 
 * @param workspaceId - Workspace ID to get recurring transactions from
 * @returns ActionResult with recurring transactions array or error
 */
export async function getRecurringTransactions(
  workspaceId: string
): Promise<ActionResult<RecurringTransaction[]>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Authorize workspace access
    const authResult = await authorizeTransactionCreate(workspaceId)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Get recurring transactions
    const { data: recurringTransactions, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Recurring transactions query error:', error)
      return { error: 'Failed to fetch recurring transactions' }
    }

    return { data: recurringTransactions || [] }
  } catch (error) {
    console.error('Error in getRecurringTransactions:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Gets expected transactions for a workspace
 * 
 * @param workspaceId - Workspace ID to get expected transactions from
 * @param status - Optional status filter
 * @returns ActionResult with expected transactions array or error
 */
export async function getExpectedTransactions(
  workspaceId: string,
  status?: 'pending' | 'confirmed' | 'skipped'
): Promise<ActionResult<ExpectedTransaction[]>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Authorize workspace access
    const authResult = await authorizeTransactionCreate(workspaceId)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Build query
    let query = supabase
      .from('expected_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('expected_date', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: expectedTransactions, error } = await query

    if (error) {
      console.error('Expected transactions query error:', error)
      return { error: 'Failed to fetch expected transactions' }
    }

    return { data: expectedTransactions || [] }
  } catch (error) {
    console.error('Error in getExpectedTransactions:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Generates expected transactions for a recurring transaction
 * Implements Requirement 9.4: Generate expected transactions based on recurring pattern
 * 
 * @param recurringTransactionId - Recurring transaction ID
 * @param workspaceId - Workspace ID
 * @param monthsAhead - Number of months to generate ahead (default: 3)
 */
async function generateExpectedTransactions(
  recurringTransactionId: string,
  workspaceId: string,
  monthsAhead: number = 3
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get recurring transaction details
    const { data: recurringTransaction, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('id', recurringTransactionId)
      .single()

    if (fetchError || !recurringTransaction) {
      console.error('Failed to fetch recurring transaction:', fetchError)
      return
    }

    if (!recurringTransaction.is_active) {
      return // Don't generate for inactive recurring transactions
    }

    // Clear existing pending expected transactions
    await supabase
      .from('expected_transactions')
      .delete()
      .eq('recurring_transaction_id', recurringTransactionId)
      .eq('status', 'pending')

    // Generate new expected transactions
    const templateData = recurringTransaction.template_data as any
    const expectedTransactions: any[] = []
    
    let currentDate = new Date(recurringTransaction.next_due_date)
    const endDate = recurringTransaction.end_date ? new Date(recurringTransaction.end_date) : addMonths(new Date(), monthsAhead)
    const maxDate = addMonths(new Date(), monthsAhead)
    const actualEndDate = endDate < maxDate ? endDate : maxDate

    while (currentDate <= actualEndDate) {
      expectedTransactions.push({
        recurring_transaction_id: recurringTransactionId,
        workspace_id: workspaceId,
        expected_date: format(currentDate, 'yyyy-MM-dd'),
        expected_amount: templateData.amount,
        currency: templateData.currency || 'UAH',
        status: 'pending',
      })

      // Calculate next occurrence based on frequency
      switch (recurringTransaction.frequency) {
        case 'daily':
          currentDate = addDays(currentDate, recurringTransaction.interval_count)
          break
        case 'weekly':
          currentDate = addWeeks(currentDate, recurringTransaction.interval_count)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, recurringTransaction.interval_count)
          break
        case 'yearly':
          currentDate = addYears(currentDate, recurringTransaction.interval_count)
          break
        default:
          console.error('Unknown frequency:', recurringTransaction.frequency)
          return
      }
    }

    // Insert expected transactions in batches
    if (expectedTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from('expected_transactions')
        .insert(expectedTransactions)

      if (insertError) {
        console.error('Failed to insert expected transactions:', insertError)
      }
    }

    // Update next_due_date on recurring transaction
    const { error: updateError } = await supabase
      .from('recurring_transactions')
      .update({ 
        next_due_date: format(currentDate, 'yyyy-MM-dd'),
        updated_at: new Date().toISOString()
      })
      .eq('id', recurringTransactionId)

    if (updateError) {
      console.error('Failed to update next_due_date:', updateError)
    }
  } catch (error) {
    console.error('Error generating expected transactions:', error)
  }
}