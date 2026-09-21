/**
 * Foreign-exchange conversion.
 *
 * Rates express the value of one unit of a currency in UAH (the base).
 * In production these come from the NBU API (`exchange_rates` table); here we
 * use a static, recent snapshot so the UI works offline. Conversion is a
 * presentation concern — stored amounts keep their original currency.
 */

import type { CurrencyCode } from '@/types/domain'

export const FX_STATUS: {source:'nbu'|'fallback';date:string|null}={source:'fallback',date:null}

/** Value of one unit of each currency in UAH. */
export const UAH_RATES: Record<CurrencyCode, number> = {
  UAH: 1,
  USD: 41.5,
  EUR: 45.2,
  GBP: 53.1,
  PLN: 10.35,
}

/**
 * Convert an amount between currencies via the UAH base.
 *
 * @example convert(100, 'USD', 'UAH') // 4150
 */
export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount
  const inUah = amount * UAH_RATES[from]
  return inUah / UAH_RATES[to]
}

/** Convert and round to 2 decimals (use for display, not for storage). */
export function convertRounded(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  return Math.round(convert(amount, from, to) * 100) / 100
}

let revision=0
const listeners=new Set<()=>void>()
export const exchangeRateVersion=()=>revision
export function subscribeExchangeRates(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
/** Publish rate changes even when query structural sharing keeps ledger data unchanged. */
export function setExchangeRates(rates:Partial<Record<CurrencyCode,number>>,date:string|null,source:'nbu'|'fallback'='nbu'){
 let changed=FX_STATUS.date!==date||FX_STATUS.source!==source
 for(const code of Object.keys(UAH_RATES) as CurrencyCode[]){const value=rates[code];if(code==='UAH'||typeof value!=='number'||!Number.isFinite(value)||value<=0)continue;if(UAH_RATES[code]!==value){UAH_RATES[code]=value;changed=true}}
 UAH_RATES.UAH=1;FX_STATUS.source=source;FX_STATUS.date=date
 if(changed){revision++;for(const listener of listeners)listener()}
}
