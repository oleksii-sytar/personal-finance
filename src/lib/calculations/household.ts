import type {Account,CurrencyCode,FinancialModelData,ExchangeRate,WorkspaceMember,ForecastSnapshot} from '@/types/domain'
import {spendingPowerSummary} from '@/lib/money/balances'
import {convert} from '@/lib/money/fx'
import {historicalValue} from '@/lib/money/statistical'
export const isSavingsAccount=(a:Account)=>!a.archivedAt&&(a.type==='savings'||a.isSavings===true)
export const savingsTotal=(accounts:Account[],currency:CurrencyCode)=>accounts.filter(isSavingsAccount).reduce((sum,a)=>sum+convert(Math.max(0,a.currentBalance),a.currency,currency),0)
export function ownerResources(accounts:Account[],members:WorkspaceMember[],currency:CurrencyCode){
 const groups=new Map<string,Account[]>()
 for(const a of accounts.filter(a=>!a.archivedAt)){const key=a.isShared?'shared':a.ownerUserId||'unknown';groups.set(key,[...(groups.get(key)||[]),a])}
 return [...groups].map(([id,rows])=>({id,name:id==='shared'?'Спільні':id==='unknown'?'Без власника':members.find(m=>m.userId===id)?.displayName||'Учасник сім’ї',own:spendingPowerSummary(rows,currency).ownFunds,savings:savingsTotal(rows,currency)}))
}
export function positionHistory(model:FinancialModelData,currency:CurrencyCode,rates:ExchangeRate[]){
 return model.positions.map(s=>{
  let assets=0,debt=0,savings=0,missing=false
  for(const a of s.accounts){const value=historicalValue(a.currentBalance,a.currency,currency,s.date,rates);if(value===null){missing=true;continue}if(value>=0)assets+=value;else debt-=value;if(isSavingsAccount(a))savings+=Math.max(0,value)}
  return {date:s.date,assets:missing?null:assets,debt:missing?null:debt,savings:missing?null:savings,net:missing?null:assets-debt}
 }).sort((a,b)=>a.date.localeCompare(b.date))
}
export function scoreForecast(snapshot:ForecastSnapshot,actual:Array<{date:string;balance:number}>){
 const truth=new Map(actual.map(p=>[p.date,p.balance])),pairs=snapshot.points.filter(p=>p.date>snapshot.asOf&&truth.has(p.date))
 if(!pairs.length)return null
 return {count:pairs.length,mae:pairs.reduce((s,p)=>s+Math.abs(p.balance-truth.get(p.date)!),0)/pairs.length,minPredicted:Math.min(...pairs.map(p=>p.balance)),minActual:Math.min(...pairs.map(p=>truth.get(p.date)!)),shortfallMissed:pairs.some(p=>p.balance>=0&&truth.get(p.date)!<0)}
}

/** Evaluate frozen forecasts only against subsequently recorded completed dates. */
export function forecastEvaluations(model:FinancialModelData,rates:ExchangeRate[],reference=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(reference)
 return model.forecasts.map(snapshot=>{
  const actual=model.positions.filter(p=>p.date>snapshot.asOf&&p.date<today).flatMap(p=>{
   let balance=0,missing=false
   for(const a of p.accounts.filter(a=>!a.archivedAt&&!a.isSavings&&['cash','bank_debit','credit_card'].includes(a.type))){const value=historicalValue(Math.max(0,a.currentBalance),a.currency,snapshot.currency,p.date,rates);if(value===null)missing=true;else balance+=value}
   return missing?[]:[{date:p.date,balance}]
  })
  return {...snapshot,score:scoreForecast(snapshot,actual)}
 }).filter(s=>s.score).sort((a,b)=>b.asOf.localeCompare(a.asOf)).slice(0,10)
}
