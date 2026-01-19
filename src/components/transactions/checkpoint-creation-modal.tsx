'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { createCheckpoint } from '@/actions/checkpoints'
import { CheckpointModel } from '@/lib/models/checkpoint'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/types'

interface CheckpointCreationModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onCheckpointCreated?: () => void
}

/**
 * Simplified CheckpointCreationModal component
 * Implements Requirements: 2.1, 2.2, 2.6
 * 
 * Features:
 * - Simple form with date, account, and actual balance
 * - Real-time calculation of expected balance and gap
 * - Simplified design without complex workflow elements
 */
export function CheckpointCreationModal({
  isOpen,
  onClose,
  workspaceId,
  onCheckpointCreated
}: CheckpointCreationModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [actualBalance, setActualBalance] = useState<string>('')
  
  // Calculated values
  const [expectedBalance, setExpectedBalance] = useState<number | null>(null)
  const [gap, setGap] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Accounts data
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  // Load accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        const supabase = createClient()
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('name')

        if (accountsError) {
          console.error('Error loading accounts:', accountsError)
          setError('Failed to load accounts')
        } else {
          setAccounts(accountsData || [])
          // Auto-select first account if available
          if (accountsData && accountsData.length > 0) {
            setSelectedAccountId(accountsData[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading accounts:', err)
        setError('Failed to load accounts')
      } finally {
        setLoadingAccounts(false)
      }
    }

    if (isOpen && workspaceId) {
      loadAccounts()
    }
  }, [isOpen, workspaceId])

  // Calculate expected balance and gap when inputs change
  useEffect(() => {
    async function calculateExpectedBalance() {
      if (!selectedAccountId || !date) {
        setExpectedBalance(null)
        setGap(null)
        return
      }

      setIsCalculating(true)
      try {
        const supabase = createClient()
        const checkpointDate = new Date(date)
        
        const calculatedExpectedBalance = await CheckpointModel.calculateExpectedBalance(
          selectedAccountId,
          checkpointDate,
          workspaceId,
          supabase
        )
        
        setExpectedBalance(calculatedExpectedBalance)
        
        // Calculate gap if actual balance is provided
        const actualBalanceNum = parseFloat(actualBalance)
        if (!isNaN(actualBalanceNum)) {
          const calculatedGap = CheckpointModel.calculateGap(actualBalanceNum, calculatedExpectedBalance)
          setGap(calculatedGap)
        } else {
          setGap(null)
        }
      } catch (err) {
        console.error('Error calculating expected balance:', err)
        setExpectedBalance(null)
        setGap(null)
      } finally {
        setIsCalculating(false)
      }
    }

    calculateExpectedBalance()
  }, [selectedAccountId, date, actualBalance, workspaceId])

  if (!isOpen && !isClosing) return null

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setError(null)
      setSelectedAccountId('')
      setDate(new Date().toISOString().split('T')[0])
      setActualBalance('')
      setExpectedBalance(null)
      setGap(null)
      onClose()
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedAccountId || !actualBalance) {
      setError('Please fill in all required fields')
      return
    }

    const actualBalanceNum = parseFloat(actualBalance)
    if (isNaN(actualBalanceNum)) {
      setError('Please enter a valid balance amount')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set('account_id', selectedAccountId)
      formData.set('date', date)
      formData.set('actual_balance', actualBalanceNum.toString())

      const result = await createCheckpoint(formData)

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to create checkpoint')
      } else {
        // Success - close modal and notify parent
        if (onCheckpointCreated) {
          onCheckpointCreated()
        }
        handleClose()
      }
    } catch (err) {
      console.error('Error creating checkpoint:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const selectedAccount = accounts.find(account => account.id === selectedAccountId)
  const gapColor = gap === null ? 'text-muted' : gap > 0 ? 'text-green-500' : gap < 0 ? 'text-red-500' : 'text-blue-500'
  const gapLabel = gap === null ? 'No gap calculated' : gap > 0 ? 'Surplus' : gap < 0 ? 'Deficit' : 'Perfect match'

  return (
    <div 
      className={cn(
        'fixed top-0 left-0 right-0 bottom-0 z-50',
        'flex items-center justify-center',
        'p-4',
        'bg-black/50 backdrop-blur-sm',
        'transition-opacity duration-200',
        isClosing ? 'opacity-0' : 'opacity-100'
      )}
      style={{ minHeight: '100dvh' }}
      onClick={handleBackdropClick}
    >
      <div 
        className={cn(
          'w-full max-w-md',
          'bg-primary border border-glass rounded-2xl shadow-2xl',
          'transition-transform duration-200',
          isClosing ? 'scale-95' : 'scale-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass">
          <h2 className="text-xl font-semibold text-primary">
            Create Checkpoint
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 hover:bg-glass rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Date Field */}
          <div className="space-y-2">
            <label htmlFor="checkpoint-date" className="block text-sm font-medium text-primary">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <Input
              id="checkpoint-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Can't create checkpoints for future dates
              required
              className="w-full"
            />
          </div>

          {/* Account Selector */}
          <div className="space-y-2">
            <label htmlFor="checkpoint-account" className="block text-sm font-medium text-primary">
              Account
            </label>
            {loadingAccounts ? (
              <div className="p-3 bg-glass rounded-lg border border-glass">
                <p className="text-secondary text-sm">Loading accounts...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-sm">No accounts found. Please create an account first.</p>
              </div>
            ) : (
              <select
                id="checkpoint-account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                className="w-full p-3 bg-glass border border-glass rounded-lg text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              >
                <option value="">Select an account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Actual Balance Field */}
          <div className="space-y-2">
            <label htmlFor="actual-balance" className="block text-sm font-medium text-primary">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Actual Balance
            </label>
            <Input
              id="actual-balance"
              type="number"
              step="0.01"
              value={actualBalance}
              onChange={(e) => setActualBalance(e.target.value)}
              placeholder="Enter actual balance from your bank"
              required
              className="w-full"
            />
            {selectedAccount && (
              <p className="text-xs text-secondary">
                Currency: {selectedAccount.currency}
              </p>
            )}
          </div>

          {/* Calculated Values Display */}
          <div className="space-y-3 p-4 bg-glass/50 rounded-lg border border-glass">
            <h3 className="text-sm font-medium text-primary flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Calculated Values
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-secondary">Expected Balance:</p>
                <p className="font-medium text-primary">
                  {isCalculating ? (
                    'Calculating...'
                  ) : expectedBalance !== null ? (
                    formatCurrency(expectedBalance, selectedAccount?.currency || 'UAH')
                  ) : (
                    'Not calculated'
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-secondary">Gap:</p>
                <p className={cn('font-medium', gapColor)}>
                  {isCalculating ? (
                    'Calculating...'
                  ) : gap !== null ? (
                    `${formatCurrency(Math.abs(gap), selectedAccount?.currency || 'UAH')} (${gapLabel})`
                  ) : (
                    'Not calculated'
                  )}
                </p>
              </div>
            </div>

            {gap !== null && (
              <div className="text-xs text-secondary">
                {gap > 0 && 'You have more money than expected based on your transactions.'}
                {gap < 0 && 'You have less money than expected based on your transactions.'}
                {gap === 0 && 'Your actual balance matches your expected balance perfectly!'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || loadingAccounts || accounts.length === 0 || !selectedAccountId || !actualBalance}
              className="flex-1"
            >
              {isLoading ? 'Creating...' : 'Create Checkpoint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}