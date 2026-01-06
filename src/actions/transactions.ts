'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTransactionSchema, updateTransactionSchema } from '@/lib/validations/transaction'
import { 
  authorizeTransactionCreate,
  authorizeTransactionUpdate,
  authorizeTransactionDelete,
  getUserWorkspaceContext
} from '@/lib/middleware'
import type { ActionResult, Transaction } from '@/types'

/**
 * Creates a new transaction following code-quality.md patterns
 * Implements Requirements 10.1: Workspace access control for transaction creation
 * Implements Requirement 1.5: Default category assignment when user skips category selection
 * 
 * @param formData - Form data containing transaction details
 * @returns ActionResult with created transaction or error
 */
export async function createTransaction(
  formData: FormData
): Promise<ActionResult<Transaction>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    const validated = createTransactionSchema.safeParse({
      ...rawData,
      amount: Number(rawData.amount),
      transaction_date: new Date(rawData.transaction_date as string),
    })

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Get workspace ID from form data or user context
    let workspaceId = rawData.workspace_id as string
    
    if (!workspaceId) {
      // If no workspace ID provided, get user's current workspace context
      const contextResult = await getUserWorkspaceContext()
      if (!contextResult.authorized || !contextResult.workspaceId) {
        return { error: contextResult.error || 'No workspace found' }
      }
      workspaceId = contextResult.workspaceId
    }

    // Authorize workspace access for transaction creation
    const authResult = await authorizeTransactionCreate(workspaceId)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Handle default category assignment (Requirement 1.5)
    let categoryId = validated.data.category_id
    if (!categoryId) {
      // Get or create default category for the transaction type
      const { getDefaultCategory } = await import('@/actions/categories')
      const defaultCategoryResult = await getDefaultCategory(workspaceId, validated.data.type)
      
      if (defaultCategoryResult.error || !defaultCategoryResult.data) {
        return { error: 'Failed to assign default category' }
      }
      
      categoryId = defaultCategoryResult.data.id
    }

    // Handle default transaction type assignment (Requirements 8.1, 8.3)
    let transactionTypeId = validated.data.transaction_type_id
    if (!transactionTypeId) {
      // Get default transaction type for the family
      const { getDefaultTransactionType } = await import('@/actions/transaction-types')
      const defaultTypeResult = await getDefaultTransactionType(workspaceId, validated.data.type)
      
      if (defaultTypeResult.error || !defaultTypeResult.data) {
        return { error: 'Failed to assign default transaction type' }
      }
      
      transactionTypeId = defaultTypeResult.data.id
    }

    // Handle currency conversion if needed
    let finalAmount = validated.data.amount
    let originalAmount: number | undefined
    let originalCurrency: string | undefined
    
    // If currency is not UAH, convert to UAH and store original values
    if (validated.data.currency && validated.data.currency !== 'UAH') {
      try {
        const { convertCurrency } = await import('@/lib/utils/currency-server')
        const conversionResult = await convertCurrency(
          validated.data.amount,
          validated.data.currency,
          'UAH',
          validated.data.transaction_date
        )
        
        finalAmount = conversionResult.amount
        originalAmount = validated.data.amount
        originalCurrency = validated.data.currency
        
        // Log conversion for debugging
        console.log(`Converted ${originalAmount} ${originalCurrency} to ${finalAmount} UAH using ${conversionResult.source} rate`)
      } catch (conversionError) {
        console.error('Currency conversion failed:', conversionError)
        return { error: 'Failed to convert currency. Please try again or use UAH.' }
      }
    }

    // Create transaction with proper user tracking and default category
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        ...validated.data,
        amount: finalAmount, // Always store in UAH
        currency: 'UAH', // Always UAH in database
        original_amount: originalAmount,
        original_currency: originalCurrency,
        category_id: categoryId,
        transaction_type_id: transactionTypeId,
        workspace_id: workspaceId,
        user_id: user.id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Transaction creation error:', error)
      return { error: 'Failed to create transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: transaction }
  } catch (error) {
    console.error('Error in createTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Updates an existing transaction
 * Implements Requirements 10.3: Workspace access control for transaction editing
 * 
 * @param id - Transaction ID to update
 * @param formData - Form data with updated values
 * @returns ActionResult with updated transaction or error
 */
export async function updateTransaction(
  id: string,
  formData: FormData
): Promise<ActionResult<Transaction>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Authorize transaction access
    const authResult = await authorizeTransactionUpdate(id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to transaction' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    const validated = updateTransactionSchema.safeParse({
      ...rawData,
      amount: rawData.amount ? Number(rawData.amount) : undefined,
      transaction_date: rawData.transaction_date ? new Date(rawData.transaction_date as string) : undefined,
    })

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Handle currency conversion if needed
    let updateData = { ...validated.data }
    
    // If amount or currency is being updated and currency is not UAH, convert to UAH
    if (validated.data.amount && validated.data.currency && validated.data.currency !== 'UAH') {
      try {
        const { convertCurrency } = await import('@/lib/utils/currency-server')
        const conversionResult = await convertCurrency(
          validated.data.amount,
          validated.data.currency,
          'UAH',
          validated.data.transaction_date || new Date()
        )
        
        updateData = {
          ...updateData,
          amount: conversionResult.amount, // Always store in UAH
          currency: 'UAH', // Always UAH in database
          original_amount: validated.data.amount,
          original_currency: validated.data.currency,
        }
        
        // Log conversion for debugging
        console.log(`Converted ${validated.data.amount} ${validated.data.currency} to ${conversionResult.amount} UAH using ${conversionResult.source} rate`)
      } catch (conversionError) {
        console.error('Currency conversion failed:', conversionError)
        return { error: 'Failed to convert currency. Please try again or use UAH.' }
      }
    }

    // Update transaction with audit trail
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({
        ...updateData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Transaction update error:', error)
      return { error: 'Failed to update transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: transaction }
  } catch (error) {
    console.error('Error in updateTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Deletes a transaction using soft delete
 * Implements Requirements 6.2, 6.4: Immediate removal from list with soft delete for admin recovery
 * 
 * @param id - Transaction ID to delete
 * @returns ActionResult with success status or error
 */
export async function deleteTransaction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Authorize transaction access
    const authResult = await authorizeTransactionDelete(id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to transaction' }
    }

    // Soft delete transaction by setting deleted_at timestamp
    // This implements Requirement 6.4: soft delete for admin recovery
    const { error } = await supabase
      .from('transactions')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Transaction soft deletion error:', error)
      return { error: 'Failed to delete transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: { id } }
  } catch (error) {
    console.error('Error in deleteTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Gets transactions for a specific workspace
 * Implements Requirements 10.2: Workspace access control for transaction viewing
 * 
 * @param workspaceId - Workspace ID to get transactions from
 * @param options - Optional filtering and pagination options
 * @returns ActionResult with transactions array or error
 */
export async function getTransactions(
  workspaceId: string,
  options?: {
    limit?: number
    offset?: number
    type?: 'income' | 'expense'
    categoryId?: string
  }
): Promise<ActionResult<Transaction[]>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Authorize workspace access
    const { authorizeTransactionRead } = await import('@/lib/middleware')
    const authResult = await authorizeTransactionRead(workspaceId)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Build query with filters
    // Note: RLS policies automatically filter out soft-deleted transactions (deleted_at IS NULL)
    let query = supabase
      .from('transactions')
      .select(`
        id,
        workspace_id,
        user_id,
        amount,
        original_amount,
        original_currency,
        currency,
        type,
        transaction_type_id,
        category_id,
        description,
        notes,
        transaction_date,
        is_expected,
        expected_transaction_id,
        recurring_transaction_id,
        created_at,
        updated_at,
        created_by,
        updated_by,
        deleted_at
      `)
      .eq('workspace_id', workspaceId)
      .order('transaction_date', { ascending: false })

    // Apply filters
    if (options?.type) {
      query = query.eq('transaction_type_id', options.type)
    }
    
    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId)
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error('Transaction query error:', error)
      return { error: 'Failed to fetch transactions' }
    }

    return { data: transactions || [] }
  } catch (error) {
    console.error('Error in getTransactions:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Restores a soft-deleted transaction (admin function)
 * Implements Requirement 6.4: Admin recovery functionality
 * 
 * @param id - Transaction ID to restore
 * @returns ActionResult with restored transaction or error
 */
export async function restoreTransaction(
  id: string
): Promise<ActionResult<Transaction>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Note: This function should be restricted to admin users in production
    // For now, we'll allow workspace owners to restore their own transactions
    
    // Restore transaction by clearing deleted_at timestamp
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({ 
        deleted_at: null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Transaction restore error:', error)
      return { error: 'Failed to restore transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: transaction }
  } catch (error) {
    console.error('Error in restoreTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Permanently deletes a transaction (admin function)
 * This is a hard delete that cannot be undone
 * 
 * @param id - Transaction ID to permanently delete
 * @returns ActionResult with success status or error
 */
export async function permanentlyDeleteTransaction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Note: This function should be restricted to admin users in production
    // This is a destructive operation that cannot be undone
    
    // Permanently delete transaction from database
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Transaction permanent deletion error:', error)
      return { error: 'Failed to permanently delete transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: { id } }
  } catch (error) {
    console.error('Error in permanentlyDeleteTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}