/**
 * NBU API client for fetching exchange rates
 * Following integrations.md NBU API patterns
 */

import { format, subDays } from 'date-fns'

const NBU_BASE_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange'

interface NBURate {
  r030: number
  txt: string
  rate: number
  cc: string
  exchangedate: string
}

/**
 * Fetches exchange rate from NBU API for a specific currency and date
 * 
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @param date - Date for exchange rate (optional, defaults to today)
 * @returns Exchange rate or null if not found
 */
export async function fetchExchangeRate(
  currency: string,
  date?: Date
): Promise<number | null> {
  const params = new URLSearchParams({ 
    valcode: currency, 
    json: '' 
  })
  
  if (date) {
    params.set('date', format(date, 'yyyyMMdd'))
  }
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  
  try {
    const response = await fetch(`${NBU_BASE_URL}?${params}`, {
      signal: controller.signal,
      next: { revalidate: 86400 } // Cache for 24 hours
    })
    
    if (!response.ok) {
      console.error(`NBU API error: ${response.status}`)
      return null
    }
    
    const data: NBURate[] = await response.json()
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
 * Fetches all exchange rates for a specific date
 * 
 * @param date - Date for exchange rates (optional, defaults to today)
 * @returns Array of exchange rates
 */
export async function fetchAllRates(date?: Date): Promise<NBURate[]> {
  const params = new URLSearchParams({ json: '' })
  
  if (date) {
    params.set('date', format(date, 'yyyyMMdd'))
  }
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  
  try {
    const response = await fetch(`${NBU_BASE_URL}?${params}`, {
      signal: controller.signal,
      next: { revalidate: 86400 }
    })
    
    if (!response.ok) {
      console.error(`NBU API error: ${response.status}`)
      return []
    }
    
    return await response.json()
  } catch (error) {
    console.error('NBU API fetch failed:', error)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Gets exchange rate with fallback to previous business days
 * NBU doesn't publish rates on weekends/holidays
 * 
 * @param currency - Currency code
 * @param date - Target date
 * @returns Exchange rate or null if not found after 5 attempts
 */
export async function getExchangeRateWithFallback(
  currency: string,
  date: Date
): Promise<{ rate: number; actualDate: Date } | null> {
  let attempts = 0
  let currentDate = date
  
  while (attempts < 5) {
    const rate = await fetchExchangeRate(currency, currentDate)
    if (rate) {
      return { rate, actualDate: currentDate }
    }
    
    // Try previous day
    currentDate = subDays(currentDate, 1)
    attempts++
  }
  
  return null
}