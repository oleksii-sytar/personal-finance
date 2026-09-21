import type {Account, CurrencyCode, Transaction} from '@/types/domain'
import type {BalanceContext, BalanceSnapshot} from '@/lib/data/repository'
import {localDay} from './liquidity'
import {isAfterBalanceAnchor, transactionEffect} from '@/lib/money/balances'
import {convert} from '@/lib/money/fx'

const round=(n:number)=>Math.round(n*100)/100
const spending=(a:Account)=>['cash','bank_debit','credit_card'].includes(a.type)
const activeOn=(a:Account,date:string)=>!a.archivedAt||localDay(new Date(a.archivedAt))>date
const valid=(s:BalanceSnapshot)=>Number.isFinite(s.amount)&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&Number.isFinite(Date.parse(s.at))
const postedAfter=(t:Transaction,account:Account,snapshot:BalanceSnapshot)=>{
 const posted=t.accountId===account.id?t.balancePostedAt:t.counterAccountId===account.id?t.counterBalancePostedAt:t.loanAccountId===account.id?t.loanBalancePostedAt:null
 // Old demo records lack posting stamps; production NULL means already included history.
 return posted===undefined?Date.parse(t.createdAt)>Date.parse(snapshot.at):isAfterBalanceAnchor(t,{...account,balanceAnchorAt:snapshot.at})
}

/** Reconstruct each account from a snapshot and its actual movements, not report totals. */
export function accountBalanceAt(account:Account,snapshots:BalanceSnapshot[],transactions:Transaction[],date:string,today:string):number|null{
 if(date>today)return null
 if(date===today)return account.currentBalance
 const candidates:BalanceSnapshot[]=[...snapshots.filter(s=>s.accountId===account.id),
  {accountId:account.id,amount:account.openingBalance,date:localDay(new Date(account.createdAt)),at:account.createdAt}]
 if(account.balanceAnchorAt&&account.balanceAnchorDate&&account.balanceAnchorAmount!=null)
  candidates.push({accountId:account.id,amount:account.balanceAnchorAmount,date:account.balanceAnchorDate,at:account.balanceAnchorAt})
 const known=candidates.filter(s=>valid(s)&&s.date<=today).sort((a,b)=>b.date.localeCompare(a.date)||Date.parse(b.at)-Date.parse(a.at))
 const actual=transactions.filter(t=>!t.deletedAt&&t.status==='completed'&&t.transactionDate<=today&&
  (t.accountId===account.id||t.counterAccountId===account.id||t.loanAccountId===account.id))
 const anchor=known.find(s=>s.date<=date)
 if(anchor){
  let balance=anchor.amount
  for(const t of actual){
   if(t.transactionDate<=date&&postedAfter(t,account,anchor))balance+=transactionEffect(t,account)
  }
  return round(balance)
 }
 const later=known[0]
 if(!later)return null
 // Recover the first recorded month's opening, not arbitrary years before any history.
 const first=[...known.map(s=>s.date),...actual.map(t=>t.transactionDate)].sort()[0]
 const firstOpening=localDay(new Date(Number(first.slice(0,4)),Number(first.slice(5,7))-1,0,12))
 if(date<firstOpening)return null
 let balance=later.amount
 for(const t of actual){
  const effect=transactionEffect(t,account)
  if(postedAfter(t,account,later)){
   // A late-entered earlier transaction was not yet included in the snapshot.
   if(t.transactionDate<=date)balance+=effect
  }else if(t.transactionDate>date&&t.transactionDate<=later.date){
   // Reverse included history even when imported after the snapshot without reposting.
   balance-=effect
  }
 }
 return round(balance)
}
export interface PeriodFunds {
 opening:number|null;closing:number|null;change:number|null;
 from:string;through:string;current:boolean;future:boolean;
 missingOpening:string[];missingClosing:string[]
}
/** The same boundary is September's closing and October's opening. Limits are never money. */
export function periodFunds(context:BalanceContext,transactions:Transaction[],currency:CurrencyCode,period:string,reference=new Date()):PeriodFunds{
 if(!/^\d{4}(-(?:0[1-9]|1[0-2]))?$/.test(period))throw new Error('Некоректний період')
 const [year,month]=period.split('-').map(Number),yearly=!month,today=localDay(reference)
 const from=year+'-'+(yearly?'01':String(month).padStart(2,'0'))+'-01'
 const last=localDay(new Date(year,yearly?12:month,0,12))
 const previous=localDay(new Date(year,yearly?0:month-1,0,12))
 const future=from>today,through=last<today?last:today
 const totalAt=(date:string)=>{
  let amount=0;const missing:string[]=[]
  for(const a of context.accounts.filter(a=>spending(a)&&activeOn(a,date))){
   const balance=accountBalanceAt(a,context.snapshots,transactions,date,today)
   if(balance===null){missing.push(a.id);continue}
   amount+=convert(Math.max(0,balance),a.currency,currency)
  }
  return {amount:missing.length?null:round(amount),missing}
 }
 const opening=future?{amount:null,missing:[]}:totalAt(previous)
 const closing=future?{amount:null,missing:[]}:totalAt(through)
 return {opening:opening.amount,closing:closing.amount,change:opening.amount!==null&&closing.amount!==null?round(closing.amount-opening.amount):null,
  from,through:future?last:through,current:!future&&today<=last,future,missingOpening:opening.missing,missingClosing:closing.missing}
}