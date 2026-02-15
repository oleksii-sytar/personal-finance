import type { Transaction } from '@/types'

/**
 * Calculates account balance from opening balance and transactions
 * 
 * Formula: opening_balance + sum(income) - sum(expense)
 * 
 * @param openingBalance - The opening balance of the account
 * @param transactions - Array of transactions for the account
 * @returns The calculated balance
 * 
 * @example
 * const balance = calculateAccountBalance(1000, [
 *   { type: 'income', amount: 500, deleted_at: null },
 *   { type: 'expense', amount: 200, deleted_at: null }
 * ])
 * // Returns: 1300 (1000 + 500 - 200)
 */
export function calculateAccountBalance(
  openingBalance: number,
  transactions: Transaction[]
): number {
  // Filter out soft-deleted transactions and planned transactions
  // Only completed transactions should affect the balance
  const activeTransactions = transactions.filter(t => 
    !t.deleted_at && t.status === 'completed'
  )
  
  // Calculate sum of income and expenses
  const transactionSum = activeTransactions.reduce((sum, transaction) => {
    return transaction.type === 'income' 
      ? sum + transaction.amount 
      : sum - transaction.amount
  }, 0)
  
  // Return opening balance plus transaction sum
  return openingBalance + transactionSum
}

/**
 * Calculates the reconciliation difference between current and calculated balance
 * 
 * Formula: current_balance - calculated_balance
 * 
 * A positive difference indicates:
 * - Missing income transactions, OR
 * - Extra expenses entered
 * 
 * A negative difference indicates:
 * - Missing expense transactions, OR
 * - Extra income entered
 * 
 * The account is considered reconciled if |difference| < 0.01 (handles floating point precision)
 * 
 * @param currentBalance - The actual balance from the bank
 * @param calculatedBalance - The balance calculated from opening balance + transactions
 * @returns The difference with sign (positive/negative), or 0 if reconciled
 * 
 * @example
 * // Account is reconciled
 * calculateDifference(1000, 1000) // Returns: 0
 * 
 * @example
 * // Missing income or extra expenses
 * calculateDifference(1050, 1000) // Returns: 50
 * 
 * @example
 * // Missing expenses or extra income
 * calculateDifference(950, 1000) // Returns: -50
 * 
 * @example
 * // Floating point precision handling
 * calculateDifference(1000.005, 1000) // Returns: 0 (considered reconciled)
 */
export function calculateDifference(
  currentBalance: number,
  calculatedBalance: number
): number {
  const difference = currentBalance - calculatedBalance
  
  // Handle floating point precision - consider reconciled if difference < 0.01
  if (Math.abs(difference) < 0.01) {
    return 0
  }
  
  return difference
}
