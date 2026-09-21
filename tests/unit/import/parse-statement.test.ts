import { describe, it, expect } from 'vitest'
import {
  detectDelimiter,
  parseDelimited,
  parseAmount,
  normalizeDate,
  guessColumns,
  toParsedRows,
} from '@/lib/import/parse-statement'

describe('detectDelimiter', () => {
  it('detects semicolons and commas', () => {
    expect(detectDelimiter('a;b;c')).toBe(';')
    expect(detectDelimiter('a,b,c')).toBe(',')
  })
})

describe('parseAmount', () => {
  it('parses Ukrainian format (space thousands, comma decimal)', () => {
    expect(parseAmount('1 234,56')).toBe(1234.56)
    expect(parseAmount('-742,30')).toBe(-742.3)
  })
  it('parses US format', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56)
  })
  it('treats parentheses as negative', () => {
    expect(parseAmount('(450.00)')).toBe(-450)
  })
  it('strips currency symbols', () => {
    expect(parseAmount('₴ 38 000,00')).toBe(38000)
  })
  it('returns null for junk', () => {
    expect(parseAmount('abc')).toBeNull()
  })
})

describe('normalizeDate', () => {
  it('handles dd.mm.yyyy', () => {
    expect(normalizeDate('04.06.2026')).toBe('2026-06-04')
  })
  it('handles yyyy-mm-dd', () => {
    expect(normalizeDate('2026-6-4')).toBe('2026-06-04')
  })
  it('returns null for junk', () => {
    expect(normalizeDate('not a date')).toBeNull()
  })
})

describe('parseDelimited + guessColumns + toParsedRows', () => {
  const csv = `Date;Description;Amount
04.06.2026;Сільпо;-742,30
06.06.2026;Зарплата;38000,00
bad;row;xyz`

  it('parses headers and rows', () => {
    const { headers, rows, delimiter } = parseDelimited(csv)
    expect(delimiter).toBe(';')
    expect(headers).toEqual(['Date', 'Description', 'Amount'])
    expect(rows).toHaveLength(3)
  })

  it('guesses columns by header name', () => {
    const { headers } = parseDelimited(csv)
    expect(guessColumns(headers)).toEqual({ date: 0, description: 1, amount: 2 })
  })

  it('maps rows to parsed transactions and flags invalid ones', () => {
    const { headers, rows } = parseDelimited(csv)
    const parsed = toParsedRows(rows, guessColumns(headers))
    expect(parsed[0]).toMatchObject({ date: '2026-06-04', description: 'Сільпо', amount: -742.3, valid: true })
    expect(parsed[1]).toMatchObject({ amount: 38000, valid: true })
    expect(parsed[2].valid).toBe(false)
  })
})