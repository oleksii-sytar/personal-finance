'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useWorkspace } from '@/contexts/workspace-context'
import { workspaceCreateSchema } from '@/lib/validations/workspace'
import type { WorkspaceCreateInput } from '@/lib/validations/workspace'

interface WorkspaceCreationFormProps {
  onSuccess?: () => void
  onSkip?: () => void
  showSkipOption?: boolean
}

/**
 * WorkspaceCreationForm component for creating new workspaces
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function WorkspaceCreationForm({ 
  onSuccess, 
  onSkip, 
  showSkipOption = false 
}: WorkspaceCreationFormProps) {
  const [formData, setFormData] = useState<WorkspaceCreateInput>({
    name: '',
    currency: 'UAH'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  
  const { createWorkspace } = useWorkspace()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      // Validate form data
      const validated = workspaceCreateSchema.safeParse(formData)
      
      if (!validated.success) {
        const fieldErrors: Record<string, string> = {}
        validated.error.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message
          }
        })
        setErrors(fieldErrors)
        return
      }

      // Create workspace
      const result = await createWorkspace(validated.data.name)
      
      if (result.error) {
        if (typeof result.error === 'string') {
          setErrors({ general: result.error })
        } else {
          // Handle validation errors from server - convert array errors to strings
          const fieldErrors: Record<string, string> = {}
          Object.entries(result.error).forEach(([key, messages]) => {
            fieldErrors[key] = Array.isArray(messages) ? messages[0] : messages
          })
          setErrors(fieldErrors)
        }
        return
      }

      // Success - call onSuccess callback or redirect
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-text-primary">
            Create Your Workspace
          </h2>
          <p className="text-text-secondary">
            Set up a workspace to start managing your family finances
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-text-primary">
              Workspace Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Smith Family Finances"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isLoading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="currency" className="text-sm font-medium text-text-primary">
              Primary Currency
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-bg-glass border border-white/10 rounded-lg text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="UAH">Ukrainian Hryvnia (UAH)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
              <option value="PLN">Polish Zloty (PLN)</option>
            </select>
            {errors.currency && (
              <p className="text-sm text-red-500">{errors.currency}</p>
            )}
          </div>

          {errors.general && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500">{errors.general}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create Workspace'}
            </Button>

            {showSkipOption && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSkip}
                disabled={isLoading}
                className="w-full"
              >
                Skip for Now
              </Button>
            )}
          </div>
        </form>

        {showSkipOption && (
          <p className="text-xs text-text-secondary text-center">
            You can create a workspace later from your settings
          </p>
        )}
      </div>
    </Card>
  )
}