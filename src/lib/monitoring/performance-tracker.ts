/**
 * Performance Tracker for Forecast Calculations
 * 
 * Tracks execution time and performance metrics for forecast calculations.
 * Helps identify slow operations and optimization opportunities.
 * 
 * @module monitoring/performance-tracker
 */

import { logger } from './logger'

export interface PerformanceMetrics {
  operationName: string
  durationMs: number
  timestamp: string
  context?: Record<string, unknown>
}

/**
 * Performance tracker for measuring operation duration
 */
export class PerformanceTracker {
  private startTime: number
  private operationName: string
  private context: Record<string, unknown>

  constructor(operationName: string, context: Record<string, unknown> = {}) {
    this.operationName = operationName
    this.context = context
    this.startTime = performance.now()
  }

  /**
   * End tracking and log performance metrics
   */
  end(additionalContext?: Record<string, unknown>): PerformanceMetrics {
    const endTime = performance.now()
    const durationMs = Math.round(endTime - this.startTime)

    const metrics: PerformanceMetrics = {
      operationName: this.operationName,
      durationMs,
      timestamp: new Date().toISOString(),
      context: {
        ...this.context,
        ...additionalContext,
      },
    }

    // Log performance metrics
    if (durationMs > 2000) {
      // Warn if operation takes more than 2 seconds
      logger.warn(`Slow operation detected: ${this.operationName}`, {
        durationMs,
        ...metrics.context,
      })
    } else if (durationMs > 1000) {
      // Info if operation takes more than 1 second
      logger.info(`Operation completed: ${this.operationName}`, {
        durationMs,
        ...metrics.context,
      })
    } else {
      // Debug for fast operations
      logger.debug(`Operation completed: ${this.operationName}`, {
        durationMs,
        ...metrics.context,
      })
    }

    return metrics
  }
}

/**
 * Helper function to track async operations
 */
export async function trackPerformance<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const tracker = new PerformanceTracker(operationName, context)

  try {
    const result = await operation()
    tracker.end({ success: true })
    return result
  } catch (error) {
    tracker.end({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    throw error
  }
}

/**
 * Helper function to track sync operations
 */
export function trackPerformanceSync<T>(
  operationName: string,
  operation: () => T,
  context?: Record<string, unknown>
): T {
  const tracker = new PerformanceTracker(operationName, context)

  try {
    const result = operation()
    tracker.end({ success: true })
    return result
  } catch (error) {
    tracker.end({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    throw error
  }
}
