'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createRecurringTransaction } from '@/actions/recurring-transactions'
import { useCategories } from '@/hooks/use-categories'
import { useTransactionTypes } from '@/hooks/use-transaction-types'
import type { RecurrenceFrequency, TransactionType } from '@/types'

interface RecurringTransactionFormProps {
  workspaceId: string
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: {
    amount?: number
    type?: TransactionType
    categoryId?: string
    description?: string
  }
}

export function RecurringTransactionForm({
  workspaceId,
  onSuccess,
  onCancel,
  initialData
}: RecurringTransactionFormProps) {
  const router = useRouter()
  const { data: categories } = useCategories()
  const { transactionTypes } = useTransactionTypes({ workspaceId })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    amount: initialData?.amount?.toString() || '',
    type: initialData?.type || 'expense' as TransactionType,
    categoryId: initialData?.categoryId || '',
    description: initialData?.description || '',
    notes: '',
    frequency: 'monthly' as RecurrenceFrequency,
    intervalCount: '1',
    startDate: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
    endDate: '', // Optional
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formDataObj = new FormData()
      formDataObj.set('amount', formData.amount)
      formDataObj.set('type', formData.type)
      formDataObj.set('category_id', formData.categoryId)
      formDataObj.set('description', formData.description)
      formDataObj.set('notes', formData.notes)
      formDataObj.set('frequency', formData.frequency)
      formDataObj.set('interval_count', formData.intervalCount)
      formDataObj.set('start_date', formData.startDate)
      if (formData.endDate) {
        formDataObj.set('end_date', formData.endDate)
      }

      const result = await createRecurringTransaction(formDataObj)

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to create recurring transaction')
        return
      }

      // Success
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/transactions')
      }
    } catch (err) {
      console.error('Error creating recurring transaction:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ]

  const typeOptions = [
    { value: 'income', label: 'Income', color: 'text-green-600' },
    { value: 'expense', label: 'Expense', color: 'text-red-600' },
  ]

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary mb-2">
          Create Recurring Transaction
        </h2>
        <p className="text-secondary text-sm">
          Set up a transaction that repeats automatically based on your schedule.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-primary mb-1">
            Amount (UAH) *
          </label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            required
            className="w-full"
          />
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-primary mb-1">
            Type *
          </label>
          <div className="flex gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: option.value as TransactionType }))}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  formData.type === option.value
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-primary/20 hover:border-accent-primary/50'
                }`}
              >
                <span className={`font-medium ${option.color}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-primary mb-1">
            Description *
          </label>
          <Input
            id="description"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Monthly rent, Weekly groceries"
            required
            className="w-full"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-primary mb-1">
            Category
          </label>
          <select
            id="category"
            value={formData.categoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
            className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-glass focus:border-accent-primary focus:outline-none"
          >
            <option value="">Select a category</option>
            {categories
              ?.filter(cat => cat.type === formData.type)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
          </select>
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-primary mb-1">
            Frequency *
          </label>
          <select
            id="frequency"
            value={formData.frequency}
            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as RecurrenceFrequency }))}
            className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-glass focus:border-accent-primary focus:outline-none"
            required
          >
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Interval Count */}
        <div>
          <label htmlFor="intervalCount" className="block text-sm font-medium text-primary mb-1">
            Every
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="intervalCount"
              type="number"
              min="1"
              max="12"
              value={formData.intervalCount}
              onChange={(e) => setFormData(prev => ({ ...prev, intervalCount: e.target.value }))}
              className="w-20"
            />
            <span className="text-secondary text-sm">
              {formData.frequency === 'daily' && 'day(s)'}
              {formData.frequency === 'weekly' && 'week(s)'}
              {formData.frequency === 'monthly' && 'month(s)'}
              {formData.frequency === 'yearly' && 'year(s)'}
            </span>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-primary mb-1">
            Start Date *
          </label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            required
            className="w-full"
          />
        </div>

        {/* End Date (Optional) */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-primary mb-1">
            End Date (Optional)
          </label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            min={formData.startDate}
            className="w-full"
          />
          <p className="text-xs text-secondary mt-1">
            Leave empty for indefinite recurring
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-primary mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes about this recurring transaction..."
            rows={3}
            className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-glass focus:border-accent-primary focus:outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Creating...' : 'Create Recurring Transaction'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}