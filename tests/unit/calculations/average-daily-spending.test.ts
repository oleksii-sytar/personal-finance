import { describe, it, expect } from 'vitest'
import {
  calculateAverageDailySpending,
  type SpendingTransaction,
} from '@/lib/calculations/average-daily-spending'

describe('calculateAverageDailySpending', () => {
  describe('No Data Cases', () => {
    it('returns zero spending with none confidence for empty array', () => {
      const result = calculateAverageDailySpending([])

      expect(result.averageDailySpending).toBe(0)
      expect(result.confidence).toBe('none')
      expect(result.daysAnalyzed).toBe(0)
      expect(result.transactionsIncluded).toBe(0)
      expect(result.transactionsExcluded).toBe(0)
      expect(result.totalSpending).toBe(0)
      expect(result.medianAmount).toBe(0)
    })

    it('returns zero spending with none confidence for income-only transactions', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 1000, transaction_date: '2024-01-01', type: 'income' },
        { amount: 2000, transaction_date: '2024-01-15', type: 'income' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.averageDailySpending).toBe(0)
      expect(result.confidence).toBe('none')
      expect(result.transactionsIncluded).toBe(0)
    })
  })

  describe('Insufficient Data Cases', () => {
    it('returns none confidence for less than 14 days of data', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 150, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-10', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.confidence).toBe('none')
      expect(result.daysAnalyzed).toBe(10) // Jan 1 to Jan 10 = 10 days
      expect(result.transactionsIncluded).toBe(3)
      expect(result.transactionsExcluded).toBe(0)
    })

    it('calculates spending even with insufficient data', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-08', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.totalSpending).toBe(300)
      expect(result.daysAnalyzed).toBe(8) // Jan 1 to Jan 8 = 8 days
      expect(result.averageDailySpending).toBe(300 / 8)
      expect(result.confidence).toBe('none')
    })
  })

  describe('Confidence Levels', () => {
    it('returns medium confidence for 14-29 days of data', () => {
      const transactions: SpendingTransaction[] = []
      // Create 20 days of transactions
      for (let i = 0; i < 20; i++) {
        transactions.push({
          amount: 100,
          transaction_date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'expense',
        })
      }

      const result = calculateAverageDailySpending(transactions)

      expect(result.confidence).toBe('medium')
      expect(result.daysAnalyzed).toBe(20)
    })

    it('returns high confidence for 30+ days of data', () => {
      const transactions: SpendingTransaction[] = []
      // Create 35 days of transactions
      for (let i = 0; i < 35; i++) {
        const date = new Date(2024, 0, i + 1)
        transactions.push({
          amount: 100,
          transaction_date: date.toISOString().split('T')[0],
          type: 'expense',
        })
      }

      const result = calculateAverageDailySpending(transactions)

      expect(result.confidence).toBe('high')
      expect(result.daysAnalyzed).toBeGreaterThanOrEqual(30)
    })
  })

  describe('Outlier Exclusion', () => {
    it('excludes transactions above 3x median as outliers', () => {
      const transactions: SpendingTransaction[] = [
        // Regular daily expenses (median will be around 100)
        { amount: 80, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-02', type: 'expense' },
        { amount: 90, transaction_date: '2024-01-03', type: 'expense' },
        { amount: 110, transaction_date: '2024-01-04', type: 'expense' },
        { amount: 95, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 105, transaction_date: '2024-01-06', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-07', type: 'expense' },
        { amount: 90, transaction_date: '2024-01-08', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-09', type: 'expense' },
        { amount: 95, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-11', type: 'expense' },
        { amount: 90, transaction_date: '2024-01-12', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-13', type: 'expense' },
        { amount: 95, transaction_date: '2024-01-14', type: 'expense' },
        // Large one-time purchase (should be excluded)
        { amount: 5000, transaction_date: '2024-01-15', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.transactionsExcluded).toBe(1)
      expect(result.transactionsIncluded).toBe(14)
      expect(result.medianAmount).toBe(100) // Median of all amounts
      // Average should not include the 5000 outlier
      expect(result.averageDailySpending).toBeLessThan(200)
    })

    it('uses custom outlier threshold when provided', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-02', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-03', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-04', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-06', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-07', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-08', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-09', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-11', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-12', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-13', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-14', type: 'expense' },
        { amount: 250, transaction_date: '2024-01-15', type: 'expense' }, // 2.5x median
      ]

      // With threshold of 2, the 250 should be excluded
      const result = calculateAverageDailySpending(transactions, 2)

      expect(result.transactionsExcluded).toBe(1)
      expect(result.transactionsIncluded).toBe(14)
    })

    it('handles case where all transactions would be outliers', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-02', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-03', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-04', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-06', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-07', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-08', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-09', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-11', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-12', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-13', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-14', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-15', type: 'expense' },
      ]

      // With threshold of 0.5, all transactions would be > 50 (0.5 * 100)
      // When all would be excluded, fallback uses all transactions with low confidence
      const result = calculateAverageDailySpending(transactions, 0.5)

      // Should use all transactions since excluding all would be invalid
      expect(result.transactionsIncluded).toBe(15)
      expect(result.transactionsExcluded).toBe(0)
      expect(result.confidence).toBe('low') // Low confidence when fallback is used
      expect(result.averageDailySpending).toBe(100)
    })
  })

  describe('Average Calculation', () => {
    it('calculates correct average for consistent spending', () => {
      const transactions: SpendingTransaction[] = []
      // 30 days of 100 per day
      for (let i = 0; i < 30; i++) {
        transactions.push({
          amount: 100,
          transaction_date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'expense',
        })
      }

      const result = calculateAverageDailySpending(transactions)

      expect(result.averageDailySpending).toBe(100)
      expect(result.confidence).toBe('high')
      expect(result.totalSpending).toBe(3000)
    })

    it('calculates correct average for variable spending', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 50, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 150, transaction_date: '2024-01-02', type: 'expense' },
        { amount: 75, transaction_date: '2024-01-03', type: 'expense' },
        { amount: 125, transaction_date: '2024-01-04', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 80, transaction_date: '2024-01-06', type: 'expense' },
        { amount: 120, transaction_date: '2024-01-07', type: 'expense' },
        { amount: 90, transaction_date: '2024-01-08', type: 'expense' },
        { amount: 110, transaction_date: '2024-01-09', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 95, transaction_date: '2024-01-11', type: 'expense' },
        { amount: 105, transaction_date: '2024-01-12', type: 'expense' },
        { amount: 85, transaction_date: '2024-01-13', type: 'expense' },
        { amount: 115, transaction_date: '2024-01-14', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-15', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0)
      expect(result.totalSpending).toBe(totalSpending)
      expect(result.averageDailySpending).toBe(totalSpending / 15)
      expect(result.confidence).toBe('medium')
    })

    it('handles sparse transactions across date range', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-15', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-30', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.daysAnalyzed).toBe(30) // Jan 1 to Jan 30
      expect(result.totalSpending).toBe(300)
      expect(result.averageDailySpending).toBe(10) // 300 / 30 days
      expect(result.confidence).toBe('high')
    })
  })

  describe('Mixed Transaction Types', () => {
    it('only includes expense transactions in calculation', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 1000, transaction_date: '2024-01-02', type: 'income' },
        { amount: 150, transaction_date: '2024-01-03', type: 'expense' },
        { amount: 2000, transaction_date: '2024-01-04', type: 'income' },
        { amount: 200, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-06', type: 'expense' },
        { amount: 150, transaction_date: '2024-01-07', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-08', type: 'expense' },
        { amount: 150, transaction_date: '2024-01-09', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 150, transaction_date: '2024-01-11', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-12', type: 'expense' },
        { amount: 150, transaction_date: '2024-01-13', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-14', type: 'expense' },
        { amount: 150, transaction_date: '2024-01-15', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      // Should only count the 13 expense transactions
      expect(result.transactionsIncluded).toBe(13)
      expect(result.totalSpending).toBe(1700) // Sum of expenses: 100+150+200+100+150+100+150+100+150+100+150+100+150 = 1700
    })
  })

  describe('Edge Cases', () => {
    it('handles single transaction', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.averageDailySpending).toBe(100)
      expect(result.confidence).toBe('none')
      expect(result.daysAnalyzed).toBe(1)
      expect(result.medianAmount).toBe(100)
    })

    it('handles transactions on same day', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 50, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 75, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.daysAnalyzed).toBe(1)
      expect(result.totalSpending).toBe(225)
      expect(result.averageDailySpending).toBe(225)
    })

    it('handles very small amounts', () => {
      const transactions: SpendingTransaction[] = []
      for (let i = 0; i < 30; i++) {
        transactions.push({
          amount: 0.5,
          transaction_date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'expense',
        })
      }

      const result = calculateAverageDailySpending(transactions)

      expect(result.averageDailySpending).toBe(0.5)
      expect(result.confidence).toBe('high')
    })

    it('handles very large amounts', () => {
      const transactions: SpendingTransaction[] = []
      for (let i = 0; i < 30; i++) {
        transactions.push({
          amount: 1000000,
          transaction_date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'expense',
        })
      }

      const result = calculateAverageDailySpending(transactions)

      expect(result.averageDailySpending).toBe(1000000)
      expect(result.confidence).toBe('high')
    })
  })

  describe('Median Calculation', () => {
    it('calculates median correctly for odd number of transactions', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-02', type: 'expense' },
        { amount: 300, transaction_date: '2024-01-03', type: 'expense' },
        { amount: 400, transaction_date: '2024-01-04', type: 'expense' },
        { amount: 500, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-06', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-07', type: 'expense' },
        { amount: 300, transaction_date: '2024-01-08', type: 'expense' },
        { amount: 400, transaction_date: '2024-01-09', type: 'expense' },
        { amount: 500, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-11', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-12', type: 'expense' },
        { amount: 300, transaction_date: '2024-01-13', type: 'expense' },
        { amount: 400, transaction_date: '2024-01-14', type: 'expense' },
        { amount: 500, transaction_date: '2024-01-15', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.medianAmount).toBe(300) // Middle value of sorted array
    })

    it('calculates median correctly for even number of transactions', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 100, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-02', type: 'expense' },
        { amount: 300, transaction_date: '2024-01-03', type: 'expense' },
        { amount: 400, transaction_date: '2024-01-04', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-06', type: 'expense' },
        { amount: 300, transaction_date: '2024-01-07', type: 'expense' },
        { amount: 400, transaction_date: '2024-01-08', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-09', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 300, transaction_date: '2024-01-11', type: 'expense' },
        { amount: 400, transaction_date: '2024-01-12', type: 'expense' },
        { amount: 100, transaction_date: '2024-01-13', type: 'expense' },
        { amount: 200, transaction_date: '2024-01-14', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      // Sorted: [100, 100, 100, 100, 200, 200, 200, 200, 300, 300, 300, 400, 400, 400]
      // Median of 14 values = average of 7th and 8th values = (200 + 200) / 2 = 200
      expect(result.medianAmount).toBe(200)
    })
  })

  describe('Real-World Scenarios', () => {
    it('handles typical monthly spending pattern', () => {
      const transactions: SpendingTransaction[] = [
        // Regular daily expenses
        ...Array.from({ length: 25 }, (_, i) => ({
          amount: 80 + Math.random() * 40, // 80-120 range
          transaction_date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'expense' as const,
        })),
        // One large purchase (rent/mortgage)
        { amount: 5000, transaction_date: '2024-01-01', type: 'expense' },
        // Income (should be ignored)
        { amount: 10000, transaction_date: '2024-01-15', type: 'income' },
      ]

      const result = calculateAverageDailySpending(transactions)

      expect(result.confidence).toBe('medium')
      expect(result.transactionsExcluded).toBeGreaterThan(0) // Large purchase excluded
      expect(result.averageDailySpending).toBeLessThan(200) // Should be reasonable
      expect(result.averageDailySpending).toBeGreaterThan(50)
    })

    it('provides conservative estimate for irregular spending', () => {
      const transactions: SpendingTransaction[] = [
        { amount: 50, transaction_date: '2024-01-01', type: 'expense' },
        { amount: 50, transaction_date: '2024-01-05', type: 'expense' },
        { amount: 50, transaction_date: '2024-01-10', type: 'expense' },
        { amount: 50, transaction_date: '2024-01-15', type: 'expense' },
        { amount: 50, transaction_date: '2024-01-20', type: 'expense' },
        { amount: 50, transaction_date: '2024-01-25', type: 'expense' },
        { amount: 50, transaction_date: '2024-01-30', type: 'expense' },
      ]

      const result = calculateAverageDailySpending(transactions)

      // Conservative: spreads spending across all days
      expect(result.averageDailySpending).toBeLessThan(15) // 350 / 30 days
      expect(result.confidence).toBe('high')
    })
  })
})
