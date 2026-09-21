import type {Transaction} from '@/types/domain'
import type {LedgerFilter,TransactionCursor,TransactionPage,TransactionSelection} from './repository'
import {needsReview,pendingForAccount,touchesAccount} from '@/lib/reconciliation/model'
import {matchesCategory,isVisiblePlan} from '@/lib/planning/model'
import {localDay} from '@/lib/calculations/liquidity'
export const TRANSACTION_PAGE_SIZE=50
export const BULK_SELECTION_LIMIT=5000
export function hasLedgerFilters(f:LedgerFilter){return !!(f.accountId||f.categoryId||f.kind||f.search?.trim()||f.from||f.to||f.deletedOnly||f.pendingAccountId||f.importBatchId||f.ids?.length)}
/** Mock adapter and tests use the same filter contract as the server RPC. */
export function matchesLedger(t:Transaction,f:LedgerFilter){
 return isVisiblePlan(t)&&!!t.deletedAt===!!f.deletedOnly&&matchesCategory(t,f.categoryId||'')
  &&(!f.accountId||touchesAccount(t,f.accountId))&&(!f.kind||t.kind===f.kind)&&(!f.status||t.status===f.status)
  &&(!f.from||t.transactionDate>=f.from)&&(!f.to||t.transactionDate<=f.to)
  &&(!f.importBatchId||t.importBatchId===f.importBatchId||t.counterImportBatchId===f.importBatchId)
  &&(!f.ids?.length||f.ids.includes(t.id))&&(!f.pendingAccountId||pendingForAccount(t,f.pendingAccountId))
  &&(!f.needsReview||needsReview(t))&&(!f.search?.trim()||(t.description+' '+(t.notes||'')).toLocaleLowerCase().includes(f.search.trim().toLocaleLowerCase()))
}
export const transactionSelection=(t:Transaction):TransactionSelection=>({id:t.id,updatedAt:t.updatedAt,currency:t.currency,kind:t.kind,counterAccountId:t.counterAccountId,deletedAt:t.deletedAt})

type TransactionPosition=Pick<Transaction,'transactionDate'|'createdAt'|'id'>
export function compareTransactionPositions(a:TransactionPosition,b:TransactionPosition,order:'asc'|'desc'='desc'){
 const direction=order==='asc'?1:-1
 return direction*(a.transactionDate.localeCompare(b.transactionDate)||Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.id.localeCompare(b.id))
}
/** History previews must scope, sort, then limit. Never slice a mixed actual/plan snapshot. */
export function recentTransactions(rows:Transaction[],{accountId,limit=12,through=localDay()}:{accountId?:string;limit?:number;through?:string}={}){
 const filter:LedgerFilter={accountId,status:'completed',to:through}
 return rows.filter(t=>matchesLedger(t,filter)).sort((a,b)=>compareTransactionPositions(a,b)).slice(0,Math.max(0,Math.floor(limit)))
}

export function pageTransactions(rows:Transaction[],filter:LedgerFilter,cursor?:TransactionCursor,snapshot=new Date().toISOString()):TransactionPage{
 const beforeSnapshot=rows.filter(t=>Date.parse(t.createdAt)<=Date.parse(snapshot))
 const order=filter.status==='planned'?'asc':'desc'
 if(cursor&&(cursor.order??'desc')!==order)throw new Error('Порядок списку змінився. Оновіть транзакції, щоб завантажити найближчі плани.')
 const compare=(a:TransactionPosition,b:TransactionPosition)=>compareTransactionPositions(a,b,order)
 const filtered=beforeSnapshot.filter(t=>matchesLedger(t,filter)).sort(compare)
 const after=cursor?filtered.filter(t=>compare(t,{transactionDate:cursor.date,createdAt:cursor.created,id:cursor.id})>0):filtered
 const items=after.slice(0,TRANSACTION_PAGE_SIZE),last=items.at(-1)
 return {items,total:filtered.length,reviewCount:rows.filter(needsReview).length,snapshot,nextCursor:after.length>items.length&&last?{date:last.transactionDate,created:last.createdAt,id:last.id,order}:null}
}