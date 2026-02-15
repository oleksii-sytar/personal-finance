/**
 * Tests for Logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../logger'

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let originalEnv: string | undefined

  beforeEach(() => {
    // Enable test logs for these tests
    originalEnv = process.env.ENABLE_TEST_LOGS
    process.env.ENABLE_TEST_LOGS = 'true'

    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.ENABLE_TEST_LOGS
    } else {
      process.env.ENABLE_TEST_LOGS = originalEnv
    }
    vi.restoreAllMocks()
  })

  describe('info', () => {
    it('logs info message with context', () => {
      logger.info('Test message', { key: 'value' })

      expect(consoleInfoSpy).toHaveBeenCalledOnce()
      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0])

      expect(loggedData.level).toBe('info')
      expect(loggedData.message).toBe('Test message')
      expect(loggedData.context).toEqual({ key: 'value' })
      expect(loggedData.timestamp).toBeDefined()
    })

    it('logs info message without context', () => {
      logger.info('Test message')

      expect(consoleInfoSpy).toHaveBeenCalledOnce()
      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0])

      expect(loggedData.level).toBe('info')
      expect(loggedData.message).toBe('Test message')
      expect(loggedData.context).toBeUndefined()
    })
  })

  describe('warn', () => {
    it('logs warning message with context', () => {
      logger.warn('Warning message', { severity: 'high' })

      expect(consoleWarnSpy).toHaveBeenCalledOnce()
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0])

      expect(loggedData.level).toBe('warn')
      expect(loggedData.message).toBe('Warning message')
      expect(loggedData.context).toEqual({ severity: 'high' })
    })
  })

  describe('error', () => {
    it('logs error message with error object', () => {
      const error = new Error('Test error')
      logger.error('Error occurred', error, { operation: 'test' })

      expect(consoleErrorSpy).toHaveBeenCalledOnce()
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0])

      expect(loggedData.level).toBe('error')
      expect(loggedData.message).toBe('Error occurred')
      expect(loggedData.context).toEqual({ operation: 'test' })
      expect(loggedData.error).toBeDefined()
      expect(loggedData.error.message).toBe('Test error')
      expect(loggedData.error.name).toBe('Error')
      expect(loggedData.error.stack).toBeDefined()
    })

    it('logs error message without error object', () => {
      logger.error('Error occurred', undefined, { operation: 'test' })

      expect(consoleErrorSpy).toHaveBeenCalledOnce()
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0])

      expect(loggedData.level).toBe('error')
      expect(loggedData.message).toBe('Error occurred')
      expect(loggedData.error).toBeUndefined()
    })
  })

  describe('timestamp', () => {
    it('includes ISO timestamp in all logs', () => {
      logger.info('Test')

      const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0])
      expect(loggedData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})
