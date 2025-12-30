/**
 * Formatting utilities following code-quality.md JSDoc standards
 */

interface FormatCurrencyOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Formats a number as currency string with proper localization
 * 
 * @param amount - The amount to format
 * @param currency - ISO 4217 currency code (e.g., 'UAH', 'USD')
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "₴1,000.00")
 * 
 * @example
 * formatCurrency(1000, 'UAH') // "₴1,000.00"
 * formatCurrency(50.5, 'USD') // "$50.50"
 */
export function formatCurrency(
  amount: number,
  currency: string = 'UAH',
  options: FormatCurrencyOptions = {}
): string {
  const {
    locale = 'uk-UA',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount)
}

/**
 * Formats a date string or Date object for display
 * 
 * @param date - Date to format (string or Date object)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * formatDate('2024-01-15') // "Jan 15, 2024"
 * formatDate(new Date(), { dateStyle: 'short' }) // "1/15/24"
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date))
}

/**
 * Formats a date for input fields (YYYY-MM-DD format)
 * 
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date: Date | string): string {
  const dateObj = new Date(date)
  return dateObj.toISOString().split('T')[0]
}

/**
 * Calculates percentage with proper rounding
 * 
 * @param value - The value to calculate percentage for
 * @param total - The total value
 * @param decimals - Number of decimal places (default: 0)
 * @returns Percentage as number
 * 
 * @example
 * calculatePercentage(25, 100) // 25
 * calculatePercentage(1, 3, 1) // 33.3
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 0
): number {
  if (total === 0) return 0
  
  const percentage = (value / total) * 100
  return Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Formats a number with thousand separators
 * 
 * @param value - Number to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value)
}