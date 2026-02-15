import { describe, it, expect } from 'vitest'
import { addDays, subDays } from 'date-fns'
import {
  assessPaymentRisks,
  type Transaction,
  type DailyForecast,
  type PaymentRisk,
} from '@/lib/calculations/payment-risk-assessment'

// Helper to create mock transaction
function createMockTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  const baseDate = new Date('2026-02-15')
  return {
    id: `tx-${Math.random()}`,
    amount: 1000,
    description: 'Test payment',
    type: 'expense',
    status: 'planned',
    transaction_date: baseDate,
    planned_date: baseDate,
    ...overrides,
  }
}

// Helper to create mock forecast
function createMockForecast(
  date: Date,
  startingBalance: number,
  overrides: Partial<DailyForecast> = {}
): DailyForecast {
  return {
    date,
    projectedBalance: startingBalance,
    confidence: 'high',
    riskLevel: 'safe',
    breakdown: {
      startingBalance,
      plannedIncome: 0,
      plannedExpenses: 0,
      estimatedDailySpending: 100,
      endingBalance: startingBalance,
    },
    warnings: [],
    ...overrides,
  }
}

describe('assessPaymentRisks', () => {
  describe('Basic Functionality', () => {
    it('should assess a single payment with sufficient funds', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 500,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [
        createMockForecast(baseDate, 5000), // ₴5000 starting balance
      ]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks).toHaveLength(1)
      expect(risks[0].riskLevel).toBe('safe')
      expect(risks[0].canAfford).toBe(true)
      expect(risks[0].balanceAfterPayment).toBe(4500)
      expect(risks[0].recommendation).toContain('Sufficient funds')
    })

    it('should identify insufficient funds (danger)', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 6000, // More than available
          planned_date: baseDate,
        }),
      ]

      const forecasts = [
        createMockForecast(baseDate, 5000), // Only ₴5000 available
      ]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks).toHaveLength(1)
      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].canAfford).toBe(false)
      expect(risks[0].balanceAfterPayment).toBe(-1000)
      expect(risks[0].recommendation).toContain('Insufficient funds')
      expect(risks[0].recommendation).toContain('₴1000.00')
    })

    it('should identify tight balance (warning)', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 4500,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [
        createMockForecast(baseDate, 5000),
      ]

      const averageDailySpending = 100
      const safetyBufferDays = 7
      const safetyBuffer = averageDailySpending * safetyBufferDays // ₴700

      const risks = assessPaymentRisks(
        transactions,
        forecasts,
        averageDailySpending,
        safetyBufferDays
      )

      expect(risks).toHaveLength(1)
      expect(risks[0].riskLevel).toBe('warning')
      expect(risks[0].canAfford).toBe(true)
      expect(risks[0].balanceAfterPayment).toBe(500) // Less than ₴700 buffer
      expect(risks[0].recommendation).toContain('Balance will be tight')
    })
  })

  describe('Multiple Payments', () => {
    it('should assess multiple payments', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 500,
          planned_date: baseDate,
          description: 'Payment 1',
        }),
        createMockTransaction({
          amount: 1000,
          planned_date: addDays(baseDate, 5),
          description: 'Payment 2',
        }),
        createMockTransaction({
          amount: 2000,
          planned_date: addDays(baseDate, 10),
          description: 'Payment 3',
        }),
      ]

      const forecasts = [
        createMockForecast(baseDate, 5000),
        createMockForecast(addDays(baseDate, 5), 4000),
        createMockForecast(addDays(baseDate, 10), 3000),
      ]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks).toHaveLength(3)
      expect(risks[0].transaction.description).toBe('Payment 1')
      expect(risks[1].transaction.description).toBe('Payment 2')
      expect(risks[2].transaction.description).toBe('Payment 3')
    })

    it('should sort payments by urgency (soonest first)', () => {
      const today = new Date()
      const transactions = [
        createMockTransaction({
          planned_date: addDays(today, 10),
          description: 'Far payment',
        }),
        createMockTransaction({
          planned_date: today,
          description: 'Today payment',
        }),
        createMockTransaction({
          planned_date: addDays(today, 5),
          description: 'Mid payment',
        }),
      ]

      const forecasts = [
        createMockForecast(today, 5000),
        createMockForecast(addDays(today, 5), 5000),
        createMockForecast(addDays(today, 10), 5000),
      ]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].transaction.description).toBe('Today payment')
      expect(risks[0].daysUntil).toBe(0)
      expect(risks[1].transaction.description).toBe('Mid payment')
      expect(risks[1].daysUntil).toBe(5)
      expect(risks[2].transaction.description).toBe('Far payment')
      expect(risks[2].daysUntil).toBe(10)
    })
  })

  describe('Transaction Type Filtering', () => {
    it('should only assess expense transactions', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          type: 'expense',
          description: 'Expense',
        }),
        createMockTransaction({
          type: 'income',
          description: 'Income',
        }),
        createMockTransaction({
          type: 'transfer_in',
          description: 'Transfer In',
        }),
        createMockTransaction({
          type: 'transfer_out',
          description: 'Transfer Out',
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks).toHaveLength(1)
      expect(risks[0].transaction.description).toBe('Expense')
    })
  })

  describe('Safety Buffer Calculations', () => {
    it('should use custom safety buffer days', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 4500,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const averageDailySpending = 100

      // With 7-day buffer: ₴700 - should be warning (₴500 < ₴700)
      const risks7Days = assessPaymentRisks(
        transactions,
        forecasts,
        averageDailySpending,
        7
      )
      expect(risks7Days[0].riskLevel).toBe('warning')

      // With 3-day buffer: ₴300 - should be safe (₴500 > ₴300)
      const risks3Days = assessPaymentRisks(
        transactions,
        forecasts,
        averageDailySpending,
        3
      )
      expect(risks3Days[0].riskLevel).toBe('safe')
    })

    it('should calculate safety buffer correctly', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 4800,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const averageDailySpending = 50
      const safetyBufferDays = 10
      // Safety buffer = 50 * 10 = ₴500

      const risks = assessPaymentRisks(
        transactions,
        forecasts,
        averageDailySpending,
        safetyBufferDays
      )

      // Balance after payment: ₴200 (less than ₴500 buffer)
      expect(risks[0].riskLevel).toBe('warning')
      expect(risks[0].balanceAfterPayment).toBe(200)
    })
  })

  describe('Missing Forecast Data', () => {
    it('should handle missing forecast gracefully', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          planned_date: baseDate,
        }),
      ]

      const forecasts: DailyForecast[] = [] // No forecasts

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks).toHaveLength(1)
      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].canAfford).toBe(false)
      expect(risks[0].projectedBalanceAtDate).toBe(0)
      expect(risks[0].balanceAfterPayment).toBe(-1000)
      expect(risks[0].recommendation).toContain('insufficient forecast data')
    })

    it('should handle forecast for different date', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          planned_date: baseDate,
        }),
      ]

      const forecasts = [
        createMockForecast(addDays(baseDate, 1), 5000), // Different date
      ]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].recommendation).toContain('insufficient forecast data')
    })
  })

  describe('Days Until Calculation', () => {
    it('should calculate days until payment correctly', () => {
      const today = new Date()
      const transactions = [
        createMockTransaction({
          planned_date: today,
          description: 'Today',
        }),
        createMockTransaction({
          planned_date: addDays(today, 3),
          description: '3 days',
        }),
        createMockTransaction({
          planned_date: addDays(today, 30),
          description: '30 days',
        }),
      ]

      const forecasts = [
        createMockForecast(today, 5000),
        createMockForecast(addDays(today, 3), 5000),
        createMockForecast(addDays(today, 30), 5000),
      ]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].daysUntil).toBe(0)
      expect(risks[1].daysUntil).toBe(3)
      expect(risks[2].daysUntil).toBe(30)
    })

    it('should handle past dates (negative days)', () => {
      const today = new Date()
      const transactions = [
        createMockTransaction({
          planned_date: subDays(today, 5),
          description: 'Past payment',
        }),
      ]

      const forecasts = [createMockForecast(subDays(today, 5), 5000)]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].daysUntil).toBe(-5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty transaction list', () => {
      const forecasts = [createMockForecast(new Date(), 5000)]

      const risks = assessPaymentRisks([], forecasts, 100, 7)

      expect(risks).toHaveLength(0)
    })

    it('should handle zero balance', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 100,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 0)]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].balanceAfterPayment).toBe(-100)
    })

    it('should handle exact safety buffer amount', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 4300,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const averageDailySpending = 100
      const safetyBufferDays = 7
      // Safety buffer = ₴700
      // Balance after payment = ₴700 (exactly at buffer)

      const risks = assessPaymentRisks(
        transactions,
        forecasts,
        averageDailySpending,
        safetyBufferDays
      )

      // Should be safe since balance equals buffer (not less than)
      expect(risks[0].balanceAfterPayment).toBe(700)
      expect(risks[0].riskLevel).toBe('safe')
    })

    it('should handle very large payment amounts', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 1000000,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].balanceAfterPayment).toBe(-995000)
      expect(risks[0].recommendation).toContain('₴995000.00')
    })

    it('should handle zero average daily spending', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 100,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const risks = assessPaymentRisks(transactions, forecasts, 0, 7)

      // With zero spending, safety buffer is 0
      // Balance after payment: ₴4900 (> ₴0)
      expect(risks[0].riskLevel).toBe('safe')
    })
  })

  describe('Recommendation Messages', () => {
    it('should include shortfall amount in danger recommendation', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 6000,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].recommendation).toContain('₴1000.00')
      expect(risks[0].recommendation).toContain('Feb 15')
    })

    it('should include remaining balance in warning recommendation', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 4500,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].recommendation).toContain('₴500.00')
      expect(risks[0].recommendation).toContain('7-day buffer')
    })

    it('should include remaining balance in safe recommendation', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 1000,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [createMockForecast(baseDate, 5000)]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].recommendation).toContain('₴4000.00')
      expect(risks[0].recommendation).toContain('Sufficient funds')
    })
  })

  describe('Projected Balance Calculation', () => {
    it('should use starting balance from forecast', () => {
      const baseDate = new Date('2026-02-15')
      const transactions = [
        createMockTransaction({
          amount: 500,
          planned_date: baseDate,
        }),
      ]

      const forecasts = [
        createMockForecast(baseDate, 3000, {
          breakdown: {
            startingBalance: 3000,
            plannedIncome: 0,
            plannedExpenses: 0,
            estimatedDailySpending: 100,
            endingBalance: 2900,
          },
        }),
      ]

      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)

      expect(risks[0].projectedBalanceAtDate).toBe(3000)
      expect(risks[0].balanceAfterPayment).toBe(2500)
    })
  })
})
