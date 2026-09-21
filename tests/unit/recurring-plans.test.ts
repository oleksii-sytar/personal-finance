import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {recurrenceDate,recurrenceDates,nextRepeatDate,plannedAmount,parsePlanRate,categoryTransactionsUrl,matchesCategory} from '@/lib/planning/model'
import {InMemoryRepository} from '@/lib/data/mock/in-memory-repository'
import {liquidityForecast} from '@/lib/calculations/liquidity'
import {makeAccount,makeTxn} from './_factories'

describe('Calendar recurrence',()=>{
 it('clamps the 31st without drifting after February',()=>expect([0,1,2,3].map(i=>recurrenceDate('2027-01-31','monthly',1,i))).toEqual(['2027-01-31','2027-02-28','2027-03-31','2027-04-30']))
 it('handles leap-year February',()=>expect(recurrenceDate('2028-01-31','monthly',1,1)).toBe('2028-02-29'))
 it('restores leap day on the next leap year',()=>{expect(recurrenceDate('2024-02-29','yearly',1,1)).toBe('2025-02-28');expect(recurrenceDate('2024-02-29','yearly',1,4)).toBe('2028-02-29')})
 it('handles weekly intervals across month boundaries',()=>expect(recurrenceDate('2026-09-25','weekly',2,1)).toBe('2026-10-09'))
 it('handles daily intervals across year boundaries',()=>expect(recurrenceDate('2026-12-31','daily',2,1)).toBe('2027-01-02'))
 it('honors an inclusive end date and does not reconstruct earlier history',()=>expect(recurrenceDates({startDate:'2017-08-31',frequency:'monthly',intervalCount:1,endDate:'2026-11-30'},'2026-09-14','2027-09-14')).toEqual(['2026-09-30','2026-10-31','2026-11-30']))
 it('starts repeats after the original completed operation',()=>expect(nextRepeatDate('2026-09-14','2026-09-14')).toBe('2026-10-14'))
 it('does not require a past source to be moved to today',()=>expect(nextRepeatDate('2017-08-31','2026-09-14')).toBe('2026-09-30'))
 it('rejects invalid dates and fractional intervals',()=>{expect(()=>recurrenceDate('2026-02-30','monthly',1,1)).toThrow();expect(()=>recurrenceDate('2026-09-14','monthly',1.5,1)).toThrow()})
})
describe('Foreign planned money',()=>{
 it('uses eight-decimal rates, including comma notation',()=>{expect(parsePlanRate('45,12345678')).toBe(45.12345678);expect(parsePlanRate('0.00000001')).toBe(0.00000001)})
 it('rejects zero, negative and non-numeric rates',()=>{for(const x of ['0','-1','Infinity','1e3','1.123456789'])expect(parsePlanRate(x)).toBeNull()})
 it('revalues an EUR plan using current rates',()=>expect(plannedAmount(makeTxn({status:'planned',amount:40000,currency:'UAH',originalCurrency:'EUR',originalAmount:1000,planExchangeMode:'nbu'}))).toBe(45200))
 it('respects a manually chosen rate',()=>expect(plannedAmount(makeTxn({status:'planned',amount:40000,currency:'UAH',originalCurrency:'EUR',originalAmount:1000,planExchangeMode:'manual',planExchangeRate:47.1234}))).toBe(47123.4))
 it('never revalues an actual completed transaction',()=>expect(plannedAmount(makeTxn({status:'completed',amount:47000,currency:'UAH',originalCurrency:'EUR',originalAmount:1000,planExchangeMode:'nbu'}))).toBe(47000))
 it('uses the same estimate in the cash forecast and ignores paused plans',()=>{
  const account=makeAccount({id:'cash',type:'cash',currency:'UAH',currentBalance:100})
  const plan=makeTxn({accountId:'cash',status:'planned',kind:'income',amount:40000,currency:'UAH',originalCurrency:'EUR',originalAmount:1000,planExchangeMode:'nbu',transactionDate:'2026-09-15'})
  const result=liquidityForecast([account],[plan,{...plan,id:'paused',recurrenceSuspended:true}],'UAH','2026-09-16',new Date(2026,8,14,12),0)
  expect(result.points.at(-1)?.balance).toBe(45300)
 })
})
describe('Category report links',()=>{
 it('retains the month, expense type and category',()=>expect(categoryTransactionsUrl('food','2028-02')).toBe('/transactions?category=food&kind=expense&from=2028-02-01&to=2028-02-29'))
 it('links uncategorized expenses explicitly',()=>expect(categoryTransactionsUrl(null,'2026-09')).toContain('category=none'))
 it('keeps all, uncategorized and specific categories distinct',()=>{const t={categoryId:'food'};expect(matchesCategory(t,'')).toBe(true);expect(matchesCategory(t,'none')).toBe(false);expect(matchesCategory(t,'food')).toBe(true);expect(matchesCategory({categoryId:null},'none')).toBe(true)})
})
describe('Recurring occurrence lifecycle',()=>{
 let repo:InMemoryRepository
 beforeEach(()=>{localStorage.clear();vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-14T12:00:00Z'));repo=new InMemoryRepository()})
 afterEach(()=>vi.useRealTimers())
 async function create(source?:Awaited<ReturnType<InMemoryRepository['createTransaction']>>){
  const account=(await repo.listAccounts())[0]
  return repo.saveRecurring({requestId:'new-series',template:{accountId:account.id,kind:'expense',amount:100,currency:account.currency,description:'Recurring test'},frequency:'monthly',intervalCount:1,startDate:'2026-09-30',sourceTransactionId:source?.id,sourceExpectedUpdatedAt:source?.updatedAt})
 }
 it('creates only plans and does not move any account balance',async()=>{
  const before=await repo.listAccounts(),series=await create(),plans=(await repo.listTransactions()).filter(t=>t.recurringTransactionId===series.id)
  expect(plans.length).toBeGreaterThan(10);expect(plans.every(t=>t.status==='planned')).toBe(true);expect(await repo.listAccounts()).toEqual(before)
 })
 it('does not duplicate occurrences on repeated reads',async()=>{const series=await create();const first=(await repo.listTransactions()).filter(t=>t.recurringTransactionId===series.id);const second=(await repo.listTransactions()).filter(t=>t.recurringTransactionId===series.id);expect(second.map(t=>t.id)).toEqual(first.map(t=>t.id))})
 it('keeps a deleted occurrence deleted',async()=>{const series=await create(),first=(await repo.listTransactions()).find(t=>t.recurringTransactionId===series.id)!;await repo.softDeleteTransaction(first.id);expect((await repo.listTransactions()).some(t=>t.id===first.id)).toBe(false);expect((await repo.listTransactions({includeDeleted:true})).filter(t=>t.recurringTransactionId===series.id&&t.recurrenceDate===first.recurrenceDate)).toHaveLength(1)})
 it('does not change or duplicate the completed source',async()=>{
  const account=(await repo.listAccounts())[0],source=await repo.createTransaction({accountId:account.id,kind:'expense',amount:100,currency:account.currency,description:'Source',transactionDate:'2026-09-01',status:'completed'})
  await create(source);expect(await repo.getTransaction(source.id)).toEqual(source)
 })
 it('adopts an existing first plan instead of inserting it twice',async()=>{
  const account=(await repo.listAccounts())[0],source=await repo.createTransaction({accountId:account.id,kind:'expense',amount:100,currency:account.currency,description:'Source',transactionDate:'2026-09-30',status:'planned'})
  const series=await create(source);const first=(await repo.listTransactions()).filter(t=>t.recurringTransactionId===series.id&&t.recurrenceDate==='2026-09-30')
  expect(first).toHaveLength(1);expect(first[0].id).toBe(source.id)
 })
 it('pauses and resumes without duplicating plans',async()=>{
  const series=await create(),count=(await repo.listTransactions()).filter(t=>t.recurringTransactionId===series.id).length
  const paused=await repo.saveRecurring({id:series.id,expectedUpdatedAt:series.updatedAt,requestId:'pause',isActive:false})
  expect((await repo.listTransactions()).filter(t=>t.recurringTransactionId===series.id)).toHaveLength(0)
  await repo.saveRecurring({id:series.id,expectedUpdatedAt:paused.updatedAt,requestId:'resume',isActive:true})
  expect((await repo.listTransactions()).filter(t=>t.recurringTransactionId===series.id)).toHaveLength(count)
 })
 it('preserves individual edits when changing the template',async()=>{
  const series=await create(),first=(await repo.listTransactions()).find(t=>t.recurringTransactionId===series.id)!
  await repo.updateTransaction(first.id,{amount:125})
  await repo.saveRecurring({id:series.id,expectedUpdatedAt:series.updatedAt,requestId:'edit-series',template:{...series.template,amount:200}})
  expect((await repo.getTransaction(first.id))?.amount).toBe(125)
  expect((await repo.listTransactions()).some(t=>t.recurringTransactionId===series.id&&t.id!==first.id&&t.amount===200)).toBe(true)
 })
})