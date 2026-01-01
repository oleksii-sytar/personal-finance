'use client'

import { useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { logError, logAuthFailure, logWorkspaceEvent } from '@/lib/utils/error-logging'

export interface ErrorHandlerOptions {
  showToast?: boolean
  logError?: boolean
  category?: 'auth' | 'workspace' | 'transaction' | 'system' | 'security'
  context?: Record<string, any>
}

export function useErrorHandler() {
  const toast = useToast()

  const handleError = useCallback((
    error: Error | string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError: shouldLog = true,
      category = 'system',
      context
    } = options

    const errorMessage = typeof error === 'string' ? error : error.message

    // Log the error
    if (shouldLog) {
      logError(error, {
        category,
        additionalContext: context
      })
    }

    // Show toast notification
    if (showToast) {
      toast.error('Error', errorMessage)
    }
  }, [toast])

  const handleAuthError = useCallback((
    error: Error | string,
    type: 'login' | 'signup' | 'reset' | 'verify',
    details?: { email?: string; attemptCount?: number }
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message

    // Log authentication failure
    logAuthFailure(type, {
      ...details,
      reason: errorMessage
    })

    // Show user-friendly error message
    toast.error('Authentication Error', errorMessage)
  }, [toast])

  const handleWorkspaceError = useCallback((
    error: Error | string,
    event?: 'unauthorized_access' | 'member_removed' | 'ownership_transfer',
    details?: { workspaceId?: string; targetUserId?: string }
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message

    // Log workspace event if specified
    if (event) {
      logWorkspaceEvent(event, details)
    }

    // Log general error
    logError(error, {
      category: 'workspace',
      additionalContext: details
    })

    // Show toast
    toast.error('Workspace Error', errorMessage)
  }, [toast])

  const handleValidationError = useCallback((
    errors: Record<string, string[]> | string,
    formName?: string
  ) => {
    if (typeof errors === 'string') {
      toast.error('Validation Error', errors)
      return
    }

    // Handle Zod validation errors
    const firstError = Object.entries(errors)[0]
    if (firstError) {
      const [field, messages] = firstError
      const message = messages[0] || 'Invalid input'
      
      toast.error('Validation Error', message)
      
      // Log validation error
      logError(`Validation failed: ${field} - ${message}`, {
        category: 'system',
        additionalContext: {
          form: formName,
          field,
          errorCount: Object.keys(errors).length
        }
      })
    }
  }, [toast])

  const handleSuccess = useCallback((
    message: string,
    description?: string
  ) => {
    toast.success(message, description)
  }, [toast])

  const handleWarning = useCallback((
    message: string,
    description?: string
  ) => {
    toast.warning(message, description)
  }, [toast])

  const handleInfo = useCallback((
    message: string,
    description?: string
  ) => {
    toast.info(message, description)
  }, [toast])

  return {
    handleError,
    handleAuthError,
    handleWorkspaceError,
    handleValidationError,
    handleSuccess,
    handleWarning,
    handleInfo
  }
}