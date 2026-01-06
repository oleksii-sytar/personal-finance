'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createTransaction } from '@/actions/transactions'
import { useWorkspace } from '@/contexts/workspace-context'
import { useFilterContext } from '@/contexts/transaction-filter-context'
import { CategorySelectorWithInlineCreate } from '@/components/categories'
import type { Category, TransactionType } from '@/types/transactions'
import type { ActionResult } from '@/types'

interface QuickEntryFormProps {
  onSuccess?: (transaction: any) => void
  onCancel?: () => void
  defaultFilters?: {
    type?: TransactionType
    categoryId?: string
  }
}

interface QuickEntryState {
  amount: string
  type: TransactionType
  categoryId?: string
  description: string
  isSubmitting: boolean
}

/**
 * QuickEntryForm component for mobile-optimized transaction entry
 * Implements Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8
 * - Under 5 seconds entry time
 * - Numeric keypad focus
 * - Default category assignment
 * - Haptic feedback on success
 * - Filter context application for pre-population (Requirement 4.8)
 */
export function QuickEntryForm({ 
  onSuccess, 
  onCancel, 
  defaultFilters 
}: QuickEntryFormProps) {
  const { currentWorkspace } = useWorkspace()
  const filterContext = useFilterContext()
  const amountInputRef = useRef<HTMLInputElement>(null)
  
  // Apply filter context for pre-population (Requirement 4.8)
  const getDefaultType = () => {
    return defaultFilters?.type || 
           filterContext.defaultType || 
           'expense' // Requirement 1.6: Default to "Expense"
  }
  
  const getDefaultCategoryId = () => {
    return defaultFilters?.categoryId || 
           filterContext.defaultCategoryId
  }
  
  const [state, setState] = useState<QuickEntryState>({
    amount: '',
    type: getDefaultType(),
    categoryId: getDefaultCategoryId(),
    description: '',
    isSubmitting: false,
  })
  
  const [error, setError] = useState<string>('')

  // Focus amount field on mount (Requirement 1.3)
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      if (amountInputRef.current) {
        amountInputRef.current.focus()
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setState(prev => ({ ...prev, amount: value }))
      setError('')
    }
  }

  const handleTypeToggle = () => {
    const newType: TransactionType = state.type === 'expense' ? 'income' : 'expense'
    setState(prev => ({ 
      ...prev, 
      type: newType,
      categoryId: undefined // Reset category when type changes
    }))
  }

  const triggerHapticFeedback = () => {
    // Requirement 1.8: Haptic feedback for successful saves
    if ('vibrate' in navigator) {
      navigator.vibrate(50) // Short vibration
    }
    
    // For iOS devices that support haptic feedback
    if ('hapticFeedback' in window) {
      // @ts-ignore - iOS specific API
      window.hapticFeedback?.impact?.('light')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentWorkspace?.id) {
      setError('No workspace selected')
      return
    }

    const amount = parseFloat(state.amount)
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setState(prev => ({ ...prev, isSubmitting: true }))
    setError('')

    try {
      const formData = new FormData()
      formData.set('amount', amount.toString())
      formData.set('type', state.type)
      formData.set('description', state.description || `${state.type === 'income' ? 'Income' : 'Expense'} - ${new Date().toLocaleDateString()}`)
      formData.set('transaction_date', new Date().toISOString())
      formData.set('currency', 'UAH')
      formData.set('workspace_id', currentWorkspace.id)
      
      // Category will be handled by server action (default assignment if not provided)
      if (state.categoryId) {
        formData.set('category_id', state.categoryId)
      }

      const result = await createTransaction(formData)

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to create transaction')
        return
      }

      // Requirement 1.8: Haptic feedback on successful save
      triggerHapticFeedback()

      // Success callback
      if (onSuccess && result.data) {
        onSuccess(result.data)
      }

      // Reset form
      setState({
        amount: '',
        type: 'expense',
        categoryId: undefined,
        description: '',
        isSubmitting: false,
      })

      // Refocus amount field for next entry
      if (amountInputRef.current) {
        amountInputRef.current.focus()
      }

    } catch (error) {
      console.error('Transaction creation error:', error)
      setError('An unexpected error occurred')
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  return (
    <div className="bg-glass backdrop-blur-[16px] border border-glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Quick Entry</h2>
        {onCancel && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="text-secondary hover:text-primary"
          >
            ✕
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount Input - Primary focus */}
        <div>
          <Input
            ref={amountInputRef}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={state.amount}
            onChange={handleAmountChange}
            className="text-2xl font-bold text-center h-16 text-primary"
            autoComplete="off"
            required
          />
          <div className="text-center text-sm text-secondary mt-1">
            Amount (UAH)
          </div>
        </div>

        {/* Type Toggle - One tap switch */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            type="button"
            onClick={handleTypeToggle}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              state.type === 'expense'
                ? 'bg-accent-primary text-inverse shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={handleTypeToggle}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              state.type === 'income'
                ? 'bg-accent-primary text-inverse shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Income
          </button>
        </div>

        {/* Category Selection with Inline Creation */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Category (optional)
          </label>
          <CategorySelectorWithInlineCreate
            type={state.type}
            value={state.categoryId}
            onChange={(categoryId) => setState(prev => ({ ...prev, categoryId }))}
            placeholder="Select or create category..."
          />
        </div>

        {/* Optional Description */}
        <Input
          type="text"
          placeholder="Description (optional)"
          value={state.description}
          onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
          className="text-primary"
          maxLength={255}
        />

        {/* Error Display */}
        {error && (
          <div className="text-accent-error text-sm p-2 bg-accent-error/10 rounded-lg">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={state.isSubmitting || !state.amount}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {state.isSubmitting ? 'Saving...' : 'Save Transaction'}
        </Button>
      </form>

      {/* Quick tip */}
      <div className="text-xs text-secondary text-center">
        Tip: Leave category empty to use default category
      </div>
    </div>
  )
}