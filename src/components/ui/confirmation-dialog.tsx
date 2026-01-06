'use client'

import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { AlertTriangleIcon, XIcon } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'
import { cn } from '@/lib/utils'

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
  variant?: 'danger' | 'warning' | 'info'
  className?: string
}

/**
 * Reusable confirmation dialog component
 * Implements Requirements 6.1: Confirmation dialog with "Are you sure?" prompt
 */
export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger',
  className
}: ConfirmationDialogProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isOpen) return null

  const handleConfirm = async () => {
    await onConfirm()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-[var(--accent-error)]',
          titleColor: 'text-[var(--accent-error)]',
          confirmButton: 'bg-[var(--accent-error)] hover:bg-[var(--accent-error)]/90 text-white'
        }
      case 'warning':
        return {
          iconColor: 'text-[var(--accent-warning)]',
          titleColor: 'text-[var(--accent-warning)]',
          confirmButton: 'bg-[var(--accent-warning)] hover:bg-[var(--accent-warning)]/90 text-white'
        }
      case 'info':
        return {
          iconColor: 'text-[var(--accent-primary)]',
          titleColor: 'text-[var(--accent-primary)]',
          confirmButton: 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-[var(--text-inverse)]'
        }
    }
  }

  const styles = getVariantStyles()

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50"
      onClick={handleBackdropClick}
    >
      <Card className={cn(
        'w-full max-w-md bg-[var(--bg-glass)] border-[var(--border-glass)]',
        'animate-in zoom-in-95 duration-200',
        className
      )}>
        <div className="p-6">
          {/* Header with icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              variant === 'danger' && 'bg-[var(--accent-error)]/10',
              variant === 'warning' && 'bg-[var(--accent-warning)]/10',
              variant === 'info' && 'bg-[var(--accent-primary)]/10'
            )}>
              <AlertTriangleIcon className={cn('w-5 h-5', styles.iconColor)} />
            </div>
            <h3 className={cn('text-lg font-semibold', styles.titleColor)}>
              {title}
            </h3>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="ml-auto p-1 hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <XIcon className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Message */}
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              onClick={onCancel}
              disabled={isLoading}
              variant="secondary"
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className={cn('flex-1', styles.confirmButton)}
            >
              {isLoading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  )
}