/**
 * Balance calculation utilities for account management
 * Implements Requirements 6.1, 6.2, 6.3, 6.4
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Calculates the current balance for an account based on transactions
 * Formula: initial_balance + sum(income) - sum(expense)
 * 
 * @param accountId - The account ID to calculate balance for
 * @param supabase - Supabase client instance
 * @returns The calculated balance
 */
export async function calculateAccountBalance(
  accountId: string,
  supabase: SupabaseClient
): Promise<number> {
  // Get account initial balance
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('initial_balance')
    .eq('id', accountId)
    .single()

  if (accountError || !account) {
    throw new Error(`Failed to fetch account: ${accountError?.message}`)
  }

  // Get all non-deleted transactions for this account
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('account_id', accountId)
    .is('deleted_at', null)

  if (transactionsError) {
    throw new Error(`Failed to fetch transactions: ${transactionsError.message}`)
  }

  // Calculate balance
  const transactionSum = (transactions || []).reduce((sum, tx) => {
    // Income adds to balance, expense subtracts from balance
    return tx.type === 'income' ? sum + tx.amount : sum - tx.amount
  }, 0)

  return account.initial_balance + transactionSum
}

/**
 * Recalculates and updates the balance for an account
 * 
 * @param accountId - The account ID to recalculate
 * @param supabase - Supabase client instance
 * @returns The updated balance
 */
export async function recalculateAccountBalance(
  accountId: string,
  supabase: SupabaseClient
): Promise<number> {
  const balance = await calculateAccountBalance(accountId, supabase)

  // Update the account balance
  const { error } = await supabase
    .from('accounts')
    .update({ 
      balance,
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)

  if (error) {
    throw new Error(`Failed to update account balance: ${error.message}`)
  }

  return balance
}

/**
 * Recalculates balances for multiple accounts
 * 
 * @param accountIds - Array of account IDs to recalculate
 * @param supabase - Supabase client instance
 * @returns Map of account IDs to their updated balances
 */
export async function recalculateMultipleAccountBalances(
  accountIds: string[],
  supabase: SupabaseClient
): Promise<Map<string, number>> {
  const balances = new Map<string, number>()

  // Process accounts in parallel for better performance
  await Promise.all(
    accountIds.map(async (accountId) => {
      try {
        const balance = await recalculateAccountBalance(accountId, supabase)
        balances.set(accountId, balance)
      } catch (error) {
        console.error(`Failed to recalculate balance for account ${accountId}:`, error)
        // Continue with other accounts even if one fails
      }
    })
  )

  return balances
}

/**
 * Gets the current balance for an account without recalculating
 * 
 * @param accountId - The account ID
 * @param supabase - Supabase client instance
 * @returns The current stored balance
 */
export async function getAccountBalance(
  accountId: string,
  supabase: SupabaseClient
): Promise<number> {
  const { data: account, error } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single()

  if (error || !account) {
    throw new Error(`Failed to fetch account balance: ${error?.message}`)
  }

  return account.balance
}

/**
 * Validates that the stored balance matches the calculated balance
 * Useful for debugging and data integrity checks
 * 
 * @param accountId - The account ID to validate
 * @param supabase - Supabase client instance
 * @returns Object with stored balance, calculated balance, and whether they match
 */
export async function validateAccountBalance(
  accountId: string,
  supabase: SupabaseClient
): Promise<{
  storedBalance: number
  calculatedBalance: number
  isValid: boolean
  difference: number
}> {
  const storedBalance = await getAccountBalance(accountId, supabase)
  const calculatedBalance = await calculateAccountBalance(accountId, supabase)
  
  const difference = Math.abs(storedBalance - calculatedBalance)
  const isValid = difference < 0.01 // Allow for floating point precision errors

  return {
    storedBalance,
    calculatedBalance,
    isValid,
    difference,
  }
}
