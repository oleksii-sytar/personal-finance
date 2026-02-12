/**
 * Balance Reconciliation Server Actions
 * 
 * Provides server actions for real-time balance reconciliation operations.
 * Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 10.1 from realtime-balance-reconciliation spec.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaceContext } from '@/lib/middleware'
import type { ActionResult } from '@/types'
import type { Account } from './accounts'
import {
  updateCurrentBalanceSchema,
  getAccountDifferenceSchema,
  getReconciliationStatusSchema,
  balanceUpdateHistoryFiltersSchema,
} from '@/lib/validations/balance-reconciliation'

/**
 * Updates the current balance for an account during reconciliation
 * 
 * Requirements:
 * - 2.1: Provide "Update Current Balance" action
 * - 2.2: Display current calculated balance as reference
 * - 2.3: Accept any valid numeric value (positive or negative)
 * - 2.4: Immediately recalculate reconciliation difference
 * - 2.5: Record update timestamp for audit purposes
 * - 10.1: Record update in balance_update_history
 * 
 * @param accountId - UUID of the account to update
 * @param newBalance - New current balance value
 * @returns ActionResult with updated account or error
 */
export async function updateCurrentBalance(
  accountId: string,
  newBalance: number
): Promise<ActionResult<Account>> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate input using Zod schema (Requirements 12.1, 12.2)
  const validation = updateCurrentBalanceSchema.safeParse({ accountId, newBalance })
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    const errorMessage = Object.values(errors).flat()[0] || 'Invalid input'
    return { error: errorMessage }
  }

  const { accountId: validAccountId, newBalance: validNewBalance } = validation.data

  // Get account to verify ownership and get old balance
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select(`
      *,
      workspace:workspaces!inner(
        id,
        owner_id
      )
    `)
    .eq('id', validAccountId)
    .single()
    
  if (fetchError || !account) {
    console.error('Account fetch error:', fetchError)
    return { error: 'Account not found' }
  }

  // Verify user has access to account's workspace
  const contextResult = await getUserWorkspaceContext()
  if (!contextResult.authorized || !contextResult.workspaceId) {
    return { error: contextResult.error || 'No workspace found' }
  }

  // Verify account belongs to user's workspace
  if (account.workspace_id !== contextResult.workspaceId) {
    return { error: 'Access denied to this account' }
  }

  // Update current balance (Requirements 2.4, 2.5)
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('accounts')
    .update({
      current_balance: validNewBalance,
      current_balance_updated_at: now,
      updated_at: now
    })
    .eq('id', validAccountId)
    .select()
    .single()
    
  if (updateError) {
    console.error('Balance update error:', updateError)
    return { error: 'Failed to update balance' }
  }

  // Record history (Requirement 10.1)
  const { error: historyError } = await supabase
    .from('balance_update_history')
    .insert({
      account_id: accountId,
      workspace_id: account.workspace_id,
      old_balance: account.current_balance,
      new_balance: newBalance,
      difference: newBalance - account.current_balance,
      updated_by: user.id
    })

  if (historyError) {
    console.error('History recording error:', historyError)
    // Don't fail the operation if history recording fails
    // The balance update succeeded, which is the critical operation
  }

  // Revalidate paths to trigger UI updates
  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  
  return { data: updated }
}

/**
 * Gets reconciliation difference for a specific account
 * 
 * Requirements:
 * - 4.1: Calculate difference as current_balance - calculated_balance
 * - 6.5: Show breakdown: opening balance, calculated balance, current balance, and difference
 * 
 * @param accountId - UUID of the account to fetch
 * @returns ActionResult with AccountBalance object or error
 */
export async function getAccountDifference(
  accountId: string
): Promise<ActionResult<AccountBalance>> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate input
  if (!accountId || typeof accountId !== 'string') {
    return { error: 'Invalid account ID' }
  }

  // Fetch account with transactions
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select(`
      *,
      transactions(*),
      workspace:workspaces!inner(
        id,
        owner_id
      )
    `)
    .eq('id', accountId)
    .single()
    
  if (fetchError || !account) {
    console.error('Account fetch error:', fetchError)
    return { error: 'Account not found' }
  }

  // Verify user has access to account's workspace
  const contextResult = await getUserWorkspaceContext()
  if (!contextResult.authorized || !contextResult.workspaceId) {
    return { error: contextResult.error || 'No workspace found' }
  }

  // Verify account belongs to user's workspace
  if (account.workspace_id !== contextResult.workspaceId) {
    return { error: 'Access denied to this account' }
  }

  // Calculate balance and difference
  const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
  
  const calculatedBalance = calculateAccountBalance(
    account.opening_balance,
    account.transactions || []
  )
  
  const difference = calculateDifference(
    account.current_balance,
    calculatedBalance
  )

  // Build AccountBalance object
  const accountBalance: AccountBalance = {
    account_id: account.id,
    opening_balance: account.opening_balance,
    current_balance: account.current_balance,
    calculated_balance: calculatedBalance,
    difference,
    currency: account.currency,
    is_reconciled: Math.abs(difference) < 0.01
  }

  return { data: accountBalance }
}

/**
 * AccountBalance type definition
 * Represents the reconciliation status of a single account
 */
export interface AccountBalance {
  account_id: string
  opening_balance: number
  current_balance: number
  calculated_balance: number
  difference: number
  currency: string
  is_reconciled: boolean
}

/**
 * ReconciliationStatus type definition
 * Represents the overall reconciliation status for a workspace
 */
export interface ReconciliationStatus {
  total_difference: number
  total_difference_currency: string
  accounts: AccountBalance[]
  all_reconciled: boolean
  last_update: string | null
}

/**
 * Gets reconciliation status for all accounts in workspace
 * 
 * Requirements:
 * - 5.1: Aggregate total difference across all accounts
 * - 5.2: Convert differences to workspace currency
 * - 6.1: Display total difference prominently
 * - 6.2: Show per-account differences in native currency
 * 
 * @param workspaceId - UUID of the workspace
 * @returns ActionResult with ReconciliationStatus or error
 */
export async function getReconciliationStatus(
  workspaceId: string
): Promise<ActionResult<ReconciliationStatus>> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate input
  if (!workspaceId || typeof workspaceId !== 'string') {
    return { error: 'Invalid workspace ID' }
  }

  // Verify user has access to workspace
  const contextResult = await getUserWorkspaceContext()
  if (!contextResult.authorized || !contextResult.workspaceId) {
    return { error: contextResult.error || 'No workspace found' }
  }

  // Verify requested workspace matches user's workspace
  if (workspaceId !== contextResult.workspaceId) {
    return { error: 'Access denied to this workspace' }
  }

  // Get all accounts with their transactions
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select(`
      *,
      transactions(*)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at')
    
  if (accountsError) {
    console.error('Accounts fetch error:', accountsError)
    return { error: 'Failed to fetch accounts' }
  }

  // Calculate balance and difference for each account
  const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
  
  const accountBalances: AccountBalance[] = accounts.map(account => {
    const calculatedBalance = calculateAccountBalance(
      account.opening_balance,
      account.transactions || []
    )
    
    const difference = calculateDifference(
      account.current_balance,
      calculatedBalance
    )
    
    return {
      account_id: account.id,
      opening_balance: account.opening_balance,
      current_balance: account.current_balance,
      calculated_balance: calculatedBalance,
      difference,
      currency: account.currency,
      is_reconciled: Math.abs(difference) < 0.01
    }
  })

  // Get workspace currency for total calculation
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('currency')
    .eq('id', workspaceId)
    .single()
    
  const workspaceCurrency = workspace?.currency || 'UAH'

  // Convert all differences to workspace currency and sum
  const { calculateTotalDifference } = await import('@/lib/utils/currency-converter')
  
  const totalDifference = await calculateTotalDifference(
    accountBalances,
    workspaceCurrency
  )

  // Find most recent update timestamp
  const lastUpdate = accounts
    .map(a => a.current_balance_updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null

  return {
    data: {
      total_difference: totalDifference,
      total_difference_currency: workspaceCurrency,
      accounts: accountBalances,
      all_reconciled: accountBalances.every(a => a.is_reconciled),
      last_update: lastUpdate
    }
  }
}

/**
 * BalanceUpdateHistory type definition
 * Represents a single balance update event with duration calculation
 */
export interface BalanceUpdateHistory {
  id: string
  account_id: string
  workspace_id: string
  old_balance: number
  new_balance: number
  difference: number
  updated_by: string
  updated_at: string
  duration_since_last_update?: number // Duration in milliseconds
}

/**
 * BalanceUpdateHistoryFilters type definition
 * Filters for querying balance update history
 */
export interface BalanceUpdateHistoryFilters {
  accountId?: string
  workspaceId?: string
  startDate?: string // ISO date string
  endDate?: string   // ISO date string
}

/**
 * Gets balance update history for an account or workspace
 * 
 * Requirements:
 * - 10.2: Show all current balance updates with dates
 * - 10.3: Show old value, new value, and difference
 * - 10.4: Show how long each reconciliation took (time between updates)
 * - 10.5: Allow filtering by account and date range
 * 
 * @param filters - Filters for querying history (accountId or workspaceId required)
 * @returns ActionResult with array of BalanceUpdateHistory or error
 */
export async function getBalanceUpdateHistory(
  filters: BalanceUpdateHistoryFilters
): Promise<ActionResult<BalanceUpdateHistory[]>> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate input - must have either accountId or workspaceId
  if (!filters.accountId && !filters.workspaceId) {
    return { error: 'Either accountId or workspaceId is required' }
  }

  // Verify user has access to workspace
  const contextResult = await getUserWorkspaceContext()
  if (!contextResult.authorized || !contextResult.workspaceId) {
    return { error: contextResult.error || 'No workspace found' }
  }

  // Build query
  let query = supabase
    .from('balance_update_history')
    .select('*')
    .order('updated_at', { ascending: false })

  // Filter by account or workspace
  if (filters.accountId) {
    // Verify account belongs to user's workspace
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('workspace_id')
      .eq('id', filters.accountId)
      .single()
    
    if (accountError || !account) {
      return { error: 'Account not found' }
    }
    
    if (account.workspace_id !== contextResult.workspaceId) {
      return { error: 'Access denied to this account' }
    }
    
    query = query.eq('account_id', filters.accountId)
  } else if (filters.workspaceId) {
    // Verify workspace matches user's workspace
    if (filters.workspaceId !== contextResult.workspaceId) {
      return { error: 'Access denied to this workspace' }
    }
    
    query = query.eq('workspace_id', filters.workspaceId)
  }

  // Apply date range filters
  if (filters.startDate) {
    query = query.gte('updated_at', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('updated_at', filters.endDate)
  }

  // Execute query
  const { data: history, error: historyError } = await query
  
  if (historyError) {
    console.error('History fetch error:', historyError)
    return { error: 'Failed to fetch balance update history' }
  }

  // Calculate duration between updates (Requirement 10.4)
  const historyWithDuration: BalanceUpdateHistory[] = history.map((entry, index) => {
    const result: BalanceUpdateHistory = {
      id: entry.id,
      account_id: entry.account_id,
      workspace_id: entry.workspace_id,
      old_balance: entry.old_balance,
      new_balance: entry.new_balance,
      difference: entry.difference,
      updated_by: entry.updated_by,
      updated_at: entry.updated_at
    }

    // Calculate duration since last update (if not the oldest entry)
    if (index < history.length - 1) {
      const currentTime = new Date(entry.updated_at).getTime()
      const previousTime = new Date(history[index + 1].updated_at).getTime()
      result.duration_since_last_update = currentTime - previousTime
    }

    return result
  })

  return { data: historyWithDuration }
}
