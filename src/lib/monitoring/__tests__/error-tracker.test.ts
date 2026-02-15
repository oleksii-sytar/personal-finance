/**
 * Tests for Error Tracker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { errorTracker, withErrorTracking, withErrorTrackingSync } from '../error-tracker'
import { logger } from '../logger'

vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ErrorTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    errorTracker.resetCounts()
  })

  describe('trackError', () => {
    it('tracks error with category and operation', () => {
      const error = new Error('Test error')
      
      errorTracker.trackError('calculation', 'test_operation', error, { userId: '123' })

      expect(logger.error).toHaveBeenCalledWith(
        'Error in test_operation',
        error,
        expect.objectContaining({
          category: 'calculation',
          errorCount: 1,
          userId: '123',
        })
      )
    })

    it('increments error count for same category and operation', () => {
      const error = new Error('Test error')
      
      errorTracker.trackError('calculation', 'test_operation', error)
      errorTracker.trackError('calculation', 'test_operation', error)
      errorTracker.trackError('calculation', 'test_operation', error)

      expect(errorTracker.getErrorCount('calculation', 'test_operation')).toBe(3)
    })

    it('tracks different errors separately', () => {
      const error = new Error('Test error')
      
      errorTracker.trackError('calculation', 'operation_a', error)
      errorTracker.trackError('calculation', 'operation_b', error)
      errorTracker.trackError('data_fetch', 'operation_a', error)

      expect(errorTracker.getErrorCount('calculation', 'operation_a')).toBe(1)
      expect(errorTracker.getErrorCount('calculation', 'operation_b')).toBe(1)
      expect(errorTracker.getErrorCount('data_fetch', 'operation_a')).toBe(1)
    })

    it('alerts when error threshold exceeded', () => {
      const error = new Error('Test error')
      
      // Track 10 errors (threshold)
      for (let i = 0; i < 10; i++) {
        errorTracker.trackError('calculation', 'test_operation', error)
      }

      // Should have logged threshold exceeded message
      expect(logger.error).toHaveBeenCalledWith(
        'Error threshold exceeded for calculation:test_operation',
        undefined,
        expect.objectContaining({
          category: 'calculation',
          operation: 'test_operation',
          errorCount: 10,
          threshold: 10,
        })
      )
    })
  })

  describe('getErrorCount', () => {
    it('returns 0 for untracked errors', () => {
      expect(errorTracker.getErrorCount('calculation', 'unknown')).toBe(0)
    })

    it('returns correct count for tracked errors', () => {
      const error = new Error('Test error')
      
      errorTracker.trackError('calculation', 'test_operation', error)
      errorTracker.trackError('calculation', 'test_operation', error)

      expect(errorTracker.getErrorCount('calculation', 'test_operation')).toBe(2)
    })
  })

  describe('getErrorRate', () => {
    it('calculates error rate correctly', () => {
      const error = new Error('Test error')
      
      errorTracker.trackError('calculation', 'test_operation', error)
      errorTracker.trackError('calculation', 'test_operation', error)

      const rate = errorTracker.getErrorRate('calculation', 'test_operation', 100)
      expect(rate).toBe(2) // 2 errors out of 100 operations = 2%
    })

    it('returns 0 when total operations is 0', () => {
      const rate = errorTracker.getErrorRate('calculation', 'test_operation', 0)
      expect(rate).toBe(0)
    })
  })

  describe('resetCounts', () => {
    it('clears all error counts', () => {
      const error = new Error('Test error')
      
      errorTracker.trackError('calculation', 'test_operation', error)
      errorTracker.trackError('data_fetch', 'another_operation', error)

      errorTracker.resetCounts()

      expect(errorTracker.getErrorCount('calculation', 'test_operation')).toBe(0)
      expect(errorTracker.getErrorCount('data_fetch', 'another_operation')).toBe(0)
    })
  })

  describe('withErrorTracking', () => {
    it('tracks errors from async operations', async () => {
      const error = new Error('Async error')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(
        withErrorTracking('calculation', 'async_operation', operation, { test: true })
      ).rejects.toThrow('Async error')

      expect(errorTracker.getErrorCount('calculation', 'async_operation')).toBe(1)
      expect(logger.error).toHaveBeenCalled()
    })

    it('does not track errors when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withErrorTracking('calculation', 'async_operation', operation)

      expect(result).toBe('success')
      expect(errorTracker.getErrorCount('calculation', 'async_operation')).toBe(0)
    })
  })

  describe('withErrorTrackingSync', () => {
    it('tracks errors from sync operations', () => {
      const error = new Error('Sync error')
      const operation = vi.fn().mockImplementation(() => {
        throw error
      })

      expect(() =>
        withErrorTrackingSync('calculation', 'sync_operation', operation, { test: true })
      ).toThrow('Sync error')

      expect(errorTracker.getErrorCount('calculation', 'sync_operation')).toBe(1)
      expect(logger.error).toHaveBeenCalled()
    })

    it('does not track errors when operation succeeds', () => {
      const operation = vi.fn().mockReturnValue('success')

      const result = withErrorTrackingSync('calculation', 'sync_operation', operation)

      expect(result).toBe('success')
      expect(errorTracker.getErrorCount('calculation', 'sync_operation')).toBe(0)
    })
  })
})
