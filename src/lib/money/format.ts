/**
 * Money formatting helpers built on Intl. Display-only; storage keeps raw
 * numbers in their original currency.
 */

import type { CurrencyCode } from '@/types/domain'



export interface FormatMoneyOptions {
  /** Hide decimals for large round figures (e.g. dashboard totals). */
  compact?: boolean
  /** Always show a leading + / − sign. */
  signed?: boolean
  maximumFractionDigits?: number
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'UAH',
  options: FormatMoneyOptions = {}
): string {
  const { compact = false, signed = false, maximumFractionDigits } = options
  const value = Math.abs(amount) < 0.005 ? 0 : amount
  try {
    const formatted = new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: maximumFractionDigits ?? (compact ? 1 : 2),
    }).format(value)
    return signed && value > 0 ? `+${formatted}` : formatted
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

/** Compact form for big dashboard numbers, e.g. ₴1.2M. */
export function formatMoneyCompact(amount: number, currency: CurrencyCode = 'UAH'): string {
  return formatMoney(amount, currency, { compact: true })
}