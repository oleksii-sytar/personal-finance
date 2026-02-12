/**
 * Currency Converter Utility
 * 
 * Converts amounts between currencies using exchange rates from the database.
 * All conversions go through UAH as the intermediate currency.
 * 
 * Requirements: 5.2, 8.1
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Account balance information with reconciliation data
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
 * Converts an amount from one currency to another using exchange rates from the database.
 * 
 * Conversion logic:
 * - If currencies are the same, returns the amount unchanged
 * - Converts via UAH as intermediate currency (fromCurrency → UAH → toCurrency)
 * - Uses the most recent exchange rate available in the database
 * 
 * @param amount - The amount to convert
 * @param fromCurrency - The source currency code (e.g., 'USD', 'EUR')
 * @param toCurrency - The target currency code (e.g., 'UAH', 'USD')
 * @returns The converted amount
 * @throws Error if exchange rate is not found for either currency
 * 
 * @example
 * // Convert $100 USD to UAH
 * const uahAmount = await convertCurrency(100, 'USD', 'UAH')
 * 
 * @example
 * // Convert €50 EUR to USD (via UAH)
 * const usdAmount = await convertCurrency(50, 'EUR', 'USD')
 * 
 * @example
 * // Same currency - no conversion needed
 * const amount = await convertCurrency(100, 'UAH', 'UAH') // Returns 100
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // Handle same-currency case - no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  const supabase = await createClient()
  
  // Step 1: Convert from source currency to UAH
  let uahAmount: number
  
  if (fromCurrency === 'UAH') {
    // Already in UAH, no conversion needed
    uahAmount = amount
  } else {
    // Get exchange rate for source currency
    const { data: fromRate, error: fromError } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency', fromCurrency)
      .order('date', { ascending: false })
      .limit(1)
      .single()
    
    if (fromError || !fromRate) {
      throw new Error(`Exchange rate not found for ${fromCurrency}`)
    }
    
    // Convert to UAH: amount * rate
    uahAmount = amount * fromRate.rate
  }
  
  // Step 2: Convert from UAH to target currency
  if (toCurrency === 'UAH') {
    // Already in UAH, return the amount
    return uahAmount
  }
  
  // Get exchange rate for target currency
  const { data: toRate, error: toError } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('currency', toCurrency)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  
  if (toError || !toRate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`)
  }
  
  // Convert from UAH to target currency: uahAmount / rate
  return uahAmount / toRate.rate
}

/**
 * Calculates total difference across all accounts in workspace currency.
 * 
 * Converts each account's difference to the workspace currency and sums them.
 * Handles conversion failures gracefully by skipping the account and logging a warning.
 * 
 * Requirements: 5.1, 8.2
 * 
 * @param accountBalances - Array of account balances with differences
 * @param workspaceCurrency - The target currency for the total (e.g., 'UAH')
 * @returns The total difference in workspace currency
 * 
 * @example
 * const accounts = [
 *   { account_id: '1', difference: 100, currency: 'USD', ... },
 *   { account_id: '2', difference: -50, currency: 'EUR', ... }
 * ]
 * const total = await calculateTotalDifference(accounts, 'UAH')
 * // Returns sum of differences converted to UAH
 */
export async function calculateTotalDifference(
  accountBalances: AccountBalance[],
  workspaceCurrency: string
): Promise<number> {
  let total = 0
  
  for (const account of accountBalances) {
    try {
      const converted = await convertCurrency(
        account.difference,
        account.currency,
        workspaceCurrency
      )
      total += converted
    } catch (error) {
      console.warn(
        `Failed to convert ${account.currency} to ${workspaceCurrency} for account ${account.account_id}. ` +
        `Skipping this account in total calculation.`,
        error
      )
      // Skip this account if conversion fails - graceful degradation
    }
  }
  
  return total
}
