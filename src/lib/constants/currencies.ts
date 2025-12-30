/**
 * Currency constants following structure.md organization
 */

export const DEFAULT_CURRENCY = 'UAH'

export const SUPPORTED_CURRENCIES = [
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
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