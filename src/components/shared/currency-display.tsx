import { useMemo } from 'react'
import { formatCurrency } from '@/lib/utils/format'
import { CURRENCY_SYMBOLS } from '@/lib/constants/currencies'
import { cn } from '@/lib/utils'
import type { SupportedCurrency } from '@/lib/constants/currencies'

interface CurrencyDisplayProps {
  amount: number
  currency: SupportedCurrency
  className?: string
  showSign?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Component for displaying currency amounts with proper formatting
 * Following code-quality.md component organization patterns
 */
export function CurrencyDisplay({ 
  amount, 
  currency, 
  className,
  showSign = false,
  size = 'md'
}: CurrencyDisplayProps) {
  // Derived state / memoization
  const formattedAmount = useMemo(
    () => formatCurrency(amount, currency),
    [amount, currency]
  )

  const isNegative = amount < 0
  const isPositive = amount > 0

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const colorClasses = showSign ? {
    positive: 'text-accent-success',
    negative: 'text-red-500',
    neutral: 'text-text-primary',
  } : {
    positive: 'text-text-primary',
    negative: 'text-text-primary',
    neutral: 'text-text-primary',
  }

  const colorClass = isPositive 
    ? colorClasses.positive 
    : isNegative 
      ? colorClasses.negative 
      : colorClasses.neutral

  return (
    <span 
      className={cn(
        'font-medium tabular-nums',
        sizeClasses[size],
        colorClass,
        className
      )}
      title={`${amount} ${currency}`}
    >
      {showSign && isPositive && '+'}
      {formattedAmount}
    </span>
  )
}