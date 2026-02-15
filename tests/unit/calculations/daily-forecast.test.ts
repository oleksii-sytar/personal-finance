/**
 * Unit tests for Daily Cash Flow Forecast Calculator
 * 
 * Tests cover:
 * - Basic forecast calculation
 * - Conservative multiplier application
 * - Risk level determination
 * - Confidence level assessment
 * - Planned transaction integration
 * - Edge cases and error handling
 */

import { describe, it, expect } from 'vitest'
import { calculateDailyForecast, type SpendingTransaction, type PlannedTransaction, type UserSettings } from '@/lib/calculations/daily-forecast'

describe('calculateDailyForecast', () => {
  // Helper to create mock spending transactions
  function createSpendingTransactions(count: number, dailyAmount: number): SpendingTransaction[] {
    const transactions: SpendingTransaction[] = []
    const today = new Date()
    
    for (let i = 0; i < count; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      transactions.push({
        amount: dailyAmount,
        transaction_date: date.toISOString().split('T')[0],
        type: 'expense',
      })
    }
    
    return transactions
  }
  
  // Helper to create planned transactions
  function createPlannedTransaction(
    amount: number,
    daysFromNow: number,
    type: 'income' | 'expense'
  ): PlannedTransaction {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    
    return {
      amount,
      planned_date: date.toISOString().split('T')[0],
      type,
    }
  }
  
  const defaultSettings: UserSettings = {
    minimumSafeBalance: 0,
    safetyBufferDays: 7,
  }
  
  describe('Basic Forecast Calculation', () => {
    it('should calculate daily forecast with sufficient historical data', () => {
      const historicalTransactions = createSpendingTransactions(30, 100) // 30 days of ₴100/day
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(true)
      expect(result.spendingConfidence).toBe('high')
      expect(result.forecasts.length).toBeGreaterThan(0)
      expect(result.averageDailySpending).toBeGreaterThan(0)
    })
    
    it('should apply conservative 1.1x multiplier to daily spending', () => {
      const historicalTransactions = createSpendingTransactions(30, 100) // ₴100/day
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      // Average should be 100, with 1.1x multiplier = 110
      expect(result.averageDailySpending).toBeCloseTo(110, 0)
    })
    
    it('should project balance correctly over multiple days', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.forecasts.length).toBe(4) // Start day + 3 days
      
      // Each day should decrease by ~110 (100 * 1.1)
      const firstDay = result.forecasts[0]
      const secondDay = result.forecasts[1]
      
      expect(firstDay.breakdown.startingBalance).toBe(5000)
      expect(firstDay.breakdown.estimatedDailySpending).toBeCloseTo(110, 0)
      expect(secondDay.breakdown.startingBalance).toBeCloseTo(firstDay.projectedBalance, 0)
    })
  })
  
  describe('Planned Transactions Integration', () => {
    it('should include planned income in forecast', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const plannedIncome = createPlannedTransaction(1000, 2, 'income')
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [plannedIncome],
        startDate,
        endDate,
        defaultSettings
      )
      
      // Find the day with planned income (day 2)
      const dayWithIncome = result.forecasts[2]
      
      expect(dayWithIncome.breakdown.plannedIncome).toBe(1000)
      expect(dayWithIncome.projectedBalance).toBeGreaterThan(dayWithIncome.breakdown.startingBalance)
    })
    
    it('should include planned expenses in forecast', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const plannedExpense = createPlannedTransaction(500, 3, 'expense')
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [plannedExpense],
        startDate,
        endDate,
        defaultSettings
      )
      
      // Find the day with planned expense (day 3)
      const dayWithExpense = result.forecasts[3]
      
      expect(dayWithExpense.breakdown.plannedExpenses).toBe(500)
      
      // Balance should decrease by planned expense + daily spending
      const expectedDecrease = 500 + dayWithExpense.breakdown.estimatedDailySpending
      const actualDecrease = dayWithExpense.breakdown.startingBalance - dayWithExpense.projectedBalance
      
      expect(actualDecrease).toBeCloseTo(expectedDecrease, 0)
    })
    
    it('should handle multiple planned transactions on same day', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const planned = [
        createPlannedTransaction(1000, 2, 'income'),
        createPlannedTransaction(300, 2, 'expense'),
        createPlannedTransaction(200, 2, 'expense'),
      ]
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        planned,
        startDate,
        endDate,
        defaultSettings
      )
      
      const dayWithMultiple = result.forecasts[2]
      
      expect(dayWithMultiple.breakdown.plannedIncome).toBe(1000)
      expect(dayWithMultiple.breakdown.plannedExpenses).toBe(500) // 300 + 200
    })
  })
  
  describe('Risk Level Determination', () => {
    it('should mark as danger when balance below minimum safe balance', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 500 // Low balance
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const settings: UserSettings = {
        minimumSafeBalance: 1000, // Higher than current balance
        safetyBufferDays: 7,
      }
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        settings
      )
      
      // All days should be danger since balance keeps decreasing
      const dangerDays = result.forecasts.filter(f => f.riskLevel === 'danger')
      expect(dangerDays.length).toBeGreaterThan(0)
    })
    
    it('should mark as warning when balance below safety buffer', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 1500
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const settings: UserSettings = {
        minimumSafeBalance: 500,
        safetyBufferDays: 7, // 7 days * 110 = 770, so warning threshold is 1270
      }
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        settings
      )
      
      // First day should be warning (1500 - 110 = 1390, which is above 1270 but close)
      // Later days will drop below warning threshold
      const warningDays = result.forecasts.filter(f => f.riskLevel === 'warning')
      expect(warningDays.length).toBeGreaterThan(0)
    })
    
    it('should mark as safe when balance above safety buffer', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 10000 // High balance
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const settings: UserSettings = {
        minimumSafeBalance: 1000,
        safetyBufferDays: 7,
      }
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        settings
      )
      
      // All days should be safe with high balance
      const safeDays = result.forecasts.filter(f => f.riskLevel === 'safe')
      expect(safeDays.length).toBe(result.forecasts.length)
    })
    
    it('should use user-defined minimum safe balance for risk calculation', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 2000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const settings: UserSettings = {
        minimumSafeBalance: 1500, // User wants to keep at least ₴1500
        safetyBufferDays: 7,
      }
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        settings
      )
      
      // Find first day that goes below minimum safe balance
      const dangerDay = result.forecasts.find(f => f.riskLevel === 'danger')
      
      if (dangerDay) {
        expect(dangerDay.projectedBalance).toBeLessThan(settings.minimumSafeBalance)
      }
    })
  })
  
  describe('Confidence Level Assessment', () => {
    it('should have high confidence with 30+ days of data and near-term forecast', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.spendingConfidence).toBe('high')
      
      // Near-term forecasts should have high confidence
      const nearTermForecasts = result.forecasts.slice(0, 7)
      const highConfidenceDays = nearTermForecasts.filter(f => f.confidence === 'high')
      expect(highConfidenceDays.length).toBeGreaterThan(0)
    })
    
    it('should have medium confidence with 14-29 days of data', () => {
      const historicalTransactions = createSpendingTransactions(20, 100) // 20 days
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.spendingConfidence).toBe('medium')
    })
    
    it('should decrease confidence for far-future forecasts', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      // Far-future forecasts (>30 days) should have low confidence
      const farFuture = result.forecasts[40] // Day 40
      expect(farFuture.confidence).toBe('low')
    })
  })
  
  describe('Edge Cases and Error Handling', () => {
    it('should hide forecast with insufficient historical data (<14 days)', () => {
      const historicalTransactions = createSpendingTransactions(10, 100) // Only 10 days
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(false)
      expect(result.spendingConfidence).toBe('none')
      expect(result.forecasts.length).toBe(0)
    })
    
    it('should handle no historical transactions', () => {
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        [],
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(false)
      expect(result.spendingConfidence).toBe('none')
      expect(result.averageDailySpending).toBe(0)
    })
    
    it('should handle zero current balance', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 0
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(true)
      
      // All days should be danger with zero starting balance
      const dangerDays = result.forecasts.filter(f => f.riskLevel === 'danger')
      expect(dangerDays.length).toBe(result.forecasts.length)
    })
    
    it('should handle negative current balance', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = -500
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(true)
      expect(result.forecasts[0].breakdown.startingBalance).toBe(-500)
      
      // All days should be danger
      const dangerDays = result.forecasts.filter(f => f.riskLevel === 'danger')
      expect(dangerDays.length).toBe(result.forecasts.length)
    })
    
    it('should handle single day forecast', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = startDate // Same day
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.forecasts.length).toBe(1)
      expect(result.forecasts[0].date).toBe(startDate)
    })
    
    it('should handle no planned transactions', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [], // No planned transactions
        startDate,
        endDate,
        defaultSettings
      )
      
      expect(result.shouldDisplay).toBe(true)
      
      // All days should have zero planned income/expenses
      result.forecasts.forEach(forecast => {
        expect(forecast.breakdown.plannedIncome).toBe(0)
        expect(forecast.breakdown.plannedExpenses).toBe(0)
      })
    })
  })
  
  describe('Breakdown Accuracy', () => {
    it('should provide accurate breakdown for each day', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const plannedExpense = createPlannedTransaction(500, 2, 'expense')
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [plannedExpense],
        startDate,
        endDate,
        defaultSettings
      )
      
      result.forecasts.forEach(forecast => {
        const { breakdown } = forecast
        
        // Verify calculation
        const calculatedEnding = 
          breakdown.startingBalance +
          breakdown.plannedIncome -
          breakdown.plannedExpenses -
          breakdown.estimatedDailySpending
        
        expect(breakdown.endingBalance).toBeCloseTo(calculatedEnding, 2)
        expect(forecast.projectedBalance).toBeCloseTo(breakdown.endingBalance, 2)
      })
    })
    
    it('should chain balances correctly across days', () => {
      const historicalTransactions = createSpendingTransactions(30, 100)
      const currentBalance = 5000
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const result = calculateDailyForecast(
        currentBalance,
        historicalTransactions,
        [],
        startDate,
        endDate,
        defaultSettings
      )
      
      // Each day's starting balance should equal previous day's ending balance
      for (let i = 1; i < result.forecasts.length; i++) {
        const previousDay = result.forecasts[i - 1]
        const currentDay = result.forecasts[i]
        
        expect(currentDay.breakdown.startingBalance).toBeCloseTo(
          previousDay.projectedBalance,
          2
        )
      }
    })
  })
})
