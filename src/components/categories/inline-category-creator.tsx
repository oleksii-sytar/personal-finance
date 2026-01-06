'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateCategory } from '@/hooks/use-categories'
import { useWorkspace } from '@/contexts/workspace-context'
import type { TransactionType } from '@/types/transactions'

interface InlineCategoryCreatorProps {
  type: TransactionType
  onCategoryCreated?: (category: any) => void
  onCancel?: () => void
  className?: string
}

/**
 * InlineCategoryCreator component for creating categories from transaction forms
 * Implements Requirement 7.1: Category management accessible from transaction entry (inline)
 * Implements Requirement 7.2: Create new category by typing name and pressing Enter
 */
export function InlineCategoryCreator({
  type,
  onCategoryCreated,
  onCancel,
  className
}: InlineCategoryCreatorProps) {
  const { currentWorkspace } = useWorkspace()
  const createCategoryMutation = useCreateCategory()
  
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState(type === 'income' ? '#4E7A58' : '#8B7355') // Growth Emerald or Warm Bronze
  const [error, setError] = useState('')

  // Predefined icons for quick selection
  const iconOptions = type === 'income' 
    ? ['💼', '💰', '💻', '🏆', '📈', '💎', '🎯', '⭐']
    : ['🍽️', '🚗', '🛍️', '🎬', '📄', '🏥', '🏠', '📚', '✈️', '🎮', '💊', '⚡']

  // Predefined colors matching Executive Lounge theme
  const colorOptions = type === 'income'
    ? ['#4E7A58', '#5C8A66', '#6A9A74', '#78AA82'] // Growth Emerald variations
    : ['#8B7355', '#9B8365', '#AB9375', '#BBA385'] // Warm Bronze variations

  const handleSubmit = async () => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected')
      return
    }

    if (!name.trim()) {
      setError('Category name is required')
      return
    }

    setError('')

    try {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('type', type)
      formData.set('icon', icon)
      formData.set('color', color)

      const result = await createCategoryMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        formData
      })

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to create category')
        return
      }

      // Success callback
      if (onCategoryCreated && result.data) {
        onCategoryCreated(result.data)
      }

      // Reset form
      setName('')
      setIcon('')
      setColor(type === 'income' ? '#4E7A58' : '#8B7355')

    } catch (error) {
      console.error('Category creation error:', error)
      setError('An unexpected error occurred')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Requirement 7.2: Create new category by pressing Enter
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault()
      handleSubmit()
    }
    
    if (e.key === 'Escape') {
      e.preventDefault()
      if (onCancel) {
        onCancel()
      }
    }
  }

  return (
    <div className={`bg-glass-elevated backdrop-blur-[16px] border border-glass rounded-xl p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">
          Create New {type === 'income' ? 'Income' : 'Expense'} Category
        </h3>
        {onCancel && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="text-secondary hover:text-primary h-6 w-6 p-0"
          >
            ✕
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Category Name */}
        <Input
          type="text"
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full"
          maxLength={100}
          autoFocus
          required
        />

        {/* Icon Selection */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-2">
            Icon (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {iconOptions.map((iconOption) => (
              <button
                key={iconOption}
                type="button"
                onClick={() => setIcon(iconOption)}
                className={`w-8 h-8 rounded-lg border transition-all hover:scale-110 ${
                  icon === iconOption
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-glass hover:border-accent-primary/50'
                }`}
              >
                {iconOption}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIcon('')}
              className={`w-8 h-8 rounded-lg border text-xs transition-all hover:scale-110 ${
                icon === ''
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-glass hover:border-accent-primary/50 text-secondary'
              }`}
            >
              ∅
            </button>
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {colorOptions.map((colorOption) => (
              <button
                key={colorOption}
                type="button"
                onClick={() => setColor(colorOption)}
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                  color === colorOption
                    ? 'border-white shadow-lg'
                    : 'border-glass'
                }`}
                style={{ backgroundColor: colorOption }}
              />
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-accent-error text-xs p-2 bg-accent-error/10 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createCategoryMutation.isPending || !name.trim()}
            size="sm"
            className="flex-1"
          >
            {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={createCategoryMutation.isPending}
              size="sm"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Quick tip */}
      <div className="text-xs text-secondary">
        Tip: Press Enter to create, Escape to cancel
      </div>
    </div>
  )
}