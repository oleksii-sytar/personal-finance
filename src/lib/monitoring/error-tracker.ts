/**
 * Error Tracker for Forecast Calculations
 * 
 * Tracks errors and provides structured error reporting.
 * Helps identify patterns and common failure modes.
 * 
 * @module monitoring/error-tracker
 */

import { logger } from './logger'

export type ErrorCategory =
  | 'data_fetch'
  | 'calculation'
  | 'validation'
  | 'cache'
  | 'unknown'

export interface ErrorMetrics {
  category: ErrorCategory
  operation: string
  message: string
  timestamp: string
  context?: Record<string, unknown>
  stack?: string
}

/**
 * Error tracker for monitoring and reporting errors
 */
class ErrorTracker {
  private errorCounts: Map<string, number> = new Map()
  private readonly ERROR_THRESHOLD = 10 // Alert after 10 errors of same type

  /**
   * Track an error with category and context
   */
  trackError(
    category: ErrorCategory,
    operation: string,
    error: Error,
    context?: Record<string, unknown>
  ): void {
    const errorKey = `${category}:${operation}`
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)

    const metrics: ErrorMetrics = {
      category,
      operation,
      message: error.message,
      timestamp: new Date().toISOString(),
      context,
      stack: error.stack,
    }

    // Log error
    logger.error(`Error in ${operation}`, error, {
      category,
      errorCount: currentCount + 1,
      ...context,
    })

    // Alert if error threshold exceeded
    if (currentCount + 1 >= this.ERROR_THRESHOLD) {
      logger.error(`Error threshold exceeded for ${errorKey}`, undefined, {
        category,
        operation,
        errorCount: currentCount + 1,
        threshold: this.ERROR_THRESHOLD,
      })
    }
  }

  /**
   * Get error count for specific category and operation
   */
  getErrorCount(category: ErrorCategory, operation: string): number {
    const errorKey = `${category}:${operation}`
    return this.errorCounts.get(errorKey) || 0
  }

  /**
   * Get all error counts
   */
  getAllErrorCounts(): Map<string, number> {
    return new Map(this.errorCounts)
  }

  /**
   * Reset error counts
   */
  resetCounts(): void {
    this.errorCounts.clear()
  }

  /**
   * Get error rate for specific operation
   */
  getErrorRate(category: ErrorCategory, operation: string, totalOperations: number): number {
    const errorCount = this.getErrorCount(category, operation)
    return totalOperations > 0 ? (errorCount / totalOperations) * 100 : 0
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker()

/**
 * Helper function to wrap operations with error tracking
 */
export async function withErrorTracking<T>(
  category: ErrorCategory,
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    errorTracker.trackError(
      category,
      operation,
      error instanceof Error ? error : new Error(String(error)),
      context
    )
    throw error
  }
}

/**
 * Helper function to wrap sync operations with error tracking
 */
export function withErrorTrackingSync<T>(
  category: ErrorCategory,
  operation: string,
  fn: () => T,
  context?: Record<string, unknown>
): T {
  try {
    return fn()
  } catch (error) {
    errorTracker.trackError(
      category,
      operation,
      error instanceof Error ? error : new Error(String(error)),
      context
    )
    throw error
  }
}
