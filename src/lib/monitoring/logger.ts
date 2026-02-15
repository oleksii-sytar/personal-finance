/**
 * Structured Logger for Forecast Monitoring
 * 
 * Provides structured logging with different severity levels and context.
 * Logs are formatted for easy parsing and analysis.
 * 
 * @module monitoring/logger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    name?: string
  }
}

/**
 * Logger class for structured logging
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isTest = process.env.NODE_ENV === 'test'

  /**
   * Format log entry as JSON string
   */
  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry, null, this.isDevelopment ? 2 : 0)
  }

  /**
   * Write log entry to console
   */
  private writeLog(level: LogLevel, entry: LogEntry): void {
    // Skip logs in test environment unless explicitly enabled
    if (this.isTest && !process.env.ENABLE_TEST_LOGS) {
      return
    }

    const formatted = this.formatLogEntry(entry)

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formatted)
        }
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.writeLog('debug', {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    })
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.writeLog('info', {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    })
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.writeLog('warn', {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    })
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.writeLog('error', {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    })
  }
}

// Export singleton instance
export const logger = new Logger()
