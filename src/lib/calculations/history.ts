import type {Account,Transaction,HistoryCoverage} from '@/types/domain'
import {localDay,dayNumber,dayString} from './dates'
export {localDay,dayNumber,dayString}
export const SPENDING_HISTORY_DAYS=90
export const touches=(t:Transaction,id:string)=>t.accountId===id||t.counterAccountId===id||t.loanAccountId===id
export function coveredOn(rows:HistoryCoverage[],accountId:string,date:string){return rows.some(r=>r.accountId===accountId&&!r.invalidatedAt&&r.fromDate<=date&&r.toDate>=date)}
export function accountObservation(account:Account,transactions:Transaction[],coverage:HistoryCoverage[],reference=new Date()){
 const today=localDay(reference),end=dayNumber(today)-1,start=end-(SPENDING_HISTORY_DAYS-1)
 const actual=transactions.filter(t=>!t.deletedAt&&t.status==='completed'&&t.transactionDate<=today&&touches(t,account.id))
 const declared=coverage.filter(r=>r.accountId===account.id&&!r.invalidatedAt)
 const prior=actual.filter(t=>t.transactionDate<today),first=prior.map(t=>t.transactionDate).sort()[0]
 const observed:number[]=[],confirmed:number[]=[]
 for(let day=start;day<=end;day++){
  const date=dayString(day),row=declared.find(r=>r.fromDate<=date&&r.toDate>=date)
  if(row){confirmed.push(day);if(row.kind!=='not_open')observed.push(day)}
  else if(first&&date>=first)observed.push(day)
 }
 return {accountId:account.id,days:observed,confirmed,hasActivity:actual.length>0,needsCoverage:!declared.some(r=>r.toDate>=dayString(end)),inferred:observed.some(d=>!confirmed.includes(d))}
}
export function periodCoverage(accounts:Account[],coverage:HistoryCoverage[],from:string,to:string){
 const relevant=accounts.filter(a=>['cash','bank_debit','credit_card','savings'].includes(a.type)),missing:string[]=[]
 if(from>to)return {complete:false,missing:relevant.map(a=>a.id)}
 for(const a of relevant){
  for(let d=dayNumber(from);d<=dayNumber(to);d++)if(!coveredOn(coverage,a.id,dayString(d))){missing.push(a.id);break}
 }
 return {complete:relevant.length>0&&missing.length===0,missing}
}
