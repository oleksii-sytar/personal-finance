/**
 * Daily Cash Flow Forecast Calculator
 * 
 * Projects future account balances with conservative estimates and risk assessment.
 * Uses historical spending patterns and planned transactions to forecast daily balances.
 * 
 * @module calculations/daily-forecast
 */

import { calculateAverageDailySpending, type SpendingTransaction } from './average-daily-spending'

/**
 * Planned transaction data for forecast calculation
 */
export interface PlannedTransaction {
  amount: number
  planned_date: string
  type: 'income' | 'expense'
}

/**
 * User-defined settings for forecast calculation
 */
export interface UserSettings {
  /** Minimum safe balance threshold (user-defined) */
  minimumSafeBalance: number
  /** Number of days to use as safety buffer (default: 7) */
  safetyBufferDays?: number
}

/**
 * Breakdown of daily balance calculation
 */
export interface DailyBalanceBreakdown {
  /** Balance at start of day */
  startingBalance: number
  /** Planned income for this day */
  plannedIncome: number
  /** Planned expenses for this day */
  plannedExpenses: number
  /** Estimated daily spending (conservative) */
  estimatedDailySpending: number
  /** Projected balance at end of day */
  endingBalance: number
}

/**
 * Daily forecast result for a single day
 */
export interface DailyForecast {
  /** Date of forecast */
  date: string
  /** Projected balance at end of day */
  projectedBalance: number
  /** Confidence level based on historical data quality */
  confidence: 'high' | 'medium' | 'low'
  /** Risk level based on user's minimum safe balance */
  riskLevel: 'safe' | 'warning' | 'danger'
  /** Detailed breakdown of calculation */
  breakdown: DailyBalanceBreakdown
}

/**
 * Complete forecast result with metadata
 */
export interface ForecastResult {
  /** Array of daily forecasts */
  forecasts: DailyForecast[]
  /** Average daily spending used in calculation */
  averageDailySpending: number
  /** Confidence level of spending calculation */
  spendingConfidence: 'high' | 'medium' | 'low' | 'none'
  /** Whether forecast should be displayed (false if confidence is low) */
  shouldDisplay: boolean
}

/**
 * Determines risk level based on projected balance and user settings
 * 
 * @param balance - Projected balance
 * @param settings - User-defined settings
 * @param averageDailySpending - Average daily spending amount
 * @returns Risk level: 'safe', 'warning', or 'danger'
 */
function determineRiskLevel(
  balance: number,
  settings: UserSettings,
  averageDailySpending: number
): 'safe' | 'warning' | 'danger' {
  const safetyBufferDays = settings.safetyBufferDays ?? 7
  const warningThreshold = settings.minimumSafeBalance + (averageDailySpending * safetyBufferDays)
  
  if (balance < settings.minimumSafeBalance) {
    return 'danger'
  }
  
  if (balance < warningThreshold) {
    return 'warning'
  }
  
  return 'safe'
}

/**
 * Determines confidence level for a specific forecast date
 * 
 * @param date - Forecast date
 * @param today - Current date
 * @param spendingConfidence - Confidence from spending calculation
 * @returns Confidence level for this forecast
 */
function determineForecastConfidence(
  date: Date,
  today: Date,
  spendingConfidence: 'high' | 'medium' | 'low' | 'none'
): 'high' | 'medium' | 'low' {
  // If spending confidence is none or low, forecast is low confidence
  if (spendingConfidence === 'none' || spendingConfidence === 'low') {
    return 'low'
  }
  
  // Calculate days in future
  const daysInFuture = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  // Confidence decreases with distance into future
  if (daysInFuture > 30) {
    return 'low'
  }
  
  if (daysInFuture > 14) {
    return 'medium'
  }
  
  return spendingConfidence === 'high' ? 'high' : 'medium'
}

/**
 * Calculates daily cash flow forecast for a date range
 * 
 * This function:
 * - Uses historical transactions to calculate average daily spending
 * - Applies conservative 1.1x multiplier for safety margin
 * - Projects balance for each day including planned transactions
 * - Assesses risk level based on user-defined minimum safe balance
 * - Hides low-confidence forecasts (returns shouldDisplay: false)
 * 
 * @param currentBalance - Current account balance
 * @param historicalTransactions - Historical completed transactions (for spending calculation)
 * @param plannedTransactions - Future planned transactions
 * @param startDate - Start date for forecast (YYYY-MM-DD)
 * @param endDate - End date for forecast (YYYY-MM-DD)
 * @param userSettings - User-defined settings (minimum safe balance, safety buffer)
 * @returns Forecast result with daily projections
 * 
 * @example
 * ```typescript
 * const result = calculateDailyForecast(
 *   5000, // current balance
 *   historicalTransactions,
 *   plannedTransactions,
 *   '2026-02-01',
 *   '2026-02-28',
 *   { minimumSafeBalance: 1000, safetyBufferDays: 7 }
 * )
 * 
 * if (result.shouldDisplay) {
 *   result.forecasts.forEach(forecast => {
 *     console.log(`${forecast.date}: ${forecast.projectedBalance} (${forecast.riskLevel})`)
 *   })
 * }
 * ```
 */
export function calculateDailyForecast(
  currentBalance: number,
  historicalTransactions: SpendingTransaction[],
  plannedTransactions: PlannedTransaction[],
  startDate: string,
  endDate: string,
  userSettings: UserSettings
): ForecastResult {
  // Calculate average daily spending from historical data
  const spendingResult = calculateAverageDailySpending(historicalTransactions)
  
  // If insufficient data, return empty forecast with shouldDisplay: false
  if (spendingResult.confidence === 'none') {
    return {
      forecasts: [],
      averageDailySpending: 0,
      spendingConfidence: 'none',
      shouldDisplay: false,
    }
  }
  
  // Apply conservative multiplier (1.1x = 10% safety margin)
  const conservativeMultiplier = 1.1
  const conservativeDailySpending = spendingResult.averageDailySpending * conservativeMultiplier
  
  // Parse dates
  const start = new Date(startDate)
  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Generate daily forecasts
  const forecasts: DailyForecast[] = []
  let runningBalance = currentBalance
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0]
    
    // Find planned transactions for this day
    const dayPlanned = plannedTransactions.filter(t => t.planned_date === dateStr)
    
    const plannedIncome = dayPlanned
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const plannedExpenses = dayPlanned
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Calculate projected balance
    const startingBalance = runningBalance
    const endingBalance = 
      startingBalance +
      plannedIncome -
      plannedExpenses -
      conservativeDailySpending
    
    // Determine risk level
    const riskLevel = determineRiskLevel(
      endingBalance,
      userSettings,
      conservativeDailySpending
    )
    
    // Determine confidence for this specific date
    const confidence = determineForecastConfidence(
      date,
      today,
      spendingResult.confidence
    )
    
    forecasts.push({
      date: dateStr,
      projectedBalance: endingBalance,
      confidence,
      riskLevel,
      breakdown: {
        startingBalance,
        plannedIncome,
        plannedExpenses,
        estimatedDailySpending: conservativeDailySpending,
        endingBalance,
      },
    })
    
    // Update running balance for next day
    runningBalance = endingBalance
  }
  
  // Determine if forecast should be displayed
  // Hide if spending confidence is low or none
  const shouldDisplay = spendingResult.confidence === 'high' || spendingResult.confidence === 'medium'
  
  return {
    forecasts,
    averageDailySpending: conservativeDailySpending,
    spendingConfidence: spendingResult.confidence,
    shouldDisplay,
  }
}
