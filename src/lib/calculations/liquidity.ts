import type {Account,CurrencyCode,Transaction} from '@/types/domain'
import {plannedAmount,isVisiblePlan} from '@/lib/planning/model'
import {convert} from '@/lib/money/fx'
import {automaticSpending,type SpendingOptions} from './spending-model'
import {localDay,dayNumber,dayString} from './dates'
export {automaticSpending} from './spending-model'
export {localDay} from './dates'
const round=(n:number)=>Math.round(n*100)/100
export const safetyReserve=(daily:number,days:number)=>Math.ceil(Math.max(0,daily)*Math.max(1,Math.min(365,Math.round(days)))*100)/100

export interface CardForecastPayment {
 id:string;date:string;description:string;accountId:string;accountName:string;
 loanAccountId:string|null;loanInstallmentId:string|null;
 amount:number;ownFundsUsed:number;fundingGap:number;availableBefore:number;
 accountAmount:number;accountCurrency:CurrencyCode;projectedAccountBalance:number
}
/** Own funds include positive card balances; borrowing capacity stays separate. */
export function liquidityForecast(accounts:Account[],transactions:Transaction[],currency:CurrencyCode,end:string,reference=new Date(),dailyBudget?:number,modelOptions:SpendingOptions={}){
 const today=localDay(reference)
 const automatic=automaticSpending(accounts,transactions,currency,end,reference,modelOptions)
 const liquid=accounts.filter(a=>!a.archivedAt&&!a.isSavings&&(a.type==='cash'||a.type==='bank_debit'))
 const ids=new Set(liquid.map(a=>a.id))
 const cards=accounts.filter(a=>!a.archivedAt&&a.type==='credit_card')
 const cardById=new Map(cards.map(a=>[a.id,a]))
 const cardBalances=new Map(cards.map(a=>[a.id,a.currentBalance]))
 const payments:CardForecastPayment[]=[]
 let balance=liquid.reduce((sum,a)=>sum+convert(Math.max(0,a.currentBalance),a.currency,currency),0)+cards.reduce((sum,a)=>sum+convert(Math.max(0,a.currentBalance),a.currency,currency),0)
 const opening=balance
 const points:Array<{date:string;balance:number;income:number;expense:number;labels:string[];cardOutflow:number;creditOutflow:number;cardFundingGap:number;cardPayments:CardForecastPayment[]}>=[]
 const firstDay=dayNumber(today)
 for(let i=0;i<=366;i++){
  const date=dayString(firstDay+i)
  if(date>end)break
  const budget=dailyBudget??(automatic.canEstimate?Math.max(0,automatic.cashDailyBase-(automatic.monthlyDiscounts[date.slice(0,7)]||0)):0)
  let income=0,expense=i===0?0:Math.max(0,budget)
  const labels:string[]=[],cardPayments:CardForecastPayment[]=[]
  const dayPlans=transactions.filter(t=>!t.deletedAt&&isVisiblePlan(t)&&t.status==='planned'&&t.transactionDate===date)
  // Dates have no guaranteed settlement order: assume same-day credits arrive first.
  const ownCredits=new Map<string,number>()
  for(const t of dayPlans){
   const own=t.kind==='income'?cardById.get(t.accountId):undefined
   const destination=t.kind==='transfer'&&t.counterAccountId?cardById.get(t.counterAccountId):undefined
   const target=own||destination
   if(target){
    const before=cardBalances.get(target.id)!
    const amount=own?convert(plannedAmount(t),t.currency,target.currency):(t.counterAmount??convert(plannedAmount(t),t.currency,target.currency))
    const after=round(before+amount)
    cardBalances.set(target.id,after)
    ownCredits.set(t.id,convert(Math.max(0,after)-Math.max(0,before),target.currency,currency))
   }
  }
  for(const t of dayPlans){
   let delta=ownCredits.get(t.id)||0
   if(ids.has(t.accountId))delta+=(t.kind==='income'?1:-1)*convert(plannedAmount(t),t.currency,currency)
   if(t.kind==='transfer'&&t.counterAccountId&&ids.has(t.counterAccountId)){
    const destination=liquid.find(a=>a.id===t.counterAccountId)!
    delta+=convert(t.counterAmount??convert(plannedAmount(t),t.currency,destination.currency),destination.currency,currency)
   }
   const card=t.kind!=='income'?cardById.get(t.accountId):undefined
   if(card){
    const accountAmount=round(convert(plannedAmount(t),t.currency,card.currency))
    const before=cardBalances.get(card.id)!
    const availableBefore=Math.max(0,before+Math.max(0,card.creditLimit??0))
    const projectedAccountBalance=round(before-accountAmount)
    const ownFundsUsed=round(convert(Math.max(0,before)-Math.max(0,projectedAccountBalance),card.currency,currency))
    delta-=ownFundsUsed
    const payment:CardForecastPayment={
     id:t.id,date,description:t.description,accountId:card.id,accountName:card.name,
     loanAccountId:t.loanAccountId??null,loanInstallmentId:t.loanInstallmentId??null,
     amount:round(convert(accountAmount,card.currency,currency)),ownFundsUsed,
     fundingGap:round(convert(Math.max(0,accountAmount-availableBefore),card.currency,currency)),
     availableBefore:round(convert(availableBefore,card.currency,currency)),
     accountAmount,accountCurrency:card.currency,projectedAccountBalance
    }
    cardBalances.set(card.id,projectedAccountBalance)
    cardPayments.push(payment);payments.push(payment)
   }
   if(delta>0)income+=delta;else expense-=delta
   if(delta!==0||card||ownCredits.has(t.id))labels.push(t.description)
  }
  balance+=income-expense
  points.push({date,balance:round(balance),income:round(income),expense:round(expense),labels,
   cardOutflow:round(cardPayments.reduce((s,p)=>s+p.amount,0)),
   creditOutflow:round(cardPayments.reduce((s,p)=>s+Math.max(0,p.amount-p.ownFundsUsed),0)),
   cardFundingGap:round(cardPayments.reduce((s,p)=>s+p.fundingGap,0)),cardPayments})

 }
 const creditCards={
  payments,totalOutflow:round(payments.reduce((s,p)=>s+p.amount,0)),
  totalFundingGap:round(payments.reduce((s,p)=>s+p.fundingGap,0)),
  accounts:cards.map(a=>{
   const projectedBalance=cardBalances.get(a.id)!,limit=Math.max(0,a.creditLimit??0)
   return {accountId:a.id,name:a.name,currency:a.currency,openingBalance:a.currentBalance,projectedBalance,
    projectedDebt:round(Math.max(0,-projectedBalance)),
    availableToSpend:round(Math.max(0,projectedBalance+limit)),
    availableCredit:round(Math.max(0,limit-Math.max(0,-projectedBalance)))}
  })
 }
 return {opening,points,automatic,creditCards,overdue:transactions.filter(t=>isVisiblePlan(t)&&!t.deletedAt&&t.status==='planned'&&t.transactionDate<today)}
}