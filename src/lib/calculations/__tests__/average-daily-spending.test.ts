/**
 * Unit tests for average daily spending calculator
 * 
 * Tests cover:
 * - Basic average calculation
 * - Outlier exclusion (one-time large purchases)
 * - Confidence level determination
 * - Minimum data requirements (14 days)
 * - Edge cases (no data, all outliers, etc.)
 * 
 * **Validates: Requirements 2.5.2, 2.5.8, 2.5.9**
 */

import { describe, it, expect } from 'vitest'
import { calculateAverageDailySpending, type SpendingTransaction } from '../average-daily-spending'

/**
 * Helper function to create mock transaction
 */
function createMockTransaction(
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
 * Helper function to generate multiple transactions over a date range
 */
function generateTransactions(
  count: number,
  startDate: string,
  amountRange: [number, number],
  type: 'income' | 'expense' = 'expense'
): SpendingTransaction[] {
  const transactions: SpendingTransaction[] = []
  const start = new Date(startDate)
  
  for (let i = 0; i < count; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    
    const amount = amountRange[0] + Math.random() * (amountRange[1] - amountRange[0])
    
    transactions.push({
      amount: Math.round(amount * 100) / 100,
      transaction_date: date.toISOString().split('T')[0],
      type,
    })
  }
  
  return transactions
}

describe('calculateAverageDailySpending', () => {
  describe('Basic Calculations', () => {
    it('calculates average correctly with sufficient data', () => {
      // 30 days of transactions, 100 per day
      const transactions = generateTransactions(30, '2026-01-01', [100, 100])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.averageDailySpending).toBeCloseTo(100, 1)
      expect(result.confidence).toBe('high')
      expect(result.daysAnalyzed).toBe(30)
      expect(result.transactionsIncluded).toBe(30)
      expect(result.transactionsExcluded).toBe(0)
    })
    
    it('calculates average with varying amounts', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(50, '2026-01-01'),
        createMockTransaction(100, '2026-01-02'),
        createMockTransaction(150, '2026-01-03'),
        createMockTransaction(200, '2026-01-04'),
        createMockTransaction(100, '2026-01-05'),
        createMockTransaction(75, '2026-01-06'),
        createMockTransaction(125, '2026-01-07'),
        createMockTransaction(90, '2026-01-08'),
        createMockTransaction(110, '2026-01-09'),
        createMockTransaction(100, '2026-01-10'),
        createMockTransaction(80, '2026-01-11'),
        createMockTransaction(120, '2026-01-12'),
        createMockTransaction(95, '2026-01-13'),
        createMockTransaction(105, '2026-01-14'),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Total: 1500, Days: 14, Average: 107.14
      expect(result.averageDailySpending).toBeCloseTo(107.14, 1)
      expect(result.confidence).toBe('medium') // 14 days = medium confidence
      expect(result.totalSpending).toBe(1500)
    })
    
    it('only includes expense transactions', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(100, '2026-01-01', 'expense'),
        createMockTransaction(1000, '2026-01-02', 'income'),
        createMockTransaction(100, '2026-01-03', 'expense'),
        createMockTransaction(500, '2026-01-04', 'income'),
        ...generateTransactions(12, '2026-01-05', [100, 100], 'expense'),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Should only count 14 expense transactions
      expect(result.transactionsIncluded).toBe(14)
      expect(result.totalSpending).toBeCloseTo(1400, 1)
    })
  })
  
  describe('Outlier Exclusion', () => {
    it('excludes one-time large purchases (>3x median)', () => {
      const transactions: SpendingTransaction[] = [
        ...generateTransactions(14, '2026-01-01', [100, 100]),
        createMockTransaction(5000, '2026-01-15'), // Large one-time purchase
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.transactionsExcluded).toBe(1)
      expect(result.transactionsIncluded).toBe(14)
      // Average should be ~100, not affected by 5000
      expect(result.averageDailySpending).toBeCloseTo(93.33, 1) // 1400 / 15 days
    })
    
    it('uses custom outlier threshold', () => {
      const transactions: SpendingTransaction[] = [
        ...generateTransactions(14, '2026-01-01', [100, 100]),
        createMockTransaction(250, '2026-01-15'), // 2.5x median
      ]
      
      // With default threshold (3x), this should be included
      const resultDefault = calculateAverageDailySpending(transactions, 3)
      expect(resultDefault.transactionsExcluded).toBe(0)
      
      // With threshold of 2x, this should be excluded
      const resultCustom = calculateAverageDailySpending(transactions, 2)
      expect(resultCustom.transactionsExcluded).toBe(1)
    })
    
    it('excludes multiple outliers', () => {
      const transactions: SpendingTransaction[] = [
        ...generateTransactions(14, '2026-01-01', [100, 100]),
        createMockTransaction(5000, '2026-01-15'),
        createMockTransaction(3000, '2026-01-16'),
        createMockTransaction(4000, '2026-01-17'),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.transactionsExcluded).toBe(3)
      expect(result.transactionsIncluded).toBe(14)
    })
    
    it('calculates median correctly for outlier detection', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(50, '2026-01-01'),
        createMockTransaction(100, '2026-01-02'),
        createMockTransaction(150, '2026-01-03'),
        createMockTransaction(200, '2026-01-04'),
        createMockTransaction(250, '2026-01-05'),
        ...generateTransactions(10, '2026-01-06', [100, 100]),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Median should be 100 (middle value when sorted)
      expect(result.medianAmount).toBe(100)
    })
    
    it('handles even number of transactions for median', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(100, '2026-01-01'),
        createMockTransaction(200, '2026-01-02'),
        ...generateTransactions(12, '2026-01-03', [100, 100]),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Median of even count is average of two middle values
      expect(result.medianAmount).toBe(100)
    })
  })
  
  describe('Confidence Levels', () => {
    it('returns high confidence for 30+ days', () => {
      const transactions = generateTransactions(30, '2026-01-01', [100, 100])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.confidence).toBe('high')
      expect(result.daysAnalyzed).toBe(30)
    })
    
    it('returns medium confidence for 14-29 days', () => {
      const transactions = generateTransactions(20, '2026-01-01', [100, 100])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.confidence).toBe('medium')
      expect(result.daysAnalyzed).toBe(20)
    })
    
    it('returns none confidence for <14 days', () => {
      const transactions = generateTransactions(10, '2026-01-01', [100, 100])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.confidence).toBe('none')
      expect(result.daysAnalyzed).toBe(10)
    })
    
    it('returns none confidence for exactly 13 days', () => {
      const transactions = generateTransactions(13, '2026-01-01', [100, 100])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.confidence).toBe('none')
      expect(result.daysAnalyzed).toBe(13)
    })
    
    it('returns medium confidence for exactly 14 days', () => {
      const transactions = generateTransactions(14, '2026-01-01', [100, 100])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.confidence).toBe('medium')
      expect(result.daysAnalyzed).toBe(14)
    })
  })
  
  describe('Minimum Data Requirements', () => {
    it('requires minimum 14 days for reliable calculation', () => {
      const transactions = generateTransactions(10, '2026-01-01', [100, 100])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.confidence).toBe('none')
      // Still calculates average but marks as unreliable
      expect(result.averageDailySpending).toBeGreaterThan(0)
    })
    
    it('calculates days correctly with gaps', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(100, '2026-01-01'),
        createMockTransaction(100, '2026-01-15'), // 14-day gap
        createMockTransaction(100, '2026-01-30'),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Days analyzed should be 30 (from Jan 1 to Jan 30)
      expect(result.daysAnalyzed).toBe(30)
      expect(result.averageDailySpending).toBe(10) // 300 / 30 days
    })
    
    it('handles single day of transactions', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(100, '2026-01-01'),
        createMockTransaction(200, '2026-01-01'),
        createMockTransaction(150, '2026-01-01'),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.daysAnalyzed).toBe(1)
      expect(result.confidence).toBe('none')
      expect(result.averageDailySpending).toBe(450) // All on one day
    })
  })
  
  describe('Edge Cases', () => {
    it('handles empty transaction list', () => {
      const result = calculateAverageDailySpending([])
      
      expect(result.averageDailySpending).toBe(0)
      expect(result.confidence).toBe('none')
      expect(result.daysAnalyzed).toBe(0)
      expect(result.transactionsIncluded).toBe(0)
      expect(result.transactionsExcluded).toBe(0)
      expect(result.totalSpending).toBe(0)
      expect(result.medianAmount).toBe(0)
    })
    
    it('handles only income transactions', () => {
      const transactions = generateTransactions(30, '2026-01-01', [1000, 1000], 'income')
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.averageDailySpending).toBe(0)
      expect(result.confidence).toBe('none')
      expect(result.transactionsIncluded).toBe(0)
    })
    
    it('handles all transactions being outliers', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(10000, '2026-01-01'),
        createMockTransaction(15000, '2026-01-02'),
        createMockTransaction(20000, '2026-01-03'),
        createMockTransaction(12000, '2026-01-04'),
        createMockTransaction(18000, '2026-01-05'),
        createMockTransaction(25000, '2026-01-06'),
        createMockTransaction(11000, '2026-01-07'),
        createMockTransaction(16000, '2026-01-08'),
        createMockTransaction(19000, '2026-01-09'),
        createMockTransaction(14000, '2026-01-10'),
        createMockTransaction(17000, '2026-01-11'),
        createMockTransaction(13000, '2026-01-12'),
        createMockTransaction(21000, '2026-01-13'),
        createMockTransaction(22000, '2026-01-14'),
      ]
      
      const result = calculateAverageDailySpending(transactions, 0.5) // Very strict threshold
      
      // When all are outliers, should use all transactions but mark confidence as low
      expect(result.transactionsIncluded).toBe(14)
      expect(result.transactionsExcluded).toBe(0)
      expect(result.confidence).toBe('low')
      expect(result.averageDailySpending).toBeGreaterThan(0)
    })
    
    it('handles zero amount transactions', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(0, '2026-01-01'),
        createMockTransaction(100, '2026-01-02'),
        createMockTransaction(0, '2026-01-03'),
        ...generateTransactions(12, '2026-01-04', [100, 100]),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.transactionsIncluded).toBe(15)
      expect(result.averageDailySpending).toBeCloseTo(86.67, 1) // 1300 / 15 days
    })
    
    it('handles very small amounts', () => {
      const transactions = generateTransactions(30, '2026-01-01', [0.01, 0.99])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.averageDailySpending).toBeGreaterThan(0)
      expect(result.averageDailySpending).toBeLessThan(1)
      expect(result.confidence).toBe('high')
    })
    
    it('handles very large amounts', () => {
      const transactions = generateTransactions(30, '2026-01-01', [100000, 100000])
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.averageDailySpending).toBeCloseTo(100000, 1)
      expect(result.confidence).toBe('high')
    })
    
    it('handles transactions spanning multiple months', () => {
      const transactions: SpendingTransaction[] = [
        ...generateTransactions(15, '2025-12-17', [100, 100]), // Dec 17-31
        ...generateTransactions(15, '2026-01-01', [100, 100]), // Jan 1-15
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Should span from Dec 17 to Jan 15 = 30 days
      expect(result.daysAnalyzed).toBe(30)
      expect(result.averageDailySpending).toBeCloseTo(100, 1)
    })
  })
  
  describe('Real-World Scenarios', () => {
    it('handles typical monthly spending pattern', () => {
      const transactions: SpendingTransaction[] = [
        // Regular daily expenses
        ...generateTransactions(20, '2026-01-01', [50, 150]),
        // Weekly grocery shopping
        createMockTransaction(300, '2026-01-07'),
        createMockTransaction(320, '2026-01-14'),
        createMockTransaction(310, '2026-01-21'),
        createMockTransaction(290, '2026-01-28'),
        // Monthly bills
        createMockTransaction(500, '2026-01-05'), // Rent utilities
        createMockTransaction(200, '2026-01-10'), // Internet/phone
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // 28 days analyzed (Jan 1-28), which gives medium confidence (14-29 days)
      expect(result.confidence).toBe('medium')
      expect(result.transactionsIncluded).toBeGreaterThan(20)
      expect(result.averageDailySpending).toBeGreaterThan(0)
    })
    
    it('excludes one-time large purchase (car repair)', () => {
      const transactions: SpendingTransaction[] = [
        ...generateTransactions(30, '2026-01-01', [80, 120]),
        createMockTransaction(5000, '2026-01-15'), // Car repair
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.transactionsExcluded).toBe(1)
      // Average should be around 100, not affected by 5000
      expect(result.averageDailySpending).toBeGreaterThan(80)
      expect(result.averageDailySpending).toBeLessThan(120)
    })
    
    it('handles vacation spending spike', () => {
      const transactions: SpendingTransaction[] = [
        // Normal spending
        ...generateTransactions(20, '2026-01-01', [80, 120]),
        // Vacation week (higher spending but not outliers)
        ...generateTransactions(7, '2026-01-21', [200, 300]),
        // Back to normal
        ...generateTransactions(3, '2026-01-28', [80, 120]),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.confidence).toBe('high')
      // Should include vacation spending as it's not >3x median
      expect(result.transactionsIncluded).toBe(30)
    })
    
    it('handles inconsistent spending frequency', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(100, '2026-01-01'),
        createMockTransaction(50, '2026-01-05'),
        createMockTransaction(200, '2026-01-06'),
        createMockTransaction(75, '2026-01-12'),
        createMockTransaction(150, '2026-01-13'),
        createMockTransaction(90, '2026-01-20'),
        createMockTransaction(110, '2026-01-21'),
        createMockTransaction(80, '2026-01-22'),
        createMockTransaction(120, '2026-01-28'),
        createMockTransaction(95, '2026-01-29'),
        createMockTransaction(105, '2026-01-30'),
        createMockTransaction(85, '2026-01-31'),
        createMockTransaction(115, '2026-02-01'),
        createMockTransaction(100, '2026-02-02'),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Should handle gaps in spending
      expect(result.daysAnalyzed).toBe(33) // Jan 1 to Feb 2
      expect(result.confidence).toBe('high')
      expect(result.averageDailySpending).toBeGreaterThan(0)
    })
  })
  
  describe('Data Quality Metrics', () => {
    it('provides accurate transaction counts', () => {
      const transactions = generateTransactions(25, '2026-01-01', [100, 100])
      transactions.push(createMockTransaction(5000, '2026-01-26')) // Outlier
      
      const result = calculateAverageDailySpending(transactions)
      
      expect(result.transactionsIncluded).toBe(25)
      expect(result.transactionsExcluded).toBe(1)
      expect(result.transactionsIncluded + result.transactionsExcluded).toBe(26)
    })
    
    it('provides accurate total spending', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(100, '2026-01-01'),
        createMockTransaction(200, '2026-01-02'),
        createMockTransaction(300, '2026-01-03'),
        ...generateTransactions(12, '2026-01-04', [100, 100]),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Total should be sum of included transactions only
      expect(result.totalSpending).toBeCloseTo(1800, 1)
    })
    
    it('provides accurate days analyzed', () => {
      const transactions: SpendingTransaction[] = [
        createMockTransaction(100, '2026-01-01'),
        createMockTransaction(100, '2026-01-31'),
      ]
      
      const result = calculateAverageDailySpending(transactions)
      
      // Should be 31 days (Jan 1 to Jan 31 inclusive)
      expect(result.daysAnalyzed).toBe(31)
    })
  })
})
