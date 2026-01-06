'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  getRecurringTransactions, 
  deleteRecurringTransaction,
  updateRecurringTransaction 
} from '@/actions/recurring-transactions'
import { formatCurrency } from '@/lib/utils/format'
import type { RecurringTransaction, RecurrenceFrequency } from '@/types'
import { Trash2, Edit, Pause, Play, Calendar } from 'lucide-react'

interface RecurringTransactionListProps {
  workspaceId: string
}

export function RecurringTransactionList({ workspaceId }: RecurringTransactionListProps) {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecurringTransactions()
  }, [workspaceId])

  const loadRecurringTransactions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await getRecurringTransactions(workspaceId)
      
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to load recurring transactions')
        return
      }
      
      setRecurringTransactions(result.data || [])
    } catch (err) {
      console.error('Error loading recurring transactions:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const formData = new FormData()
      formData.set('is_active', (!currentStatus).toString())
      
      const result = await updateRecurringTransaction(id, formData)
      
      if (result.error) {
        console.error('Failed to toggle recurring transaction:', result.error)
        return
      }
      
      // Update local state
      setRecurringTransactions(prev => 
        prev.map(rt => 
          rt.id === id ? { ...rt, is_active: !currentStatus } : rt
        )
      )
    } catch (err) {
      console.error('Error toggling recurring transaction:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring transaction? This will also remove all pending expected transactions.')) {
      return
    }

    try {
      const result = await deleteRecurringTransaction(id)
      
      if (result.error) {
        console.error('Failed to delete recurring transaction:', result.error)
        return
      }
      
      // Remove from local state
      setRecurringTransactions(prev => prev.filter(rt => rt.id !== id))
    } catch (err) {
      console.error('Error deleting recurring transaction:', err)
    }
  }

  const formatFrequency = (frequency: RecurrenceFrequency, interval: number) => {
    const unit = frequency.slice(0, -2) // Remove 'ly' suffix
    return interval === 1 ? frequency : `Every ${interval} ${unit}s`
  }

  const formatNextDue = (date: string) => {
    const nextDue = new Date(date)
    const today = new Date()
    const diffTime = nextDue.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays <= 7) return `In ${diffDays} days`
    
    return nextDue.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-glass rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-glass rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadRecurringTransactions} variant="secondary">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (recurringTransactions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">
            No Recurring Transactions
          </h3>
          <p className="text-secondary mb-4">
            Set up recurring transactions to automatically track regular income and expenses.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-primary mb-2">
          Recurring Transactions
        </h3>
        <p className="text-secondary text-sm">
          Manage your recurring income and expenses
        </p>
      </div>

      <div className="space-y-3">
        {recurringTransactions.map((recurringTransaction) => {
          const templateData = recurringTransaction.template_data as any
          const isOverdue = new Date(recurringTransaction.next_due_date) < new Date()
          
          return (
            <div
              key={recurringTransaction.id}
              className={`p-4 border rounded-lg transition-colors ${
                recurringTransaction.is_active
                  ? 'border-primary/20 bg-glass'
                  : 'border-primary/10 bg-primary/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-primary">
                      {templateData.description || 'Recurring Transaction'}
                    </h4>
                    {!recurringTransaction.is_active && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        Paused
                      </span>
                    )}
                    {isOverdue && recurringTransaction.is_active && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                        Overdue
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-secondary">
                    <span className={`font-medium ${
                      templateData.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(templateData.amount, templateData.currency || 'UAH')}
                    </span>
                    <span>
                      {formatFrequency(recurringTransaction.frequency as RecurrenceFrequency, recurringTransaction.interval_count)}
                    </span>
                    <span>
                      Next: {formatNextDue(recurringTransaction.next_due_date)}
                    </span>
                  </div>
                  
                  {templateData.notes && (
                    <p className="text-xs text-muted mt-2">
                      {templateData.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggleActive(recurringTransaction.id, recurringTransaction.is_active)}
                    className="p-2"
                    title={recurringTransaction.is_active ? 'Pause' : 'Resume'}
                  >
                    {recurringTransaction.is_active ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(recurringTransaction.id)}
                    className="p-2 text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}