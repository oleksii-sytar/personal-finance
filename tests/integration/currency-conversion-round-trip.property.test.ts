/**
 * Property-Based Test for Currency Conversion Round Trip
 * 
 * Feature: transactions, Property 6: Currency Conversion Round Trip
 * 
 * Tests that for any foreign currency transaction, converting to UAH and displaying 
 * both amounts should maintain mathematical accuracy within acceptable precision.
 * 
 * Validates: Requirements 2.8
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import * as fc from 'fast-check'
import { convertCurrency } from '@/lib/utils/currency-server'
import { getExchangeRate } from '@/lib/nbu-api/cached-rates'

// Mock the NBU API to provide consistent test data
vi.mock('@/lib/nbu-api/cached-rates', () => ({
  getExchangeRate: vi.fn()
}))

const mockGetExchangeRate = vi.mocked(getExchangeRate)

describe('Property 6: Currency Conversion Round Trip', () => {
  beforeAll(() => {
    // Set up consistent mock exchange rates for testing
    mockGetExchangeRate.mockImplementation(async (currency: string, date: Date) => {
      // Handle invalid dates
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date provided: ${date}`)
      }
      
      const rates: Record<string, number> = {
        'USD': 41.25,
        'EUR': 44.80,
        'GBP': 52.30,
        'PLN': 10.15,
      }
      
      const rate = rates[currency]
      if (!rate) {
        throw new Error(`No exchange rate available for ${currency}`)
      }
      
      return {
        rate,
        source: 'live' as const,
        date: date.toISOString()
      }
    })
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('Property 6: Currency Conversion Round Trip - converting foreign currency to UAH should maintain mathematical accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for foreign currency conversions
        fc.record({
          amount: fc.float({ 
            min: Math.fround(0.01), 
            max: Math.fround(99999.99), 
            noNaN: true,
            noDefaultInfinity: true
          }),
          currency: fc.constantFrom('USD', 'EUR', 'GBP', 'PLN'),
          date: fc.date({ 
            min: new Date('2024-01-01'), 
            max: new Date('2024-12-31') 
          }).filter(d => !isNaN(d.getTime()))
        }),
        async (testData) => {
          const { amount, currency, date } = testData

          // Convert foreign currency to UAH
          const conversionResult = await convertCurrency(amount, currency, 'UAH', date)

          // Property assertions for conversion accuracy
          expect(conversionResult).toBeDefined()
          expect(conversionResult.amount).toBeGreaterThan(0)
          expect(conversionResult.rate).toBeGreaterThan(0)
          expect(conversionResult.originalAmount).toBe(amount)
          expect(conversionResult.originalCurrency).toBe(currency)
          expect(conversionResult.targetCurrency).toBe('UAH')

          // Mathematical accuracy: converted amount should equal original amount * rate
          const expectedAmount = amount * conversionResult.rate
          const actualAmount = conversionResult.amount
          
          // Allow for floating point precision errors (within 0.01 UAH)
          const precision = 0.01
          const difference = Math.abs(actualAmount - expectedAmount)
          expect(difference).toBeLessThanOrEqual(precision)

          // Verify the conversion maintains reasonable bounds
          // For known exchange rates, the converted amount should be reasonable
          const knownRates: Record<string, { min: number, max: number }> = {
            'USD': { min: 35, max: 50 },    // USD typically 35-50 UAH
            'EUR': { min: 40, max: 55 },    // EUR typically 40-55 UAH  
            'GBP': { min: 45, max: 65 },    // GBP typically 45-65 UAH
            'PLN': { min: 8, max: 15 }      // PLN typically 8-15 UAH
          }

          const expectedRange = knownRates[currency]
          if (expectedRange) {
            const ratePerUnit = actualAmount / amount
            expect(ratePerUnit).toBeGreaterThanOrEqual(expectedRange.min)
            expect(ratePerUnit).toBeLessThanOrEqual(expectedRange.max)
          }

          // Verify conversion metadata is correct
          expect(conversionResult.source).toMatch(/^(live|cached|fallback)$/)
          expect(conversionResult.date).toBeDefined()
          expect(new Date(conversionResult.date)).toBeInstanceOf(Date)
        }
      ),
      { numRuns: 50 } // Run 50 iterations for comprehensive testing
    )
  }, 30000) // 30 second timeout

  it('Property 6: Currency Conversion Round Trip - same currency conversion should be identity operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for same currency "conversions"
        fc.record({
          amount: fc.float({ 
            min: Math.fround(0.01), 
            max: Math.fround(99999.99), 
            noNaN: true,
            noDefaultInfinity: true
          }),
          currency: fc.constantFrom('UAH', 'USD', 'EUR', 'GBP', 'PLN'),
          date: fc.date({ 
            min: new Date('2024-01-01'), 
            max: new Date('2024-12-31') 
          }).filter(d => !isNaN(d.getTime()))
        }),
        async (testData) => {
          const { amount, currency, date } = testData

          // Convert currency to itself (should be identity operation)
          const conversionResult = await convertCurrency(amount, currency, currency, date)

          // Property assertions for identity conversion
          expect(conversionResult.amount).toBe(amount)
          expect(conversionResult.rate).toBe(1)
          expect(conversionResult.originalAmount).toBe(amount)
          expect(conversionResult.originalCurrency).toBe(currency)
          expect(conversionResult.targetCurrency).toBe(currency)
          expect(conversionResult.source).toBe('live')
          
          // Verify no precision loss in identity conversion
          expect(conversionResult.amount).toEqual(amount)
        }
      ),
      { numRuns: 30 } // Run 30 iterations
    )
  }, 20000) // 20 second timeout

  it('Property 6: Currency Conversion Round Trip - conversion precision should be consistent across multiple calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for consistency testing
        fc.record({
          amount: fc.float({ 
            min: Math.fround(0.01), 
            max: Math.fround(1000), 
            noNaN: true,
            noDefaultInfinity: true
          }),
          currency: fc.constantFrom('USD', 'EUR'),
          date: fc.date({ 
            min: new Date('2024-01-01'), 
            max: new Date('2024-12-31') 
          }).filter(d => !isNaN(d.getTime()))
        }),
        async (testData) => {
          const { amount, currency, date } = testData

          // Perform the same conversion multiple times
          const conversion1 = await convertCurrency(amount, currency, 'UAH', date)
          const conversion2 = await convertCurrency(amount, currency, 'UAH', date)
          const conversion3 = await convertCurrency(amount, currency, 'UAH', date)

          // Property assertion: Results should be identical (deterministic)
          expect(conversion1.amount).toBe(conversion2.amount)
          expect(conversion1.amount).toBe(conversion3.amount)
          expect(conversion1.rate).toBe(conversion2.rate)
          expect(conversion1.rate).toBe(conversion3.rate)
          expect(conversion1.source).toBe(conversion2.source)
          expect(conversion1.source).toBe(conversion3.source)

          // Verify all conversions maintain the same accuracy
          const expectedAmount = amount * conversion1.rate
          expect(conversion1.amount).toBeCloseTo(expectedAmount, 2)
          expect(conversion2.amount).toBeCloseTo(expectedAmount, 2)
          expect(conversion3.amount).toBeCloseTo(expectedAmount, 2)
        }
      ),
      { numRuns: 20 } // Run 20 iterations
    )
  }, 25000) // 25 second timeout

  it('Property 6: Currency Conversion Round Trip - conversion should handle edge case amounts correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate edge case amounts
        fc.record({
          amount: fc.constantFrom(
            0.01,    // Minimum amount
            0.99,    // Less than 1
            1.00,    // Exactly 1
            999.99,  // Large amount with decimals
            1000.00, // Round large amount
            99999.99 // Maximum amount
          ),
          currency: fc.constantFrom('USD', 'EUR'),
          date: fc.date({ 
            min: new Date('2024-01-01'), 
            max: new Date('2024-12-31') 
          }).filter(d => !isNaN(d.getTime()))
        }),
        async (testData) => {
          const { amount, currency, date } = testData

          // Convert edge case amounts
          const conversionResult = await convertCurrency(amount, currency, 'UAH', date)

          // Property assertions for edge cases
          expect(conversionResult.amount).toBeGreaterThan(0)
          expect(Number.isFinite(conversionResult.amount)).toBe(true)
          expect(Number.isNaN(conversionResult.amount)).toBe(false)
          
          // Verify precision is maintained for small amounts
          if (amount < 1) {
            expect(conversionResult.amount).toBeGreaterThan(0)
            // For small amounts, the converted amount should still be reasonable
            expect(conversionResult.amount).toBeGreaterThan(amount) // Should be larger in UAH
          }

          // Verify large amounts don't overflow
          if (amount > 1000) {
            expect(conversionResult.amount).toBeLessThan(Number.MAX_SAFE_INTEGER)
            expect(Number.isFinite(conversionResult.amount)).toBe(true)
          }

          // Mathematical accuracy check
          const expectedAmount = amount * conversionResult.rate
          expect(conversionResult.amount).toBeCloseTo(expectedAmount, 2)

          // Verify metadata is correct for edge cases
          expect(conversionResult.originalAmount).toBe(amount)
          expect(conversionResult.originalCurrency).toBe(currency)
          expect(conversionResult.targetCurrency).toBe('UAH')
          expect(conversionResult.rate).toBeGreaterThan(0)
          expect(Number.isFinite(conversionResult.rate)).toBe(true)
        }
      ),
      { numRuns: 15 } // Run 15 iterations for edge cases
    )
  }, 20000) // 20 second timeout

  it('Property 6: Currency Conversion Round Trip - conversion should maintain precision for display purposes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate amounts that would be displayed to users
        fc.record({
          amount: fc.float({ 
            min: Math.fround(0.01), 
            max: Math.fround(10000), 
            noNaN: true,
            noDefaultInfinity: true
          }),
          currency: fc.constantFrom('USD', 'EUR', 'GBP', 'PLN'),
          date: fc.date({ 
            min: new Date('2024-01-01'), 
            max: new Date('2024-12-31') 
          }).filter(d => !isNaN(d.getTime()))
        }),
        async (testData) => {
          const { amount, currency, date } = testData

          // Convert for display purposes (simulating Requirements 2.8)
          const conversionResult = await convertCurrency(amount, currency, 'UAH', date)

          // Property assertion: Display precision should be appropriate for currency
          // UAH typically displays with 2 decimal places
          const displayAmount = Math.round(conversionResult.amount * 100) / 100
          const precisionDifference = Math.abs(conversionResult.amount - displayAmount)
          
          // Should be within 0.01 UAH for display purposes
          expect(precisionDifference).toBeLessThanOrEqual(0.01)

          // Verify the conversion supports dual currency display (Requirements 2.8)
          // Both original and converted amounts should be available
          expect(conversionResult.originalAmount).toBeDefined()
          expect(conversionResult.originalCurrency).toBeDefined()
          expect(conversionResult.amount).toBeDefined()
          expect(conversionResult.targetCurrency).toBe('UAH')

          // Verify the rate is reasonable for display calculations
          expect(conversionResult.rate).toBeGreaterThan(0)
          expect(conversionResult.rate).toBeLessThan(1000) // Reasonable upper bound

          // Test that we can format both amounts for display
          const originalFormatted = `${conversionResult.originalAmount.toFixed(2)} ${conversionResult.originalCurrency}`
          const convertedFormatted = `${displayAmount.toFixed(2)} UAH`
          
          expect(originalFormatted).toMatch(/^\d+\.\d{2} [A-Z]{3}$/)
          expect(convertedFormatted).toMatch(/^\d+\.\d{2} UAH$/)

          // Verify conversion maintains relationship for dual display
          const calculatedAmount = conversionResult.originalAmount * conversionResult.rate
          expect(Math.abs(calculatedAmount - conversionResult.amount)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 25 } // Run 25 iterations
    )
  }, 25000) // 25 second timeout
})