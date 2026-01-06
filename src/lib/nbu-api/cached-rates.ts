/**
 * Cached exchange rates with database integration
 * Following integrations.md caching strategy
 */

import { format, subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { fetchExchangeRate, getExchangeRateWithFallback } from './client'

interface CachedRate {
  rate: number
  source: 'cached' | 'live' | 'fallback'
  date: string
  actualDate?: Date
}

/**
 * Gets cached exchange rate from database
 * 
 * @param currency - Currency code
 * @param date - Date for exchange rate
 * @returns Cached rate or null if not found
 */
export async function getCachedRate(
  currency: string,
  date: Date
): Promise<number | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency', currency)
      .eq('date', format(date, 'yyyy-MM-dd'))
      .single()
    
    if (error) {
      console.warn('Failed to fetch cached rate:', error.message)
      return null
    }
    
    return data?.rate ?? null
  } catch (error) {
    console.error('Error fetching cached rate:', error)
    return null
  }
}

/**
 * Caches exchange rate in database
 * 
 * @param currency - Currency code
 * @param date - Date for exchange rate
 * @param rate - Exchange rate value
 */
export async function cacheRate(
  currency: string,
  date: Date,
  rate: number
): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('exchange_rates')
      .upsert({
        currency,
        date: format(date, 'yyyy-MM-dd'),
        rate,
        fetched_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Failed to cache rate:', error.message)
    }
  } catch (error) {
    console.error('Error caching rate:', error)
  }
}

/**
 * Gets exchange rate with comprehensive fallback strategy
 * 1. Try cached rate for exact date
 * 2. Try live NBU API for exact date
 * 3. Try live NBU API for previous business days
 * 4. Try cached rates for previous days
 * 5. Use hardcoded fallback rates
 * 
 * @param currency - Currency code
 * @param date - Target date
 * @returns Exchange rate with source information
 */
export async function getExchangeRate(
  currency: string,
  date: Date
): Promise<CachedRate> {
  // If converting to same currency, return 1
  if (currency === 'UAH') {
    return {
      rate: 1,
      source: 'live',
      date: date.toISOString()
    }
  }

  // Try cache first
  const cachedRate = await getCachedRate(currency, date)
  if (cachedRate) {
    return {
      rate: cachedRate,
      source: 'cached',
      date: date.toISOString()
    }
  }

  // Try live NBU API with fallback to previous days
  const liveResult = await getExchangeRateWithFallback(currency, date)
  if (liveResult) {
    // Cache the rate for future use
    await cacheRate(currency, liveResult.actualDate, liveResult.rate)
    
    return {
      rate: liveResult.rate,
      source: 'live',
      date: date.toISOString(),
      actualDate: liveResult.actualDate
    }
  }

  // Try cached rates for previous days
  let attempts = 0
  let currentDate = date
  
  while (attempts < 7) { // Try up to a week back
    currentDate = subDays(currentDate, 1)
    const oldCachedRate = await getCachedRate(currency, currentDate)
    
    if (oldCachedRate) {
      console.warn(`Using cached rate from ${format(currentDate, 'yyyy-MM-dd')} for ${currency}`)
      return {
        rate: oldCachedRate,
        source: 'cached',
        date: date.toISOString(),
        actualDate: currentDate
      }
    }
    
    attempts++
  }

  // Last resort: hardcoded fallback rates
  const fallbackRates: Record<string, number> = {
    'USD': 41.25,
    'EUR': 44.80,
    'GBP': 52.30,
    'PLN': 10.15,
  }

  const fallbackRate = fallbackRates[currency]
  if (fallbackRate) {
    console.error(`Using fallback exchange rate for ${currency} - this should be investigated`)
    return {
      rate: fallbackRate,
      source: 'fallback',
      date: date.toISOString()
    }
  }

  throw new Error(`No exchange rate available for ${currency} to UAH`)
}

/**
 * Gets multiple exchange rates for different currencies
 * Useful for bulk operations
 * 
 * @param currencies - Array of currency codes
 * @param date - Target date
 * @returns Map of currency to exchange rate info
 */
export async function getMultipleExchangeRates(
  currencies: string[],
  date: Date = new Date()
): Promise<Map<string, CachedRate>> {
  const rates = new Map<string, CachedRate>()
  
  // Process currencies in parallel
  const promises = currencies.map(async (currency) => {
    try {
      const rate = await getExchangeRate(currency, date)
      rates.set(currency, rate)
    } catch (error) {
      console.error(`Failed to get rate for ${currency}:`, error)
    }
  })
  
  await Promise.all(promises)
  return rates
}

/**
 * Checks if cached rate is stale (older than 24 hours)
 * 
 * @param currency - Currency code
 * @param date - Date to check
 * @returns True if rate needs refresh
 */
export async function isRateStale(
  currency: string,
  date: Date
): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('fetched_at')
      .eq('currency', currency)
      .eq('date', format(date, 'yyyy-MM-dd'))
      .single()
    
    if (error || !data?.fetched_at) {
      return true // No cached rate or error = stale
    }
    
    const fetchedAt = new Date(data.fetched_at)
    const now = new Date()
    const hoursSinceFetch = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60)
    
    return hoursSinceFetch > 24
  } catch (error) {
    console.error('Error checking rate staleness:', error)
    return true // Assume stale on error
  }
}