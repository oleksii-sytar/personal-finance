'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkpointInputSchema } from '@/lib/validations/checkpoint'
import { CheckpointModel } from '@/lib/models/checkpoint'
import { 
  getUserWorkspaceContext
} from '@/lib/middleware'
import type { ActionResult } from '@/types'
import type { Checkpoint } from '@/types/checkpoint'

/**
 * Creates a new checkpoint for simplified timeline system
 * Implements Requirements: 2.3, 2.4, 2.5, 4.4
 */
export async function createCheckpoint(
  formData: FormData
): Promise<ActionResult<Checkpoint>> {
  try {
    const supabase = await createClient()
    
    // Get user and workspace context
    const authResult = await getUserWorkspaceContext()
    if (!authResult.authorized) {
      return { error: authResult.error || 'Authorization failed' }
    }
    
    const { userId, workspaceId } = authResult
    
    if (!userId || !workspaceId) {
      return { error: 'Invalid user or workspace context' }
    }
    
    // Validate input data
    const validated = checkpointInputSchema.safeParse({
      account_id: formData.get('account_id'),
      date: formData.get('date') || new Date().toISOString(),
      actual_balance: parseFloat(formData.get('actual_balance') as string || '0'),
      workspace_id: workspaceId,
    })

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    const checkpointDate = new Date(validated.data.date)
    
    // Calculate expected balance from transactions
    const expectedBalance = await CheckpointModel.calculateExpectedBalance(
      validated.data.account_id,
      checkpointDate,
      workspaceId,
      supabase
    )

    // Calculate gap
    const gap = CheckpointModel.calculateGap(
      validated.data.actual_balance,
      expectedBalance
    )

    // Create checkpoint record
    const checkpointData = {
      workspace_id: workspaceId,
      account_id: validated.data.account_id,
      date: checkpointDate.toISOString().split('T')[0],
      actual_balance: validated.data.actual_balance,
      expected_balance: expectedBalance,
      gap: gap,
      // Legacy fields for backward compatibility
      account_balances: [],
      expected_balances: [],
      gaps: [],
      status: 'open',
      notes: null,
      created_by: userId,
    }

    const { data: checkpoint, error: insertError } = await supabase
      .from('checkpoints')
      .insert(checkpointData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating checkpoint:', insertError)
      return { error: 'Failed to create checkpoint' }
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    
    return { 
      data: CheckpointModel.fromRow(checkpoint)
    }

  } catch (error) {
    console.error('Error in createCheckpoint:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Gets checkpoints for timeline display with period information
 * Implements Requirements: 3.2, 6.2
 */
export async function getCheckpointsForTimeline(
  workspaceId: string,
  accountId?: string
): Promise<ActionResult<(Checkpoint & { transaction_count: number; days_since_previous: number })[]>> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('checkpoints')
      .select('*')
      .eq('workspace_id', workspaceId)
      .not('account_id', 'is', null) // Only get simplified checkpoints
      .order('date', { ascending: false })

    // Filter by account if specified
    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    const { data: checkpoints, error } = await query

    if (error) {
      console.error('Error fetching checkpoints:', error)
      return { error: 'Failed to fetch checkpoints' }
    }

    if (!checkpoints || checkpoints.length === 0) {
      return { data: [] }
    }

    // Convert to models and add period information
    const checkpointModels = []
    
    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = CheckpointModel.fromRow(checkpoints[i])
      
      // Find previous checkpoint for the same account to calculate period
      const previousCheckpoint = i < checkpoints.length - 1 ? checkpoints[i + 1] : null
      const startDate = previousCheckpoint 
        ? new Date(previousCheckpoint.date)
        : new Date(checkpoint.date.getFullYear(), checkpoint.date.getMonth(), 1) // Start of month if no previous
      
      // Calculate days since previous checkpoint
      const daysSincePrevious = previousCheckpoint
        ? Math.ceil((checkpoint.date.getTime() - new Date(previousCheckpoint.date).getTime()) / (1000 * 60 * 60 * 24))
        : Math.ceil((checkpoint.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Count transactions in the period
      let transactionQuery = supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('account_id', checkpoint.account_id)
        .gt('transaction_date', startDate.toISOString())
        .lte('transaction_date', checkpoint.date.toISOString())
        .is('deleted_at', null)

      const { count: transactionCount, error: countError } = await transactionQuery

      if (countError) {
        console.error('Error counting transactions for checkpoint:', countError)
        // Continue with 0 count rather than failing
      }

      checkpointModels.push({
        ...checkpoint,
        transaction_count: transactionCount || 0,
        days_since_previous: daysSincePrevious
      })
    }
    
    return { data: checkpointModels }

  } catch (error) {
    console.error('Error in getCheckpointsForTimeline:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Recalculates checkpoint gaps when transactions change
 * Implements Requirements: 5.1, 5.4
 */
export async function recalculateCheckpointGaps(
  transactionDate: Date,
  accountId: string,
  workspaceId: string
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const supabase = await createClient()
    return await recalculateAffectedCheckpoints(transactionDate, accountId, workspaceId, supabase)
  } catch (error) {
    console.error('Error in recalculateCheckpointGaps:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Core function to recalculate affected checkpoints
 * Implements Requirements: 5.1, 5.2, 5.3, 5.4
 * 
 * @param transactionDate - Date of the transaction that triggered recalculation
 * @param accountId - Account ID to recalculate checkpoints for
 * @param workspaceId - Workspace ID for security context
 * @param supabaseClient - Supabase client instance
 * @returns Promise with result containing updated count or error
 */
export async function recalculateAffectedCheckpoints(
  transactionDate: Date,
  accountId: string,
  workspaceId: string,
  supabaseClient?: any
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const supabase = supabaseClient || await createClient()
    
    // Find all checkpoints that could be affected by this transaction
    // A checkpoint is affected if its date is >= the transaction date
    const { data: affectedCheckpoints, error: fetchError } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('account_id', accountId)
      .gte('date', transactionDate.toISOString().split('T')[0])
      .not('account_id', 'is', null) // Only simplified checkpoints
      .order('date', { ascending: true }) // Process in chronological order

    if (fetchError) {
      console.error('Error fetching affected checkpoints:', fetchError)
      return { error: 'Failed to fetch checkpoints for recalculation' }
    }

    if (!affectedCheckpoints || affectedCheckpoints.length === 0) {
      // No checkpoints to recalculate
      return { data: { updatedCount: 0 } }
    }

    let updatedCount = 0
    const errors: string[] = []

    // Recalculate each affected checkpoint in chronological order
    for (const checkpointRow of affectedCheckpoints) {
      try {
        const checkpoint = CheckpointModel.fromRow(checkpointRow)
        
        // Recalculate expected balance based on transactions
        const newExpectedBalance = await CheckpointModel.calculateExpectedBalance(
          accountId,
          checkpoint.date,
          workspaceId,
          supabase
        )

        // Calculate new gap
        const newGap = CheckpointModel.calculateGap(
          checkpoint.actual_balance,
          newExpectedBalance
        )

        // Only update if values have changed to avoid unnecessary writes
        if (newExpectedBalance !== checkpoint.expected_balance || newGap !== checkpoint.gap) {
          const { error: updateError } = await supabase
            .from('checkpoints')
            .update({
              expected_balance: newExpectedBalance,
              gap: newGap,
              updated_at: new Date().toISOString(),
            })
            .eq('id', checkpoint.id)

          if (updateError) {
            console.error(`Error updating checkpoint ${checkpoint.id}:`, updateError)
            errors.push(`Failed to update checkpoint ${checkpoint.id}`)
          } else {
            updatedCount++
          }
        }
      } catch (checkpointError) {
        console.error(`Error processing checkpoint ${checkpointRow.id}:`, checkpointError)
        errors.push(`Failed to process checkpoint ${checkpointRow.id}`)
      }
    }

    // Return partial success if some updates failed
    if (errors.length > 0 && updatedCount === 0) {
      return { error: `All checkpoint updates failed: ${errors.join(', ')}` }
    }

    if (errors.length > 0) {
      console.warn(`Some checkpoint updates failed: ${errors.join(', ')}`)
    }

    return { data: { updatedCount } }

  } catch (error) {
    console.error('Error in recalculateAffectedCheckpoints:', error)
    return { error: 'An unexpected error occurred during checkpoint recalculation' }
  }
}