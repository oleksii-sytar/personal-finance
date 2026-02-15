/**
 * Unit tests for spending trends calculator
 * 
 * Tests cover:
 * - Month-over-month calculations
 * - 3-month average calculations
 * - Trend direction detection
 * - Unusual spending pattern detection
 * - Edge cases (no data, single category, etc.)
 */

import { describe, it, expect } from 'vitest'
import { calculateSpendingTrends, type TrendTransaction } from '../spending-trends'

/**
 * Helper function to create mock transactions
 */
function createMockTransaction(
  amount: number,
  date: string,
  categoryId: string,
  categoryName: string
): TrendTransaction {
  return {
    amount,
    transaction_date: date,
    type: 'expense',
    category_id: categoryId,
    category_name: categoryName,
  }
}

describe('calculateSpendingTrends', () => {
  describe('Basic Calculations', () => {
    it('calculates current month spending correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-02-01', 'cat1', 'Food'),
        createMockTransaction(200, '2026-02-15', 'cat1', 'Food'),
        createMockTransaction(150, '2026-02-20', 'cat2', 'Transport'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.totalCurrentMonth).toBe(450)
      expect(result.trends).toHaveLength(2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.currentMonth).toBe(300)
      expect(foodTrend?.transactionCount).toBe(2)
      
      const transportTrend = result.trends.find(t => t.categoryId === 'cat2')
      expect(transportTrend?.currentMonth).toBe(150)
      expect(transportTrend?.transactionCount).toBe(1)
    })
    
    it('calculates previous month spending correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(200, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.currentMonth).toBe(200)
      expect(foodTrend?.previousMonth).toBe(100)
    })
    
    it('handles year boundary correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2025-12-15', 'cat1', 'Food'),
        createMockTransaction(200, '2026-01-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 1)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.currentMonth).toBe(200)
      expect(foodTrend?.previousMonth).toBe(100)
    })
  })
  
  describe('Month-over-Month Changes', () => {
    it('calculates percentage increase correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(150, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.percentChange).toBe(50) // 50% increase
      expect(foodTrend?.trend).toBe('increasing')
    })
    
    it('calculates percentage decrease correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(200, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(100, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.percentChange).toBe(-50) // 50% decrease
      expect(foodTrend?.trend).toBe('decreasing')
    })
    
    it('identifies stable trend for small changes', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(103, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.percentChange).toBe(3)
      expect(foodTrend?.trend).toBe('stable')
    })
    
    it('handles new category (no previous spending)', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.previousMonth).toBe(0)
      expect(foodTrend?.percentChange).toBe(100)
      expect(foodTrend?.trend).toBe('increasing')
    })
    
    it('handles category with no current spending', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.currentMonth).toBe(0)
      expect(foodTrend?.previousMonth).toBe(100)
      expect(foodTrend?.percentChange).toBe(-100)
      expect(foodTrend?.trend).toBe('decreasing')
    })
  })
  
  describe('3-Month Average', () => {
    it('calculates 3-month average correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2025-12-15', 'cat1', 'Food'),
        createMockTransaction(200, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(300, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.threeMonthAverage).toBe(200) // (100 + 200 + 300) / 3
    })
    
    it('handles 3-month average across year boundary', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2025-11-15', 'cat1', 'Food'),
        createMockTransaction(200, '2025-12-15', 'cat1', 'Food'),
        createMockTransaction(300, '2026-01-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 1)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.threeMonthAverage).toBe(200) // (100 + 200 + 300) / 3
    })
    
    it('includes months with zero spending in average', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(300, '2026-02-15', 'cat1', 'Food'),
        // No spending in Jan or Dec
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.threeMonthAverage).toBe(100) // (0 + 0 + 300) / 3
    })
  })
  
  describe('Unusual Spending Detection', () => {
    it('detects unusually high spending (>50% above average)', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2025-12-15', 'cat1', 'Food'),
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(300, '2026-02-15', 'cat1', 'Food'), // 200% of average
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.isUnusual).toBe(true)
      expect(result.unusualCategories).toHaveLength(1)
    })
    
    it('detects unusually low spending (>50% below average)', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(200, '2025-12-15', 'cat1', 'Food'),
        createMockTransaction(200, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(50, '2026-02-15', 'cat1', 'Food'), // 25% of average
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.isUnusual).toBe(true)
    })
    
    it('does not flag normal variations as unusual', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2025-12-15', 'cat1', 'Food'),
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(130, '2026-02-15', 'cat1', 'Food'), // 30% above average
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.isUnusual).toBe(false)
      expect(result.unusualCategories).toHaveLength(0)
    })
    
    it('handles zero average (new category)', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      // 3-month average is 100/3 = 33.33, current is 100, so it's 200% of average
      // This is >50% deviation, so it IS unusual (which is correct behavior)
      expect(foodTrend?.threeMonthAverage).toBeCloseTo(33.33, 1)
      expect(foodTrend?.isUnusual).toBe(true)
    })
  })
  
  describe('Top Categories', () => {
    it('identifies top 3 spending categories', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(500, '2026-02-15', 'cat1', 'Food'),
        createMockTransaction(300, '2026-02-15', 'cat2', 'Transport'),
        createMockTransaction(200, '2026-02-15', 'cat3', 'Entertainment'),
        createMockTransaction(100, '2026-02-15', 'cat4', 'Utilities'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.topCategories).toHaveLength(3)
      expect(result.topCategories[0].categoryName).toBe('Food')
      expect(result.topCategories[1].categoryName).toBe('Transport')
      expect(result.topCategories[2].categoryName).toBe('Entertainment')
    })
    
    it('handles fewer than 3 categories', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(500, '2026-02-15', 'cat1', 'Food'),
        createMockTransaction(300, '2026-02-15', 'cat2', 'Transport'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.topCategories).toHaveLength(2)
    })
  })
  
  describe('Overall Metrics', () => {
    it('calculates total spending correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-02-01', 'cat1', 'Food'),
        createMockTransaction(200, '2026-02-15', 'cat2', 'Transport'),
        createMockTransaction(150, '2026-02-20', 'cat3', 'Entertainment'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.totalCurrentMonth).toBe(450)
    })
    
    it('calculates overall percentage change correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(100, '2026-01-20', 'cat2', 'Transport'),
        createMockTransaction(150, '2026-02-15', 'cat1', 'Food'),
        createMockTransaction(150, '2026-02-20', 'cat2', 'Transport'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.totalPreviousMonth).toBe(200)
      expect(result.totalCurrentMonth).toBe(300)
      expect(result.overallPercentChange).toBe(50) // 50% increase
    })
    
    it('calculates average daily spending correctly', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(280, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      // February 2026 has 28 days
      expect(result.averageDailySpending).toBe(10) // 280 / 28
    })
  })
  
  describe('Edge Cases', () => {
    it('handles empty transaction list', () => {
      const result = calculateSpendingTrends([], 2026, 2)
      
      expect(result.trends).toHaveLength(0)
      expect(result.totalCurrentMonth).toBe(0)
      expect(result.totalPreviousMonth).toBe(0)
      expect(result.overallPercentChange).toBe(0)
      expect(result.topCategories).toHaveLength(0)
      expect(result.unusualCategories).toHaveLength(0)
      expect(result.averageDailySpending).toBe(0)
    })
    
    it('ignores income transactions', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-02-15', 'cat1', 'Food'),
        {
          amount: 1000,
          transaction_date: '2026-02-15',
          type: 'income',
          category_id: 'cat2',
          category_name: 'Salary',
        },
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.totalCurrentMonth).toBe(100) // Only expense counted
      expect(result.trends).toHaveLength(1)
      expect(result.trends[0].categoryName).toBe('Food')
    })
    
    it('handles single category', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-01-15', 'cat1', 'Food'),
        createMockTransaction(150, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.trends).toHaveLength(1)
      expect(result.topCategories).toHaveLength(1)
    })
    
    it('handles multiple transactions same day same category', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(50, '2026-02-15', 'cat1', 'Food'),
        createMockTransaction(75, '2026-02-15', 'cat1', 'Food'),
        createMockTransaction(25, '2026-02-15', 'cat1', 'Food'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      const foodTrend = result.trends.find(t => t.categoryId === 'cat1')
      expect(foodTrend?.currentMonth).toBe(150)
      expect(foodTrend?.transactionCount).toBe(3)
    })
    
    it('sorts categories by current spending descending', () => {
      const transactions: TrendTransaction[] = [
        createMockTransaction(100, '2026-02-15', 'cat1', 'Food'),
        createMockTransaction(300, '2026-02-15', 'cat2', 'Transport'),
        createMockTransaction(200, '2026-02-15', 'cat3', 'Entertainment'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.trends[0].categoryName).toBe('Transport')
      expect(result.trends[1].categoryName).toBe('Entertainment')
      expect(result.trends[2].categoryName).toBe('Food')
    })
  })
  
  describe('Real-World Scenarios', () => {
    it('handles typical monthly spending pattern', () => {
      const transactions: TrendTransaction[] = [
        // December 2025
        createMockTransaction(400, '2025-12-05', 'cat1', 'Food'),
        createMockTransaction(150, '2025-12-10', 'cat2', 'Transport'),
        createMockTransaction(100, '2025-12-20', 'cat3', 'Entertainment'),
        
        // January 2026
        createMockTransaction(450, '2026-01-05', 'cat1', 'Food'),
        createMockTransaction(200, '2026-01-10', 'cat2', 'Transport'),
        createMockTransaction(80, '2026-01-20', 'cat3', 'Entertainment'),
        
        // February 2026
        createMockTransaction(500, '2026-02-05', 'cat1', 'Food'),
        createMockTransaction(180, '2026-02-10', 'cat2', 'Transport'),
        createMockTransaction(120, '2026-02-20', 'cat3', 'Entertainment'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 2)
      
      expect(result.trends).toHaveLength(3)
      expect(result.totalCurrentMonth).toBe(800)
      expect(result.totalPreviousMonth).toBe(730)
      
      const foodTrend = result.trends.find(t => t.categoryName === 'Food')
      expect(foodTrend?.trend).toBe('increasing')
      expect(foodTrend?.threeMonthAverage).toBeCloseTo(450, 0)
    })
    
    it('detects unusual holiday spending', () => {
      const transactions: TrendTransaction[] = [
        // Normal months
        createMockTransaction(100, '2025-11-15', 'cat1', 'Gifts'),
        createMockTransaction(100, '2025-12-15', 'cat1', 'Gifts'),
        
        // Holiday spike
        createMockTransaction(500, '2026-01-15', 'cat1', 'Gifts'),
      ]
      
      const result = calculateSpendingTrends(transactions, 2026, 1)
      
      const giftsTrend = result.trends.find(t => t.categoryName === 'Gifts')
      expect(giftsTrend?.isUnusual).toBe(true)
      expect(giftsTrend?.trend).toBe('increasing')
      expect(result.unusualCategories).toContain(giftsTrend)
    })
  })
})
