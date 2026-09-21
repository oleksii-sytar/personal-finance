import type {Transaction,CurrencyCode,ExchangeRate} from '@/types/domain'
import {convert} from './fx'
import {localDay} from '@/lib/calculations/dates'

export interface ReportOptions {rates?:ExchangeRate[];reference?:Date}
export function historicalValue(amount:number,from:CurrencyCode,to:CurrencyCode,date:string,rates?:ExchangeRate[]):number|null{
 if(amount===0)return 0
 if(from===to)return amount
 if(!rates)return convert(amount,from,to)
 const rate=(code:CurrencyCode)=>code==='UAH'?1:rates.find(r=>r.currency===code&&r.date===date)?.rate
 const a=rate(from),b=rate(to)
 return a&&b&&Number.isFinite(a)&&Number.isFinite(b)?amount*a/b:null
}
/** Household budget: each expense is counted in full, including loan payments.
 * Own transfers and borrowed principal received are not earned income.
 */
export function statisticalAmounts(t:Transaction){
 return {income:t.kind==='income'&&t.accountingClass!=='principal'?t.amount:0,
  expense:t.kind==='expense'?t.amount:0,unallocated:0,estimated:false}
}
export const countedActual=(t:Transaction,reference=new Date())=>!t.deletedAt&&t.status==='completed'&&t.transactionDate<=localDay(reference)
export function reportQuality(transactions:Transaction[],currency:CurrencyCode,period:string,options:ReportOptions={}){
 const missingRates:string[]=[]
 let recognizedExpense=0
 for(const t of transactions.filter(t=>countedActual(t,options.reference)&&t.transactionDate.startsWith(period))){
  const parts=statisticalAmounts(t)
  if(!parts.income&&!parts.expense)continue
  const value=historicalValue(parts.expense||parts.income,t.currency,currency,t.transactionDate,options.rates)
  if(value===null){missingRates.push(t.id);continue}
  if(parts.expense)recognizedExpense+=value
 }
 // Preserve the shared presentation contract without inventing allocation gaps.
 return {provisional:missingRates.length>0,incomplete:missingRates.length>0,missingRates,
  unallocated:[] as string[],unallocatedAmount:0,estimated:[] as string[],estimatedExpense:0,
  componentGaps:[] as Array<{id:string;amount:number|null}>,previousExpense:recognizedExpense,recognizedExpense,expenseDifference:0}
}
