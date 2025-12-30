import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, calculatePercentage } from '@/lib/utils/format'

/**
 * Unit tests for formatting utilities following testing.md patterns
 */

describe('formatCurrency', () => {
  it('formats UAH correctly', () => {
    const result = formatCurrency(1000, 'UAH')
    // Test that it contains the expected elements rather than exact match
    expect(result).toContain('1')
    expect(result).toContain('000')
    expect(result).toContain('₴')
  })

  it('handles negative amounts', () => {
    const result = formatCurrency(-500, 'UAH')
    expect(result).toContain('-')
    expect(result).toContain('500')
    expect(result).toContain('₴')
  })

  it('handles zero', () => {
    const result = formatCurrency(0, 'UAH')
    expect(result).toContain('0')
    expect(result).toContain('₴')
  })

  it('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('56')
  })

  it('uses default currency when not specified', () => {
    const result = formatCurrency(100)
    expect(result).toContain('100')
    expect(result).toContain('₴')
  })

  it('respects custom formatting options', () => {
    const result = formatCurrency(100, 'USD', { minimumFractionDigits: 0 })
    expect(result).toContain('100')
    expect(result).not.toContain('.00')
  })

  it('formats with US locale when specified', () => {
    const result = formatCurrency(1000, 'USD', { locale: 'en-US' })
    expect(result).toBe('$1,000.00')
  })
})

describe('formatDate', () => {
  it('formats date string correctly', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024')
  })

  it('formats Date object correctly', () => {
    const date = new Date('2024-01-15')
    expect(formatDate(date)).toBe('Jan 15, 2024')
  })

  it('respects custom formatting options', () => {
    expect(formatDate('2024-01-15', { month: 'long', day: 'numeric', year: 'numeric' }))
      .toBe('January 15, 2024')
  })
})

describe('calculatePercentage', () => {
  it('calculates percentage correctly', () => {
    expect(calculatePercentage(25, 100)).toBe(25)
  })

  it('handles zero total', () => {
    expect(calculatePercentage(10, 0)).toBe(0)
  })

  it('rounds to specified decimal places', () => {
    expect(calculatePercentage(1, 3, 1)).toBe(33.3)
    expect(calculatePercentage(1, 3, 2)).toBe(33.33)
  })

  it('handles zero value', () => {
    expect(calculatePercentage(0, 100)).toBe(0)
  })
})