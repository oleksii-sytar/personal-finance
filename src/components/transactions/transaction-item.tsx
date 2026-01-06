/**
 * Transaction item component with multi-currency display support
 * Shows original amount and UAH conversion when applicable
 * Implements Requirements 3.2, 3.3, 3.4: Transaction display with proper formatting and color coding
 * Implements Requirements 3.6, 3.7: Tap-to-edit and swipe-to-delete gestures
 */

'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { EditIcon, TrashIcon } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { TransactionWithCategory } from '@/types/transactions'

interface TransactionItemProps {
  transaction: TransactionWithCategory
  onEdit?: (transaction: TransactionWithCategory) => void
  onDelete?: (transactionId: string) => void
  className?: string
  showActions?: boolean
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
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
    
    if (onEdit) {
      onEdit(transaction)
    }
  }
  
  // Handle delete with confirmation
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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
  
  return (
    <div 
      ref={itemRef}
      className={cn(
        'relative overflow-hidden bg-glass rounded-xl transition-all duration-200 cursor-pointer select-none',
        // Expected transactions have dashed border and different styling
        isExpected 
          ? 'border-2 border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50/50' 
          : 'border border-glass hover:border-accent/30',
        'active:scale-[0.98] touch-manipulation', // Better mobile interaction
        className
      )}
      onClick={handleItemClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main content */}
      <div className={cn(
        'flex items-start sm:items-center justify-between p-3 sm:p-4 transition-transform duration-200',
        isSwipeRevealed && 'transform -translate-x-16 sm:-translate-x-20'
      )}>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2 sm:mb-1">
            <h3 className="font-medium text-primary truncate text-sm sm:text-base leading-tight">
              {transaction.description}
            </h3>
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
              <span className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium',
                isIncome 
                  ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)] border border-[var(--accent-success)]/30' 
                  : 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
              )}>
                {isIncome ? 'Income' : 'Expense'}
              </span>
              {isExpected && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  Expected
                </span>
              )}
              {transaction.category && (
                <span className="text-muted text-xs sm:text-sm">
                  {transaction.category.icon} {transaction.category.name}
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
        
        {showActions && (onEdit || onDelete) && !isSwipeRevealed && (
          <div className="hidden sm:flex items-center space-x-2 ml-4">
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
      <div className="sm:hidden absolute bottom-1 right-2 text-xs text-muted opacity-50">
        Tap to edit
      </div>
    </div>
  )
}