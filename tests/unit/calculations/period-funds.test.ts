import {describe,it,expect} from 'vitest'
import {periodFunds,accountBalanceAt} from '@/lib/calculations/period-funds'
import {monthlyTotals} from '@/lib/calculations/reports'
import {netWorthSummary} from '@/lib/money/balances'
import type {BalanceContext} from '@/lib/data/repository'
import {makeAccount,makeTxn} from '../_factories'
const now=new Date(2026,8,15,12)
const bank=(over:Parameters<typeof makeAccount>[0]={})=>makeAccount({id:'bank',type:'bank_debit',openingBalance:10000,currentBalance:13000,...over})
const card=(over:Parameters<typeof makeAccount>[0]={})=>makeAccount({id:'card',type:'credit_card',openingBalance:0,currentBalance:0,creditLimit:100000,...over})
const tx=(over:Parameters<typeof makeTxn>[0]={})=>makeTxn({accountId:'bank',transactionDate:'2026-09-15',createdAt:'2026-09-15T08:00:00Z',balancePostedAt:'2026-09-15T08:00:00Z',...over})
const context=(accounts:BalanceContext['accounts'],snapshots:BalanceContext['snapshots']=[])=>({accounts,snapshots})
const income=tx({kind:'income',amount:5000}),expense=tx({amount:2000})
describe('Period opening and closing money are independent of income',()=>{
 it('carries September closing into October opening without adding income',()=>{
  const ctx=context([bank()]),rows=[income,expense],ref=new Date(2026,9,5,12)
  const september=periodFunds(ctx,rows,'UAH','2026-09',ref),october=periodFunds(ctx,rows,'UAH','2026-10',ref)
  expect(september).toMatchObject({opening:10000,closing:13000,change:3000})
  expect(october).toMatchObject({opening:13000,closing:13000,change:0})
  expect(monthlyTotals(rows,2026,9,'UAH')).toEqual({income:0,expense:0,net:0})
 })
 it('keeps a nonzero balance in a month with no transactions',()=>{
  expect(periodFunds(context([bank({currentBalance:10000})]),[],'UAH','2026-09',now)).toMatchObject({opening:10000,closing:10000,change:0})
 })
 it('reconstructs the first month from its later snapshot and complete actual history',()=>{
  const account=bank({createdAt:'2026-09-09T10:00:00Z',balanceAnchorAt:'2026-09-15T12:00:00Z',balanceAnchorDate:'2026-09-15',balanceAnchorAmount:13000})
  const result=periodFunds(context([account]),[income,expense],'UAH','2026-09',now)
  expect(result).toMatchObject({opening:10000,closing:13000,change:3000,missingOpening:[]})
  expect(monthlyTotals([income,expense],2026,8,'UAH')).toEqual({income:5000,expense:2000,net:3000})
 })
 it('uses a verified snapshot and subsequent posted transactions',()=>{
  const account=bank({currentBalance:10000}),snapshots=[{accountId:'bank',amount:12000,date:'2026-09-10',at:'2026-09-10T12:00:00Z'}]
  expect(accountBalanceAt(account,snapshots,[expense],'2026-09-30','2026-10-05')).toBe(10000)
 })
 it('does not apply history-only, planned or deleted records after an anchor',()=>{
  const a=bank({balanceAnchorAt:'2026-09-10T12:00:00Z',balanceAnchorDate:'2026-09-10',balanceAnchorAmount:10000})
  const rows=[tx({balancePostedAt:null}),tx({status:'planned'}),tx({deletedAt:'2026-09-15'}),tx({transactionDate:'2026-10-05'})]
  expect(accountBalanceAt(a,[],rows,'2026-09-30','2026-10-05')).toBe(10000)
 })
 it('does not count a transaction already included in the anchor again',()=>{
  const a=bank({balanceAnchorAt:'2026-09-15T12:00:00Z',balanceAnchorDate:'2026-09-15',balanceAnchorAmount:13000})
  expect(accountBalanceAt(a,[],[income,expense],'2026-09-30','2026-10-05')).toBe(13000)
 })
 it('a card limit creates neither own funds nor income',()=>{
  expect(periodFunds(context([card()]),[],'UAH','2026-09',now)).toMatchObject({opening:0,closing:0,change:0})
  expect(monthlyTotals([],2026,8,'UAH')).toEqual({income:0,expense:0,net:0})
 })
 it('reducing a limit by 10000 does not change any money balance',()=>{
  const a=card({openingBalance:-20000,currentBalance:-20000,creditLimit:50000})
  expect(periodFunds(context([a]),[],'UAH','2026-09',now)).toEqual(periodFunds(context([{...a,creditLimit:40000}]),[],'UAH','2026-09',now))
 })
 it('repayment reduces own money and debt without reducing the income-expense result',()=>{
  const before=[bank({openingBalance:50000,currentBalance:50000}),card({openingBalance:-40000,currentBalance:-40000})]
  const after=[{...before[0],currentBalance:20000},{...before[1],currentBalance:-10000}]
  const payment=tx({kind:'transfer',counterAccountId:'card',counterAmount:30000,amount:30000,counterBalancePostedAt:'2026-09-15T08:00:00Z'})
  expect(periodFunds(context(after),[payment],'UAH','2026-09',now)).toMatchObject({opening:50000,closing:20000,change:-30000})
  expect(monthlyTotals([payment],2026,8,'UAH').net).toBe(0)
  expect(netWorthSummary(before,'UAH').netWorth).toBe(netWorthSummary(after,'UAH').netWorth)
 })
 it('only the debt repayment reduces own money when a top-up also leaves own money on the card',()=>{
  const accounts=[bank({openingBalance:50000,currentBalance:20000}),card({openingBalance:-20000,currentBalance:10000})]
  expect(periodFunds(context(accounts),[],'UAH','2026-09',now)).toMatchObject({opening:50000,closing:30000,change:-20000})
 })
 it('includes positive card balances and excludes unused limits',()=>{
  const result=periodFunds(context([bank({currentBalance:5000}),card({currentBalance:2000})]),[],'UAH','2026-09',now)
  expect(result.closing).toBe(7000)
 })
 it('does not substitute the current balance for a future month',()=>{
  expect(periodFunds(context([bank()]),[],'UAH','2026-10',now)).toMatchObject({opening:null,closing:null,change:null,future:true})
 })
 it('uses the same December-January boundary for annual summaries',()=>{
  const account=bank({createdAt:'2025-01-01T00:00:00Z'}),ref=new Date(2027,0,1,12)
  const ctx=context([account]),rows=[income,expense]
  expect(periodFunds(ctx,rows,'UAH','2026',ref).closing).toBe(periodFunds(ctx,rows,'UAH','2027',ref).opening)
 })
 it('retains archived accounts when calculating an earlier closing',()=>{
  const account=bank({archivedAt:'2026-10-01T10:00:00Z'}),ctx=context([account]),ref=new Date(2026,9,5,12)
  expect(periodFunds(ctx,[income,expense],'UAH','2026-09',ref).closing).toBe(13000)
  expect(periodFunds(ctx,[income,expense],'UAH','2026-10',ref)).toMatchObject({opening:13000,closing:0})
 })
 it('rejects invalid period inputs instead of silently showing another month',()=>{
  expect(()=>periodFunds(context([]),[],'UAH','2026-13',now)).toThrow()
 })
})

const firstMonthAccount=(over:Parameters<typeof makeAccount>[0]={})=>bank({createdAt:'2026-09-09T10:00:00Z',openingBalance:0,currentBalance:10000,balanceAnchorAmount:10000,balanceAnchorDate:'2026-09-15',balanceAnchorAt:'2026-09-15T12:00:00Z',...over})
describe('First-month reconstruction keeps account movements separate from report categories',()=>{
 it('reverses history imported after the snapshot without posting it again',()=>{
  const account=firstMonthAccount({currentBalance:8000,balanceAnchorAmount:8000})
  const history=tx({amount:2000,transactionDate:'2026-09-05',createdAt:'2026-09-15T13:00:00Z',balancePostedAt:null})
  expect(periodFunds(context([account]),[history],'UAH','2026-09',now)).toMatchObject({opening:10000,closing:8000,change:-2000})
 })
 it('uses the latest stored balance rather than an initial zero placeholder',()=>{
  const snapshots=[{accountId:'bank',amount:0,date:'2026-09-09',at:'2026-09-09T10:00:00Z'}]
  expect(accountBalanceAt(firstMonthAccount(),snapshots,[],'2026-08-31','2026-09-15')).toBe(10000)
 })
 it('does not extrapolate into months before any recorded history',()=>{
  const result=periodFunds(context([firstMonthAccount()]),[],'UAH','2026-08',now)
  expect(result).toMatchObject({opening:null,closing:10000,change:null,missingOpening:['bank']})
 })
 it('ignores plans, deleted rows and future-dated completed rows',()=>{
  const rows=[tx({status:'planned',amount:7000}),tx({deletedAt:'2026-09-15',amount:8000}),tx({transactionDate:'2026-10-01',amount:9000})]
  expect(periodFunds(context([firstMonthAccount()]),rows,'UAH','2026-09',now).opening).toBe(10000)
 })
 it('ignores transactions belonging to another account',()=>{
  expect(periodFunds(context([firstMonthAccount()]),[tx({accountId:'other',amount:9000})],'UAH','2026-09',now).opening).toBe(10000)
 })
 it('reconstructs both legs of a credit-card repayment without an extra expense',()=>{
  const source=firstMonthAccount({currentBalance:20000,balanceAnchorAmount:20000})
  const destination=firstMonthAccount({id:'card',type:'credit_card',currentBalance:-10000,balanceAnchorAmount:-10000,creditLimit:100000})
  const payment=tx({kind:'transfer',amount:30000,counterAccountId:'card',counterAmount:30000,counterBalancePostedAt:'2026-09-15T08:00:00Z'})
  expect(periodFunds(context([source,destination]),[payment],'UAH','2026-09',now)).toMatchObject({opening:50000,closing:20000,change:-30000})
  expect(monthlyTotals([payment],2026,8,'UAH')).toEqual({income:0,expense:0,net:0})
 })
 it('uses the received amount for a foreign-currency transfer',()=>{
  const source=firstMonthAccount({currentBalance:1000,balanceAnchorAmount:1000})
  const destination=firstMonthAccount({id:'usd',currency:'USD',currentBalance:600,balanceAnchorAmount:600})
  const payment=tx({kind:'transfer',amount:26880,counterAccountId:'usd',counterAmount:600,counterBalancePostedAt:'2026-09-15T08:00:00Z'})
  expect(accountBalanceAt(source,[],[payment],'2026-08-31','2026-09-15')).toBe(27880)
  expect(accountBalanceAt(destination,[],[payment],'2026-08-31','2026-09-15')).toBe(0)
 })
 it('checks each transfer leg against its own posting timestamp with microsecond precision',()=>{
  const at='2026-09-15T08:00:00.000002Z'
  const source=firstMonthAccount({currentBalance:7000,balanceAnchorAmount:7000,balanceAnchorAt:at})
  const destination=firstMonthAccount({id:'cash',type:'cash',currentBalance:3000,balanceAnchorAmount:0,balanceAnchorAt:at})
  const payment=tx({kind:'transfer',amount:3000,counterAccountId:'cash',counterAmount:3000,balancePostedAt:'2026-09-15T08:00:00.000001Z',counterBalancePostedAt:'2026-09-15T08:00:00.000003Z'})
  expect(periodFunds(context([source,destination]),[payment],'UAH','2026-09',now)).toMatchObject({opening:10000,closing:10000,change:0})
 })
 it('recovers positive own card funds before a purchase used them and then borrowed',()=>{
  const account=firstMonthAccount({type:'credit_card',currentBalance:-500,balanceAnchorAmount:-500,creditLimit:100000})
  expect(periodFunds(context([account]),[tx({amount:2500})],'UAH','2026-09',now)).toMatchObject({opening:2000,closing:0,change:-2000})
 })
 it('includes a late-posted transaction dated on or before the reconstructed boundary',()=>{
  const late=tx({kind:'income',amount:800,transactionDate:'2026-08-31',balancePostedAt:'2026-09-15T13:00:00Z'})
  expect(accountBalanceAt(firstMonthAccount(),[],[late],'2026-08-31','2026-09-15')).toBe(10800)
 })
})