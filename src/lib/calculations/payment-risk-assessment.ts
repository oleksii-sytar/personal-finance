/**
 * Payment Risk Assessment
 * 
 * Assesses risk for upcoming planned transactions by calculating projected
 * balance at payment date and providing actionable recommendations.
 * 
 * SAFETY RULES:
 * 1. Conservative balance projections
 * 2. Clear recommendations
 * 3. Account for daily spending after payment
 * 4. Flag payments that leave insufficient buffer
 */

import { differenceInDays, format, isSameDay } from 'date-fns'

export interface Transaction {
  id: string
  amount: number
  description: string
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out'
  status: 'completed' | 'planned'
  transaction_date: Date
  planned_date?: Date
}

export interface DailyForecast {
  date: Date
  projectedBalance: number
  confidence: 'high' | 'medium' | 'low'
  riskLevel: 'safe' | 'warning' | 'danger'
  breakdown: {
    startingBalance: number
    plannedIncome: number
    plannedExpenses: number
    estimatedDailySpending: number
    endingBalance: number
  }
  warnings: string[]
}

export interface PaymentRisk {
  transaction: Transaction
  daysUntil: number
  projectedBalanceAtDate: number
  balanceAfterPayment: number
  riskLevel: 'safe' | 'warning' | 'danger'
  recommendation: string
  canAfford: boolean
}

/**
 * Assess risk for each upcoming payment
 * 
 * @param plannedTransactions - List of planned transactions to assess
 * @param dailyForecasts - Daily balance forecasts
 * @param averageDailySpending - Average daily spending amount
 * @param safetyBufferDays - Number of days of spending to keep as buffer (default: 7)
 * @returns Array of payment risks sorted by urgency (soonest first)
 */
export function assessPaymentRisks(
  plannedTransactions: Transaction[],
  dailyForecasts: DailyForecast[],
  averageDailySpending: number,
  safetyBufferDays: number = 7
): PaymentRisk[] {
  // Filter to expense transactions only
  const expenseTransactions = plannedTransactions.filter(
    t => t.type === 'expense'
  )

  // Assess each payment
  const risks = expenseTransactions.map(transaction => {
    const paymentDate = transaction.planned_date || transaction.transaction_date
    const daysUntil = differenceInDays(paymentDate, new Date())

    // Find forecast for payment date
    const forecast = dailyForecasts.find(f => isSameDay(f.date, paymentDate))

    // Handle missing forecast data
    if (!forecast) {
      return {
        transaction,
        daysUntil,
        projectedBalanceAtDate: 0,
        balanceAfterPayment: -transaction.amount,
        riskLevel: 'danger' as const,
        recommendation: 'Unable to calculate - insufficient forecast data',
        canAfford: false,
      }
    }

    // Calculate balance after payment
    const projectedBalance = forecast.breakdown.startingBalance
    const balanceAfterPayment = projectedBalance - transaction.amount
    const safetyBuffer = averageDailySpending * safetyBufferDays

    // Determine risk level and recommendation
    let riskLevel: 'safe' | 'warning' | 'danger'
    let recommendation: string
    let canAfford: boolean

    if (balanceAfterPayment < 0) {
      // Insufficient funds
      riskLevel = 'danger'
      const shortfall = Math.abs(balanceAfterPayment)
      recommendation = `Insufficient funds. Need ₴${shortfall.toFixed(2)} more by ${format(paymentDate, 'MMM d')}.`
      canAfford = false
    } else if (balanceAfterPayment < safetyBuffer) {
      // Balance will be tight
      riskLevel = 'warning'
      recommendation = `Balance will be tight. Only ₴${balanceAfterPayment.toFixed(2)} remaining after payment (less than ${safetyBufferDays}-day buffer).`
      canAfford = true
    } else {
      // Sufficient funds
      riskLevel = 'safe'
      recommendation = `Sufficient funds available. ₴${balanceAfterPayment.toFixed(2)} remaining after payment.`
      canAfford = true
    }

    return {
      transaction,
      daysUntil,
      projectedBalanceAtDate: projectedBalance,
      balanceAfterPayment,
      riskLevel,
      recommendation,
      canAfford,
    }
  })

  // Sort by urgency (soonest first)
  return risks.sort((a, b) => a.daysUntil - b.daysUntil)
}
