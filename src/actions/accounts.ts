'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAccountSchema, updateAccountSchema } from '@/lib/validations/account'
import { getUserWorkspaceContext } from '@/lib/middleware'
import type { ActionResult } from '@/types'

export interface Account {
  id: string
  workspace_id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  opening_balance: number
  current_balance: number
  current_balance_updated_at: string | null
  currency: string
  is_default: boolean
  created_at: string
  updated_at: string
}

/**
 * Creates a new account for the workspace
 */
export async function createAccount(
  formData: FormData
): Promise<ActionResult<Account>> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Get workspace context
  const contextResult = await getUserWorkspaceContext()
  console.log('Account creation - workspace context:', contextResult)
  if (!contextResult.authorized || !contextResult.workspaceId) {
    console.error('Account creation failed - no workspace context:', contextResult)
    return { error: contextResult.error || 'No workspace found. Please refresh the page and try again.' }
  }

  // Validate input data
  const rawData = Object.fromEntries(formData)
  
  // Parse opening_balance, defaulting to 0 if empty or invalid
  const openingBalance = rawData.opening_balance ? Number(rawData.opening_balance) : 0
  const currentBalance = rawData.current_balance ? Number(rawData.current_balance) : openingBalance
  
  const validated = createAccountSchema.safeParse({
    name: rawData.name,
    type: rawData.type,
    opening_balance: openingBalance,
    workspace_id: contextResult.workspaceId,
  })

  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  // Get workspace to retrieve currency
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('currency')
    .eq('id', contextResult.workspaceId)
    .single()

  // Create account with opening_balance and current_balance set to the same value
  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      name: validated.data.name,
      type: validated.data.type,
      opening_balance: validated.data.opening_balance,
      current_balance: currentBalance,
      currency: workspace?.currency || 'UAH',
      workspace_id: contextResult.workspaceId,
    })
    .select()
    .single()

  if (error) {
    console.error('Account creation error:', error)
    return { error: 'Failed to create account' }
  }

  revalidatePath('/accounts')
  revalidatePath('/transactions')
  
  return { data: account }
}

/**
 * Gets all accounts for the current workspace
 * Balance calculation excludes planned transactions (only completed transactions affect balance)
 */
export async function getAccounts(): Promise<ActionResult<Account[]>> {
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

  // Fetch accounts with their actual balances (from completed transactions only)
  // The account_actual_balances view automatically excludes planned transactions
  const { data: accountBalances, error: balanceError } = await supabase
    .from('account_actual_balances')
    .select('*')

  if (balanceError) {
    console.error('Account balances fetch error:', balanceError)
    // Fallback to direct account query if view fails
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('workspace_id', contextResult.workspaceId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Accounts fetch error:', error)
      return { error: 'Failed to fetch accounts' }
    }

    return { data: accounts || [] }
  }

  // Fetch full account details
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('workspace_id', contextResult.workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Accounts fetch error:', error)
    return { error: 'Failed to fetch accounts' }
  }

  // Merge calculated balances with account data
  const accountsWithBalances = accounts.map(account => {
    const balance = accountBalances.find(b => b.account_id === account.id)
    return {
      ...account,
      // Update current_balance with calculated balance from completed transactions only
      current_balance: balance?.calculated_balance ?? account.current_balance,
    }
  })

  return { data: accountsWithBalances || [] }
}

/**
 * Gets or creates a default account for the workspace
 * This is used when no account is specified for a transaction
 */
export async function getOrCreateDefaultAccount(): Promise<ActionResult<Account>> {
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

  // Try to find existing default account
  const { data: existingAccounts, error: fetchError } = await supabase
    .from('accounts')
    .select('*')
    .eq('workspace_id', contextResult.workspaceId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (fetchError) {
    console.error('Account fetch error:', fetchError)
    return { error: 'Failed to fetch accounts' }
  }

  // If account exists, return it
  if (existingAccounts && existingAccounts.length > 0) {
    return { data: existingAccounts[0] }
  }

  // Create default account
  const { data: account, error: createError } = await supabase
    .from('accounts')
    .insert({
      workspace_id: contextResult.workspaceId,
      name: 'Main Account',
      type: 'checking',
      balance: 0,
      currency: 'UAH',
    })
    .select()
    .single()

  if (createError) {
    console.error('Default account creation error:', createError)
    return { error: 'Failed to create default account' }
  }

  return { data: account }
}

/**
 * Updates an existing account
 */
export async function updateAccount(
  id: string,
  formData: FormData
): Promise<ActionResult<Account>> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Validate input data
  const rawData = Object.fromEntries(formData)
  const validated = updateAccountSchema.safeParse({
    ...rawData,
    balance: rawData.balance ? Number(rawData.balance) : undefined,
  })

  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  // Update account
  const { data: account, error } = await supabase
    .from('accounts')
    .update(validated.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Account update error:', error)
    return { error: 'Failed to update account' }
  }

  revalidatePath('/accounts')
  revalidatePath('/transactions')
  
  return { data: account }
}

/**
 * Deletes an account (soft delete)
 */
export async function deleteAccount(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // Check if account has transactions
  const { data: transactions, error: transactionError } = await supabase
    .from('transactions')
    .select('id')
    .eq('account_id', id)
    .limit(1)

  if (transactionError) {
    console.error('Transaction check error:', transactionError)
    return { error: 'Failed to check account usage' }
  }

  if (transactions && transactions.length > 0) {
    return { error: 'Cannot delete account with existing transactions' }
  }

  // Delete account
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Account deletion error:', error)
    return { error: 'Failed to delete account' }
  }

  revalidatePath('/accounts')
  revalidatePath('/transactions')
  
  return { data: { id } }
}