/**
 * Unit tests for payment risk assessment
 * 
 * Tests cover:
 * - Risk level determination (safe, warning, danger)
 * - Balance projection accuracy
 * - Recommendation generation
 * - Safety buffer calculations
 * - Edge cases and error scenarios
 * 
 * **Validates: Requirements 2.6.1-2.6.7**
 */

import { describe, it, expect } from 'vitest'
import { assessPaymentRisks, type Transaction, type DailyForecast } from '../payment-risk-assessment'

/**
 * Helper function to create mock transaction
 */
function createMockTransaction(
  id: string,
  amount: number,
  description: string,
  plannedDate: string,
  type: 'income' | 'expense' = 'expense'
): Transaction {
  return {
    id,
    amount,
    description,
    type,
    status: 'planned',
    transaction_date: new Date(plannedDate),
    planned_date: new Date(plannedDate),
  }
}

/**
 * Helper function to create mock daily forecast
 */
function createMockForecast(
  date: string,
  startingBalance: number,
  estimatedDailySpending: number
): DailyForecast {
  return {
    date: new Date(date),
    projectedBalance: startingBalance - estimatedDailySpending,
    confidence: 'high',
    riskLevel: 'safe',
    breakdown: {
      startingBalance,
      plannedIncome: 0,
      plannedExpenses: 0,
      estimatedDailySpending,
      endingBalance: startingBalance - estimatedDailySpending,
    },
    warnings: [],
  }
}

/**
 * Helper function to generate forecast sequence
 */
function generateForecasts(
  startDate: string,
  days: number,
  startingBalance: number,
  dailySpending: number
): DailyForecast[] {
  const forecasts: DailyForecast[] = []
  let balance = startingBalance
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    forecasts.push(createMockForecast(
      date.toISOString().split('T')[0],
      balance,
      dailySpending
    ))
    
    balance -= dailySpending
  }
  
  return forecasts
}

describe('assessPaymentRisks', () => {
  describe('Risk Level Determination', () => {
    it('marks payment as safe when sufficient funds available', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Rent', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks).toHaveLength(1)
      expect(risks[0].riskLevel).toBe('safe')
      expect(risks[0].canAfford).toBe(true)
      expect(risks[0].recommendation).toContain('Sufficient funds')
    })
    
    it('marks payment as warning when balance below safety buffer', () => {
      const transactions = [
        createMockTransaction('1', 4200, 'Large expense', '2026-02-05'),
      ]
      
      // Balance on day 5 will be 4600, after payment: 400
      // Safety buffer: 100 * 7 = 700, so 400 < 700 = warning
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].riskLevel).toBe('warning')
      expect(risks[0].canAfford).toBe(true)
      expect(risks[0].recommendation).toContain('Balance will be tight')
    })
    
    it('marks payment as danger when insufficient funds', () => {
      const transactions = [
        createMockTransaction('1', 6000, 'Large expense', '2026-02-05'),
      ]
      
      // Balance on day 5 will be 4600, payment is 6000
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].canAfford).toBe(false)
      expect(risks[0].recommendation).toContain('Insufficient funds')
      expect(risks[0].recommendation).toContain('Need ₴')
    })
    
    it('calculates exact shortfall amount', () => {
      const transactions = [
        createMockTransaction('1', 5000, 'Large expense', '2026-02-05'),
      ]
      
      // Balance on day 5: 4600, payment: 5000, shortfall: 400
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].balanceAfterPayment).toBe(-400)
      expect(risks[0].recommendation).toContain('₴400.00')
    })
    
    it('uses custom safety buffer days', () => {
      const transactions = [
        createMockTransaction('1', 3500, 'Expense', '2026-02-05'),
      ]
      
      // Balance on day 5: 4600, after payment: 1100
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      // With 7-day buffer (700), 1100 > 700 = safe
      const risks7 = assessPaymentRisks(transactions, forecasts, 100, 7)
      expect(risks7[0].riskLevel).toBe('safe')
      
      // With 14-day buffer (1400), 1100 < 1400 = warning
      const risks14 = assessPaymentRisks(transactions, forecasts, 100, 14)
      expect(risks14[0].riskLevel).toBe('warning')
    })
  })
  
  describe('Balance Projection', () => {
    it('projects balance at payment date correctly', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      // Day 5 balance: 5000 - (4 * 100) = 4600
      expect(risks[0].projectedBalanceAtDate).toBe(4600)
    })
    
    it('calculates balance after payment correctly', () => {
      const transactions = [
        createMockTransaction('1', 1000, 'Payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      // Balance: 4600 - 1000 = 3600
      expect(risks[0].balanceAfterPayment).toBe(3600)
    })
    
    it('handles multiple payments on different days', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment 1', '2026-02-03'),
        createMockTransaction('2', 300, 'Payment 2', '2026-02-07'),
        createMockTransaction('3', 200, 'Payment 3', '2026-02-10'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 15, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks).toHaveLength(3)
      expect(risks[0].transaction.description).toBe('Payment 1')
      expect(risks[1].transaction.description).toBe('Payment 2')
      expect(risks[2].transaction.description).toBe('Payment 3')
    })
  })
  
  describe('Days Until Calculation', () => {
    it('calculates days until payment correctly', () => {
      const today = new Date()
      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + 5)
      
      const transactions = [
        createMockTransaction('1', 500, 'Payment', futureDate.toISOString().split('T')[0]),
      ]
      
      const forecasts = generateForecasts(today.toISOString().split('T')[0], 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      // Should be approximately 5 days (could be 4 or 5 depending on time of day)
      expect(risks[0].daysUntil).toBeGreaterThanOrEqual(4)
      expect(risks[0].daysUntil).toBeLessThanOrEqual(5)
    })
    
    it('handles payment today', () => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      const transactions = [
        createMockTransaction('1', 500, 'Payment', todayStr),
      ]
      
      const forecasts = generateForecasts(todayStr, 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].daysUntil).toBe(0)
    })
    
    it('handles payment far in future', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment', '2026-02-28'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 30, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      // Days until is calculated from today, not from forecast start
      // So we just verify it's a reasonable number
      expect(risks[0].daysUntil).toBeGreaterThanOrEqual(0)
    })
  })
  
  describe('Sorting and Filtering', () => {
    it('sorts payments by urgency (soonest first)', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment 3', '2026-02-10'),
        createMockTransaction('2', 300, 'Payment 1', '2026-02-03'),
        createMockTransaction('3', 200, 'Payment 2', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 15, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].transaction.description).toBe('Payment 1')
      expect(risks[1].transaction.description).toBe('Payment 2')
      expect(risks[2].transaction.description).toBe('Payment 3')
    })
    
    it('only includes expense transactions', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Expense', '2026-02-05', 'expense'),
        createMockTransaction('2', 1000, 'Income', '2026-02-07', 'income'),
        createMockTransaction('3', 300, 'Expense', '2026-02-10', 'expense'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 15, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks).toHaveLength(2)
      expect(risks[0].transaction.type).toBe('expense')
      expect(risks[1].transaction.type).toBe('expense')
    })
  })
  
  describe('Recommendation Generation', () => {
    it('provides clear recommendation for safe payments', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].recommendation).toContain('Sufficient funds available')
      expect(risks[0].recommendation).toContain('₴')
      expect(risks[0].recommendation).toContain('remaining after payment')
    })
    
    it('provides clear recommendation for warning payments', () => {
      const transactions = [
        createMockTransaction('1', 4000, 'Large payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].recommendation).toContain('Balance will be tight')
      expect(risks[0].recommendation).toContain('less than')
      expect(risks[0].recommendation).toContain('day buffer')
    })
    
    it('provides clear recommendation for danger payments', () => {
      const transactions = [
        createMockTransaction('1', 6000, 'Too large', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].recommendation).toContain('Insufficient funds')
      expect(risks[0].recommendation).toContain('Need ₴')
      expect(risks[0].recommendation).toContain('more by')
    })
    
    it('includes payment date in danger recommendation', () => {
      const transactions = [
        createMockTransaction('1', 6000, 'Payment', '2026-02-15'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 20, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].recommendation).toContain('Feb 15')
    })
  })
  
  describe('Missing Forecast Data', () => {
    it('handles missing forecast for payment date', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment', '2026-03-01'),
      ]
      
      // Forecasts only go to Feb 28
      const forecasts = generateForecasts('2026-02-01', 28, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].canAfford).toBe(false)
      expect(risks[0].recommendation).toContain('Unable to calculate')
      expect(risks[0].projectedBalanceAtDate).toBe(0)
    })
    
    it('handles empty forecast array', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment', '2026-02-05'),
      ]
      
      const risks = assessPaymentRisks(transactions, [], 100, 7)
      
      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].recommendation).toContain('insufficient forecast data')
    })
  })
  
  describe('Edge Cases', () => {
    it('handles empty transaction list', () => {
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks([], forecasts, 100, 7)
      
      expect(risks).toHaveLength(0)
    })
    
    it('handles zero amount payment', () => {
      const transactions = [
        createMockTransaction('1', 0, 'Free service', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].riskLevel).toBe('safe')
      expect(risks[0].balanceAfterPayment).toBe(4600)
    })
    
    it('handles very small payment', () => {
      const transactions = [
        createMockTransaction('1', 0.01, 'Tiny payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].riskLevel).toBe('safe')
      expect(risks[0].balanceAfterPayment).toBeCloseTo(4599.99, 2)
    })
    
    it('handles very large payment', () => {
      const transactions = [
        createMockTransaction('1', 1000000, 'Huge payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].balanceAfterPayment).toBeLessThan(-900000)
    })
    
    it('handles zero safety buffer days', () => {
      const transactions = [
        createMockTransaction('1', 4500, 'Payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      // With 0 buffer, only checks if balance > 0
      const risks = assessPaymentRisks(transactions, forecasts, 100, 0)
      
      expect(risks[0].riskLevel).toBe('safe')
      expect(risks[0].balanceAfterPayment).toBe(100)
    })
    
    it('handles very high safety buffer days', () => {
      const transactions = [
        createMockTransaction('1', 3000, 'Payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      // Balance on day 5: 4600, after payment: 1600
      // With 30-day buffer (3000), 1600 < 3000 = warning
      const risks = assessPaymentRisks(transactions, forecasts, 100, 30)
      
      expect(risks[0].riskLevel).toBe('warning')
      expect(risks[0].balanceAfterPayment).toBe(1600)
    })
    
    it('handles negative projected balance', () => {
      const transactions = [
        createMockTransaction('1', 100, 'Payment', '2026-02-10'),
      ]
      
      // Balance will be negative by day 10
      const forecasts = generateForecasts('2026-02-01', 15, 500, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].projectedBalanceAtDate).toBeLessThan(0)
      expect(risks[0].riskLevel).toBe('danger')
    })
  })
  
  describe('Real-World Scenarios', () => {
    it('handles typical monthly bills', () => {
      const transactions = [
        createMockTransaction('1', 1500, 'Rent', '2026-02-01'),
        createMockTransaction('2', 200, 'Utilities', '2026-02-05'),
        createMockTransaction('3', 100, 'Internet', '2026-02-10'),
        createMockTransaction('4', 50, 'Phone', '2026-02-15'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 20, 3000, 80)
      
      const risks = assessPaymentRisks(transactions, forecasts, 80, 7)
      
      expect(risks).toHaveLength(4)
      
      // Rent should be first (day 1)
      expect(risks[0].transaction.description).toBe('Rent')
      // Days until is calculated from today, so just verify it's defined
      expect(risks[0].daysUntil).toBeDefined()
      
      // All should be assessed
      risks.forEach(risk => {
        expect(risk.riskLevel).toBeDefined()
        expect(risk.recommendation).toBeDefined()
      })
    })
    
    it('identifies cash flow crisis scenario', () => {
      const transactions = [
        createMockTransaction('1', 1500, 'Rent', '2026-02-01'),
        createMockTransaction('2', 1000, 'Car repair', '2026-02-05'),
        createMockTransaction('3', 800, 'Medical', '2026-02-10'),
      ]
      
      // Low starting balance that will go negative after payments
      // Day 1: 1000 - 1500 = -500 (danger)
      const forecasts = generateForecasts('2026-02-01', 15, 1000, 50)
      
      const risks = assessPaymentRisks(transactions, forecasts, 50, 7)
      
      // Should identify danger payments (balance goes negative)
      const dangerPayments = risks.filter(r => r.riskLevel === 'danger')
      expect(dangerPayments.length).toBeGreaterThan(0)
      
      // First payment should be danger
      expect(risks[0].riskLevel).toBe('danger')
      expect(risks[0].balanceAfterPayment).toBeLessThan(0)
    })
    
    it('handles payday scenario', () => {
      const transactions = [
        createMockTransaction('1', 1000, 'Rent', '2026-02-05'),
        createMockTransaction('2', 500, 'Bills', '2026-02-10'),
      ]
      
      // Low balance but will receive income (not in this calculation)
      const forecasts = generateForecasts('2026-02-01', 15, 1500, 50)
      
      const risks = assessPaymentRisks(transactions, forecasts, 50, 7)
      
      // Should show warnings/danger before payday
      expect(risks[0].riskLevel).not.toBe('safe')
    })
    
    it('handles irregular payment schedule', () => {
      const transactions = [
        createMockTransaction('1', 100, 'Payment 1', '2026-02-03'),
        createMockTransaction('2', 200, 'Payment 2', '2026-02-05'),
        createMockTransaction('3', 150, 'Payment 3', '2026-02-12'),
        createMockTransaction('4', 300, 'Payment 4', '2026-02-20'),
        createMockTransaction('5', 250, 'Payment 5', '2026-02-28'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 30, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks).toHaveLength(5)
      
      // Should be sorted by date
      expect(risks[0].daysUntil).toBeLessThan(risks[1].daysUntil)
      expect(risks[1].daysUntil).toBeLessThan(risks[2].daysUntil)
    })
    
    it('handles end-of-month payment crunch', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment 1', '2026-02-25'),
        createMockTransaction('2', 600, 'Payment 2', '2026-02-26'),
        createMockTransaction('3', 700, 'Payment 3', '2026-02-27'),
        createMockTransaction('4', 800, 'Payment 4', '2026-02-28'),
      ]
      
      // Balance declining throughout month
      const forecasts = generateForecasts('2026-02-01', 30, 5000, 150)
      
      const risks = assessPaymentRisks(transactions, forecasts, 150, 7)
      
      // Later payments should have higher risk
      expect(risks[3].riskLevel).not.toBe('safe')
    })
  })
  
  describe('Data Integrity', () => {
    it('preserves transaction data', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Test payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      expect(risks[0].transaction.id).toBe('1')
      expect(risks[0].transaction.amount).toBe(500)
      expect(risks[0].transaction.description).toBe('Test payment')
    })
    
    it('provides complete risk information', () => {
      const transactions = [
        createMockTransaction('1', 500, 'Payment', '2026-02-05'),
      ]
      
      const forecasts = generateForecasts('2026-02-01', 10, 5000, 100)
      
      const risks = assessPaymentRisks(transactions, forecasts, 100, 7)
      
      const risk = risks[0]
      expect(risk.transaction).toBeDefined()
      expect(risk.daysUntil).toBeDefined()
      expect(risk.projectedBalanceAtDate).toBeDefined()
      expect(risk.balanceAfterPayment).toBeDefined()
      expect(risk.riskLevel).toBeDefined()
      expect(risk.recommendation).toBeDefined()
      expect(risk.canAfford).toBeDefined()
    })
  })
})
