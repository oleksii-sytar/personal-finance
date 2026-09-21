/**
 * Currency constants following structure.md organization
 */

export const DEFAULT_CURRENCY = 'UAH'

export const SUPPORTED_CURRENCIES = [
  { code: 'UAH', name: "Українська гривня", symbol: '₴' },
  { code: 'USD', name: "Долар США", symbol: '$' },
  { code: 'EUR', name: "Євро", symbol: '€' },
  { code: 'GBP', name: "Британський фунт", symbol: '£' },
  { code: 'PLN', name: "Польський злотий", symbol: 'zł' },
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]['code']

/**
 * Currency symbols mapping for quick lookup
 */
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
  GBP: '£',
  PLN: 'zł',
}