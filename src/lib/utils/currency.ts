/**
 * Currency utilities for multi-currency support
 * Following tech.md NBU API integration patterns
 */

import { format, subDays } from 'date-fns'

interface ExchangeRate {
  rate: number
  source: 'live' | 'cached' | 'fallback'
  date: string
}

/**
 * Fallback exchange rates (used when NBU API is unavailable)
 * These should be updated periodically and are for emergency use only
 */
const FALLBACK_RATES: Record<string, number> = {
  'USD_UAH': 41.25,
  'EUR_UAH': 44.80,
  'GBP_UAH': 52.30,
  'PLN_UAH': 10.15,
}

/**
 * Converts amount from one currency to another
 * 
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param date - Date for exchange rate (default: today)
 * @returns Promise with converted amount and rate source
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: Date = new Date()
): Promise<ExchangeRate & { amount: number }> {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return { 
      amount, 
      rate: 1, 
      source: 'live', 
      date: date.toISOString() 
    }
  }

  // Try to get exchange rate
  try {
    const exchangeRate = await getExchangeRate(fromCurrency, toCurrency, date)
    return {
      amount: amount * exchangeRate.rate,
      ...exchangeRate,
    }
  } catch (error) {
    console.error('Currency conversion failed:', error)
    throw new Error(`Unable to convert ${fromCurrency} to ${toCurrency}`)
  }
}

/**
 * Gets exchange rate between two currencies
 * Implements caching and fallback strategy from integrations.md
 */
async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date: Date
): Promise<ExchangeRate> {
  // For UAH conversions, use NBU API
  if (toCurrency === 'UAH') {
    return await getUAHExchangeRate(fromCurrency, date)
  }
  
  // For other conversions, would need additional API or cross-calculation
  throw new Error(`Conversion from ${fromCurrency} to ${toCurrency} not supported`)
}

/**
 * Gets exchange rate to UAH using NBU API with fallback strategy
 */
async function getUAHExchangeRate(
  currency: string,
  date: Date
): Promise<ExchangeRate> {
  // Try live rate first
  try {
    const rate = await fetchNBURate(currency, date)
    if (rate) {
      return { 
        rate, 
        source: 'live', 
        date: date.toISOString() 
      }
    }
  } catch (error) {
    console.warn('NBU API unavailable, trying fallback options')
  }

  // Try previous day (NBU doesn't have weekend rates)
  let attempts = 0
  let currentDate = date
  
  while (attempts < 5) {
    try {
      const rate = await fetchNBURate(currency, currentDate)
      if (rate) {
        return { 
          rate, 
          source: 'cached', 
          date: currentDate.toISOString() 
        }
      }
    } catch (error) {
      // Continue to next day
    }
    
    currentDate = subDays(currentDate, 1)
    attempts++
  }

  // Last resort: use hardcoded fallback rate
  const fallbackKey = `${currency}_UAH`
  const fallbackRate = FALLBACK_RATES[fallbackKey]
  
  if (fallbackRate) {
    console.error('Using fallback exchange rate - this should be investigated')
    return { 
      rate: fallbackRate, 
      source: 'fallback', 
      date: date.toISOString() 
    }
  }

  throw new Error(`No exchange rate available for ${currency} to UAH`)
}

/**
 * Fetches exchange rate from NBU API
 * Following integrations.md NBU API patterns
 */
async function fetchNBURate(
  currency: string,
  date: Date
): Promise<number | null> {
  const NBU_BASE_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange'
  
  const params = new URLSearchParams({
    valcode: currency,
    date: format(date, 'yyyyMMdd'),
    json: '',
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${NBU_BASE_URL}?${params}`, {
      signal: controller.signal,
      next: { revalidate: 86400 }, // Cache for 24 hours
    })

    if (!response.ok) {
      console.error(`NBU API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data[0]?.rate ?? null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('NBU API timeout')
    } else {
      console.error('NBU API fetch failed:', error)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Gets list of supported currencies
 */
export function getSupportedCurrencies(): Array<{ code: string; name: string }> {
  return [
    { code: 'UAH', name: 'Ukrainian Hryvnia' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'PLN', name: 'Polish Zloty' },
  ]
}

/**
 * Validates currency code format
 */
export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code)
}