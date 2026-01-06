'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { 
  createTransactionTypeSchema, 
  updateTransactionTypeSchema,
  reassignTransactionTypeSchema,
  type TransactionType,
  type TransactionTypeFamily
} from '@/lib/validations/transaction-type'
import { 
  authorizeWorkspaceAccess,
  getCurrentUserWorkspaceContext
} from '@/lib/access-control'
import type { ActionResult } from '@/types'

/**
 * Creates a new custom transaction type
 * Implements Requirements 8.1, 8.2, 8.3: Custom transaction types with family constraints
 * 
 * @param formData - Form data containing transaction type details
 * @returns ActionResult with created transaction type or error
 */
export async function createTransactionType(
  formData: FormData
): Promise<ActionResult<TransactionType>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    const validated = createTransactionTypeSchema.safeParse(rawData)

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Get workspace ID from form data or user context
    let workspaceId = rawData.workspace_id as string
    
    if (!workspaceId) {
      const contextResult = await getCurrentUserWorkspaceContext(user.id)
      if (!contextResult || !contextResult.workspace_id) {
        return { error: 'No workspace found' }
      }
      workspaceId = contextResult.workspace_id
    }

    // Authorize workspace access
    const authResult = await authorizeWorkspaceAccess(workspaceId)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Check if name already exists in workspace
    const { data: existingType } = await supabase
      .from('transaction_types')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', validated.data.name)
      .single()

    if (existingType) {
      return { error: 'A transaction type with this name already exists' }
    }

    // Create transaction type
    const { data: transactionType, error } = await supabase
      .from('transaction_types')
      .insert({
        ...validated.data,
        workspace_id: workspaceId,
      })
      .select()
      .single()

    if (error) {
      console.error('Transaction type creation error:', error)
      return { error: 'Failed to create transaction type' }
    }

    revalidatePath('/transactions')
    
    return { data: transactionType }
  } catch (error) {
    console.error('Error in createTransactionType:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Updates an existing transaction type
 * Implements Requirement 8.5: Editing transaction types
 * 
 * @param id - Transaction type ID to update
 * @param formData - Form data with updated values
 * @returns ActionResult with updated transaction type or error
 */
export async function updateTransactionType(
  id: string,
  formData: FormData
): Promise<ActionResult<TransactionType>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get existing transaction type to verify access and constraints
    const { data: existingType, error: fetchError } = await supabase
      .from('transaction_types')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingType) {
      return { error: 'Transaction type not found' }
    }

    // Authorize workspace access
    const authResult = await authorizeWorkspaceAccess(existingType.workspace_id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // System types have limited editability
    if (existingType.is_system) {
      return { error: 'System transaction types cannot be modified' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    const validated = updateTransactionTypeSchema.safeParse(rawData)

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Check if new name conflicts with existing types (if name is being changed)
    if (validated.data.name && validated.data.name !== existingType.name) {
      const { data: conflictingType } = await supabase
        .from('transaction_types')
        .select('id')
        .eq('workspace_id', existingType.workspace_id)
        .eq('name', validated.data.name)
        .neq('id', id)
        .single()

      if (conflictingType) {
        return { error: 'A transaction type with this name already exists' }
      }
    }

    // Update transaction type
    const { data: transactionType, error } = await supabase
      .from('transaction_types')
      .update({
        ...validated.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Transaction type update error:', error)
      return { error: 'Failed to update transaction type' }
    }

    revalidatePath('/transactions')
    
    return { data: transactionType }
  } catch (error) {
    console.error('Error in updateTransactionType:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Deletes a transaction type with transaction reassignment
 * Implements Requirement 8.5: Deleting types with transaction reassignment
 * 
 * @param id - Transaction type ID to delete
 * @param reassignToId - Transaction type ID to reassign existing transactions to
 * @returns ActionResult with success status or error
 */
export async function deleteTransactionType(
  id: string,
  reassignToId?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get existing transaction type to verify access and constraints
    const { data: existingType, error: fetchError } = await supabase
      .from('transaction_types')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingType) {
      return { error: 'Transaction type not found' }
    }

    // Authorize workspace access
    const authResult = await authorizeWorkspaceAccess(existingType.workspace_id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // System types cannot be deleted
    if (existingType.is_system) {
      return { error: 'System transaction types cannot be deleted' }
    }

    // Check if there are transactions using this type
    const { data: transactionsUsingType, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('transaction_type_id', id)
      .is('deleted_at', null) // Only count non-deleted transactions

    if (countError) {
      console.error('Error counting transactions:', countError)
      return { error: 'Failed to check transaction usage' }
    }

    const transactionCount = transactionsUsingType?.length || 0

    // If there are transactions using this type, reassignment is required
    if (transactionCount > 0) {
      if (!reassignToId) {
        return { 
          error: `Cannot delete transaction type. ${transactionCount} transactions are using this type. Please specify a replacement type.` 
        }
      }

      // Validate reassignment target
      const { data: targetType, error: targetError } = await supabase
        .from('transaction_types')
        .select('*')
        .eq('id', reassignToId)
        .eq('workspace_id', existingType.workspace_id) // Must be in same workspace
        .single()

      if (targetError || !targetType) {
        return { error: 'Invalid reassignment target transaction type' }
      }

      // Target type must be in the same family
      if (targetType.family !== existingType.family) {
        return { error: 'Reassignment target must be in the same family (income/expense)' }
      }

      // Reassign all transactions to the target type
      const { error: reassignError } = await supabase
        .from('transactions')
        .update({ 
          transaction_type_id: reassignToId,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_type_id', id)
        .is('deleted_at', null)

      if (reassignError) {
        console.error('Transaction reassignment error:', reassignError)
        return { error: 'Failed to reassign transactions' }
      }
    }

    // Delete the transaction type
    const { error: deleteError } = await supabase
      .from('transaction_types')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Transaction type deletion error:', deleteError)
      return { error: 'Failed to delete transaction type' }
    }

    revalidatePath('/transactions')
    
    return { data: { id } }
  } catch (error) {
    console.error('Error in deleteTransactionType:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Gets all transaction types for a workspace
 * Implements Requirement 8.2: Type management accessible from Transactions section
 * 
 * @param workspaceId - Workspace ID to get transaction types from
 * @param family - Optional filter by family (income/expense)
 * @returns ActionResult with transaction types array or error
 */
export async function getTransactionTypes(
  workspaceId?: string,
  family?: TransactionTypeFamily
): Promise<ActionResult<TransactionType[]>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Get workspace ID from parameter or user context
    let targetWorkspaceId = workspaceId
    
    if (!targetWorkspaceId) {
      const contextResult = await getCurrentUserWorkspaceContext(user.id)
      if (!contextResult || !contextResult.workspace_id) {
        return { error: 'No workspace found' }
      }
      targetWorkspaceId = contextResult.workspace_id
    }

    // Authorize workspace access
    const authResult = await authorizeWorkspaceAccess(targetWorkspaceId!)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Build query with optional family filter
    let query = supabase
      .from('transaction_types')
      .select('*')
      .eq('workspace_id', targetWorkspaceId!)
      .order('is_default', { ascending: false }) // Default types first
      .order('name', { ascending: true })

    if (family) {
      query = query.eq('family', family)
    }

    const { data: transactionTypes, error } = await query

    if (error) {
      console.error('Transaction types query error:', error)
      return { error: 'Failed to fetch transaction types' }
    }

    return { data: transactionTypes || [] }
  } catch (error) {
    console.error('Error in getTransactionTypes:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Gets the default transaction type for a family in a workspace
 * 
 * @param workspaceId - Workspace ID
 * @param family - Transaction type family (income/expense)
 * @returns ActionResult with default transaction type or error
 */
export async function getDefaultTransactionType(
  workspaceId: string,
  family: TransactionTypeFamily
): Promise<ActionResult<TransactionType>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Authorize workspace access
    const authResult = await authorizeWorkspaceAccess(workspaceId)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Get default transaction type for the family
    const { data: defaultType, error } = await supabase
      .from('transaction_types')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('family', family)
      .eq('is_default', true)
      .single()

    if (error || !defaultType) {
      return { error: `No default ${family} transaction type found` }
    }

    return { data: defaultType }
  } catch (error) {
    console.error('Error in getDefaultTransactionType:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Reassigns transactions from one type to another
 * Utility function for bulk reassignment operations
 * 
 * @param formData - Form data containing reassignment details
 * @returns ActionResult with reassignment count or error
 */
export async function reassignTransactionType(
  formData: FormData
): Promise<ActionResult<{ count: number }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    const validated = reassignTransactionTypeSchema.safeParse(rawData)

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    const { from_type_id, to_type_id } = validated.data

    // Get both transaction types to verify they exist and are in same workspace/family
    const { data: fromType, error: fromError } = await supabase
      .from('transaction_types')
      .select('*')
      .eq('id', from_type_id)
      .single()

    const { data: toType, error: toError } = await supabase
      .from('transaction_types')
      .select('*')
      .eq('id', to_type_id)
      .single()

    if (fromError || !fromType || toError || !toType) {
      return { error: 'Invalid transaction type IDs' }
    }

    // Verify both types are in the same workspace
    if (fromType.workspace_id !== toType.workspace_id) {
      return { error: 'Transaction types must be in the same workspace' }
    }

    // Verify both types are in the same family
    if (fromType.family !== toType.family) {
      return { error: 'Transaction types must be in the same family (income/expense)' }
    }

    // Authorize workspace access
    const authResult = await authorizeWorkspaceAccess(fromType.workspace_id)
    if (!authResult.authorized) {
      return { error: authResult.error || 'Access denied to workspace' }
    }

    // Perform the reassignment
    const { data: updatedTransactions, error: updateError } = await supabase
      .from('transactions')
      .update({ 
        transaction_type_id: to_type_id,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_type_id', from_type_id)
      .is('deleted_at', null) // Only update non-deleted transactions
      .select('id')

    if (updateError) {
      console.error('Transaction reassignment error:', updateError)
      return { error: 'Failed to reassign transactions' }
    }

    const count = updatedTransactions?.length || 0

    revalidatePath('/transactions')
    
    return { data: { count } }
  } catch (error) {
    console.error('Error in reassignTransactionType:', error)
    return { error: 'An unexpected error occurred' }
  }
}