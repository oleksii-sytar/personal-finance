/**
 * Centralized error logging utility
 * Implements security event logging requirements (9.4, 9.5)
 */

export interface ErrorLogData {
  message: string
  stack?: string
  context?: Record<string, any>
  userId?: string
  timestamp: string
  level: 'error' | 'warn' | 'info'
  category: 'auth' | 'workspace' | 'transaction' | 'system' | 'security'
}

export interface SecurityEventData {
  event: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, any>
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class ErrorLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isClient = typeof window !== 'undefined'

  /**
   * Log application errors with proper security considerations
   */
  logError(error: Error | string, context?: {
    category?: ErrorLogData['category']
    userId?: string
    additionalContext?: Record<string, any>
  }) {
    const errorData: ErrorLogData = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context: context?.additionalContext,
      userId: context?.userId,
      timestamp: new Date().toISOString(),
      level: 'error',
      category: context?.category || 'system'
    }

    // Console logging (always)
    console.error('Application Error:', {
      message: errorData.message,
      category: errorData.category,
      timestamp: errorData.timestamp,
      ...(this.isDevelopment && { stack: errorData.stack })
    })

    // In production, send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoringService(errorData)
    }
  }

  /**
   * Log security events (Requirement 9.4, 9.5)
   */
  logSecurityEvent(eventData: Omit<SecurityEventData, 'timestamp'>) {
    const securityEvent: SecurityEventData = {
      ...eventData,
      timestamp: new Date().toISOString()
    }

    // Always log security events (but sanitize sensitive data)
    console.error('Security Event:', {
      event: securityEvent.event,
      severity: securityEvent.severity,
      timestamp: securityEvent.timestamp,
      // Don't log sensitive details in console
      hasDetails: !!securityEvent.details
    })

    // Send to security monitoring
    this.sendToSecurityMonitoring(securityEvent)
  }

  /**
   * Log authentication failures (Requirement 2.3, 3.4)
   */
  logAuthFailure(type: 'login' | 'signup' | 'reset' | 'verify', details?: {
    email?: string
    reason?: string
    attemptCount?: number
  }) {
    this.logSecurityEvent({
      event: `auth_${type}_failure`,
      severity: details?.attemptCount && details.attemptCount > 3 ? 'high' : 'medium',
      details: {
        // Don't log email directly for privacy
        hasEmail: !!details?.email,
        reason: details?.reason,
        attemptCount: details?.attemptCount
      }
    })
  }

  /**
   * Log workspace security events
   */
  logWorkspaceEvent(event: 'unauthorized_access' | 'member_removed' | 'ownership_transfer', details?: {
    workspaceId?: string
    userId?: string
    targetUserId?: string
  }) {
    this.logSecurityEvent({
      event: `workspace_${event}`,
      severity: event === 'unauthorized_access' ? 'high' : 'medium',
      userId: details?.userId,
      details: {
        workspaceId: details?.workspaceId,
        targetUserId: details?.targetUserId
      }
    })
  }

  /**
   * Log validation errors (Requirement 1.7)
   */
  logValidationError(field: string, value: any, rule: string, context?: {
    form?: string
    userId?: string
  }) {
    this.logError(`Validation failed: ${field} - ${rule}`, {
      category: 'system',
      userId: context?.userId,
      additionalContext: {
        field,
        rule,
        form: context?.form,
        // Don't log actual values for security
        hasValue: value !== undefined && value !== null
      }
    })
  }

  private sendToMonitoringService(errorData: ErrorLogData) {
    // In a real application, this would send to Sentry, LogRocket, etc.
    // For now, we'll just prepare the data structure
    
    if (this.isClient) {
      // Client-side error reporting - implement when needed
      // For now, errors are logged to console in development only
    } else {
      // Server-side error reporting - implement when needed
      // For now, errors are logged to console in development only
    }
  }

  private sendToSecurityMonitoring(securityEvent: SecurityEventData) {
    // In a real application, this would send to security monitoring service
    // For now, we'll just prepare the data structure
    
    // Security event monitoring is handled through proper logging
    // This provides a foundation for future security monitoring integration
    // - Datadog Security Monitoring
    // - Custom security dashboard
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger()

// Convenience functions for common error types
export const logError = (error: Error | string, context?: Parameters<typeof errorLogger.logError>[1]) => {
  errorLogger.logError(error, context)
}

export const logSecurityEvent = (eventData: Parameters<typeof errorLogger.logSecurityEvent>[0]) => {
  errorLogger.logSecurityEvent(eventData)
}

export const logAuthFailure = (type: Parameters<typeof errorLogger.logAuthFailure>[0], details?: Parameters<typeof errorLogger.logAuthFailure>[1]) => {
  errorLogger.logAuthFailure(type, details)
}

export const logWorkspaceEvent = (event: Parameters<typeof errorLogger.logWorkspaceEvent>[0], details?: Parameters<typeof errorLogger.logWorkspaceEvent>[1]) => {
  errorLogger.logWorkspaceEvent(event, details)
}

export const logValidationError = (field: string, value: any, rule: string, context?: Parameters<typeof errorLogger.logValidationError>[3]) => {
  errorLogger.logValidationError(field, value, rule, context)
}