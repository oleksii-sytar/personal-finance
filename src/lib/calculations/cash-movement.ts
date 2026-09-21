import type {Account,CurrencyCode,Transaction} from '@/types/domain'
import {convert} from '@/lib/money/fx'
import {plannedAmount,isVisiblePlan} from '@/lib/planning/model'
import {historicalValue,countedActual,type ReportOptions} from '@/lib/money/statistical'
import {loanPaymentParts} from '@/lib/loans/accounting'
import type {liquidityForecast} from '@/lib/calculations/liquidity'
const cash=(a?:Account)=>!!a&&!a.isSavings&&['cash','bank_debit'].includes(a.type)
const debt=(a?:Account)=>!!a&&['credit_card','bank_loan','mortgage','microloan','personal_debt'].includes(a.type)
const round=(n:number)=>Math.round(n*100)/100
/** Cash/debit flow is not spending: internal cash exchanges cancel, card funding remains visible. */
export function cashMovement(accounts:Account[],transactions:Transaction[],currency:CurrencyCode,period:string,options:ReportOptions={}){
 const byId=new Map(accounts.map(a=>[a.id,a]))
 const rows=transactions.filter(t=>countedActual(t,options.reference)&&t.transactionDate.startsWith(period))
 let incoming=0,outgoing=0,loanPayments=0,cardRepayments=0,otherOutflows=0,creditCharges=0,principal=0,estimatedPrincipal=0,unallocated=0
 const loanRows=rows.filter(t=>!!t.loanAccountId)
 for(const t of rows){
  const a=byId.get(t.accountId),b=byId.get(t.counterAccountId||''),fx=(n:number,from:CurrencyCode)=>historicalValue(n,from,currency,t.transactionDate,options.rates)??0,value=fx(t.amount,t.currency)
  if(t.kind==='income'&&cash(a))incoming+=value
  if(t.kind==='expense'){
   if(cash(a)){outgoing+=value;if(t.loanAccountId)loanPayments+=value;else otherOutflows+=value}
   if(a?.type==='credit_card')creditCharges+=value
  }
  if(t.kind==='transfer'){
   if(cash(a)&&!cash(b)){outgoing+=value;if(b?.type==='credit_card')cardRepayments+=value;else if(debt(b))loanPayments+=value;else otherOutflows+=value}
   if(!cash(a)&&cash(b))incoming+=fx(t.counterAmount??t.amount,b!.currency)
  }
  if(t.loanAccountId){
   const p=loanPaymentParts(t)
   if(p.principal!==null){if(p.estimated)estimatedPrincipal+=fx(p.principal,t.currency);else principal+=convert(p.principal,t.currency,currency)}
   unallocated+=fx(p.unallocated,t.currency)
  }
 }
 return {incoming:round(incoming),outgoing:round(outgoing),net:round(incoming-outgoing),loanPayments:round(loanPayments),cardRepayments:round(cardRepayments),otherOutflows:round(otherOutflows),creditCharges:round(creditCharges),principal:round(principal),estimatedPrincipal:round(estimatedPrincipal),unallocated:round(unallocated),loanRows,count:rows.length}
}
export interface ForecastPaymentRow{id:string;date:string;name:string;accountId:string;accountName:string;loanAccountId:string|null;amount:number;currency:CurrencyCode;card:boolean;fundingGap:number;fromSchedule:boolean}
export function forecastPaymentRows(accounts:Account[],transactions:Transaction[],currency:CurrencyCode,from:string,through:string,forecast:ReturnType<typeof liquidityForecast>):ForecastPaymentRow[]{
 const byId=new Map(accounts.map(a=>[a.id,a])),cards=new Map(forecast.creditCards.payments.map(p=>[p.id,p]))
 return transactions.filter(t=>!t.deletedAt&&isVisiblePlan(t)&&t.status==='planned'&&t.transactionDate>=from&&t.transactionDate<=through&&t.kind!=='income').flatMap(t=>{
  const a=byId.get(t.accountId),b=byId.get(t.counterAccountId||'')
  if(!a||a.archivedAt||(!cash(a)&&a.type!=='credit_card')||(t.kind==='transfer'&&cash(a)&&cash(b)))return []
  return [{id:t.id,date:t.transactionDate,name:t.description.replace(/^(Платіж: |Непідтверджений платіж: )/,''),accountId:a.id,accountName:a.name,loanAccountId:t.loanAccountId||(debt(b)?b!.id:null),amount:round(convert(plannedAmount(t),t.currency,currency)),currency,card:a.type==='credit_card',fundingGap:cards.get(t.id)?.fundingGap||0,fromSchedule:t.id.startsWith('loan-plan:')}]
 }).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))
}
