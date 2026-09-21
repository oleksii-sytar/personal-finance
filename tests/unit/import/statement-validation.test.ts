import { describe, expect, it } from 'vitest'
import { normalizeDate, parseAmount, toParsedRows } from '@/lib/import/parse-statement'

describe('statement data validation', () => {
  it.each(['31.02.2026', '2026-13-01', '2026-00-01', '2026-04-31', '29.02.2026'])(
    'rejects the impossible date %s', (value) => expect(normalizeDate(value)).toBeNull()
  )
  it('accepts a leap day and a dated bank timestamp', () => {
    expect(normalizeDate('29.02.2024')).toBe('2024-02-29')
    expect(normalizeDate('2026-09-09T23:30:00+03:00')).toBe('2026-09-09')
  })
  it.each(['1.2.3', '1,2,3', '1.2345', '9'.repeat(400)])(
    'does not silently truncate malformed amounts', (value) => expect(parseAmount(value)).toBeNull()
  )
  it('marks impossible dates invalid before importing', () => {
    expect(toParsedRows([['31.02.2026', 'Test', '-10']], { date: 0, description: 1, amount: 2 })[0].valid).toBe(false)
  })
})