import type {Account,CurrencyCode,Transaction} from '@/types/domain'
import {automaticSpending,liquidityForecast,localDay} from './liquidity'
import {forecastPaymentRows} from './cash-movement'
import {reserveTarget,type SpendingOptions} from './spending-model'
import {plannedAmount,isVisiblePlan} from '@/lib/planning/model'
import {convert} from '@/lib/money/fx'
const round=(n:number)=>Math.round(n*100)/100
/** UI and MCP share this boundary: schedules are not an input to accounting. */
export function buildForecast(accounts:Account[],transactions:Transaction[],currency:CurrencyCode,through:string,reference=new Date(),bufferDays=7,options:SpendingOptions={}){
 const from=localDay(reference),trend=automaticSpending(accounts,transactions,currency,through,reference,options),reliable=trend.confidence==='history'
 const forecast=liquidityForecast(accounts,transactions,currency,through,reference,trend.canEstimate?undefined:0,options)
 const paymentRows=forecastPaymentRows(accounts,transactions,currency,from,through,forecast)
 const active=new Map(accounts.filter(a=>!a.archivedAt).map(a=>[a.id,a]))
 const cash=(a?:Account)=>!!a&&!a.isSavings&&['cash','bank_debit'].includes(a.type)
 const incomingRows=transactions.filter(t=>!t.deletedAt&&isVisiblePlan(t)&&t.status==='planned'&&t.transactionDate>=from&&t.transactionDate<=through).flatMap(t=>{
  const source=active.get(t.accountId),destination=active.get(t.counterAccountId||'')
  if(t.kind==='income'&&source&&['cash','bank_debit','credit_card'].includes(source.type))return [{id:t.id,amount:round(convert(plannedAmount(t),t.currency,currency))}]
  if(t.kind==='transfer'&&source&&!cash(source)&&cash(destination))return [{id:t.id,amount:round(convert(t.counterAmount??plannedAmount(t),destination!.currency,currency))}]
  return []
 })
 const summary={income:round(incomingRows.reduce((sum,t)=>sum+t.amount,0)),incomeCount:incomingRows.length,expense:round(paymentRows.reduce((sum,t)=>sum+t.amount,0)),expenseCount:paymentRows.length}
 const reserve=reserveTarget(accounts,transactions,currency,bufferDays,reference,options)
 let pessimistic=0,optimistic=0
 const points=forecast.points.map((p,i)=>{
  if(i>0&&trend.canEstimate){
   const discount=trend.monthlyDiscounts[p.date.slice(0,7)]||0
   const base=Math.max(0,trend.cashDailyBase-discount)
   pessimistic+=Math.max(0,Math.max(0,trend.highDailyBase-discount)-base)
   optimistic+=Math.max(0,base-Math.max(0,trend.lowDailyBase-discount))
  }
  return {...p,lower:round(p.balance-pessimistic),upper:round(p.balance+optimistic)}
 })
 return {forecast:{...forecast,points},trend,reliable,paymentRows,summary,reserve:reserve.amount,reserveDetails:reserve}
}
