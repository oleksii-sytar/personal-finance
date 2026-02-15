/**
 * Spending Trends Calculator
 * 
 * Analyzes spending patterns across categories to identify trends, changes,
 * and unusual spending behavior. Provides month-over-month comparisons and
 * 3-month rolling averages for financial insights.
 * 
 * @module calculations/spending-trends
 */

/**
 * Transaction data required for trend analysis
 */
export interface TrendTransaction {
  amount: number
  transaction_date: string
  type: 'income' | 'expense'
  category_id: string
  category_name: string
}

/**
 * Category spending data for a specific period
 */
export interface CategorySpending {
  categoryId: string
  categoryName: string
  amount: number
  transactionCount: number
}

/**
 * Spending trend analysis for a single category
 */
export interface SpendingTrend {
  /** Category identifier */
  categoryId: string
  /** Category name */
  categoryName: string
  /** Spending in current month */
  currentMonth: number
  /** Spending in previous month */
  previousMonth: number
  /** Average spending over last 3 months */
  threeMonthAverage: number
  /** Percentage change from previous month */
  percentChange: number
  /** Trend direction */
  trend: 'increasing' | 'decreasing' | 'stable'
  /** Whether spending is unusually high/low */
  isUnusual: boolean
  /** Number of transactions in current month */
  transactionCount: number
}

/**
 * Complete spending trends analysis result
 */
export interface SpendingTrendsResult {
  /** Array of category trends sorted by current spending (highest first) */
  trends: SpendingTrend[]
  /** Total spending in current month */
  totalCurrentMonth: number
  /** Total spending in previous month */
  totalPreviousMonth: number
  /** Overall percentage change */
  overallPercentChange: number
  /** Top 3 spending categories */
  topCategories: SpendingTrend[]
  /** Categories with unusual spending patterns */
  unusualCategories: SpendingTrend[]
  /** Average daily spending for current month */
  averageDailySpending: number
}

/**
 * Calculates spending for a specific month and groups by category
 * 
 * @param transactions - All transactions
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Array of category spending data
 */
function calculateMonthlySpendingByCategory(
  transactions: TrendTransaction[],
  year: number,
  month: number
): CategorySpending[] {
  // Filter transactions for the specified month
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date)
    return (
      t.type === 'expense' &&
      date.getFullYear() === year &&
      date.getMonth() + 1 === month
    )
  })
  
  // Group by category
  const categoryMap = new Map<string, CategorySpending>()
  
  for (const transaction of monthTransactions) {
    const existing = categoryMap.get(transaction.category_id)
    
    if (existing) {
      existing.amount += transaction.amount
      existing.transactionCount += 1
    } else {
      categoryMap.set(transaction.category_id, {
        categoryId: transaction.category_id,
        categoryName: transaction.category_name,
        amount: transaction.amount,
        transactionCount: 1,
      })
    }
  }
  
  return Array.from(categoryMap.values())
}

/**
 * Calculates 3-month average spending for a category
 * 
 * @param transactions - All transactions
 * @param categoryId - Category to analyze
 * @param endYear - End year
 * @param endMonth - End month (1-12)
 * @returns Average monthly spending over 3 months
 */
function calculateThreeMonthAverage(
  transactions: TrendTransaction[],
  categoryId: string,
  endYear: number,
  endMonth: number
): number {
  const amounts: number[] = []
  
  // Calculate spending for each of the last 3 months
  for (let i = 0; i < 3; i++) {
    let year = endYear
    let month = endMonth - i
    
    // Handle year boundary
    if (month <= 0) {
      month += 12
      year -= 1
    }
    
    const monthSpending = transactions
      .filter(t => {
        const date = new Date(t.transaction_date)
        return (
          t.type === 'expense' &&
          t.category_id === categoryId &&
          date.getFullYear() === year &&
          date.getMonth() + 1 === month
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)
    
    amounts.push(monthSpending)
  }
  
  // Return average
  return amounts.reduce((sum, amount) => sum + amount, 0) / 3
}

/**
 * Determines trend direction based on percentage change
 * 
 * @param percentChange - Percentage change from previous month
 * @returns Trend direction
 */
function determineTrend(percentChange: number): 'increasing' | 'decreasing' | 'stable' {
  if (percentChange > 5) return 'increasing'
  if (percentChange < -5) return 'decreasing'
  return 'stable'
}

/**
 * Determines if spending is unusual compared to 3-month average
 * 
 * Uses 50% deviation threshold: spending is unusual if it differs
 * from the 3-month average by more than 50%
 * 
 * @param currentAmount - Current month spending
 * @param threeMonthAverage - 3-month average spending
 * @returns True if spending is unusual
 */
function isUnusualSpending(currentAmount: number, threeMonthAverage: number): boolean {
  // If average is zero, any spending is not unusual
  if (threeMonthAverage === 0) return false
  
  // Calculate deviation percentage
  const deviation = Math.abs(currentAmount - threeMonthAverage) / threeMonthAverage
  
  // 50% deviation threshold
  return deviation > 0.5
}

/**
 * Calculates spending trends across all categories
 * 
 * This function:
 * - Analyzes spending by category for current and previous months
 * - Calculates 3-month rolling averages
 * - Identifies month-over-month percentage changes
 * - Detects unusual spending patterns (>50% deviation from average)
 * - Ranks categories by current spending
 * 
 * @param transactions - Historical transactions with category information
 * @param year - Year to analyze (e.g., 2026)
 * @param month - Month to analyze (1-12)
 * @returns Complete spending trends analysis
 * 
 * @example
 * ```typescript
 * const result = calculateSpendingTrends(transactions, 2026, 2)
 * 
 * console.log(`Total spending: ${result.totalCurrentMonth}`)
 * console.log(`Change from last month: ${result.overallPercentChange}%`)
 * 
 * result.topCategories.forEach(cat => {
 *   console.log(`${cat.categoryName}: ${cat.currentMonth} (${cat.trend})`)
 * })
 * 
 * if (result.unusualCategories.length > 0) {
 *   console.log('Unusual spending detected in:', result.unusualCategories)
 * }
 * ```
 */
export function calculateSpendingTrends(
  transactions: TrendTransaction[],
  year: number,
  month: number
): SpendingTrendsResult {
  // Calculate spending for current month
  const currentMonthSpending = calculateMonthlySpendingByCategory(transactions, year, month)
  
  // Calculate spending for previous month
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear -= 1
  }
  const previousMonthSpending = calculateMonthlySpendingByCategory(transactions, prevYear, prevMonth)
  
  // Create map of previous month spending for easy lookup
  const prevMonthMap = new Map(
    previousMonthSpending.map(cat => [cat.categoryId, cat.amount])
  )
  
  // Get all unique categories (from current and previous months)
  const allCategoryIds = new Set([
    ...currentMonthSpending.map(cat => cat.categoryId),
    ...previousMonthSpending.map(cat => cat.categoryId),
  ])
  
  // Calculate trends for each category
  const trends: SpendingTrend[] = []
  
  for (const categoryId of allCategoryIds) {
    const currentCat = currentMonthSpending.find(cat => cat.categoryId === categoryId)
    const currentAmount = currentCat?.amount ?? 0
    const currentCount = currentCat?.transactionCount ?? 0
    const categoryName = currentCat?.categoryName ?? 
      previousMonthSpending.find(cat => cat.categoryId === categoryId)?.categoryName ?? 
      'Unknown'
    
    const previousAmount = prevMonthMap.get(categoryId) ?? 0
    
    // Calculate 3-month average
    const threeMonthAverage = calculateThreeMonthAverage(
      transactions,
      categoryId,
      year,
      month
    )
    
    // Calculate percentage change
    let percentChange = 0
    if (previousAmount > 0) {
      percentChange = ((currentAmount - previousAmount) / previousAmount) * 100
    } else if (currentAmount > 0) {
      percentChange = 100 // New spending category
    }
    
    // Determine trend direction
    const trend = determineTrend(percentChange)
    
    // Check if unusual
    const isUnusual = isUnusualSpending(currentAmount, threeMonthAverage)
    
    trends.push({
      categoryId,
      categoryName,
      currentMonth: currentAmount,
      previousMonth: previousAmount,
      threeMonthAverage,
      percentChange,
      trend,
      isUnusual,
      transactionCount: currentCount,
    })
  }
  
  // Sort by current month spending (highest first)
  trends.sort((a, b) => b.currentMonth - a.currentMonth)
  
  // Calculate totals
  const totalCurrentMonth = trends.reduce((sum, t) => sum + t.currentMonth, 0)
  const totalPreviousMonth = trends.reduce((sum, t) => sum + t.previousMonth, 0)
  
  // Calculate overall percentage change
  let overallPercentChange = 0
  if (totalPreviousMonth > 0) {
    overallPercentChange = ((totalCurrentMonth - totalPreviousMonth) / totalPreviousMonth) * 100
  } else if (totalCurrentMonth > 0) {
    overallPercentChange = 100
  }
  
  // Get top 3 categories
  const topCategories = trends.slice(0, 3)
  
  // Get unusual categories
  const unusualCategories = trends.filter(t => t.isUnusual)
  
  // Calculate average daily spending for current month
  const daysInMonth = new Date(year, month, 0).getDate()
  const averageDailySpending = totalCurrentMonth / daysInMonth
  
  return {
    trends,
    totalCurrentMonth,
    totalPreviousMonth,
    overallPercentChange,
    topCategories,
    unusualCategories,
    averageDailySpending,
  }
}
