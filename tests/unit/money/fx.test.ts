import { describe, it, expect } from 'vitest'
import { convert, convertRounded, UAH_RATES } from '@/lib/money/fx'

describe('convert', () => {
  it('returns the same amount for the same currency', () => {
    expect(convert(123.45, 'UAH', 'UAH')).toBe(123.45)
    expect(convert(10, 'USD', 'USD')).toBe(10)
  })

  it('converts a foreign currency to UAH using its rate', () => {
    expect(convert(100, 'USD', 'UAH')).toBe(100 * UAH_RATES.USD)
  })

  it('converts UAH to a foreign currency', () => {
    expect(convert(UAH_RATES.USD, 'UAH', 'USD')).toBeCloseTo(1, 6)
  })

  it('converts between two foreign currencies via UAH', () => {
    const usdToEur = convert(100, 'USD', 'EUR')
    expect(usdToEur).toBeCloseTo((100 * UAH_RATES.USD) / UAH_RATES.EUR, 6)
  })

  it('rounds to two decimals on demand', () => {
    expect(convertRounded(1, 'USD', 'UAH')).toBe(Math.round(UAH_RATES.USD * 100) / 100)
  })
})