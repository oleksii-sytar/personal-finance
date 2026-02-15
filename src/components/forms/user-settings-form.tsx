'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/toast'
import { userSettingsFormSchema, type UserSettingsFormInput } from '@/lib/validations/user-settings'
import { useWorkspace } from '@/contexts/workspace-context'
import { getUserSettings, updateUserSettings, type UserSettings } from '@/actions/user-settings'

/**
 * UserSettingsForm component for managing forecast preferences
 * Requirements: User Journey Enhancement - Phase 2: Financial Safety Dashboard (Task 7.4)
 * 
 * Features:
 * - Minimum safe balance input (for risk threshold calculation)
 * - Safety buffer days input (1-30 days, default 7)
 * - Real-time validation with Zod
 * - Executive Lounge styling (glass inputs, rounded corners)
 * - Loading states during submission
 * - Auto-loads current settings on mount
 * - Upsert behavior (creates or updates)
 */
interface UserSettingsFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function UserSettingsForm({ onSuccess, onCancel }: UserSettingsFormProps) {
  const { currentWorkspace } = useWorkspace()
  const { success, error: showError } = useToast()
  
  const [formData, setFormData] = useState<UserSettingsFormInput>({
    minimum_safe_balance: 0,
    safety_buffer_days: 7,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Load current settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (!currentWorkspace?.id) {
        setIsLoadingSettings(false)
        return
      }

      try {
        const result = await getUserSettings(currentWorkspace.id)
        
        if (result.error) {
          console.error('Error loading settings:', result.error)
          // Don't show error to user - just use defaults
        } else if (result.data) {
          setFormData({
            minimum_safe_balance: result.data.minimum_safe_balance,
            safety_buffer_days: result.data.safety_buffer_days,
          })
        }
      } catch (error) {
        console.error('Unexpected error loading settings:', error)
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadSettings()
  }, [currentWorkspace?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      if (!currentWorkspace?.id) {
        setErrors({ general: 'No workspace selected' })
        setIsLoading(false)
        return
      }

      // Validate form data with Zod
      const validated = userSettingsFormSchema.safeParse(formData)
      
      if (!validated.success) {
        // Convert Zod errors to field errors
        const fieldErrors: Record<string, string> = {}
        validated.error.errors.forEach((error) => {
          if (error.path[0]) {
            const field = error.path[0] as string
            fieldErrors[field] = error.message
          }
        })
        setErrors(fieldErrors)
        setIsLoading(false)
        return
      }

      // Create FormData for server action
      const submitData = new FormData()
      submitData.set('minimum_safe_balance', validated.data.minimum_safe_balance.toString())
      submitData.set('safety_buffer_days', validated.data.safety_buffer_days.toString())

      // Call server action
      const result = await updateUserSettings(currentWorkspace.id, submitData)

      if (result.error) {
        // Handle server errors
        if (typeof result.error === 'string') {
          setErrors({ general: result.error })
          showError('Failed to save settings', result.error)
        } else {
          // Handle validation errors from server
          const fieldErrors: Record<string, string> = {}
          Object.entries(result.error).forEach(([key, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[key] = messages[0]
            } else if (typeof messages === 'string') {
              fieldErrors[key] = messages
            }
          })
          setErrors(fieldErrors)
          showError('Validation failed', 'Please check the form for errors')
        }
        return
      }

      // Success! Show toast notification
      success(
        'Settings saved',
        'Your forecast preferences have been updated successfully'
      )

      // Call success callback (closes modal if in modal)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Settings form submission error:', error)
      setErrors({ general: 'An unexpected error occurred' })
      showError('Unexpected error', 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingSettings) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[var(--bg-glass)] rounded" />
          <div className="h-10 bg-[var(--bg-glass)] rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[var(--bg-glass)] rounded" />
          <div className="h-10 bg-[var(--bg-glass)] rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Minimum Safe Balance Input */}
      <div className="space-y-2">
        <label htmlFor="minimum-safe-balance" className="block text-sm font-medium text-[var(--text-primary)]">
          Minimum Safe Balance
        </label>
        <Input
          id="minimum-safe-balance"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={formData.minimum_safe_balance}
          onChange={(e) => {
            const value = e.target.value
            setFormData(prev => ({ 
              ...prev, 
              minimum_safe_balance: value === '' ? 0 : parseFloat(value) || 0
            }))
          }}
          disabled={isLoading}
          className={errors.minimum_safe_balance ? 'border-[var(--accent-error)]/50' : ''}
          aria-invalid={!!errors.minimum_safe_balance}
          aria-describedby={errors.minimum_safe_balance ? 'minimum-safe-balance-error minimum-safe-balance-help' : 'minimum-safe-balance-help'}
        />
        <p id="minimum-safe-balance-help" className="text-xs text-[var(--text-secondary)]">
          The minimum balance you want to maintain. Forecasts will show warnings when your projected balance falls below this amount. Set to 0 to disable.
        </p>
        {errors.minimum_safe_balance && (
          <p id="minimum-safe-balance-error" className="text-sm text-[var(--accent-error)]">
            {errors.minimum_safe_balance}
          </p>
        )}
      </div>

      {/* Safety Buffer Days Input */}
      <div className="space-y-2">
        <label htmlFor="safety-buffer-days" className="block text-sm font-medium text-[var(--text-primary)]">
          Safety Buffer Days
        </label>
        <Input
          id="safety-buffer-days"
          type="number"
          min="1"
          max="30"
          placeholder="7"
          value={formData.safety_buffer_days}
          onChange={(e) => {
            const value = e.target.value
            setFormData(prev => ({ 
              ...prev, 
              safety_buffer_days: value === '' ? 7 : parseInt(value) || 7
            }))
          }}
          disabled={isLoading}
          className={errors.safety_buffer_days ? 'border-[var(--accent-error)]/50' : ''}
          aria-invalid={!!errors.safety_buffer_days}
          aria-describedby={errors.safety_buffer_days ? 'safety-buffer-days-error safety-buffer-days-help' : 'safety-buffer-days-help'}
        />
        <p id="safety-buffer-days-help" className="text-xs text-[var(--text-secondary)]">
          Number of days of spending to maintain as a safety buffer (1-30 days). Forecasts will show warnings when your balance is below this buffer. Default is 7 days.
        </p>
        {errors.safety_buffer_days && (
          <p id="safety-buffer-days-error" className="text-sm text-[var(--accent-error)]">
            {errors.safety_buffer_days}
          </p>
        )}
      </div>

      {/* Current Settings Summary */}
      <div className="p-4 bg-[var(--bg-glass)] rounded-lg border border-[var(--border-glass)]">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Current Settings
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Safe Balance Threshold:</span>
            <span className="text-[var(--text-primary)] font-medium">
              {currentWorkspace?.currency || 'UAH'} {formData.minimum_safe_balance.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Safety Buffer:</span>
            <span className="text-[var(--text-primary)] font-medium">
              {formData.safety_buffer_days} {formData.safety_buffer_days === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>
      </div>

      {/* General Error Message */}
      {errors.general && (
        <div className="p-3 bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 rounded-lg">
          <p className="text-sm text-[var(--accent-error)]">{errors.general}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <LoadingButton
          type="submit"
          loading={isLoading}
          loadingText="Saving..."
          className="flex-1"
        >
          Save Settings
        </LoadingButton>

        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
