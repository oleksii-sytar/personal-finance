/**
 * Metrics Collector for Monitoring Dashboard
 * 
 * Collects and aggregates metrics from various monitoring components.
 * Provides a unified interface for viewing system health and performance.
 * 
 * @module monitoring/metrics-collector
 */

import { errorTracker, type ErrorCategory } from './error-tracker'
import { forecastService } from '@/lib/services/forecast-service'

export interface SystemMetrics {
  timestamp: string
  cache: {
    size: number
    hits: number
    misses: number
    hitRate: number
    totalOperations: number
  }
  errors: {
    totalErrors: number
    errorsByCategory: Record<string, number>
    recentErrors: Array<{
      category: string
      operation: string
      count: number
    }>
  }
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    issues: string[]
  }
}

/**
 * Metrics collector for system monitoring
 */
class MetricsCollector {
  /**
   * Collect all system metrics
   */
  collectMetrics(): SystemMetrics {
    const cacheStats = forecastService.getCacheStats()
    const errorCounts = errorTracker.getAllErrorCounts()

    // Calculate total errors
    let totalErrors = 0
    const errorsByCategory: Record<string, number> = {}
    const recentErrors: Array<{ category: string; operation: string; count: number }> = []

    for (const [key, count] of errorCounts.entries()) {
      totalErrors += count
      const [category, operation] = key.split(':')
      
      // Aggregate by category
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count
      
      // Track recent errors
      recentErrors.push({ category, operation, count })
    }

    // Sort recent errors by count (descending)
    recentErrors.sort((a, b) => b.count - a.count)

    // Determine health status
    const health = this.determineHealth(cacheStats, totalErrors)

    return {
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      errors: {
        totalErrors,
        errorsByCategory,
        recentErrors: recentErrors.slice(0, 10), // Top 10
      },
      health,
    }
  }

  /**
   * Determine system health based on metrics
   */
  private determineHealth(
    cacheStats: ReturnType<typeof forecastService.getCacheStats>,
    totalErrors: number
  ): { status: 'healthy' | 'degraded' | 'unhealthy'; issues: string[] } {
    const issues: string[] = []
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Check cache hit rate
    if (cacheStats.hitRate < 50 && cacheStats.totalOperations > 10) {
      issues.push(`Low cache hit rate: ${cacheStats.hitRate}%`)
      status = 'degraded'
    }

    // Check error rate
    const errorRate = cacheStats.totalOperations > 0
      ? (totalErrors / cacheStats.totalOperations) * 100
      : 0

    if (errorRate > 5) {
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`)
      status = 'unhealthy'
    } else if (errorRate > 1) {
      issues.push(`Elevated error rate: ${errorRate.toFixed(1)}%`)
      if (status === 'healthy') {
        status = 'degraded'
      }
    }

    // Check for specific error thresholds
    const errorCounts = errorTracker.getAllErrorCounts()
    for (const [key, count] of errorCounts.entries()) {
      if (count >= 10) {
        issues.push(`High error count for ${key}: ${count}`)
        status = 'unhealthy'
      }
    }

    return { status, issues }
  }

  /**
   * Get error rate for specific operation
   */
  getErrorRate(category: string, operation: string, totalOperations: number): number {
    return errorTracker.getErrorRate(category as ErrorCategory, operation, totalOperations)
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    errorTracker.resetCounts()
    forecastService.clearCache()
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector()
