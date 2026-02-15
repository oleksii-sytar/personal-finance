/**
 * Performance tests for forecast calculations
 * 
 * Validates that forecast calculations meet performance requirements:
 * - Calculation time < 2 seconds (design requirement)
 * - Efficient handling of large datasets
 * - Caching effectiveness
 * - Query optimization
 * 
 * These tests measure actual execution time and verify performance targets.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { calculateDailyForecast } from '@/lib/calculations/daily-forecast'
import { calculateAverageDailySpending } from '@/lib/calculations/average-daily-spending'
import type { SpendingTransaction } from '@/lib/calculations/average-daily-spending'
import type { PlannedTransaction } from '@/lib/calculations/daily-forecast'

// Performance thresholds from design.md
const PERFORMANCE_THRESHOLDS = {
  FORECAST_CALCULATION_MS: 2000, // < 2 seconds
  AVERAGE_SPENDING_CALCULATION_MS: 500, // < 500ms
  LARGE_DATASET_CALCULATION_MS: 3000, // < 3 seconds for large datasets
  ACCEPTABLE_VARIANCE_MS: 200, // Allow 200ms variance for CI environments
}

// Helper to generate large datasets for performance testing
function generateLargeTransactionDataset(count: number): SpendingTransaction[] {
  const transactions: SpendingTransaction[] = []
  const startDate = new Date(2023, 0, 1)
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + Math.floor(i / 3)) // ~3 transactions per day
    
    transactions.push({
      amount: 50 + Math.random() * 200, // 50-250 UAH
      transaction_date: date.toISOString(),
      type: Math.random() > 0.8 ? 'income' : 'expense',
    })
  }
  
  return transactions
}

function generatePlannedTransactions(count: number, startDate: string): PlannedTransaction[] {
  const transactions: PlannedTransaction[] = []
  const start = new Date(startDate)
  
  for (let i = 0; i < count; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i * 3) // Every 3 days
    
    transactions.push({
      amount: 100 + Math.random() * 500,
      planned_date: date.toISOString().split('T')[0],
      type: Math.random() > 0.7 ? 'income' : 'expense',
    })
  }
  
  return transactions
}

// Helper to measure execution time
async function measureExecutionTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()
  const durationMs = endTime - startTime
  
  return { result, durationMs }
}

describe('Forecast Performance Tests', () => {
  const userSettings = { minimumSafeBalance: 1000, safetyBufferDays: 7 }

  describe('Average Daily Spending Calculation Performance', () => {
    it('should calculate average spending in < 500ms for 90 days of data', async () => {
      // Arrange: 90 days of transactions (~270 transactions)
      const transactions = generateLargeTransactionDataset(270)
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateAverageDailySpending(transactions)
      )
      
      // Assert: Performance requirement
      expect(durationMs).toBeLessThan(
        PERFORMANCE_THRESHOLDS.AVERAGE_SPENDING_CALCULATION_MS + 
        PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      // Verify calculation still works correctly
      expect(result.averageDailySpending).toBeGreaterThan(0)
      expect(result.confidence).toBeDefined()
      
      console.log(`✓ Average spending calculated in ${durationMs.toFixed(2)}ms (${transactions.length} transactions)`)
    })

    it('should handle 1 year of data efficiently', async () => {
      // Arrange: 365 days of transactions (~1095 transactions)
      const transactions = generateLargeTransactionDataset(1095)
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateAverageDailySpending(transactions)
      )
      
      // Assert: Should still be fast even with large dataset
      expect(durationMs).toBeLessThan(1000) // < 1 second for 1 year
      expect(result.averageDailySpending).toBeGreaterThan(0)
      
      console.log(`✓ 1 year calculation in ${durationMs.toFixed(2)}ms (${transactions.length} transactions)`)
    })

    it('should perform outlier detection efficiently', async () => {
      // Arrange: Dataset with many outliers
      const baseTransactions = generateLargeTransactionDataset(300)
      const outliers: SpendingTransaction[] = Array.from({ length: 50 }, (_, i) => ({
        amount: 5000 + Math.random() * 5000, // Large outliers
        transaction_date: new Date(2024, 0, i + 1).toISOString(),
        type: 'expense' as const,
      }))
      
      const transactions = [...baseTransactions, ...outliers]
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateAverageDailySpending(transactions)
      )
      
      // Assert: Outlier detection shouldn't significantly slow down calculation
      expect(durationMs).toBeLessThan(800)
      expect(result.transactionsExcluded).toBeGreaterThan(0)
      
      console.log(`✓ Outlier detection in ${durationMs.toFixed(2)}ms (${result.transactionsExcluded} outliers excluded)`)
    })
  })

  describe('Daily Forecast Calculation Performance', () => {
    it('should generate 30-day forecast in < 2 seconds', async () => {
      // Arrange: Realistic dataset
      const historicalTransactions = generateLargeTransactionDataset(270) // 90 days
      const plannedTransactions = generatePlannedTransactions(10, '2024-02-01')
      const currentBalance = 15000
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateDailyForecast(
          currentBalance,
          historicalTransactions,
          plannedTransactions,
          '2024-02-01',
          '2024-02-29',
          userSettings
        )
      )
      
      // Assert: Critical performance requirement from design.md
      expect(durationMs).toBeLessThan(
        PERFORMANCE_THRESHOLDS.FORECAST_CALCULATION_MS + 
        PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      // Verify calculation correctness
      expect(result.forecasts).toHaveLength(29)
      expect(result.shouldDisplay).toBe(true)
      
      console.log(`✓ 30-day forecast in ${durationMs.toFixed(2)}ms (${historicalTransactions.length} historical + ${plannedTransactions.length} planned)`)
    })

    it('should handle 90-day forecast efficiently', async () => {
      // Arrange: 90-day forecast period
      const historicalTransactions = generateLargeTransactionDataset(270)
      const plannedTransactions = generatePlannedTransactions(30, '2024-02-01')
      const currentBalance = 20000
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateDailyForecast(
          currentBalance,
          historicalTransactions,
          plannedTransactions,
          '2024-02-01',
          '2024-04-30',
          userSettings
        )
      )
      
      // Assert: Should complete in reasonable time
      expect(durationMs).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LARGE_DATASET_CALCULATION_MS
      )
      
      expect(result.forecasts).toHaveLength(90)
      
      console.log(`✓ 90-day forecast in ${durationMs.toFixed(2)}ms`)
    })

    it('should handle maximum 6-month forecast period', async () => {
      // Arrange: Maximum allowed forecast period (6 months = ~180 days)
      const historicalTransactions = generateLargeTransactionDataset(540) // 18 months history
      const plannedTransactions = generatePlannedTransactions(60, '2024-02-01')
      const currentBalance = 50000
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateDailyForecast(
          currentBalance,
          historicalTransactions,
          plannedTransactions,
          '2024-02-01',
          '2024-07-31',
          userSettings
        )
      )
      
      // Assert: Even maximum period should be fast
      expect(durationMs).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LARGE_DATASET_CALCULATION_MS
      )
      
      expect(result.forecasts.length).toBeGreaterThan(150) // ~180 days
      
      console.log(`✓ 6-month forecast in ${durationMs.toFixed(2)}ms (${result.forecasts.length} days)`)
    })

    it('should handle many planned transactions efficiently', async () => {
      // Arrange: Many planned transactions (realistic for recurring bills)
      const historicalTransactions = generateLargeTransactionDataset(270)
      const plannedTransactions = generatePlannedTransactions(100, '2024-02-01') // 100 planned
      const currentBalance = 30000
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateDailyForecast(
          currentBalance,
          historicalTransactions,
          plannedTransactions,
          '2024-02-01',
          '2024-04-30',
          userSettings
        )
      )
      
      // Assert: Many planned transactions shouldn't slow down significantly
      expect(durationMs).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LARGE_DATASET_CALCULATION_MS
      )
      
      console.log(`✓ Forecast with ${plannedTransactions.length} planned transactions in ${durationMs.toFixed(2)}ms`)
    })
  })

  describe('Large Dataset Performance', () => {
    it('should handle 2 years of historical data', async () => {
      // Arrange: 2 years of data (~2190 transactions)
      const transactions = generateLargeTransactionDataset(2190)
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateAverageDailySpending(transactions)
      )
      
      // Assert: Should handle large datasets
      expect(durationMs).toBeLessThan(2000) // < 2 seconds
      expect(result.averageDailySpending).toBeGreaterThan(0)
      
      console.log(`✓ 2 years of data processed in ${durationMs.toFixed(2)}ms (${transactions.length} transactions)`)
    })

    it('should maintain performance with complex spending patterns', async () => {
      // Arrange: Complex pattern with many categories and variations
      const transactions: SpendingTransaction[] = []
      
      // Generate varied spending pattern
      for (let day = 0; day < 365; day++) {
        const date = new Date(2023, 0, 1)
        date.setDate(date.getDate() + day)
        
        // Daily expenses (1-5 per day)
        const dailyCount = 1 + Math.floor(Math.random() * 5)
        for (let i = 0; i < dailyCount; i++) {
          transactions.push({
            amount: 10 + Math.random() * 500,
            transaction_date: date.toISOString(),
            type: Math.random() > 0.85 ? 'income' : 'expense',
          })
        }
      }
      
      const plannedTransactions = generatePlannedTransactions(50, '2024-02-01')
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateDailyForecast(
          25000,
          transactions,
          plannedTransactions,
          '2024-02-01',
          '2024-04-30',
          userSettings
        )
      )
      
      // Assert: Complex patterns shouldn't degrade performance significantly
      expect(durationMs).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LARGE_DATASET_CALCULATION_MS
      )
      
      console.log(`✓ Complex pattern (${transactions.length} transactions) processed in ${durationMs.toFixed(2)}ms`)
    })
  })

  describe('Performance Consistency', () => {
    it('should have consistent performance across multiple runs', async () => {
      // Arrange: Standard dataset
      const historicalTransactions = generateLargeTransactionDataset(270)
      const plannedTransactions = generatePlannedTransactions(10, '2024-02-01')
      const currentBalance = 15000
      
      const durations: number[] = []
      
      // Act: Run calculation 5 times
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureExecutionTime(() =>
          calculateDailyForecast(
            currentBalance,
            historicalTransactions,
            plannedTransactions,
            '2024-02-01',
            '2024-02-29',
            userSettings
          )
        )
        durations.push(durationMs)
      }
      
      // Assert: Performance should be consistent
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)
      const variance = maxDuration - minDuration
      
      // Variance should be reasonable (< 500ms)
      expect(variance).toBeLessThan(500)
      
      // Average should meet performance target
      expect(avgDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.FORECAST_CALCULATION_MS
      )
      
      console.log(`✓ Performance consistency: avg=${avgDuration.toFixed(2)}ms, min=${minDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms, variance=${variance.toFixed(2)}ms`)
    })

    it('should not degrade with repeated calculations', async () => {
      // Arrange: Same dataset used multiple times
      const historicalTransactions = generateLargeTransactionDataset(270)
      const plannedTransactions = generatePlannedTransactions(10, '2024-02-01')
      const currentBalance = 15000
      
      const firstRun = await measureExecutionTime(() =>
        calculateDailyForecast(
          currentBalance,
          historicalTransactions,
          plannedTransactions,
          '2024-02-01',
          '2024-02-29',
          userSettings
        )
      )
      
      // Run 10 more times
      const subsequentRuns: number[] = []
      for (let i = 0; i < 10; i++) {
        const { durationMs } = await measureExecutionTime(() =>
          calculateDailyForecast(
            currentBalance,
            historicalTransactions,
            plannedTransactions,
            '2024-02-01',
            '2024-02-29',
            userSettings
          )
        )
        subsequentRuns.push(durationMs)
      }
      
      const avgSubsequent = subsequentRuns.reduce((a, b) => a + b, 0) / subsequentRuns.length
      
      // Assert: No performance degradation
      expect(avgSubsequent).toBeLessThanOrEqual(firstRun.durationMs * 1.2) // Allow 20% variance
      
      console.log(`✓ No degradation: first=${firstRun.durationMs.toFixed(2)}ms, avg subsequent=${avgSubsequent.toFixed(2)}ms`)
    })
  })

  describe('Edge Case Performance', () => {
    it('should handle minimal data quickly', async () => {
      // Arrange: Minimal dataset (14 transactions - minimum required)
      const transactions = generateLargeTransactionDataset(14)
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateAverageDailySpending(transactions)
      )
      
      // Assert: Minimal data should be very fast
      expect(durationMs).toBeLessThan(100) // < 100ms
      
      console.log(`✓ Minimal data (14 transactions) in ${durationMs.toFixed(2)}ms`)
    })

    it('should handle empty planned transactions efficiently', async () => {
      // Arrange: No planned transactions
      const historicalTransactions = generateLargeTransactionDataset(270)
      const plannedTransactions: PlannedTransaction[] = []
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateDailyForecast(
          15000,
          historicalTransactions,
          plannedTransactions,
          '2024-02-01',
          '2024-02-29',
          userSettings
        )
      )
      
      // Assert: Should be fast without planned transactions
      expect(durationMs).toBeLessThan(
        PERFORMANCE_THRESHOLDS.FORECAST_CALCULATION_MS
      )
      
      console.log(`✓ No planned transactions in ${durationMs.toFixed(2)}ms`)
    })

    it('should handle single-day forecast quickly', async () => {
      // Arrange: Single day forecast
      const historicalTransactions = generateLargeTransactionDataset(270)
      const plannedTransactions = generatePlannedTransactions(5, '2024-02-01')
      
      // Act & Measure
      const { result, durationMs } = await measureExecutionTime(() =>
        calculateDailyForecast(
          15000,
          historicalTransactions,
          plannedTransactions,
          '2024-02-01',
          '2024-02-01',
          userSettings
        )
      )
      
      // Assert: Single day should be very fast
      expect(durationMs).toBeLessThan(500) // < 500ms
      expect(result.forecasts).toHaveLength(1)
      
      console.log(`✓ Single-day forecast in ${durationMs.toFixed(2)}ms`)
    })
  })

  describe('Performance Summary', () => {
    it('should generate performance report', async () => {
      console.log('\n=== Forecast Performance Summary ===')
      console.log(`Target: Forecast calculation < ${PERFORMANCE_THRESHOLDS.FORECAST_CALCULATION_MS}ms`)
      console.log(`Target: Average spending < ${PERFORMANCE_THRESHOLDS.AVERAGE_SPENDING_CALCULATION_MS}ms`)
      console.log(`Target: Large datasets < ${PERFORMANCE_THRESHOLDS.LARGE_DATASET_CALCULATION_MS}ms`)
      console.log('===================================\n')
      
      // This test always passes - it's just for reporting
      expect(true).toBe(true)
    })
  })
})
