/**
 * Transaction Status Filter Component
 * Filter control for planned vs completed transactions
 * Implements Requirements 3.3: Filter for planned vs completed transactions
 */

'use client'

import { CalendarClockIcon, CheckCircle2Icon, ListIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionStatus } from '@/types/transactions'

type StatusFilterValue = 'all' | TransactionStatus

interface TransactionStatusFilterProps {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
  className?: string
  plannedCount?: number
  completedCount?: number
}

export function TransactionStatusFilter({
  value,
  onChange,
  className,
  plannedCount,
  completedCount
}: TransactionStatusFilterProps) {
  const options: Array<{
    value: StatusFilterValue
    label: string
    icon: React.ComponentType<{ className?: string }>
    count?: number
  }> = [
    { value: 'all', label: 'All', icon: ListIcon },
    { value: 'planned', label: 'Planned', icon: CalendarClockIcon, count: plannedCount },
    { value: 'completed', label: 'Completed', icon: CheckCircle2Icon, count: completedCount }
  ]
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-secondary mr-2">Status:</span>
      <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1 gap-1">
        {options.map((option) => {
          const Icon = option.icon
          const isActive = value === option.value
          
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                'hover:bg-[var(--bg-glass)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2',
                isActive
                  ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
              aria-pressed={isActive}
            >
              <Icon className="w-4 h-4" />
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span
                  className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--bg-glass)] text-[var(--text-muted)]'
                  )}
                >
                  {option.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
