/**
 * Transaction item component with multi-currency display support
 * Shows original amount and UAH conversion when applicable
 * Implements Requirements 3.2, 3.3, 3.4: Transaction display with proper formatting and color coding
 * Implements Requirements 3.6, 3.7: Tap-to-edit and swipe-to-delete gestures
 */

'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { EditIcon, TrashIcon, Lock, AlertTriangle } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Button } from '@/components/ui/Button'
import { TransactionStatusBadge } from './transaction-status-badge'
import { MarkAsPaidButton } from './mark-as-paid-button'
import { cn } from '@/lib/utils'
import type { TransactionWithCategory } from '@/types/transactions'

// Enhanced transaction type that includes additional information
interface TransactionWithAdditionalInfo extends TransactionWithCategory {
  isLocked?: boolean
  lockReason?: string
  isAdjustmentTransaction?: boolean
  isRecentlyAdded?: boolean
}

interface TransactionItemProps {
  transaction: TransactionWithAdditionalInfo
  onEdit?: (transaction: TransactionWithAdditionalInfo) => void
  onDelete?: (transactionId: string) => void
  onMarkAsPaid?: (transactionId: string) => Promise<void>
  className?: string
  showActions?: boolean
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  onMarkAsPaid,
  className,
  showActions = true
}: TransactionItemProps) {
  const [isSwipeRevealed, setIsSwipeRevealed] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const touchStartX = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)
  const itemRef = useRef<HTMLDivElement>(null)
  
  const isIncome = transaction.type === 'income'
  
  // Handle touch events for swipe-to-delete gesture (Requirement 3.7)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onDelete) return
    
    touchCurrentX.current = e.touches[0].clientX
    const deltaX = touchStartX.current - touchCurrentX.current
    
    // Only allow left swipe (positive deltaX)
    if (deltaX > 50) {
      setIsSwipeRevealed(true)
    } else if (deltaX < -20) {
      setIsSwipeRevealed(false)
    }
  }
  
  const handleTouchEnd = () => {
    // Reset touch tracking
    touchStartX.current = 0
    touchCurrentX.current = 0
  }
  
  // Handle tap-to-edit (Requirement 3.6)
  const handleItemClick = () => {
    if (isSwipeRevealed) {
      setIsSwipeRevealed(false)
      return
    }
    
    // Don't allow editing if transaction is locked
    if (transaction.isLocked) {
      return
    }
    
    if (onEdit) {
      onEdit(transaction)
    }
  }
  
  // Handle delete with confirmation
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Don't allow deletion if transaction is locked
    if (transaction.isLocked) {
      return
    }
    
    setShowDeleteConfirm(true)
  }
  
  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(transaction.id)
    }
    setShowDeleteConfirm(false)
    setIsSwipeRevealed(false)
  }
  
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }
  
  // Visual distinction for expected transactions (Requirement 9.5)
  const isExpected = transaction.is_expected
  const isLocked = transaction.isLocked || false
  const isAdjustment = transaction.isAdjustmentTransaction || false
  const isRecentlyAdded = transaction.isRecentlyAdded || false
  const isPlanned = transaction.status === 'planned'
  const transactionStatus = transaction.status || 'completed'
  
  return (
    <div 
      ref={itemRef}
      className={cn(
        'relative overflow-hidden bg-glass rounded-xl transition-all duration-200 select-none',
        // Planned transactions have amber/gold styling
        isPlanned
          ? 'border-2 border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 hover:bg-[var(--accent-primary)]/10'
          : 'border border-glass hover:border-accent/30',
        // Expected transactions have dashed border and different styling
        isExpected 
          ? 'border-2 border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50/50' 
          : '',
        // Locked transactions have different styling
        isLocked
          ? 'opacity-75 cursor-not-allowed border-gray-400'
          : 'cursor-pointer active:scale-[0.98]',
        // Adjustment transactions have special styling
        isAdjustment && 'border-blue-300 bg-blue-50/20',
        // Recently added transactions have green glow
        isRecentlyAdded && 'border-accent-success bg-accent-success/10 shadow-lg shadow-accent-success/20',
        'touch-manipulation', // Better mobile interaction
        className
      )}
      onClick={handleItemClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      title={isLocked ? transaction.lockReason : undefined}
    >
      {/* Main content */}
      <div className={cn(
        'flex items-start sm:items-center justify-between p-3 sm:p-4 transition-transform duration-200',
        isSwipeRevealed && 'transform -translate-x-16 sm:-translate-x-20'
      )}>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2 sm:mb-1">
            <div className="flex items-center gap-2">
              {transaction.category ? (
                <h3 className="font-medium text-primary text-sm sm:text-base leading-tight">
                  {transaction.category.icon} {transaction.category.name}
                </h3>
              ) : (
                <h3 className="font-medium text-muted text-sm sm:text-base leading-tight">
                  Uncategorized
                </h3>
              )}
            </div>
            <CurrencyDisplay
              amount={transaction.original_amount || transaction.amount}
              currency={transaction.original_currency || transaction.currency}
              originalAmount={transaction.original_amount || undefined}
              originalCurrency={transaction.original_currency || undefined}
              className={cn(
                'font-semibold text-sm sm:text-base',
                // Requirement 3.3: Income transactions in Growth Emerald color
                isIncome ? 'text-[var(--accent-success)]' : 'text-primary'
              )}
              size="md"
              showBoth={!!transaction.original_currency}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-secondary">
            <div className="flex items-center flex-wrap gap-2">
              {transaction.description && (
                <span className="font-medium text-primary text-sm truncate">
                  {transaction.description}
                </span>
              )}
              <span className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium',
                isIncome 
                  ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)] border border-[var(--accent-success)]/30' 
                  : 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
              )}>
                {isIncome ? 'Income' : 'Expense'}
              </span>
              {/* Transaction status badge */}
              <TransactionStatusBadge status={transactionStatus} size="sm" />
              {isExpected && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  Expected
                </span>
              )}
              {isRecentlyAdded && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-accent-success/20 text-accent-success border border-accent-success/30 animate-pulse">
                  <span className="w-2 h-2 bg-accent-success rounded-full"></span>
                  Recently added
                </span>
              )}
              {isLocked && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
              {isAdjustment && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                  <AlertTriangle className="w-3 h-3" />
                  Adjustment
                </span>
              )}
            </div>
            
            <time dateTime={transaction.transaction_date} className="text-xs sm:text-sm">
              {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
            </time>
          </div>
          
          {transaction.notes && (
            <p className="text-xs sm:text-sm text-muted mt-2 line-clamp-2 sm:truncate">
              {transaction.notes}
            </p>
          )}
          
          {/* Show conversion info if foreign currency */}
          {transaction.original_currency && transaction.original_currency !== 'UAH' && (
            <div className="text-xs text-muted mt-1">
              Converted from {transaction.original_currency} to UAH
            </div>
          )}
        </div>
        
        {showActions && (onEdit || onDelete || (isPlanned && onMarkAsPaid)) && !isSwipeRevealed && !isLocked && (
          <div className="hidden sm:flex items-center space-x-2 ml-4">
            {isPlanned && onMarkAsPaid && (
              <MarkAsPaidButton
                transactionId={transaction.id}
                onMarkAsPaid={onMarkAsPaid}
                variant="compact"
              />
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(transaction)
                }}
                className="p-2 hover:bg-[var(--accent-primary)]/10"
                aria-label="Edit transaction"
              >
                <EditIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Swipe-revealed delete action */}
      {isSwipeRevealed && onDelete && (
        <div className="absolute right-0 top-0 h-full flex items-center px-3 sm:px-4 bg-red-500/10">
          {showDeleteConfirm ? (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConfirmDelete}
                className="p-2 bg-red-500 text-white hover:bg-red-600 text-xs"
                aria-label="Confirm delete"
              >
                <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelDelete}
                className="p-2 bg-gray-500 text-white hover:bg-gray-600 text-xs"
                aria-label="Cancel delete"
              >
                ×
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="p-2 text-red-500 hover:bg-red-500/10"
              aria-label="Delete transaction"
            >
              <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      )}
      
      {/* Mobile tap indicator */}
      <div className="sm:hidden absolute bottom-1 right-2 flex items-center gap-2">
        {isPlanned && onMarkAsPaid && (
          <MarkAsPaidButton
            transactionId={transaction.id}
            onMarkAsPaid={onMarkAsPaid}
            variant="compact"
            className="text-xs"
          />
        )}
        <span className="text-xs text-muted opacity-50">Tap to edit</span>
      </div>
    </div>
  )
}