/**
 * Server-side currency conversion utilities
 * This file should only be imported in server components and server actions
 */

import { getExchangeRate } from '@/lib/nbu-api/cached-rates'

interface ConversionResult {
  amount: number
  rate: number
  source: 'live' | 'cached' | 'fallback'
  date: string
  originalAmount: number
  originalCurrency: string
  targetCurrency: string
  actualDate?: Date
}

/**
 * Converts amount from one currency to another
 * This function should only be used on the server side
 * 
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code (defaults to UAH)
 * @param date - Date for exchange rate (default: today)
 * @returns Promise with converted amount and rate source
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string = 'UAH',
  date: Date = new Date()
): Promise<ConversionResult> {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return { 
      amount, 
      rate: 1, 
      source: 'live', 
      date: date.toISOString(),
      originalAmount: amount,
      originalCurrency: fromCurrency,
      targetCurrency: toCurrency
    }
  }

  // Currently only support conversion to UAH
  if (toCurrency !== 'UAH') {
    throw new Error(`Conversion to ${toCurrency} not supported. Only UAH conversions are available.`)
  }

  try {
    const exchangeRate = await getExchangeRate(fromCurrency, date)
    return {
      amount: amount * exchangeRate.rate,
      rate: exchangeRate.rate,
      source: exchangeRate.source,
      date: exchangeRate.date,
      originalAmount: amount,
      originalCurrency: fromCurrency,
      targetCurrency: toCurrency,
      actualDate: exchangeRate.actualDate
    }
  } catch (error) {
    console.error('Currency conversion failed:', error)
    throw new Error(`Unable to convert ${fromCurrency} to ${toCurrency}`)
  }
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