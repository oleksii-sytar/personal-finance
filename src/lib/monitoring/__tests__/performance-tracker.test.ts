/**
 * Tests for Performance Tracker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PerformanceTracker, trackPerformance, trackPerformanceSync } from '../performance-tracker'
import { logger } from '../logger'

vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('PerformanceTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PerformanceTracker class', () => {
    it('tracks operation duration', () => {
      const tracker = new PerformanceTracker('test_operation')
      
      // Simulate some work
      const start = performance.now()
      while (performance.now() - start < 10) {
        // Wait at least 10ms
      }
      
      const metrics = tracker.end()

      expect(metrics.operationName).toBe('test_operation')
      expect(metrics.durationMs).toBeGreaterThanOrEqual(10)
      expect(metrics.timestamp).toBeDefined()
    })

    it('includes context in metrics', () => {
      const tracker = new PerformanceTracker('test_operation', { userId: '123' })
      const metrics = tracker.end({ result: 'success' })

      expect(metrics.context).toEqual({
        userId: '123',
        result: 'success',
      })
    })

    it('logs debug for fast operations (<1s)', () => {
      const tracker = new PerformanceTracker('fast_operation')
      tracker.end()

      expect(logger.debug).toHaveBeenCalled()
      expect(logger.info).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('trackPerformance', () => {
    it('tracks async operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('result')

      const result = await trackPerformance('async_operation', operation, { test: true })

      expect(result).toBe('result')
      expect(operation).toHaveBeenCalledOnce()
      expect(logger.debug).toHaveBeenCalled()
    })

    it('tracks async operation failure', async () => {
      const error = new Error('Operation failed')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(
        trackPerformance('failing_operation', operation)
      ).rejects.toThrow('Operation failed')

      expect(logger.debug).toHaveBeenCalled()
    })
  })

  describe('trackPerformanceSync', () => {
    it('tracks sync operation successfully', () => {
      const operation = vi.fn().mockReturnValue('result')

      const result = trackPerformanceSync('sync_operation', operation, { test: true })

      expect(result).toBe('result')
      expect(operation).toHaveBeenCalledOnce()
      expect(logger.debug).toHaveBeenCalled()
    })

    it('tracks sync operation failure', () => {
      const error = new Error('Operation failed')
      const operation = vi.fn().mockImplementation(() => {
        throw error
      })

      expect(() => trackPerformanceSync('failing_operation', operation)).toThrow('Operation failed')

      expect(logger.debug).toHaveBeenCalled()
    })
  })
})
