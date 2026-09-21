import type {Account,Category,CurrencyCode,ExchangeRate,HistoryCoverage,Transaction} from '@/types/domain'
import {accountObservation,SPENDING_HISTORY_DAYS} from './history'
import {localDay,dayNumber,dayString,addDays,monthEnd} from './dates'
import {plannedAmount,isVisiblePlan} from '@/lib/planning/model'
import {historicalValue,statisticalAmounts} from '@/lib/money/statistical'
import {convert} from '@/lib/money/fx'

export interface SpendingOptions {purpose?:'forecast'|'reserve';includeTodayBudget?:boolean;coverage?:HistoryCoverage[];categories?:Category[];rates?:ExchangeRate[]}
export const SPENDING_MODEL_VERSION='household-v5-transparent-budget'
const round=(n:number)=>Math.round(n*100)/100
const mean=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0
const quantile=(a:number[],p:number)=>{const b=[...a].sort((x,y)=>x-y);if(!b.length)return 0;const x=(b.length-1)*p,i=Math.floor(x);return b[i]+(b[Math.min(i+1,b.length-1)]-b[i])*(x-i)}
const words=(text:string)=>text.normalize('NFKC').toLocaleLowerCase('uk-UA').replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean)
const annotationWords=new Set(['оплата','платіж','готівкою','прогноз','план','щомісячна','щомісячний','щотижнева','щотижневий','сесія','uah','usd','eur','gbp','pln','грн'])

/** Preserve payees and purpose. Neither an empty name nor a generic prefix is an identity. */
export function spendingFlow(t:Transaction,categoryName?:string){
 if(t.flowKey?.trim())return 'explicit:'+t.flowKey.trim().toLocaleLowerCase('uk-UA')
 if(t.recurringTransactionId)return 'recurrence:'+t.recurringTransactionId
 let tokens=words(t.description)
 const category=words(categoryName||'')
 if(category.length&&category.every((word,i)=>tokens[i]===word))tokens=tokens.slice(category.length)
 const identity=tokens.filter(word=>!annotationWords.has(word)&&!/^\d+$/.test(word)).join(' ')
 return identity?(t.categoryId||'uncategorized')+'|'+(t.originalCurrency||t.currency)+'|'+identity:'unmatched:'+t.id
}
export function rollingOriginComparison(values:number[],horizon=7){
 let baseline=0,smoothing=0,folds=0
 for(let origin=14;origin+horizon<=values.length;origin+=horizon){
  const train=values.slice(0,origin),target=values.slice(origin,origin+horizon).reduce((s,v)=>s+v,0),average=mean(train)
  let level=train[0]||0;for(const value of train.slice(1))level=.2*value+.8*level
  baseline+=Math.abs(average*horizon-target);smoothing+=Math.abs(level*horizon-target);folds++
 }
 return {folds,baselineMAE:folds?round(baseline/folds):null,smoothingMAE:folds?round(smoothing/folds):null,horizon}
}
export function automaticSpending(accounts:Account[],transactions:Transaction[],currency:CurrencyCode,_end:string,reference=new Date(),options:SpendingOptions={}){
 const today=localDay(reference),last=addDays(today,-1)
 const eligible=accounts.filter(a=>!a.archivedAt&&['cash','bank_debit','credit_card','savings'].includes(a.type)),ids=new Set(eligible.map(a=>a.id))
 const categories=new Map((options.categories||[]).map(c=>[c.id,c]))
 const purpose=options.purpose??'forecast',field=purpose==='reserve'?'isEssential':'includeInDailyForecast'
 const included=(t:Transaction)=>categories.get(t.categoryId||'')?.[field]!==false
 const excludedCategoryIds=[...categories.values()].filter(c=>c.type==='expense'&&c[field]===false).map(c=>c.id).sort()
 const flow=(t:Transaction)=>spendingFlow(t,categories.get(t.categoryId||'')?.name)
 const actual=transactions.filter(t=>ids.has(t.accountId)&&!t.deletedAt&&t.status==='completed'&&t.transactionDate<today&&dayNumber(t.transactionDate)>=dayNumber(today)-SPENDING_HISTORY_DAYS)
 // One fixed planning window: changing the chart horizon must not change today's model.
 const plans=transactions.filter(t=>ids.has(t.accountId)&&!t.deletedAt&&isVisiblePlan(t)&&t.status==='planned'&&t.kind==='expense'&&t.transactionDate>=today&&t.transactionDate<=addDays(today,365))
 const groups=new Map<string,Transaction[]>(),futureGroups=new Map<string,Transaction[]>()
 for(const t of actual.filter(t=>t.kind==='expense'&&included(t))){const key=flow(t);groups.set(key,[...(groups.get(key)||[]),t])}
 for(const t of plans){const key=flow(t);futureGroups.set(key,[...(futureGroups.get(key)||[]),t])}
 const fixedStreams=new Set<string>(),inferredStreams=new Set<string>()
 const nominal=(t:Transaction)=>t.originalAmount&&t.originalCurrency?t.originalAmount:t.amount
 for(const [key,rows] of groups){
  const upcoming=futureGroups.get(key)
  if(!upcoming||key.startsWith('unmatched:'))continue
  if(rows.some(t=>t.flowKey?.trim()||t.recurringTransactionId||t.forecastBehavior==='scheduled')||upcoming.some(t=>t.forecastBehavior==='scheduled')){fixedStreams.add(key);continue}
  const dates=[...new Set(rows.map(t=>dayNumber(t.transactionDate)))].sort((a,b)=>a-b)
  const gaps=dates.slice(1).map((d,i)=>d-dates[i]),average=mean(rows.map(nominal))
  // A sparse, same-purpose, same-currency obligation can be covered by a real plan.
  // A supermarket's frequent or materially different purchases are not erased.
  if(average>0&&gaps.every(g=>g>=5)&&rows.every(t=>Math.abs(nominal(t)-average)<=average*.05)&&upcoming.some(t=>Math.abs(nominal(t)-average)<=average*.05)){
   fixedStreams.add(key);inferredStreams.add(key)
  }
 }
 const observations=eligible.map(a=>accountObservation(a,transactions,options.coverage||[],reference))
 const allDays=[...new Set(observations.flatMap(a=>a.days))].sort((a,b)=>a-b)
 const byDay=new Map(allDays.map(d=>[dayString(d),0]))
 const flowDaily=new Map<string,number>(),flowEssential=new Map<string,boolean>()
 const streams=new Map<string,{name:string;amount:number;count:number;scheduled:boolean}>()
 const exclusions:Array<{id:string;date:string;name:string;accountId:string;amount:number;reason:'loan'|'one_off'|'scheduled'|'category'|'missing_fx'}>=[]
 const ordinary:Array<{id:string;date:string;name:string;accountId:string;amount:number;days:number;daily:number;flow:string;explicit:boolean}>=[]
 const accountBreakdown:Array<{id:string;name:string;days:number;count:number;amount:number;daily:number}>=[]
 let daily=0,essentialDaily=0,sampleCount=0,missingFx=0,irregular=0,scheduled=0
 for(const account of eligible){
  const observation=observations.find(o=>o.accountId===account.id)!,days=observation.days.length
  if(!days)continue
  const observed=new Set(observation.days.map(dayString))
  let accountAmount=0,accountCount=0
  for(const t of actual.filter(t=>t.accountId===account.id&&observed.has(t.transactionDate)&&t.kind==='expense')){
   const key=flow(t),linkedLoan=t.accountingClass==='principal'||!!t.loanAccountId
   const value=historicalValue(linkedLoan?t.amount:statisticalAmounts(t).expense,t.currency,currency,t.transactionDate,options.rates)
   const reason=linkedLoan?'loan':!included(t)?'category':t.forecastBehavior==='one_off'?'one_off':t.forecastBehavior==='scheduled'||!!t.recurringTransactionId||fixedStreams.has(key)?'scheduled':null
   if(!linkedLoan)sampleCount++
   if(reason){
    exclusions.push({id:t.id,date:t.transactionDate,name:t.description,accountId:t.accountId,amount:value??0,reason})
    if(reason==='one_off')irregular+=value??0
    if(reason==='scheduled'){scheduled+=value??0;const old=streams.get(key);streams.set(key,{name:t.description,amount:(old?.amount||0)+(value??0),count:(old?.count||0)+1,scheduled:true})}
    continue
   }
   if(value===null){missingFx++;exclusions.push({id:t.id,date:t.transactionDate,name:t.description,accountId:t.accountId,amount:0,reason:'missing_fx'});continue}
   const contribution=value/days,essential=categories.get(t.categoryId||'')?.isEssential!==false
   ordinary.push({id:t.id,date:t.transactionDate,name:t.description,accountId:t.accountId,amount:value,days,daily:contribution,flow:key,explicit:!!t.flowKey?.trim()})
   flowDaily.set(key,(flowDaily.get(key)||0)+contribution);flowEssential.set(key,essential)
   daily+=contribution;if(essential)essentialDaily+=contribution
   accountAmount+=value;accountCount++
   byDay.set(t.transactionDate,(byDay.get(t.transactionDate)||0)+contribution*allDays.length)
  }
  accountBreakdown.push({id:account.id,name:account.name,days,count:accountCount,amount:round(accountAmount),daily:round(accountAmount/days)})
 }
 // Large sparse observations are review candidates, not errors or permission to remove spending.
 // Tukey's outer fence is a diagnostic only; see NIST EDA 1.3.3.7.
 const amounts=ordinary.map(r=>r.amount),q1=quantile(amounts,.25),q3=quantile(amounts,.75)
 const reviewThreshold=Math.max(q3+3*(q3-q1),q3*3)
 const reviewRows=ordinary.length>=8?ordinary.filter(r=>!r.explicit&&r.amount>reviewThreshold&&new Set((groups.get(r.flow)||[]).map(t=>t.transactionDate)).size<3):[]
 const unplannedStreams=[...streams].filter(([key])=>!futureGroups.has(key)).map(([,value])=>value)
 const values=allDays.map(d=>byDay.get(dayString(d))||0),comparison=rollingOriginComparison(values),longComparison=rollingOriginComparison(values,14)
 const missingCoverage=observations.filter(o=>o.needsCoverage||o.inferred).map(o=>o.accountId)
 const complete=eligible.length>0&&observations.every(o=>!o.needsCoverage&&!o.inferred)
 const uniform=observations.every(o=>!o.days.length||o.days.length===allDays.length)
 const hasHistory=allDays.length>0&&(sampleCount>0||complete),canEstimate=hasHistory&&missingFx===0
 const interpretable=reviewRows.length===0&&inferredStreams.size===0&&unplannedStreams.length===0
 const evaluated=complete&&uniform&&comparison.folds>=3&&longComparison.folds>=3
 const useSmoothing=evaluated&&interpretable&&(comparison.smoothingMAE??Infinity)<(comparison.baselineMAE??0)*.95&&(longComparison.smoothingMAE??Infinity)<(longComparison.baselineMAE??0)*.95
 let level=values[0]||0;for(const value of values.slice(1))level=.2*value+.8*level
 const meanDaily=daily,scale=useSmoothing&&daily?level/daily:1
 if(useSmoothing){daily*=scale;essentialDaily*=scale}
 const plannedByFlow=new Map<string,{month:string;flow:string;value:number;days:number}>()
 const monthlyDiscounts:Record<string,number>={},essentialDiscounts:Record<string,number>={}
 for(const t of plans){
  const key=flow(t);if(!flowDaily.has(key))continue
  const month=t.transactionDate.slice(0,7)
  const first=Math.max(dayNumber(addDays(today,1)),dayNumber(month+'-01')),count=dayNumber(monthEnd(month))-first+1
  if(count<=0||t.transactionDate<=today)continue
  const value=convert(plannedAmount(t),t.currency,currency),budgetKey=month+'|'+key,old=plannedByFlow.get(budgetKey)
  plannedByFlow.set(budgetKey,{month,flow:key,value:(old?.value||0)+value,days:count})
 }
 const planAdjustments:Array<{month:string;flow:string;daily:number;planned:number;days:number}>=[]
 for(const {month,flow:key,value,days} of plannedByFlow.values()){
  const discount=Math.min((flowDaily.get(key)||0)*scale,value/days)
  monthlyDiscounts[month]=(monthlyDiscounts[month]||0)+discount
  if(flowEssential.get(key))essentialDiscounts[month]=(essentialDiscounts[month]||0)+discount
  planAdjustments.push({month,flow:key,daily:round(discount),planned:round(value),days})
 }
 const blocks:number[]=[];for(let i=0;i+7<=values.length;i++)blocks.push(mean(values.slice(i,i+7)))
 const baseDaily=daily,baseEssential=essentialDaily
 const lowDailyBase=Math.min(baseDaily,blocks.length?quantile(blocks,.2):baseDaily*.5)
 const highDailyBase=Math.max(baseDaily*1.35,blocks.length?quantile(blocks,.8):baseDaily*1.75)
 const discount=monthlyDiscounts[today.slice(0,7)]||0
 daily=Math.max(0,baseDaily-discount);essentialDaily=Math.max(0,baseEssential-(essentialDiscounts[today.slice(0,7)]||0))
 const days=allDays.length,confidence=!canEstimate?'plans_only':evaluated&&interpretable?'history':'preliminary'
 return {version:SPENDING_MODEL_VERSION,purpose,lookbackDays:SPENDING_HISTORY_DAYS,excludedCategoryIds,daily:round(daily),cashDaily:round(daily),cashDailyBase:baseDaily,essentialDaily:round(essentialDaily),baseEssential,
  essentialDiscounts,monthlyDiscounts,planAdjustments,days,sampleCount,variableSampleCount:ordinary.length,hasHistory,canEstimate,provisional:confidence!=='history',
  partialDay:days===0,unknownAccounts:missingCoverage.length,missingCoverage,missingFx,recurringStreams:streams.size,streams:[...streams.values()],
  inferredStreams:inferredStreams.size,unplannedStreams,reviewRows,reviewThreshold:round(reviewThreshold),accountBreakdown,ordinary,exclusions,meanDaily:round(meanDaily),
  excludedOneOff:round(irregular),scheduledHistory:round(scheduled),from:allDays.length?dayString(allDays[0]):today,to:last,confidence,
  method:useSmoothing?'ses':'mean',comparison,longComparison,lowDailyBase,highDailyBase,
  lowDaily:round(Math.max(0,lowDailyBase-discount)),highDaily:round(Math.max(0,highDailyBase-discount))}
}
export function reserveTarget(accounts:Account[],transactions:Transaction[],currency:CurrencyCode,days:number,reference=new Date(),options:SpendingOptions={}){
 const from=localDay(reference),duration=Number.isFinite(days)?Math.max(1,Math.min(365,Math.round(days))):1
 const through=addDays(from,duration-1),trend=automaticSpending(accounts,transactions,currency,through,reference,{...options,purpose:'reserve'})
 const categories=new Map((options.categories||[]).map(c=>[c.id,c])),byId=new Map(accounts.filter(a=>!a.archivedAt).map(a=>[a.id,a]))
 const scheduled=transactions.filter(t=>byId.has(t.accountId)&&!t.deletedAt&&isVisiblePlan(t)&&t.status==='planned'&&t.transactionDate>=from&&t.transactionDate<=through&&categories.get(t.categoryId||'')?.isEssential!==false).reduce((sum,t)=>{
  const target=byId.get(t.counterAccountId||''),essential=t.kind==='expense'||t.kind==='transfer'&&target&&['credit_card','bank_loan','mortgage','microloan','personal_debt'].includes(target.type)
  return sum+(essential?convert(plannedAmount(t),t.currency,currency):0)
 },0)
 // Identical to the forecast: actual balances already include today's spending.
 let variable=0;for(let d=dayNumber(from)+1;d<=dayNumber(through);d++)variable+=Math.max(0,trend.baseEssential-(trend.essentialDiscounts[dayString(d).slice(0,7)]||0))
 return {amount:trend.canEstimate?round(variable+scheduled):null,scheduled:round(scheduled),variable:round(variable),daily:trend.essentialDaily,confidence:trend.confidence,through,trend}
}
