/**
 * Bank-statement (CSV) parsing. Tolerant of the formats Ukrainian banks export:
 * `;` or `,` delimiters, quoted fields, `1 234,56` amounts, and dd.mm.yyyy dates.
 * Pure functions — unit tested, no I/O.
 */

export interface ColumnMapping {
  date: number
  description: number
  amount: number
}

export interface ParsedRow {
  date: string
  description: string
  amount: number
  occurredAt?: string | null
  valid: boolean
  raw: string[]
}

const pad = (x: string | number) => String(x).padStart(2, '0')

export function detectDelimiter(line: string): string {
  const candidates = [';', ',', '\t', '|']
  let best = ','
  let bestCount = -1
  for (const d of candidates) {
    const count = line.split(d).length - 1
    if (count > bestCount) {
      best = d
      bestCount = count
    }
  }
  return best
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else quoted = !quoted
    } else if (c === delim && !quoted) {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export function parseDelimited(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' }
  const delimiter = detectDelimiter(lines[0])
  const all = lines.map((l) => splitLine(l, delimiter))
  return { headers: all[0], rows: all.slice(1), delimiter }
}

/** Parse a money string in either UA (`1 234,56`) or US (`1,234.56`) format. */
export function parseAmount(raw: string): number | null {
  if (!raw) return null
  let s = raw.trim()
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.includes('-')) negative = true
  s = s.replace(/[^\d.,]/g, '')
  if (!s) return null
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    const parts = s.split(',')
    if (parts.length === 2 && parts[1].length <= 2) s = `${parts[0]}.${parts[1]}`
    else {
      if (!/^\d{1,3}(?:,\d{3})+$/.test(s)) return null
      s = s.replace(/,/g, '')
    }
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negative ? -Math.abs(n) : n
}

/** Normalise common date formats to YYYY-MM-DD. */
export function normalizeDate(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/)
  const local = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s.*)?$/)
  if (!iso && !local) return null
  const year = Number(iso ? iso[1] : local![3])
  const month = Number(iso ? iso[2] : local![2])
  const day = Number(iso ? iso[3] : local![1])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

const DATE_KEYS = ['date', 'дата', 'time', 'час']
const AMOUNT_KEYS = ['amount', 'сума', 'сумма', 'total', 'сумма у валюті', 'sum']
const DESC_KEYS = ['descr', 'опис', 'призначен', 'narrative', 'merchant', 'details', 'коментар', 'контрагент', 'name', 'деталі']

export function guessColumns(headers: string[]): ColumnMapping {
  const find = (keys: string[]) =>
    headers.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)))
  let date = find(DATE_KEYS)
  let amount = find(AMOUNT_KEYS)
  let description = find(DESC_KEYS)
  if (date < 0) date = 0
  if (amount < 0) amount = Math.max(0, headers.length - 1)
  if (description < 0) description = Math.min(1, headers.length - 1)
  return { date, description, amount }
}

export function toParsedRows(rows: string[][], mapping: ColumnMapping): ParsedRow[] {
  return rows.map((raw) => {
    const date = normalizeDate(raw[mapping.date] ?? '') ?? ''
    const amount = parseAmount(raw[mapping.amount] ?? '')
    const description = (raw[mapping.description] ?? '').trim()
    return {
      date,
      occurredAt:date&&raw[mapping.date]?.match(/(?:T|\s)(\d{2}:\d{2}(?::\d{2})?)/)?.[1]?date+'T'+raw[mapping.date].match(/(?:T|\s)(\d{2}:\d{2}(?::\d{2})?)/)![1]:null,
      description: description || "Імпортована операція",
      amount: amount ?? 0,
      valid: !!date && amount != null && amount !== 0,
      raw,
    }
  })
}