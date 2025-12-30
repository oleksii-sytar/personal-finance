import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge
 * Following code-quality.md utility function patterns
 * 
 * @param inputs - Class values to combine
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export formatting utilities for backward compatibility
export { formatCurrency, formatDate, calculatePercentage, formatNumber } from './utils/format'
export { convertCurrency, getSupportedCurrencies, isValidCurrencyCode } from './utils/currency'