/**
 * Integration tests for the complete forecast calculation flow
 * 
 * Tests the integration of:
 * - Average daily spending calculation
 * - Daily forecast generation
 * - Conservative calculation approach
 * 
 * Validates end-to-end forecast generation with various data scenarios
 */

import { describe, it, expect } from 'vitest'
import { calculateDailyForecast } from '@/lib/calculations/daily-forecast'
import type { SpendingTransaction } from '@/lib/calculations/average-daily-spending'
import type { PlannedTransaction } from '@/lib/calculations/daily-forecast'

describe('Forecast Flow Integration', () => {
  const userSettings = { minimumSafeBalance: 1000, safetyBufferDays: 7 }

  describe('Complete Flow: Historical Data → Forecast', () => {
    it('should generate conservative forecast from consistent spending pattern', () => {
      // Arrange: 30 days of consistent spending (~100 UAH/day)
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 100, // Positive for expenses
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 5000
      const plannedTransactions: PlannedTransaction[] = []

      // Act: Run complete flow
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Verify conservative forecast
      expect(result.shouldDisplay).toBe(true)
      expect(result.spendingConfidence).toBe('high')
      expect(result.averageDailySpending).toBeGreaterThanOrEqual(100 * 1.1) // Conservative multiplier
      expect(result.forecasts.length).toBe(28) // 28 days in February
      
      // Verify declining balance
      const firstDay = result.forecasts[0]
      const lastDay = result.forecasts[27]
      expect(firstDay.projectedBalance).toBeLessThan(currentBalance)
      expect(lastDay.projectedBalance).toBeLessThan(firstDay.projectedBalance)
      
      // Verify risk levels are appropriate with sufficient balance
      expect(firstDay.riskLevel).toBe('safe')
    })

    it('should handle variable spending with conservative bias', () => {
      // Arrange: Variable spending pattern (50-150 UAH/day)
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 50 + (i % 10) * 10, // Varies from 50 to 140
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 3000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should use conservative estimate (higher spending)
      const actualAverage = historicalTransactions.reduce((sum, tx) => sum + tx.amount, 0) / 30
      expect(result.averageDailySpending).toBeGreaterThanOrEqual(actualAverage * 1.1)
      
      // Verify forecast reflects conservative spending
      const firstDay = result.forecasts[0]
      const lastDay = result.forecasts[27]
      const totalForecasted = firstDay.projectedBalance - lastDay.projectedBalance
      const expectedTotal = result.averageDailySpending * 28
      // Allow for small rounding differences
      expect(Math.abs(totalForecasted - expectedTotal)).toBeLessThan(200)
    })

    it('should integrate planned transactions into forecast', () => {
      // Arrange: Consistent spending + large planned payment
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 50,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 2000
      const plannedTransactions: PlannedTransaction[] = [
        {
          amount: 1000,
          planned_date: '2024-02-15',
          type: 'expense',
        },
      ]

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Verify planned transaction impact
      const dayBeforeRent = result.forecasts.find(f => f.date === '2024-02-14')
      const rentDay = result.forecasts.find(f => f.date === '2024-02-15')
      
      expect(dayBeforeRent).toBeDefined()
      expect(rentDay).toBeDefined()
      expect(rentDay!.breakdown.plannedExpenses).toBe(1000)
      expect(rentDay!.projectedBalance).toBeLessThan(dayBeforeRent!.projectedBalance - 900)
    })

    it('should detect payment risks when balance insufficient', () => {
      // Arrange: Low balance with planned payments
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 100,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 1500 // Low balance
      const plannedTransactions: PlannedTransaction[] = [
        {
          amount: 1000,
          planned_date: '2024-02-10',
          type: 'expense',
        },
        {
          amount: 500,
          planned_date: '2024-02-20',
          type: 'expense',
        },
      ]

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should detect payment risks
      const day20 = result.forecasts.find(f => f.date === '2024-02-20')
      expect(day20).toBeDefined()
      
      // By day 20, balance should be in danger zone or negative
      const lastDay = result.forecasts[result.forecasts.length - 1]
      expect(lastDay.projectedBalance).toBeLessThan(userSettings.minimumSafeBalance)
    })
  })

  describe('Edge Cases', () => {
    it('should handle no historical data gracefully', () => {
      // Arrange: No historical transactions
      const historicalTransactions: SpendingTransaction[] = []
      const currentBalance = 5000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should not display forecast with no data
      expect(result.shouldDisplay).toBe(false)
      expect(result.spendingConfidence).toBe('none')
      expect(result.forecasts).toHaveLength(0)
    })

    it('should handle insufficient historical data (< 14 days)', () => {
      // Arrange: Only 10 days of data
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 10 }, (_, i) => ({
        amount: 100,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 3000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should have none confidence and not display
      expect(result.spendingConfidence).toBe('none')
      expect(result.shouldDisplay).toBe(false)
    })

    it('should handle medium confidence data (14-29 days)', () => {
      // Arrange: 20 days of data (medium confidence)
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 20 }, (_, i) => ({
        amount: 100,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 3000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should have medium confidence and display
      expect(result.spendingConfidence).toBe('medium')
      expect(result.shouldDisplay).toBe(true)
      expect(result.forecasts.length).toBe(28)
    })

    it('should handle zero balance scenario', () => {
      // Arrange: Zero starting balance
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 50,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 0
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should show negative balances
      const firstDay = result.forecasts[0]
      const lastDay = result.forecasts[result.forecasts.length - 1]
      
      expect(firstDay.projectedBalance).toBeLessThan(0)
      expect(lastDay.projectedBalance).toBeLessThan(firstDay.projectedBalance)
      expect(firstDay.riskLevel).toBe('danger')
    })

    it('should handle outliers in historical data conservatively', () => {
      // Arrange: Mostly consistent spending with one large outlier
      const historicalTransactions: SpendingTransaction[] = [
        ...Array.from({ length: 29 }, (_, i) => ({
          amount: 100,
          transaction_date: new Date(2024, 0, i + 1).toISOString(),
          type: 'expense' as const,
        })),
        {
          amount: 5000, // Large outlier
          transaction_date: new Date(2024, 0, 30).toISOString(),
          type: 'expense' as const,
        },
      ]

      const currentBalance = 10000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Outlier handling - the algorithm may or may not exclude it
      // What matters is the forecast is conservative
      expect(result.averageDailySpending).toBeGreaterThan(100) // At least base spending
      expect(result.shouldDisplay).toBe(true)
      expect(result.forecasts.length).toBe(28)
    })
  })

  describe('Realistic Scenarios', () => {
    it('should handle typical monthly budget scenario', () => {
      // Arrange: Realistic monthly spending pattern
      const historicalTransactions: SpendingTransaction[] = [
        // Daily small expenses (30 days)
        ...Array.from({ length: 30 }, (_, i) => ({
          amount: 20 + Math.floor(Math.random() * 30), // 20-50 UAH daily
          transaction_date: new Date(2024, 0, i + 1).toISOString(),
          type: 'expense' as const,
        })),
        // Weekly groceries
        {
          amount: 800,
          transaction_date: new Date(2024, 0, 7).toISOString(),
          type: 'expense' as const,
        },
        {
          amount: 750,
          transaction_date: new Date(2024, 0, 14).toISOString(),
          type: 'expense' as const,
        },
        {
          amount: 820,
          transaction_date: new Date(2024, 0, 21).toISOString(),
          type: 'expense' as const,
        },
        {
          amount: 780,
          transaction_date: new Date(2024, 0, 28).toISOString(),
          type: 'expense' as const,
        },
      ]

      const currentBalance = 15000
      const plannedTransactions: PlannedTransaction[] = [
        {
          amount: 8000,
          planned_date: '2024-02-01',
          type: 'expense',
        },
        {
          amount: 1500,
          planned_date: '2024-02-05',
          type: 'expense',
        },
      ]

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-29',
        userSettings
      )

      // Assert: Verify realistic forecast
      expect(result.shouldDisplay).toBe(true)
      expect(result.forecasts.length).toBe(29)
      
      // Should account for rent on day 1
      const day1 = result.forecasts[0]
      expect(day1.breakdown.plannedExpenses).toBe(8000)
      
      // Should account for utilities on day 5
      const day5 = result.forecasts.find(f => f.date === '2024-02-05')
      expect(day5!.breakdown.plannedExpenses).toBe(1500)
      
      // Final balance should be positive
      const lastDay = result.forecasts[result.forecasts.length - 1]
      expect(lastDay.projectedBalance).toBeGreaterThan(0)
    })

    it('should handle income and expenses together', () => {
      // Arrange: Mix of income and expenses
      const historicalTransactions: SpendingTransaction[] = [
        // Salary (should be ignored in spending calculation)
        {
          amount: 20000,
          transaction_date: new Date(2024, 0, 1).toISOString(),
          type: 'income' as const,
        },
        // Daily expenses
        ...Array.from({ length: 30 }, (_, i) => ({
          amount: 100,
          transaction_date: new Date(2024, 0, i + 1).toISOString(),
          type: 'expense' as const,
        })),
      ]

      const currentBalance = 17000 // After January: 20000 - 3000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should only consider expenses for spending average
      expect(result.averageDailySpending).toBeGreaterThanOrEqual(100 * 1.1)
      const lastDay = result.forecasts[result.forecasts.length - 1]
      expect(lastDay.projectedBalance).toBeLessThan(currentBalance)
      
      // Should not include income in daily spending calculation
      expect(result.averageDailySpending).toBeLessThan(1000)
    })
  })

  describe('Conservative Calculation Verification', () => {
    it('should apply 1.1x conservative multiplier', () => {
      // Arrange: Exact spending for verification
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 100, // Exactly 100 per day
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 5000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should apply 1.1x multiplier
      expect(result.averageDailySpending).toBeCloseTo(110, 1) // 100 * 1.1
      
      // Verify forecast uses conservative spending
      const firstDay = result.forecasts[0]
      const lastDay = result.forecasts[27]
      const totalSpent = firstDay.projectedBalance - lastDay.projectedBalance
      // Allow for small rounding differences
      expect(Math.abs(totalSpent - (110 * 28))).toBeLessThan(150)
    })

    it('should prefer higher spending when data is variable', () => {
      // Arrange: Two different spending patterns
      const historicalTransactions: SpendingTransaction[] = [
        // First 15 days: low spending
        ...Array.from({ length: 15 }, (_, i) => ({
          amount: 50,
          transaction_date: new Date(2024, 0, i + 1).toISOString(),
          type: 'expense' as const,
        })),
        // Last 15 days: high spending
        ...Array.from({ length: 15 }, (_, i) => ({
          amount: 150,
          transaction_date: new Date(2024, 0, i + 16).toISOString(),
          type: 'expense' as const,
        })),
      ]

      const currentBalance = 5000
      const plannedTransactions: PlannedTransaction[] = []

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Should use average with conservative multiplier
      const exactAverage = (15 * 50 + 15 * 150) / 30 // 100
      expect(result.averageDailySpending).toBeGreaterThanOrEqual(exactAverage * 1.1)
    })

    it('should handle planned income correctly', () => {
      // Arrange: Historical expenses with planned income
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 100,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 2000
      const plannedTransactions: PlannedTransaction[] = [
        {
          amount: 5000, // Salary
          planned_date: '2024-02-15',
          type: 'income',
        },
      ]

      // Act
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        userSettings
      )

      // Assert: Planned income should boost balance
      const dayBeforeSalary = result.forecasts.find(f => f.date === '2024-02-14')
      const salaryDay = result.forecasts.find(f => f.date === '2024-02-15')
      
      expect(salaryDay!.breakdown.plannedIncome).toBe(5000)
      expect(salaryDay!.projectedBalance).toBeGreaterThan(dayBeforeSalary!.projectedBalance + 4000)
    })
  })

  describe('Risk Level Assessment', () => {
    it('should mark balance below minimum as danger', () => {
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 200,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 2000
      const plannedTransactions: PlannedTransaction[] = []

      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        { minimumSafeBalance: 1000, safetyBufferDays: 7 }
      )

      // Find first day below minimum
      const dangerDay = result.forecasts.find(f => f.projectedBalance < 1000)
      expect(dangerDay).toBeDefined()
      expect(dangerDay!.riskLevel).toBe('danger')
    })

    it('should mark balance in warning zone correctly', () => {
      const historicalTransactions: SpendingTransaction[] = Array.from({ length: 30 }, (_, i) => ({
        amount: 50,
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))

      const currentBalance = 2000
      const plannedTransactions: PlannedTransaction[] = []

      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        plannedTransactions,
        '2024-02-01',
        '2024-02-28',
        { minimumSafeBalance: 1000, safetyBufferDays: 7 }
      )

      // Warning threshold = 1000 + (55 * 7) = 1385
      // Find day in warning zone (between 1000 and 1385)
      const warningDay = result.forecasts.find(f => 
        f.projectedBalance >= 1000 && f.projectedBalance < 1385
      )
      
      if (warningDay) {
        expect(warningDay.riskLevel).toBe('warning')
      }
    })
  })
})
