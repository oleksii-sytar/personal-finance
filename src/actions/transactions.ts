'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTransactionSchema, updateTransactionSchema } from '@/lib/validations/transaction'
import type { ActionResult, Transaction } from '@/types'

/**
 * Creates a new transaction following code-quality.md patterns
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

    // Get user's workspace (assuming single workspace for now)
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!workspace) {
      return { error: 'No workspace found' }
    }

    // Create transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        ...validated.data,
        workspace_id: workspace.id,
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
    console.error('Unexpected error in createTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Updates an existing transaction
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

    // Update transaction (RLS will ensure user can only update their own)
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(validated.data)
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
    console.error('Unexpected error in updateTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Deletes a transaction
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

    // Delete transaction (RLS will ensure user can only delete their own)
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Transaction deletion error:', error)
      return { error: 'Failed to delete transaction' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { data: { id } }
  } catch (error) {
    console.error('Unexpected error in deleteTransaction:', error)
    return { error: 'An unexpected error occurred' }
  }
}