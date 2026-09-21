import type {Account,Transaction} from '@/types/domain'
import type {automaticSpending} from './spending-model'
import {localDay} from './dates'

export type SpendingTrend=ReturnType<typeof automaticSpending>
export interface SpendingMembership {included:boolean;review:boolean;reason:string}
export const exclusionReason=(reason:string,purpose:'forecast'|'reserve'='forecast')=>({
 loan:'Кредитний платіж враховується лише окремими планами',
 one_off:'Позначено як разову витрату',
 scheduled:'Враховується лише окремими планами',
 category:purpose==='reserve'?'Категорію не обрано для резерву':'Категорію не обрано для щоденних витрат',
 missing_fx:'Немає курсу валюти на дату витрати',
}[reason]||'Поза доступною історією розрахунку')
export function spendingMembership(transactions:Transaction[],accounts:Account[],trend:SpendingTrend){
 const included=new Set(trend.ordinary.map(r=>r.id)),excluded=new Map(trend.exclusions.map(r=>[r.id,r.reason]))
 const review=new Set(trend.reviewRows.map(r=>r.id)),byAccount=new Map(accounts.map(a=>[a.id,a]))
 return new Map(transactions.map(t=>{
  let reason=''
  if(included.has(t.id))reason='Входить у розрахунок за '+trend.from+' - '+trend.to
  else if(excluded.has(t.id))reason=exclusionReason(excluded.get(t.id)!,trend.purpose)
  else if(t.deletedAt)reason='Транзакцію видалено'
  else if(t.kind!=='expense')reason='Це не витрата'
  else if(t.status==='planned')reason='План враховується окремо, це ще не фактична витрата'
  else if(t.transactionDate>=localDay())reason='Цей день ще не завершився'
  else if(t.transactionDate<trend.from)reason='Поза періодом розрахунку'
  else if(byAccount.get(t.accountId)?.archivedAt)reason='Рахунок архівовано'
  else reason='Поза доступною історією рахунку'
  return [t.id,{included:included.has(t.id),review:review.has(t.id),reason}] as const
 }))
}
