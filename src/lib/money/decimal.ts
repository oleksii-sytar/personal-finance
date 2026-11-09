/** Money crosses input/storage boundaries in whole minor units, never by deleting unknown characters. */
export const MAX_MONEY = 1e12
const units: Record<string, string> = { '₴':'UAH',UAH:'UAH','ГРН':'UAH','$':'USD',USD:'USD','€':'EUR',EUR:'EUR','£':'GBP',GBP:'GBP',PLN:'PLN','ZŁ':'PLN' }
const unitPattern = '(?:UAH|USD|EUR|GBP|PLN|грн|zł|[₴$€£])'
export function parseMoney(value: unknown, options: {currency?:string; symbols?:boolean; signed?:boolean} = {}): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (typeof value === 'number') {
    const cents = Math.round(value * 100)
    return Number.isFinite(value) && Math.abs(value) < MAX_MONEY && Number.isSafeInteger(cents) && (value === 0 || cents !== 0) && Math.abs(value - cents / 100) <= Number.EPSILON * Math.max(1,Math.abs(value)) * 2 && (options.signed !== false || value >= 0) ? cents / 100 : null
  }
  let s = value.trim().replace(/[\u00a0\u202f]/g, ' ')
  if (!s || /[\r\n\t]/.test(s)) return null
  if (options.symbols) {
    const prefix = s.match(new RegExp('^([+−-]?)\\s*(' + unitPattern + ')\\s*', 'i'))
    const suffix = s.match(new RegExp('\\s*(' + unitPattern + ')$', 'i'))
    if (prefix && suffix) return null
    const token = prefix?.[2] || suffix?.[1]
    if (token && options.currency && units[token.toUpperCase()] !== options.currency) return null
    if (prefix) s = prefix[1] + s.slice(prefix[0].length)
    else if (suffix) s = s.slice(0, -suffix[0].length)
  }
  let negative = false
  if (/^\([^()]+\)$/.test(s)) { negative = true; s = s.slice(1, -1).trim(); if (/^[+−-]/.test(s)) return null }
  else if (/^[+−-]/.test(s)) { negative = s[0] !== '+'; s = s.slice(1) }
  if (negative && options.signed === false) return null
  if (!/^[\d .,]+$/.test(s)) return null
  let integer = s, fraction = ''
  const comma = s.lastIndexOf(','), dot = s.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.', thousands = decimal === ',' ? '.' : ','
    const parts = s.split(decimal)
    if (parts.length !== 2 || !/^\d{1,2}$/.test(parts[1])) return null
    integer = parts[0]; fraction = parts[1]
    const escaped = thousands === '.' ? '\\.' : ','
    if (!new RegExp('^\\d{1,3}(?:' + escaped + '\\d{3})+$').test(integer)) return null
    integer = integer.split(thousands).join('')
  } else if (comma >= 0) {
    if (/^\d{1,3}(?:,\d{3})+$/.test(s)) integer = s.replace(/,/g, '')
    else { const p = s.split(','); if (p.length !== 2 || !/^\d{1,2}$/.test(p[1])) return null; [integer, fraction] = p }
  } else if (dot >= 0) {
    const p = s.split('.'); if (p.length !== 2 || !/^\d{1,2}$/.test(p[1])) return null; [integer, fraction] = p
  }
  if (integer.includes(' ')) {
    if (!/^\d{1,3}(?: \d{3})+$/.test(integer)) return null
    integer = integer.replace(/ /g, '')
  }
  if (!/^\d+$/.test(integer)) return null
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents >= MAX_MONEY * 100) return null
  return cents === 0 ? 0 : (negative ? -cents : cents) / 100
}
export function moneyCents(value:number):number {
  if (!Number.isFinite(value)) throw new Error('Некоректна грошова сума')
  const [coefficient,exponent='0']=Math.abs(value).toString().split('e')
  const scaled=Number(coefficient+'e'+(Number(exponent)+2))
  const magnitude=Math.round(scaled)
  const cents=magnitude===0?0:Math.sign(value)*magnitude
  if (!Number.isSafeInteger(cents)) throw new Error('Загальна сума перевищує точність розрахунку')
  return cents
}
export const roundMoney = (value:number) => moneyCents(value) / 100
export function sumMoney(values:Iterable<number>):number {
  let cents = 0
  for (const value of values) { cents += moneyCents(value); if (!Number.isSafeInteger(cents)) throw new Error('Загальна сума перевищує точність розрахунку') }
  return cents / 100
}
