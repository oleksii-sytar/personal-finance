import {describe,it,expect} from 'vitest'
import {pageTransactions,matchesLedger,hasLedgerFilters,transactionSelection} from '@/lib/data/ledger-filter'
import {makeTxn} from './_factories'
const stamp='2026-09-15T12:00:00Z'
const rows=Array.from({length:135},(_,i)=>makeTxn({id:String(i).padStart(5,'0'),transactionDate:'2026-09-10',createdAt:'2026-09-10T12:00:00Z',categoryId:'food'}))
describe('Bounded ledger pagination and explicit selection',()=>{
 it('returns 50, 50 and 35 stable unique rows even when dates and timestamps tie',()=>{
  const a=pageTransactions(rows,{status:'completed'},undefined,stamp),b=pageTransactions(rows,{status:'completed'},a.nextCursor!,a.snapshot),c=pageTransactions(rows,{status:'completed'},b.nextCursor!,b.snapshot)
  expect([a.items.length,b.items.length,c.items.length]).toEqual([50,50,35])
  expect(a.total).toBe(135);expect(new Set([...a.items,...b.items,...c.items].map(t=>t.id)).size).toBe(135);expect(c.nextCursor).toBeNull()
 })
 it('filters and counts before pagination, not after slicing',()=>{
  const input=rows.map((t,i)=>({...t,categoryId:i%2?'food':'other'})),page=pageTransactions(input,{categoryId:'food'},undefined,stamp)
  expect(page.total).toBe(67);expect(page.items).toHaveLength(50);expect(page.items.every(t=>t.categoryId==='food')).toBe(true)
 })
 it('does not expose select-all for a status tab without actual filters',()=>{
  expect(hasLedgerFilters({status:'completed',needsReview:true})).toBe(false)
  expect(hasLedgerFilters({search:'  '})).toBe(false)
  expect(hasLedgerFilters({categoryId:'food'})).toBe(true)
 })
 it('keeps new records out of an in-progress snapshot',()=>{
  const first=pageTransactions(rows,{},undefined,stamp),newRow=makeTxn({createdAt:'2026-09-15T12:01:00Z'})
  expect(pageTransactions([...rows,newRow],{},first.nextCursor!,first.snapshot).total).toBe(135)
 })
 it('includes both transfer legs and loan legs in account filtering',()=>{
  const t=makeTxn({accountId:'source',counterAccountId:'target',loanAccountId:'loan'})
  for(const accountId of ['source','target','loan'])expect(matchesLedger(t,{accountId})).toBe(true)
 })
 it('uses the verification of the selected leg, not another account',()=>{
  const t=makeTxn({accountId:'source',counterAccountId:'target',kind:'transfer',accountVerifiedAt:stamp,counterVerifiedAt:null})
  expect(matchesLedger(t,{pendingAccountId:'target'})).toBe(true);expect(matchesLedger(t,{pendingAccountId:'source'})).toBe(false)
 })
 it('handles uncategorized, deleted and suspended rows explicitly',()=>{
  expect(matchesLedger(makeTxn({categoryId:null}),{categoryId:'none'})).toBe(true)
  expect(matchesLedger(makeTxn({deletedAt:stamp}),{})).toBe(false)
  expect(matchesLedger(makeTxn({deletedAt:stamp}),{deletedOnly:true})).toBe(true)
  expect(matchesLedger(makeTxn({status:'planned',recurrenceSuspended:true}),{status:'planned'})).toBe(false)
 })
 it('keeps IDs and original versions for safe bulk updates',()=>{
  const selected=transactionSelection(rows[0]);expect(selected.updatedAt).toBe(rows[0].updatedAt);expect(selected.id).toBe(rows[0].id)
  expect(selected).not.toHaveProperty('description')
 })
})

describe('Planned transactions are paged nearest first',()=>{
 const plans=Array.from({length:135},(_,i)=>makeTxn({
  id:i===1?'rent-tomorrow':String(i).padStart(5,'0'),
  status:'planned',completedAt:null,
  transactionDate:new Date(Date.UTC(2026,8,15+i)).toISOString().slice(0,10),
  createdAt:'2026-09-10T12:00:00Z',
 })).reverse()
 it('includes tomorrow on the first page even with more than 50 future plans',()=>{
  const page=pageTransactions(plans,{status:'planned'},undefined,stamp)
  expect(page.total).toBe(135);expect(page.items).toHaveLength(50)
  expect(page.items[0].transactionDate).toBe('2026-09-15')
  expect(page.items[1].id).toBe('rent-tomorrow')
  expect(page.nextCursor?.order).toBe('asc')
 })
 it('visits every future plan once across all pages in ascending date order',()=>{
  const a=pageTransactions(plans,{status:'planned'},undefined,stamp)
  const b=pageTransactions(plans,{status:'planned'},a.nextCursor!,a.snapshot)
  const c=pageTransactions(plans,{status:'planned'},b.nextCursor!,b.snapshot)
  const all=[...a.items,...b.items,...c.items]
  expect([a.items.length,b.items.length,c.items.length]).toEqual([50,50,35])
  expect(new Set(all.map(t=>t.id)).size).toBe(135)
  expect(all.map(t=>t.transactionDate)).toEqual(plans.map(t=>t.transactionDate).sort())
  expect(c.nextCursor).toBeNull()
 })
 it('uses stable cursor tie-breakers when over 50 plans share the same date and timestamp',()=>{
  const tied=rows.map(t=>({...t,status:'planned' as const}))
  const a=pageTransactions(tied,{status:'planned'},undefined,stamp)
  const b=pageTransactions(tied,{status:'planned'},a.nextCursor!,stamp)
  const c=pageTransactions(tied,{status:'planned'},b.nextCursor!,stamp)
  expect([...a.items,...b.items,...c.items].map(t=>t.id)).toEqual(tied.map(t=>t.id).sort())
  expect(c.nextCursor).toBeNull()
 })
 it('filters before ascending pagination and keeps overdue plans visible',()=>{
  const overdue=makeTxn({id:'overdue',status:'planned',transactionDate:'2026-09-12',createdAt:'2026-09-10T12:00:00Z'})
  const page=pageTransactions([...plans,overdue],{status:'planned'},undefined,stamp)
  expect(page.items[0].id).toBe('overdue')
  const filtered=pageTransactions(plans,{status:'planned',from:'2026-09-16',to:'2026-09-16'},undefined,stamp)
  expect(filtered.total).toBe(1);expect(filtered.items.map(t=>t.id)).toEqual(['rent-tomorrow'])
 })
 it('rejects old reverse-order plan cursors instead of silently skipping nearer plans',()=>{
  const page=pageTransactions(plans,{status:'planned'},undefined,stamp)
  const {order:_order,...legacy}=page.nextCursor!
  expect(()=>pageTransactions(plans,{status:'planned'},legacy,stamp)).toThrow('Порядок списку змінився')
  expect(()=>pageTransactions(plans,{status:'planned'},{...legacy,order:'desc'},stamp)).toThrow('Порядок списку змінився')
  expect(()=>pageTransactions(rows,{status:'completed'},page.nextCursor!,stamp)).toThrow('Порядок списку змінився')
 })
 it('preserves newest-first completed history and supports its existing cursors',()=>{
  const input=plans.map(t=>({...t,status:'completed' as const}))
  const first=pageTransactions(input,{status:'completed'},undefined,stamp)
  expect(first.items[0].transactionDate).toBe(plans[0].transactionDate)
  expect(first.nextCursor?.order).toBe('desc')
  const {order:_order,...legacy}=first.nextCursor!
  expect(pageTransactions(input,{status:'completed'},legacy,stamp)).toEqual(pageTransactions(input,{status:'completed'},first.nextCursor!,stamp))
 })
 it('does not let a newly created plan enter an in-progress snapshot',()=>{
  const first=pageTransactions(plans,{status:'planned'},undefined,stamp)
  const later=makeTxn({id:'later',status:'planned',createdAt:'2026-09-15T12:01:00Z',transactionDate:'2026-09-16'})
  const second=pageTransactions([...plans,later],{status:'planned'},first.nextCursor!,stamp)
  expect(second.total).toBe(135);expect(second.items.some(t=>t.id==='later')).toBe(false)
 })
})