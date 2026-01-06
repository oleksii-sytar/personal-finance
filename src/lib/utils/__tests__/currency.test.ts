/**
 * Tests for currency conversion utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  formatCurrency, 
  formatDualCurrency,
  parseCurrencyAmount,
  isValidCurrencyCode,
  getCurrencySymbol
} from '../currency'

// Mock the NBU API cached rates module
vi.mock('@/lib/nbu-api/cached-rates', () => ({
  getExchangeRate: vi.fn()
}))

describe('Currency Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatCurrency', () => {
    it('formats UAH correctly', () => {
      const result = formatCurrency(1000, 'UAH')
      expect(result).toContain('1')
      expect(result).toContain('000')
      expect(result).toContain('₴')
    })

    it('formats USD correctly', () => {
      const result = formatCurrency(1000, 'USD')
      expect(result).toContain('1')
      expect(result).toContain('000')
      expect(result).toContain('$')
    })

    it('handles zero amounts', () => {
      const result = formatCurrency(0, 'UAH')
      expect(result).toContain('0')
      expect(result).toContain('₴')
    })

    it('handles negative amounts', () => {
      const result = formatCurrency(-500, 'UAH')
      expect(result).toContain('-')
      expect(result).toContain('500')
    })
  })

  describe('formatDualCurrency', () => {
    it('shows both currencies when different', () => {
      const result = formatDualCurrency(100, 'USD', 4125, 'UAH', true)
      expect(result).toContain('$')
      expect(result).toContain('100')
      expect(result).toContain('₴')
      expect(result).toContain('4')
      expect(result).toContain('125')
    })

    it('shows only original when same currency', () => {
      const result = formatDualCurrency(1000, 'UAH', 1000, 'UAH', true)
      expect(result).toContain('₴')
      expect(result).toContain('1')
      expect(result).toContain('000')
      expect(result).not.toContain('(')
    })

    it('shows only original when showBoth is false', () => {
      const result = formatDualCurrency(100, 'USD', 4125, 'UAH', false)
      expect(result).toContain('$')
      expect(result).toContain('100')
      expect(result).not.toContain('₴')
      expect(result).not.toContain('4125')
    })
  })

  describe('parseCurrencyAmount', () => {
    it('parses simple numbers', () => {
      expect(parseCurrencyAmount('1000')).toBe(1000)
      expect(parseCurrencyAmount('1000.50')).toBe(1000.5)
    })

    it('parses formatted numbers', () => {
      expect(parseCurrencyAmount('1,000.50')).toBe(1000.5)
      expect(parseCurrencyAmount('1 000.50')).toBe(1000.5)
    })

    it('parses numbers with currency symbols', () => {
      expect(parseCurrencyAmount('$1000.50')).toBe(1000.5)
      expect(parseCurrencyAmount('₴1,000.50')).toBe(1000.5)
      expect(parseCurrencyAmount('€500')).toBe(500)
    })

    it('returns null for invalid input', () => {
      expect(parseCurrencyAmount('')).toBeNull()
      expect(parseCurrencyAmount('abc')).toBeNull()
      expect(parseCurrencyAmount('-100')).toBeNull() // Negative amounts
    })
  })

  describe('isValidCurrencyCode', () => {
    it('validates correct currency codes', () => {
      expect(isValidCurrencyCode('UAH')).toBe(true)
      expect(isValidCurrencyCode('USD')).toBe(true)
      expect(isValidCurrencyCode('EUR')).toBe(true)
    })

    it('rejects invalid currency codes', () => {
      expect(isValidCurrencyCode('ua')).toBe(false) // Too short
      expect(isValidCurrencyCode('UAHH')).toBe(false) // Too long
      expect(isValidCurrencyCode('uah')).toBe(false) // Lowercase
      expect(isValidCurrencyCode('123')).toBe(false) // Numbers
    })
  })

  describe('getCurrencySymbol', () => {
    it('returns correct symbols for supported currencies', () => {
      expect(getCurrencySymbol('UAH')).toBe('₴')
      expect(getCurrencySymbol('USD')).toBe('$')
      expect(getCurrencySymbol('EUR')).toBe('€')
      expect(getCurrencySymbol('GBP')).toBe('£')
      expect(getCurrencySymbol('PLN')).toBe('zł')
    })

    it('returns currency code for unsupported currencies', () => {
      expect(getCurrencySymbol('JPY')).toBe('JPY')
      expect(getCurrencySymbol('CAD')).toBe('CAD')
    })
  })

  describe('convertCurrency', () => {
    it('returns same amount for same currency', async () => {
      // Import from server-side module for testing
      const { convertCurrency } = await import('../currency-server')
      const result = await convertCurrency(1000, 'UAH', 'UAH')
      
      expect(result.amount).toBe(1000)
      expect(result.rate).toBe(1)
      expect(result.source).toBe('live')
      expect(result.originalAmount).toBe(1000)
      expect(result.originalCurrency).toBe('UAH')
      expect(result.targetCurrency).toBe('UAH')
    })

    it('throws error for unsupported target currency', async () => {
      const { convertCurrency } = await import('../currency-server')
      await expect(convertCurrency(100, 'USD', 'EUR')).rejects.toThrow(
        'Conversion to EUR not supported'
      )
    })
  })
})