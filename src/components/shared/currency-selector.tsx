/**
 * Currency selector component for forms
 * Provides dropdown selection of supported currencies
 */

'use client'

import { useState } from 'react'
import { ChevronDownIcon, CheckIcon } from 'lucide-react'
import { getSupportedCurrencies, getCurrencySymbol } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

interface CurrencySelectorProps {
  value: string
  onChange: (currency: string) => void
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CurrencySelector({
  value,
  onChange,
  className,
  disabled = false,
  size = 'md'
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currencies = getSupportedCurrencies()
  const selectedCurrency = currencies.find(c => c.code === value)
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-4 py-4 text-lg min-h-[52px]'
  }
  
  const handleSelect = (currencyCode: string) => {
    onChange(currencyCode)
    setIsOpen(false)
  }
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full bg-glass-interactive border border-glass rounded-xl',
          'text-primary font-medium transition-all duration-200',
          'hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          className
        )}
      >
        <div className="flex items-center space-x-2">
          <span className="font-mono text-accent-primary">
            {getCurrencySymbol(value)}
          </span>
          <span>{value}</span>
        </div>
        <ChevronDownIcon 
          className={cn(
            'w-4 h-4 text-muted transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-glass-dropdown backdrop-blur-xl border border-glass rounded-xl shadow-lg overflow-hidden">
            {currencies.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => handleSelect(currency.code)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-left rounded-lg group',
                  'hover:bg-accent-primary/10 hover:shadow-sm transition-all duration-200 ease-out',
                  'focus:bg-accent-primary/10 focus:outline-none focus:ring-2 focus:ring-accent-primary/20',
                  'text-primary',
                  value === currency.code && 'bg-accent-primary/15 shadow-sm'
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-accent-primary w-6 transition-all duration-200 group-hover:brightness-125 group-hover:drop-shadow-sm">
                    {currency.symbol}
                  </span>
                  <div>
                    <div className="font-medium transition-colors duration-200 group-hover:text-accent-primary">
                      {currency.code}
                    </div>
                    <div className="text-xs text-muted transition-colors duration-200 group-hover:text-secondary">
                      {currency.name}
                    </div>
                  </div>
                </div>
                {value === currency.code && (
                  <CheckIcon className="w-4 h-4 text-accent-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface CurrencyBadgeProps {
  currency: string
  className?: string
  showSymbol?: boolean
}

export function CurrencyBadge({ 
  currency, 
  className,
  showSymbol = true 
}: CurrencyBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center space-x-1 px-2 py-1 rounded-full',
      'bg-accent/10 text-accent-primary text-xs font-medium',
      className
    )}>
      {showSymbol && (
        <span className="font-mono">{getCurrencySymbol(currency)}</span>
      )}
      <span>{currency}</span>
    </span>
  )
}