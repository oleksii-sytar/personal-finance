/**
 * Mark as Paid Button Component
 * Action button to mark planned transactions as completed
 * Implements Requirements 3.3: "Mark as Paid" action for planned transactions
 */

'use client'

import { useState } from 'react'
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MarkAsPaidButtonProps {
  transactionId: string
  onMarkAsPaid?: (transactionId: string) => Promise<void>
  className?: string
  variant?: 'default' | 'compact'
  disabled?: boolean
}

export function MarkAsPaidButton({
  transactionId,
  onMarkAsPaid,
  className,
  variant = 'default',
  disabled = false
}: MarkAsPaidButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent click handlers
    
    if (!onMarkAsPaid || isLoading || disabled) return
    
    setIsLoading(true)
    try {
      await onMarkAsPaid(transactionId)
    } catch (error) {
      console.error('Failed to mark transaction as paid:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
          'bg-[var(--accent-success)]/20 text-[var(--accent-success)] border border-[var(--accent-success)]/30',
          'hover:bg-[var(--accent-success)]/30 active:scale-95',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent-success)] focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        aria-label="Mark transaction as paid"
      >
        {isLoading ? (
          <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <CheckCircle2Icon className="w-3.5 h-3.5" />
        )}
        <span>Mark as Paid</span>
      </button>
    )
  }
  
  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant="primary"
      size="sm"
      className={cn(
        'bg-[var(--accent-success)] hover:bg-[var(--accent-success)]/90',
        'text-white shadow-sm',
        className
      )}
      aria-label="Mark transaction as paid"
    >
      {isLoading ? (
        <>
          <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
          <span>Marking...</span>
        </>
      ) : (
        <>
          <CheckCircle2Icon className="w-4 h-4 mr-2" />
          <span>Mark as Paid</span>
        </>
      )}
    </Button>
  )
}
