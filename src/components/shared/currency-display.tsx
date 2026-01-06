/**
 * Currency display component with multi-currency support
 * Shows original amount and UAH conversion when applicable
 */

import { formatCurrency, formatDualCurrency, getCurrencySymbol } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  currency: string
  originalAmount?: number
  originalCurrency?: string
  className?: string
  showBoth?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'muted' | 'accent'
}

export function CurrencyDisplay({
  amount,
  currency,
  originalAmount,
  originalCurrency,
  className,
  showBoth = true,
  size = 'md',
  variant = 'default'
}: CurrencyDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  }
  
  const variantClasses = {
    default: 'text-primary',
    muted: 'text-secondary',
    accent: 'text-accent-primary'
  }
  
  // If we have original currency info and it's different, show dual display
  if (originalAmount && originalCurrency && originalCurrency !== currency && showBoth) {
    return (
      <div className={cn('flex flex-col', className)}>
        <span className={cn(sizeClasses[size], variantClasses[variant])}>
          {formatCurrency(originalAmount, originalCurrency)}
        </span>
        <span className={cn('text-xs text-muted', size === 'lg' && 'text-sm')}>
          {formatCurrency(amount, currency)}
        </span>
      </div>
    )
  }
  
  // Standard single currency display
  return (
    <span className={cn(sizeClasses[size], variantClasses[variant], className)}>
      {formatCurrency(amount, currency)}
    </span>
  )
}

interface CurrencySymbolProps {
  currency: string
  className?: string
}

export function CurrencySymbol({ currency, className }: CurrencySymbolProps) {
  return (
    <span className={cn('font-medium', className)}>
      {getCurrencySymbol(currency)}
    </span>
  )
}

interface CurrencyInputDisplayProps {
  value: string
  currency: string
  className?: string
  placeholder?: string
}

export function CurrencyInputDisplay({
  value,
  currency,
  className,
  placeholder = '0.00'
}: CurrencyInputDisplayProps) {
  const symbol = getCurrencySymbol(currency)
  
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <CurrencySymbol currency={currency} className="text-muted" />
      <span className="font-mono">
        {value || placeholder}
      </span>
    </div>
  )
}