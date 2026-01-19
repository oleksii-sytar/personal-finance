'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DetailedEntryForm } from './detailed-entry-form'
import { cn } from '@/lib/utils'
import type { TransactionWithCategory } from '@/types/transactions'

interface TransactionEditModalProps {
  transaction: TransactionWithCategory
  isOpen: boolean
  onClose: () => void
  onSuccess?: (transaction: TransactionWithCategory) => void
}

/**
 * TransactionEditModal component for editing existing transactions
 * Implements Requirements 5.1, 5.2, 5.3: Edit form with pre-populated values and save/cancel functionality
 * Uses DetailedEntryForm component which already handles Requirements 5.4, 5.5: Audit trail
 */
export function TransactionEditModal({
  transaction,
  isOpen,
  onClose,
  onSuccess
}: TransactionEditModalProps) {
  const [isClosing, setIsClosing] = useState(false)

  if (!isOpen && !isClosing) return null

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  const handleSuccess = (updatedTransaction: any) => {
    if (onSuccess) {
      onSuccess(updatedTransaction)
    }
    handleClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

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
          'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
          'bg-primary border border-glass rounded-2xl shadow-2xl',
          'transition-transform duration-200',
          isClosing ? 'scale-95' : 'scale-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass">
          <h2 className="text-xl font-semibold text-primary">
            Edit Transaction
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
        <div className="p-6">
          <DetailedEntryForm
            transaction={transaction}
            onSuccess={handleSuccess}
            onCancel={handleClose}
            showHeader={false}
          />
        </div>
      </div>
    </div>
  )
}