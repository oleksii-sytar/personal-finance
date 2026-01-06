/**
 * Currency utilities for multi-currency support (client-safe)
 * Following tech.md NBU API integration patterns
 */

import { CURRENCY_SYMBOLS, type SupportedCurrency } from '@/lib/constants/currencies'

/**
 * Formats currency amount with proper symbol and locale
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @param locale - Locale for formatting (auto-detected based on currency)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'UAH',
  locale?: string
): string {
  // Auto-detect appropriate locale based on currency
  const detectedLocale = locale || (currency === 'UAH' ? 'uk-UA' : 'en-US')
  
  try {
    return new Intl.NumberFormat(detectedLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback to manual formatting if Intl fails
    const symbol = CURRENCY_SYMBOLS[currency as SupportedCurrency] || currency
    return `${symbol}${amount.toFixed(2)}`
  }
}

/**
 * Formats currency with both original and converted amounts
 * 
 * @param originalAmount - Original amount
 * @param originalCurrency - Original currency
 * @param convertedAmount - Converted amount
 * @param convertedCurrency - Converted currency (usually UAH)
 * @param showBoth - Whether to show both amounts
 * @returns Formatted string with both amounts
 */
export function formatDualCurrency(
  originalAmount: number,
  originalCurrency: string,
  convertedAmount: number,
  convertedCurrency: string = 'UAH',
  showBoth: boolean = true
): string {
  const originalFormatted = formatCurrency(originalAmount, originalCurrency)
  const convertedFormatted = formatCurrency(convertedAmount, convertedCurrency)
  
  if (!showBoth || originalCurrency === convertedCurrency) {
    return originalFormatted
  }
  
  return `${originalFormatted} (${convertedFormatted})`
}

/**
 * Gets list of supported currencies with their display information
 */
export function getSupportedCurrencies(): Array<{ 
  code: string
  name: string
  symbol: string
}> {
  return [
    { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  ]
}

/**
 * Validates currency code format
 */
export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code)
}

/**
 * Gets currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency as SupportedCurrency] || currency
}

/**
 * Parses currency amount from string input
 * Handles various formats like "1,000.50", "1000.50", "$1000.50"
 * 
 * @param input - String input to parse
 * @returns Parsed number or null if invalid
 */
export function parseCurrencyAmount(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null
  }
  
  // Remove currency symbols and whitespace
  const cleaned = input
    .replace(/[₴$€£zł]/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '')
  
  const parsed = parseFloat(cleaned)
  
  if (isNaN(parsed) || parsed < 0) {
    return null
  }
  
  return parsed
}

/**
 * Checks if a currency conversion is needed
 */
export function needsConversion(
  fromCurrency: string,
  toCurrency: string = 'UAH'
): boolean {
  return fromCurrency !== toCurrency
}

/**
 * Gets the default currency for the application
 */
export function getDefaultCurrency(): string {
  return 'UAH'
}