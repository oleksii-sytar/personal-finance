/**
 * Unit tests for daily cash flow forecast calculator
 * 
 * Tests cover:
 * - Daily balance projection
 * - Conservative multiplier application (1.1x)
 * - Risk level determination
 * - Confidence level calculation
 * - Planned transaction integration
 * - Edge cases and error scenarios
 * 
 * **Validates: Requirements 2.5.1-2.5.11**
 */

import { describe, it, expect } from 'vitest'
import {
  calculateDailyForecast,
  type SpendingTransaction,
  type PlannedTransaction,
  type UserSettings,
} from '../daily-forecast'

/**
 * Helper function to create mock spending transaction
 */
function createSpendingTransaction(
  amount: number,
  date: string,
  type: 'income' | 'expense' = 'expense'
): SpendingTransaction {
  return {
    amount,
    transaction_date: date,
    type,
  }
}

/**
 * Helper function to create mock planned transaction
 */
function createPlannedTransaction(
  amount: number,
  date: string,
  type: 'income' | 'expense' = 'expense'
): PlannedTransaction {
  return {
    amount,
    planned_date: date,
    type,
  }
}

/**
 * Helper function to generate historical transactions
 */
function generateHistoricalTransactions(
  count: number,
  startDate: string,
  dailyAmount: number
): SpendingTransaction[] {
  const transactions: SpendingTransaction[] = []
  const start = new Date(startDate)
  
  for (let i = 0; i < count; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    
    transactions.push({
      amount: dailyAmount,
      transaction_date: date.toISOString().split('T')[0],
      type: 'expense',
    })
  }
  
  return transactions
}

describe('calculateDailyForecast', () => {
  const defaultSettings: UserSettings = {
    minimumSafeBalance: 0,
    safetyBufferDays: 7,
  }
  
  describe('Basic Forecast Calculation', () => {
    it('projects balance correctly for simple scenario', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const planned: PlannedTransaction[] = []
      
      const result = calculateDailyForecast(
        5000, // current balance
        historical,
        planned,
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(true)
      expect(result.forecasts).toHaveLength(5)
      
      // Each day should decrease by conservative daily spending (100 * 1.1 = 110)
      const day1 = result.forecasts[0]
      expect(day1.breakdown.startingBalance).toBe(5000)
      expect(day1.breakdown.estimatedDailySpending).toBeCloseTo(110, 1)
      expect(day1.breakdown.endingBalance).toBeCloseTo(4890, 1)
    })
    
    it('applies conservative multiplier (1.1x)', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-01',
        defaultSettings
      )
      
      // Average is 100, conservative is 110 (1.1x)
      expect(result.averageDailySpending).toBeCloseTo(110, 1)
      expect(result.forecasts[0].breakdown.estimatedDailySpending).toBeCloseTo(110, 1)
    })
    
    it('includes planned income', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const planned: PlannedTransaction[] = [
        createPlannedTransaction(1000, '2026-02-03', 'income'),
      ]
      
      const result = calculateDailyForecast(
        5000,
        historical,
        planned,
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      const day3 = result.forecasts[2] // Feb 3
      expect(day3.breakdown.plannedIncome).toBe(1000)
      expect(day3.breakdown.endingBalance).toBeGreaterThan(day3.breakdown.startingBalance)
    })
    
    it('includes planned expenses', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const planned: PlannedTransaction[] = [
        createPlannedTransaction(500, '2026-02-03', 'expense'),
      ]
      
      const result = calculateDailyForecast(
        5000,
        historical,
        planned,
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      const day3 = result.forecasts[2] // Feb 3
      expect(day3.breakdown.plannedExpenses).toBe(500)
      // Should decrease by both planned expense and daily spending
      expect(day3.breakdown.endingBalance).toBeLessThan(day3.breakdown.startingBalance - 500)
    })
    
    it('handles multiple planned transactions on same day', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const planned: PlannedTransaction[] = [
        createPlannedTransaction(1000, '2026-02-03', 'income'),
        createPlannedTransaction(500, '2026-02-03', 'income'),
        createPlannedTransaction(200, '2026-02-03', 'expense'),
        createPlannedTransaction(150, '2026-02-03', 'expense'),
      ]
      
      const result = calculateDailyForecast(
        5000,
        historical,
        planned,
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      const day3 = result.forecasts[2]
      expect(day3.breakdown.plannedIncome).toBe(1500)
      expect(day3.breakdown.plannedExpenses).toBe(350)
    })
  })
  
  describe('Risk Level Determination', () => {
    it('marks as danger when balance below minimum safe balance', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const settings: UserSettings = {
        minimumSafeBalance: 1000,
        safetyBufferDays: 7,
      }
      
      const result = calculateDailyForecast(
        500, // Below minimum
        historical,
        [],
        '2026-02-01',
        '2026-02-01',
        settings
      )
      
      expect(result.forecasts[0].riskLevel).toBe('danger')
    })
    
    it('marks as warning when balance below safety buffer', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const settings: UserSettings = {
        minimumSafeBalance: 0,
        safetyBufferDays: 7,
      }
      
      // Balance will be 500, safety buffer is 7 * 110 = 770
      const result = calculateDailyForecast(
        610, // 500 after daily spending
        historical,
        [],
        '2026-02-01',
        '2026-02-01',
        settings
      )
      
      expect(result.forecasts[0].riskLevel).toBe('warning')
    })
    
    it('marks as safe when balance above safety buffer', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const settings: UserSettings = {
        minimumSafeBalance: 0,
        safetyBufferDays: 7,
      }
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-01',
        settings
      )
      
      expect(result.forecasts[0].riskLevel).toBe('safe')
    })
    
    it('uses user-defined minimum safe balance', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const settings: UserSettings = {
        minimumSafeBalance: 2000,
        safetyBufferDays: 7,
      }
      
      const result = calculateDailyForecast(
        2500,
        historical,
        [],
        '2026-02-01',
        '2026-02-01',
        settings
      )
      
      // Balance after spending: 2500 - 110 = 2390
      // Warning threshold: 2000 + (7 * 110) = 2770
      // 2390 is between 2000 and 2770, so warning
      expect(result.forecasts[0].riskLevel).toBe('warning')
    })
    
    it('uses custom safety buffer days', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const settings: UserSettings = {
        minimumSafeBalance: 0,
        safetyBufferDays: 14, // 2 weeks instead of 1
      }
      
      const result = calculateDailyForecast(
        1000,
        historical,
        [],
        '2026-02-01',
        '2026-02-01',
        settings
      )
      
      // Balance after spending: 890
      // Warning threshold: 0 + (14 * 110) = 1540
      // 890 < 1540, so warning
      expect(result.forecasts[0].riskLevel).toBe('warning')
    })
  })
  
  describe('Confidence Level Calculation', () => {
    it('returns high confidence for near-term with good data', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-07', // 7 days ahead
        defaultSettings
      )
      
      expect(result.spendingConfidence).toBe('high')
      result.forecasts.forEach(forecast => {
        expect(forecast.confidence).toBe('high')
      })
    })
    
    it('returns medium confidence for mid-term forecasts', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-03-10', // 38 days ahead
        defaultSettings
      )
      
      // Near-term should be high confidence
      expect(result.forecasts[0].confidence).toBe('high')
      
      // Should have mix of high and medium confidence (days 15-30 are medium)
      const confidenceLevels = result.forecasts.map(f => f.confidence)
      expect(confidenceLevels).toContain('high')
      expect(confidenceLevels).toContain('medium')
    })
    
    it('returns low confidence for long-term forecasts', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-04-01', // 60 days ahead - definitely > 30
        defaultSettings
      )
      
      // Days beyond 30 should be low confidence
      const lastDay = result.forecasts[result.forecasts.length - 1]
      expect(lastDay.confidence).toBe('low')
      
      // Should have all three confidence levels
      const confidenceLevels = result.forecasts.map(f => f.confidence)
      expect(confidenceLevels).toContain('high')
      expect(confidenceLevels).toContain('medium')
      expect(confidenceLevels).toContain('low')
    })
    
    it('returns low confidence when spending confidence is low', () => {
      // Only 14 days of data = medium spending confidence
      const historical = generateHistoricalTransactions(14, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      expect(result.spendingConfidence).toBe('medium')
      // Even near-term forecasts should be medium at best
      result.forecasts.forEach(forecast => {
        expect(['medium', 'low']).toContain(forecast.confidence)
      })
    })
  })
  
  describe('Insufficient Data Handling', () => {
    it('returns shouldDisplay: false for insufficient data', () => {
      // Less than 14 days of data
      const historical = generateHistoricalTransactions(10, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-28',
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(false)
      expect(result.spendingConfidence).toBe('none')
      expect(result.forecasts).toHaveLength(0)
    })
    
    it('returns shouldDisplay: false for no historical data', () => {
      const result = calculateDailyForecast(
        5000,
        [],
        [],
        '2026-02-01',
        '2026-02-28',
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(false)
      expect(result.spendingConfidence).toBe('none')
      expect(result.forecasts).toHaveLength(0)
    })
    
    it('displays forecast with medium confidence (14-29 days)', () => {
      const historical = generateHistoricalTransactions(20, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(true)
      expect(result.spendingConfidence).toBe('medium')
    })
    
    it('hides forecast with low spending confidence', () => {
      // Create scenario with insufficient data (< 14 days)
      const historical: SpendingTransaction[] = [
        createSpendingTransaction(100, '2026-01-01'),
        createSpendingTransaction(100, '2026-01-02'),
        createSpendingTransaction(100, '2026-01-03'),
        createSpendingTransaction(100, '2026-01-04'),
        createSpendingTransaction(100, '2026-01-05'),
      ]
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      // With insufficient data (< 14 days), confidence should be none
      expect(result.spendingConfidence).toBe('none')
      expect(result.shouldDisplay).toBe(false)
    })
  })
  
  describe('Running Balance Calculation', () => {
    it('carries balance forward correctly', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      // Each day's starting balance should be previous day's ending balance
      for (let i = 1; i < result.forecasts.length; i++) {
        expect(result.forecasts[i].breakdown.startingBalance).toBeCloseTo(
          result.forecasts[i - 1].breakdown.endingBalance,
          1
        )
      }
    })
    
    it('projects declining balance without income', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-10',
        defaultSettings
      )
      
      // Balance should decline each day
      for (let i = 1; i < result.forecasts.length; i++) {
        expect(result.forecasts[i].projectedBalance).toBeLessThan(
          result.forecasts[i - 1].projectedBalance
        )
      }
    })
    
    it('projects increasing balance with planned income', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const planned: PlannedTransaction[] = [
        createPlannedTransaction(2000, '2026-02-05', 'income'),
      ]
      
      const result = calculateDailyForecast(
        5000,
        historical,
        planned,
        '2026-02-01',
        '2026-02-10',
        defaultSettings
      )
      
      // Day 5 should have higher balance than day 4
      expect(result.forecasts[4].projectedBalance).toBeGreaterThan(
        result.forecasts[3].projectedBalance
      )
    })
  })
  
  describe('Edge Cases', () => {
    it('handles zero current balance', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        0,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      expect(result.forecasts[0].breakdown.startingBalance).toBe(0)
      expect(result.forecasts[0].projectedBalance).toBeLessThan(0)
      expect(result.forecasts[0].riskLevel).toBe('danger')
    })
    
    it('handles negative current balance', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        -500,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      expect(result.forecasts[0].breakdown.startingBalance).toBe(-500)
      expect(result.forecasts[0].riskLevel).toBe('danger')
    })
    
    it('handles single day forecast', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-01',
        defaultSettings
      )
      
      expect(result.forecasts).toHaveLength(1)
      expect(result.forecasts[0].date).toBe('2026-02-01')
    })
    
    it('handles month-long forecast', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-28',
        defaultSettings
      )
      
      expect(result.forecasts).toHaveLength(28) // February 2026 has 28 days
    })
    
    it('handles no planned transactions', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      result.forecasts.forEach(forecast => {
        expect(forecast.breakdown.plannedIncome).toBe(0)
        expect(forecast.breakdown.plannedExpenses).toBe(0)
      })
    })
    
    it('handles very high current balance', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        1000000,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      result.forecasts.forEach(forecast => {
        expect(forecast.riskLevel).toBe('safe')
      })
    })
    
    it('handles very low daily spending', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 1)
      
      const result = calculateDailyForecast(
        100,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      expect(result.averageDailySpending).toBeCloseTo(1.1, 1)
    })
  })
  
  describe('Date Handling', () => {
    it('generates correct date sequence', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-02-01',
        '2026-02-05',
        defaultSettings
      )
      
      expect(result.forecasts[0].date).toBe('2026-02-01')
      expect(result.forecasts[1].date).toBe('2026-02-02')
      expect(result.forecasts[2].date).toBe('2026-02-03')
      expect(result.forecasts[3].date).toBe('2026-02-04')
      expect(result.forecasts[4].date).toBe('2026-02-05')
    })
    
    it('handles month boundary correctly', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2026-01-30',
        '2026-02-02',
        defaultSettings
      )
      
      expect(result.forecasts[0].date).toBe('2026-01-30')
      expect(result.forecasts[1].date).toBe('2026-01-31')
      expect(result.forecasts[2].date).toBe('2026-02-01')
      expect(result.forecasts[3].date).toBe('2026-02-02')
    })
    
    it('handles year boundary correctly', () => {
      const historical = generateHistoricalTransactions(30, '2025-12-01', 100)
      
      const result = calculateDailyForecast(
        5000,
        historical,
        [],
        '2025-12-30',
        '2026-01-02',
        defaultSettings
      )
      
      expect(result.forecasts[0].date).toBe('2025-12-30')
      expect(result.forecasts[1].date).toBe('2025-12-31')
      expect(result.forecasts[2].date).toBe('2026-01-01')
      expect(result.forecasts[3].date).toBe('2026-01-02')
    })
  })
  
  describe('Real-World Scenarios', () => {
    it('handles typical monthly forecast with bills', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 100)
      const planned: PlannedTransaction[] = [
        createPlannedTransaction(1500, '2026-02-01', 'expense'), // Rent
        createPlannedTransaction(200, '2026-02-05', 'expense'), // Utilities
        createPlannedTransaction(100, '2026-02-10', 'expense'), // Internet
        createPlannedTransaction(3000, '2026-02-15', 'income'), // Salary
      ]
      
      const result = calculateDailyForecast(
        2000,
        historical,
        planned,
        '2026-02-01',
        '2026-02-28',
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(true)
      
      // Day 1 should have rent expense
      expect(result.forecasts[0].breakdown.plannedExpenses).toBe(1500)
      
      // Day 15 should have salary income
      expect(result.forecasts[14].breakdown.plannedIncome).toBe(3000)
      
      // Balance should be higher on day 15 than it would be without the income
      // (even though daily spending continues)
      const day14Balance = result.forecasts[13].projectedBalance
      const day15Balance = result.forecasts[14].projectedBalance
      // Day 15 gets 3000 income minus ~110 daily spending, so should be much higher than day 14
      expect(day15Balance).toBeGreaterThan(day14Balance + 2000)
    })
    
    it('identifies cash flow crisis', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 200)
      const planned: PlannedTransaction[] = [
        createPlannedTransaction(5000, '2026-02-10', 'expense'), // Large expense
      ]
      
      const result = calculateDailyForecast(
        3000,
        historical,
        planned,
        '2026-02-01',
        '2026-02-15',
        { minimumSafeBalance: 0, safetyBufferDays: 7 }
      )
      
      // Should show danger after the large expense
      const day10 = result.forecasts[9]
      expect(day10.riskLevel).toBe('danger')
      expect(day10.projectedBalance).toBeLessThan(0)
    })
    
    it('handles irregular income pattern', () => {
      const historical = generateHistoricalTransactions(30, '2026-01-01', 150)
      const planned: PlannedTransaction[] = [
        createPlannedTransaction(2000, '2026-02-05', 'income'),
        createPlannedTransaction(1500, '2026-02-15', 'income'),
        createPlannedTransaction(2500, '2026-02-25', 'income'),
      ]
      
      const result = calculateDailyForecast(
        1000,
        historical,
        planned,
        '2026-02-01',
        '2026-02-28',
        defaultSettings
      )
      
      // Balance should spike on income days
      expect(result.forecasts[4].projectedBalance).toBeGreaterThan(
        result.forecasts[3].projectedBalance
      )
      expect(result.forecasts[14].projectedBalance).toBeGreaterThan(
        result.forecasts[13].projectedBalance
      )
    })
  })
})
