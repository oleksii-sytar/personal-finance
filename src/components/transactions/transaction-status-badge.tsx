/**
 * Transaction Status Badge Component
 * Visual indicator for planned vs completed transactions
 * Implements Requirements 3.3: Visual distinction for planned transactions
 */

'use client'

import { CalendarClockIcon, CheckCircle2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionStatus } from '@/types/transactions'

interface TransactionStatusBadgeProps {
  status: TransactionStatus
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TransactionStatusBadge({
  status,
  className,
  showIcon = true,
  size = 'md'
}: TransactionStatusBadgeProps) {
  const isPlanned = status === 'planned'
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  }
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-all',
        sizeClasses[size],
        isPlanned
          ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
          : 'bg-[var(--accent-success)]/20 text-[var(--accent-success)] border border-[var(--accent-success)]/30',
        className
      )}
    >
      {showIcon && (
        isPlanned ? (
          <CalendarClockIcon className={iconSizes[size]} />
        ) : (
          <CheckCircle2Icon className={iconSizes[size]} />
        )
      )}
      <span>{isPlanned ? 'Planned' : 'Completed'}</span>
    </span>
  )
}
