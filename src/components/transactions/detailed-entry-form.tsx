'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createTransaction, updateTransaction } from '@/actions/transactions'
import { createRecurringTransaction } from '@/actions/recurring-transactions'
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/use-transactions'
import { useWorkspace } from '@/contexts/workspace-context'
import { useFilterContext } from '@/contexts/transaction-filter-context'
import { DEFAULT_CURRENCY } from '@/lib/constants/currencies'
import { CategorySelectorWithInlineCreate } from '@/components/categories'
import type { TransactionType, Transaction } from '@/types/transactions'
import { CurrencySelector } from '@/components/shared/currency-selector'
import type { ActionResult } from '@/types'

interface DetailedEntryFormProps {
  transaction?: Transaction // For editing existing transactions
  onSuccess?: (transaction: Transaction) => void
  onCancel?: () => void
  defaultFilters?: {
    type?: TransactionType
    categoryId?: string
  }
  showHeader?: boolean // Control whether to show the form header
}

interface DetailedEntryState {
  amount: string
  type: TransactionType
  categoryId?: string
  description: string
  notes: string
  date: string
  currency: string
  isSubmitting: boolean
  // Recurring transaction options
  isRecurring: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  intervalCount: string
  endDate: string
}

/**
 * DetailedEntryForm component for desktop-optimized transaction entry
 * Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 * - Full transaction fields
 * - Keyboard navigation and shortcuts
 * - Type-ahead search for categories
 * - Currency selector with UAH default
 * - Filter context application for pre-population (Requirement 4.8)
 */
export function DetailedEntryForm({ 
  transaction,
  onSuccess, 
  onCancel, 
  defaultFilters,
  showHeader = true
}: DetailedEntryFormProps) {
  const { currentWorkspace } = useWorkspace()
  const filterContext = useFilterContext()
  const formRef = useRef<HTMLFormElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  
  // React Query mutations for cache invalidation
  const createTransactionMutation = useCreateTransaction()
  const updateTransactionMutation = useUpdateTransaction()
  
  // Apply filter context for pre-population (Requirement 4.8)
  const getDefaultType = () => {
    return (transaction?.type as TransactionType) || 
           defaultFilters?.type || 
           filterContext.defaultType || 
           'expense'
  }
  
  const getDefaultCategoryId = () => {
    return transaction?.category_id || 
           defaultFilters?.categoryId || 
           filterContext.defaultCategoryId
  }
  
  const getDefaultDate = () => {
    if (transaction?.transaction_date) {
      return new Date(transaction.transaction_date).toISOString().split('T')[0]
    }
    if (filterContext.defaultDate) {
      return filterContext.defaultDate.toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  }
  
  const [state, setState] = useState<DetailedEntryState>({
    amount: transaction?.amount?.toString() || '',
    type: getDefaultType(),
    categoryId: getDefaultCategoryId(),
    description: transaction?.description || '',
    notes: transaction?.notes || '',
    date: getDefaultDate(),
    currency: transaction?.currency || DEFAULT_CURRENCY,
    isSubmitting: false,
    // Recurring transaction defaults
    isRecurring: false,
    frequency: 'monthly',
    intervalCount: '1',
    endDate: '',
  })
  
  const [error, setError] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Focus amount field on mount (Requirement 2.2: Tab navigation starts logically)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amountInputRef.current) {
        amountInputRef.current.focus()
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Track unsaved changes for confirmation dialog (Requirement 2.6)
  useEffect(() => {
    const hasChanges = !!(
      state.amount.trim() || 
      state.description.trim() || 
      state.notes.trim() || 
      state.categoryId ||
      state.isRecurring ||
      (transaction && (
        state.amount !== transaction.amount?.toString() ||
        state.type !== transaction.type ||
        state.categoryId !== transaction.category_id ||
        state.description !== transaction.description ||
        state.notes !== transaction.notes ||
        state.date !== new Date(transaction.transaction_date).toISOString().split('T')[0] ||
        state.currency !== transaction.currency
      ))
    )
    setHasUnsavedChanges(hasChanges)
  }, [state, transaction])

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      // Requirement 2.6: Confirmation if data was entered
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }
    
    if (onCancel) {
      onCancel()
    }
  }, [hasUnsavedChanges, onCancel])

  // Keyboard shortcuts (Requirement 2.5: Enter, Cmd+S, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S or Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (formRef.current) {
          formRef.current.requestSubmit()
        }
      }
      
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, handleCancel])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setState(prev => ({ ...prev, amount: value }))
      setError('')
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

    if (!state.description.trim()) {
      setError('Please enter a description')
      return
    }

    setState(prev => ({ ...prev, isSubmitting: true }))
    setError('')

    try {
      const formData = new FormData()
      formData.set('amount', amount.toString())
      formData.set('type', state.type)
      formData.set('description', state.description.trim())
      formData.set('notes', state.notes.trim())
      formData.set('transaction_date', new Date(state.date).toISOString())
      formData.set('currency', state.currency)
      formData.set('workspace_id', currentWorkspace.id)
      
      if (state.categoryId) {
        formData.set('category_id', state.categoryId)
      }

      let result: ActionResult<Transaction>
      
      if (transaction) {
        // Update existing transaction using React Query mutation
        result = await updateTransactionMutation.mutateAsync({ 
          id: transaction.id, 
          formData 
        })
      } else if (state.isRecurring) {
        // Create recurring transaction instead of regular transaction
        const recurringFormData = new FormData()
        recurringFormData.set('amount', amount.toString())
        recurringFormData.set('type', state.type)
        recurringFormData.set('description', state.description.trim())
        recurringFormData.set('notes', state.notes.trim())
        recurringFormData.set('currency', state.currency)
        recurringFormData.set('frequency', state.frequency)
        recurringFormData.set('interval_count', state.intervalCount)
        recurringFormData.set('start_date', state.date)
        
        if (state.categoryId) {
          recurringFormData.set('category_id', state.categoryId)
        }
        
        if (state.endDate) {
          recurringFormData.set('end_date', state.endDate)
        }

        const recurringResult = await createRecurringTransaction(recurringFormData)
        
        if (recurringResult.error) {
          setError(typeof recurringResult.error === 'string' ? recurringResult.error : 'Failed to create recurring transaction')
          return
        }

        // For recurring transactions, we'll create a mock transaction object for the success callback
        const mockTransaction: Transaction = {
          id: 'recurring-' + recurringResult.data!.id,
          workspace_id: currentWorkspace.id,
          user_id: recurringResult.data!.user_id,
          amount: amount,
          currency: state.currency,
          type: state.type,
          category_id: state.categoryId || null,
          description: state.description.trim(),
          notes: state.notes.trim() || null,
          transaction_date: state.date,
          is_expected: false,
          expected_transaction_id: null,
          recurring_transaction_id: recurringResult.data!.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: recurringResult.data!.user_id,
          updated_by: null,
          original_amount: null,
          original_currency: null,
          transaction_type_id: null,
          deleted_at: null,
        }
        
        result = { data: mockTransaction }
      } else {
        // Create new regular transaction using React Query mutation
        result = await createTransactionMutation.mutateAsync(formData)
      }

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to save transaction')
        return
      }

      // Success callback
      if (onSuccess && result.data) {
        onSuccess(result.data)
      }

      // Reset form if creating new transaction
      if (!transaction) {
        setState({
          amount: '',
          type: 'expense',
          categoryId: undefined,
          description: '',
          notes: '',
          date: new Date().toISOString().split('T')[0],
          currency: DEFAULT_CURRENCY,
          isSubmitting: false,
          isRecurring: false,
          frequency: 'monthly',
          intervalCount: '1',
          endDate: '',
        })
        
        // Refocus amount field for next entry
        if (amountInputRef.current) {
          amountInputRef.current.focus()
        }
      }

    } catch (error) {
      console.error('Transaction save error:', error)
      setError('An unexpected error occurred')
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  return (
    <div className="bg-glass backdrop-blur-[16px] border border-glass rounded-2xl p-6 space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">
            {transaction ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          {onCancel && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              className="text-secondary hover:text-primary"
            >
              ✕
            </Button>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* Amount and Currency Row */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">
            <Input
              ref={amountInputRef}
              label="Amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={state.amount}
              onChange={handleAmountChange}
              className="text-lg font-semibold"
              autoComplete="off"
              required
              tabIndex={1}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="currency-select" className="block text-sm font-medium text-primary mb-2">
              Currency
            </label>
            <CurrencySelector
              value={state.currency}
              onChange={(currency) => setState(prev => ({ ...prev, currency }))}
              className="w-full"
            />
          </div>
        </div>

        {/* Transaction Type */}
        <fieldset>
          <legend className="block text-sm font-medium text-primary mb-2">
            Type
          </legend>
          <div className="flex bg-secondary rounded-lg p-1">
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, type: 'expense' }))}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                state.type === 'expense'
                  ? 'bg-accent-primary text-inverse shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
              tabIndex={3}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, type: 'income' }))}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                state.type === 'income'
                  ? 'bg-accent-primary text-inverse shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
              tabIndex={4}
            >
              Income
            </button>
          </div>
        </fieldset>

        {/* Category with Inline Creation */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Category
          </label>
          <CategorySelectorWithInlineCreate
            type={state.type}
            value={state.categoryId}
            onChange={(categoryId) => setState(prev => ({ ...prev, categoryId }))}
            placeholder="Search or create category..."
          />
        </div>

        {/* Description */}
        <Input
          label="Description"
          type="text"
          placeholder="Enter transaction description"
          value={state.description}
          onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
          className="w-full"
          maxLength={255}
          required
          tabIndex={6}
        />

        {/* Date */}
        <Input
          label="Date"
          type="date"
          value={state.date}
          onChange={(e) => setState(prev => ({ ...prev, date: e.target.value }))}
          className="w-full"
          required
          tabIndex={7}
        />

        {/* Notes */}
        <div>
          <label htmlFor="notes-textarea" className="block text-sm font-medium text-primary mb-2">
            Notes (optional)
          </label>
          <textarea
            id="notes-textarea"
            placeholder="Additional notes..."
            value={state.notes}
            onChange={(e) => setState(prev => ({ ...prev, notes: e.target.value }))}
            className="form-input w-full min-h-[80px] resize-y"
            maxLength={1000}
            tabIndex={8}
          />
        </div>

        {/* Recurring Transaction Options (only for new transactions) */}
        {!transaction && (
          <div className="space-y-4 p-4 bg-glass/50 rounded-lg border border-glass">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-recurring"
                checked={state.isRecurring}
                onChange={(e) => setState(prev => ({ ...prev, isRecurring: e.target.checked }))}
                className="w-4 h-4 text-accent-primary bg-glass border-primary/20 rounded focus:ring-accent-primary focus:ring-2"
                tabIndex={9}
              />
              <label htmlFor="is-recurring" className="text-sm font-medium text-primary">
                Make this a recurring transaction
              </label>
            </div>

            {state.isRecurring && (
              <div className="space-y-4 pl-7">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="frequency" className="block text-sm font-medium text-primary mb-1">
                      Frequency
                    </label>
                    <select
                      id="frequency"
                      value={state.frequency}
                      onChange={(e) => setState(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="form-input w-full"
                      tabIndex={10}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="interval-count" className="block text-sm font-medium text-primary mb-1">
                      Every
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="interval-count"
                        type="number"
                        min="1"
                        max="12"
                        value={state.intervalCount}
                        onChange={(e) => setState(prev => ({ ...prev, intervalCount: e.target.value }))}
                        className="form-input w-20"
                        tabIndex={11}
                      />
                      <span className="text-sm text-secondary">
                        {state.frequency === 'daily' && 'day(s)'}
                        {state.frequency === 'weekly' && 'week(s)'}
                        {state.frequency === 'monthly' && 'month(s)'}
                        {state.frequency === 'yearly' && 'year(s)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-primary mb-1">
                    End Date (Optional)
                  </label>
                  <Input
                    id="end-date"
                    type="date"
                    value={state.endDate}
                    onChange={(e) => setState(prev => ({ ...prev, endDate: e.target.value }))}
                    min={state.date}
                    className="w-full"
                    tabIndex={12}
                  />
                  <p className="text-xs text-secondary mt-1">
                    Leave empty for indefinite recurring
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-accent-error text-sm p-3 bg-accent-error/10 rounded-lg border border-accent-error/20">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={state.isSubmitting || !state.amount || !state.description.trim()}
            className="flex-1"
            size="lg"
            tabIndex={9}
          >
            {state.isSubmitting 
              ? 'Saving...' 
              : transaction 
                ? 'Update Transaction' 
                : state.isRecurring
                  ? 'Create Recurring Transaction'
                  : 'Save Transaction'
            }
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={state.isSubmitting}
              size="lg"
              tabIndex={10}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Keyboard Shortcuts Help */}
      <div className="text-xs text-secondary space-y-1 pt-2 border-t border-glass">
        <div className="font-medium">Keyboard Shortcuts:</div>
        <div className="grid grid-cols-2 gap-2">
          <div>• Tab: Navigate fields</div>
          <div>• ⌘+S: Save transaction</div>
          <div>• Enter: Save (when focused)</div>
          <div>• Escape: Cancel</div>
        </div>
      </div>
    </div>
  )
}