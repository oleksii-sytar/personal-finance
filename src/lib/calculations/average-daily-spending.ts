/**
 * Average Daily Spending Calculator
 * 
 * Calculates average daily spending from historical transactions with outlier exclusion
 * and confidence level assessment. Used for financial forecasting and safety analysis.
 * 
 * @module calculations/average-daily-spending
 */

/**
 * Transaction data required for spending calculation
 */
export interface SpendingTransaction {
  amount: number
  transaction_date: string
  type: 'income' | 'expense'
}

/**
 * Result of average daily spending calculation
 */
export interface AverageDailySpendingResult {
  /** Average daily spending amount (positive number) */
  averageDailySpending: number
  /** Confidence level: 'high' (30+ days), 'medium' (14-29 days), 'low' (<14 days), 'none' (insufficient data) */
  confidence: 'high' | 'medium' | 'low' | 'none'
  /** Number of days analyzed */
  daysAnalyzed: number
  /** Number of expense transactions included */
  transactionsIncluded: number
  /** Number of transactions excluded as outliers */
  transactionsExcluded: number
  /** Total spending amount analyzed */
  totalSpending: number
  /** Median transaction amount (used for outlier detection) */
  medianAmount: number
}

/**
 * Calculates the median value from an array of numbers
 * 
 * @param values - Array of numbers to calculate median from
 * @returns Median value, or 0 if array is empty
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Determines confidence level based on number of days analyzed
 * 
 * @param days - Number of days with transaction data
 * @returns Confidence level
 */
function determineConfidence(days: number): 'high' | 'medium' | 'low' | 'none' {
  if (days < 14) return 'none'
  if (days < 30) return 'medium'
  return 'high'
}

/**
 * Calculates average daily spending from historical transactions
 * 
 * This function:
 * - Filters for expense transactions only
 * - Excludes outliers (transactions > 3x median) as one-time large purchases
 * - Requires minimum 14 days of data for reliable calculation
 * - Returns confidence level based on data quality
 * 
 * Conservative approach: Better to underestimate than overestimate spending
 * 
 * @param transactions - Array of historical transactions
 * @param outlierThreshold - Multiplier for median to identify outliers (default: 3)
 * @returns Average daily spending result with confidence level
 * 
 * @example
 * ```typescript
 * const result = calculateAverageDailySpending(transactions)
 * if (result.confidence !== 'none') {
 *   console.log(`Average daily spending: ${result.averageDailySpending}`)
 *   console.log(`Confidence: ${result.confidence}`)
 * }
 * ```
 */
export function calculateAverageDailySpending(
  transactions: SpendingTransaction[],
  outlierThreshold: number = 3
): AverageDailySpendingResult {
  // Filter for expense transactions only
  const expenses = transactions.filter(t => t.type === 'expense')
  
  // Handle no data case
  if (expenses.length === 0) {
    return {
      averageDailySpending: 0,
      confidence: 'none',
      daysAnalyzed: 0,
      transactionsIncluded: 0,
      transactionsExcluded: 0,
      totalSpending: 0,
      medianAmount: 0,
    }
  }
  
  // Calculate date range
  const dates = expenses.map(t => new Date(t.transaction_date))
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
  const daysAnalyzed = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // Check minimum data requirement
  if (daysAnalyzed < 14) {
    const totalSpending = expenses.reduce((sum, t) => sum + t.amount, 0)
    return {
      averageDailySpending: totalSpending / daysAnalyzed,
      confidence: 'none',
      daysAnalyzed,
      transactionsIncluded: expenses.length,
      transactionsExcluded: 0,
      totalSpending,
      medianAmount: calculateMedian(expenses.map(t => t.amount)),
    }
  }
  
  // Calculate median for outlier detection
  const amounts = expenses.map(t => t.amount)
  const medianAmount = calculateMedian(amounts)
  
  // Exclude outliers (one-time large purchases)
  const threshold = medianAmount * outlierThreshold
  const includedExpenses = expenses.filter(t => t.amount <= threshold)
  const excludedCount = expenses.length - includedExpenses.length
  
  // Handle case where all transactions are outliers
  if (includedExpenses.length === 0) {
    // Use all transactions but mark confidence as low
    const totalSpending = expenses.reduce((sum, t) => sum + t.amount, 0)
    return {
      averageDailySpending: totalSpending / daysAnalyzed,
      confidence: 'low',
      daysAnalyzed,
      transactionsIncluded: expenses.length,
      transactionsExcluded: 0,
      totalSpending,
      medianAmount,
    }
  }
  
  // Calculate average daily spending
  const totalSpending = includedExpenses.reduce((sum, t) => sum + t.amount, 0)
  const averageDailySpending = totalSpending / daysAnalyzed
  
  // Determine confidence level
  const confidence = determineConfidence(daysAnalyzed)
  
  return {
    averageDailySpending,
    confidence,
    daysAnalyzed,
    transactionsIncluded: includedExpenses.length,
    transactionsExcluded: excludedCount,
    totalSpending,
    medianAmount,
  }
}
