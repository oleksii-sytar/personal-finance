/**
 * Account utility functions
 * Following code-quality.md JSDoc standards
 */

import type { Account, AccountType, AccountSummary } from '@/types'
import { formatCurrency } from './format'

/**
 * Calculates the total balance across all accounts
 * 
 * @param accounts - Array of accounts
 * @returns Total balance sum
 * 
 * @example
 * calculateTotalBalance([
 *   { current_balance: 1000, ... },
 *   { current_balance: 500, ... }
 * ]) // 1500
 */
export function calculateTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.current_balance, 0)
}

/**
 * Counts accounts by type
 * 
 * @param accounts - Array of accounts
 * @returns Record mapping account types to their counts
 * 
 * @example
 * countAccountsByType([
 *   { type: 'checking', ... },
 *   { type: 'checking', ... },
 *   { type: 'savings', ... }
 * ]) // { checking: 2, savings: 1, credit: 0, investment: 0 }
 */
export function countAccountsByType(
  accounts: Account[]
): Record<AccountType, number> {
  const counts: Record<AccountType, number> = {
    checking: 0,
    savings: 0,
    credit: 0,
    investment: 0,
  }

  accounts.forEach((account) => {
    counts[account.type]++
  })

  return counts
}

/**
 * Identifies accounts with negative balances (debt accounts)
 * 
 * @param accounts - Array of accounts
 * @returns Array of accounts with current_balance < 0
 * 
 * @example
 * getDebtAccounts([
 *   { current_balance: 1000, ... },
 *   { current_balance: -500, ... }
 * ]) // [{ current_balance: -500, ... }]
 */
export function getDebtAccounts(accounts: Account[]): Account[] {
  return accounts.filter((account) => account.current_balance < 0)
}

/**
 * Generates account summary statistics for dashboard display
 * 
 * @param accounts - Array of accounts
 * @returns Account summary with totals and counts
 * 
 * @example
 * generateAccountSummary(accounts)
 * // {
 * //   total_balance: 1500,
 * //   account_counts: { checking: 2, savings: 1, ... },
 * //   debt_accounts: [...],
 * //   total_accounts: 3
 * // }
 */
export function generateAccountSummary(accounts: Account[]): AccountSummary {
  return {
    total_balance: calculateTotalBalance(accounts),
    account_counts: countAccountsByType(accounts),
    debt_accounts: getDebtAccounts(accounts),
    total_accounts: accounts.length,
  }
}

/**
 * Formats account type counts as a human-readable string
 * 
 * @param counts - Record of account type counts
 * @returns Formatted string (e.g., "2 Checking, 1 Savings")
 * 
 * @example
 * formatAccountTypeCounts({ checking: 2, savings: 1, credit: 0, investment: 0 })
 * // "2 Checking, 1 Savings"
 */
export function formatAccountTypeCounts(
  counts: Record<AccountType, number>
): string {
  const parts: string[] = []

  const typeLabels: Record<AccountType, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit: 'Credit',
    investment: 'Investment',
  }

  Object.entries(counts).forEach(([type, count]) => {
    if (count > 0) {
      parts.push(`${count} ${typeLabels[type as AccountType]}`)
    }
  })

  return parts.length > 0 ? parts.join(', ') : 'No accounts'
}

/**
 * Finds the default account in a list of accounts
 * 
 * @param accounts - Array of accounts
 * @returns The default account or undefined if none found
 * 
 * @example
 * findDefaultAccount(accounts) // { is_default: true, ... }
 */
export function findDefaultAccount(accounts: Account[]): Account | undefined {
  return accounts.find((account) => account.is_default)
}

/**
 * Checks if an account has a negative balance (is in debt)
 * 
 * @param account - The account to check
 * @returns True if current_balance is negative
 * 
 * @example
 * isDebtAccount({ current_balance: -500, ... }) // true
 * isDebtAccount({ current_balance: 1000, ... }) // false
 */
export function isDebtAccount(account: Account): boolean {
  return account.current_balance < 0
}

/**
 * Formats an account balance with currency symbol
 * Wrapper around formatCurrency for account-specific formatting
 * 
 * @param account - The account to format balance for
 * @returns Formatted balance string
 * 
 * @example
 * formatAccountBalance({ current_balance: 1000, currency: 'UAH', ... })
 * // "₴1,000.00"
 */
export function formatAccountBalance(account: Account): string {
  return formatCurrency(account.current_balance, account.currency)
}

/**
 * Sorts accounts by creation date (oldest first)
 * Requirement: 2.4 - Chronological ordering
 * 
 * @param accounts - Array of accounts to sort
 * @returns Sorted array (does not mutate original)
 * 
 * @example
 * sortAccountsByDate(accounts) // [oldest, ..., newest]
 */
export function sortAccountsByDate(accounts: Account[]): Account[] {
  return [...accounts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}
