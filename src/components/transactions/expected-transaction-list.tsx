'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { 
  getExpectedTransactions, 
  confirmExpectedTransaction,
  skipExpectedTransaction 
} from '@/actions/recurring-transactions'
import { formatCurrency } from '@/lib/utils/format'
import type { ExpectedTransaction } from '@/types'
import { Check, X, Clock, Calendar, DollarSign } from 'lucide-react'

interface ExpectedTransactionListProps {
  workspaceId: string
  showAll?: boolean // Show all statuses or just pending
}

export function ExpectedTransactionList({ 
  workspaceId, 
  showAll = false 
}: ExpectedTransactionListProps) {
  const [expectedTransactions, setExpectedTransactions] = useState<ExpectedTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [adjustmentAmounts, setAdjustmentAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    loadExpectedTransactions()
  }, [workspaceId, showAll])

  const loadExpectedTransactions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await getExpectedTransactions(
        workspaceId, 
        showAll ? undefined : 'pending'
      )
      
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to load expected transactions')
        return
      }
      
      setExpectedTransactions(result.data || [])
    } catch (err) {
      console.error('Error loading expected transactions:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async (expectedTransaction: ExpectedTransaction) => {
    try {
      setProcessingIds(prev => new Set(prev).add(expectedTransaction.id))
      
      const adjustmentAmount = adjustmentAmounts[expectedTransaction.id]
      const actualAmount = adjustmentAmount ? parseFloat(adjustmentAmount) : undefined
      
      const result = await confirmExpectedTransaction(expectedTransaction.id, actualAmount)
      
      if (result.error) {
        console.error('Failed to confirm expected transaction:', result.error)
        return
      }
      
      // Remove from local state or update status
      if (showAll) {
        setExpectedTransactions(prev => 
          prev.map(et => 
            et.id === expectedTransaction.id 
              ? { ...et, status: 'confirmed' as const }
              : et
          )
        )
      } else {
        setExpectedTransactions(prev => 
          prev.filter(et => et.id !== expectedTransaction.id)
        )
      }
      
      // Clear adjustment amount
      setAdjustmentAmounts(prev => {
        const newAmounts = { ...prev }
        delete newAmounts[expectedTransaction.id]
        return newAmounts
      })
    } catch (err) {
      console.error('Error confirming expected transaction:', err)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(expectedTransaction.id)
        return newSet
      })
    }
  }

  const handleSkip = async (expectedTransaction: ExpectedTransaction) => {
    if (!confirm('Are you sure you want to skip this expected transaction?')) {
      return
    }

    try {
      setProcessingIds(prev => new Set(prev).add(expectedTransaction.id))
      
      const result = await skipExpectedTransaction(expectedTransaction.id)
      
      if (result.error) {
        console.error('Failed to skip expected transaction:', result.error)
        return
      }
      
      // Remove from local state or update status
      if (showAll) {
        setExpectedTransactions(prev => 
          prev.map(et => 
            et.id === expectedTransaction.id 
              ? { ...et, status: 'skipped' as const }
              : et
          )
        )
      } else {
        setExpectedTransactions(prev => 
          prev.filter(et => et.id !== expectedTransaction.id)
        )
      }
    } catch (err) {
      console.error('Error skipping expected transaction:', err)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(expectedTransaction.id)
        return newSet
      })
    }
  }

  const handleAdjustmentChange = (id: string, value: string) => {
    setAdjustmentAmounts(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
    if (diffDays <= 7) return `In ${diffDays} days`
    
    return date.toLocaleDateString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Check className="w-4 h-4 text-green-600" />
      case 'skipped':
        return <X className="w-4 h-4 text-red-600" />
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-amber-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'border-green-200 bg-green-50'
      case 'skipped':
        return 'border-red-200 bg-red-50'
      case 'pending':
      default:
        return 'border-amber-200 bg-amber-50'
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-glass rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-glass rounded"></div>
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
          <Button onClick={loadExpectedTransactions} variant="secondary">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (expectedTransactions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">
            No Expected Transactions
          </h3>
          <p className="text-secondary mb-4">
            {showAll 
              ? 'No expected transactions found.'
              : 'No pending expected transactions. All caught up!'
            }
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-primary mb-2">
          Expected Transactions
        </h3>
        <p className="text-secondary text-sm">
          {showAll 
            ? 'All expected transactions from recurring schedules'
            : 'Pending transactions that need your attention'
          }
        </p>
      </div>

      <div className="space-y-3">
        {expectedTransactions.map((expectedTransaction) => {
          const isProcessing = processingIds.has(expectedTransaction.id)
          const adjustmentAmount = adjustmentAmounts[expectedTransaction.id] || ''
          const isPending = expectedTransaction.status === 'pending'
          const isOverdue = new Date(expectedTransaction.expected_date) < new Date() && isPending
          
          return (
            <div
              key={expectedTransaction.id}
              className={`p-4 border-2 border-dashed rounded-lg transition-all ${
                isPending 
                  ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50' 
                  : getStatusColor(expectedTransaction.status)
              } ${isOverdue ? 'ring-2 ring-red-200' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(expectedTransaction.status)}
                    <span className="text-sm font-medium text-primary capitalize">
                      {expectedTransaction.status}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                        Overdue
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-primary">
                      {formatCurrency(expectedTransaction.expected_amount, expectedTransaction.currency)}
                    </span>
                    <span className="text-secondary">
                      Expected: {formatDate(expectedTransaction.expected_date)}
                    </span>
                  </div>
                </div>

                {isPending && (
                  <div className="flex items-center gap-2 ml-4">
                    {/* Amount adjustment input */}
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={expectedTransaction.expected_amount.toString()}
                        value={adjustmentAmount}
                        onChange={(e) => handleAdjustmentChange(expectedTransaction.id, e.target.value)}
                        className="w-24 h-8 text-sm"
                        disabled={isProcessing}
                      />
                    </div>
                    
                    {/* Confirm button */}
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(expectedTransaction)}
                      disabled={isProcessing}
                      className="h-8 px-3"
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    
                    {/* Skip button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSkip(expectedTransaction)}
                      disabled={isProcessing}
                      className="h-8 px-3 text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}