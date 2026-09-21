import {describe,it,expect} from 'vitest'
import {liquidityForecast} from '@/lib/calculations/liquidity'
import {spendingPowerSummary} from '@/lib/money/balances'
import {makeAccount,makeTxn} from '../_factories'
const ref=new Date(2026,8,15,12)
const bank=(balance=10000)=>makeAccount({id:'bank',type:'bank_debit',currentBalance:balance})
const card=(balance=2000,limit=50000)=>makeAccount({id:'card',type:'credit_card',currentBalance:balance,creditLimit:limit})
const plan=(over:Parameters<typeof makeTxn>[0]={})=>makeTxn({accountId:'card',status:'planned',amount:1500,transactionDate:'2026-09-16',...over})
const forecast=(accounts:ReturnType<typeof makeAccount>[],rows:ReturnType<typeof makeTxn>[]=[])=>(liquidityForecast(accounts,rows,'UAH','2026-09-30',ref,0))
describe('Own money on credit cards stays in the forecast',()=>{
 it('starts from the same own money as the overview',()=>{
  const accounts=[bank(),card()]
  expect(forecast(accounts).opening).toBe(spendingPowerSummary(accounts,'UAH').ownFunds)
  expect(forecast(accounts).points.at(-1)?.balance).toBe(12000)
 })
 it('uses own card money first and deducts it exactly once',()=>{
  const f=forecast([bank(),card()],[plan()]),day=f.points[1]
  expect(day).toMatchObject({balance:10500,expense:1500,cardOutflow:1500,creditOutflow:0})
  expect(day.expense+day.creditOutflow).toBe(1500)
  expect(f.creditCards.accounts[0].projectedBalance).toBe(500)
 })
 it('splits a payment across own money and borrowing without a second cash debit',()=>{
  const f=forecast([bank(),card(1000)],[plan()]),day=f.points[1]
  expect(day).toMatchObject({balance:10000,expense:1000,cardOutflow:1500,creditOutflow:500})
  expect(day.expense+day.creditOutflow).toBe(1500)
  expect(f.creditCards.accounts[0].projectedDebt).toBe(500)
 })
 it('does not lower own money for a fully credit-funded purchase',()=>{
  expect(forecast([bank(),card(-1000)],[plan()]).points[1]).toMatchObject({balance:10000,expense:0,creditOutflow:1500})
 })
 it('does not lose own money moved from debit to a positive card',()=>{
  const f=forecast([bank(),card()],[plan({accountId:'bank',counterAccountId:'card',kind:'transfer',counterAmount:3000,amount:3000})])
  expect(f.points[1]).toMatchObject({balance:12000,income:0,expense:0})
 })
 it('reduces own money only by the portion that repays debt',()=>{
  const f=forecast([bank(),card(-2000)],[plan({accountId:'bank',counterAccountId:'card',kind:'transfer',counterAmount:3000,amount:3000})])
  expect(f.points[1]).toMatchObject({balance:8000,income:0,expense:2000})
  expect(f.creditCards.accounts[0].projectedBalance).toBe(1000)
 })
 it('does not count moving own card money to debit as new income',()=>{
  const f=forecast([bank(),card(3000)],[plan({counterAccountId:'bank',kind:'transfer',counterAmount:1000,amount:1000})])
  expect(f.points[1]).toMatchObject({balance:13000,income:0,expense:0})
 })
 it('retains the credit-funded distinction when cash is borrowed from the card',()=>{
  const f=forecast([bank(),card(-1000)],[plan({counterAccountId:'bank',kind:'transfer',counterAmount:1000,amount:1000})])
  expect(f.points[1].balance).toBe(11000)
  expect(f.creditCards.accounts[0].projectedDebt).toBe(2000)
 })
 it('credits income on a card only after its existing debt is covered',()=>{
  expect(forecast([bank(),card(-1000)],[plan({kind:'income',amount:2500})]).points[1]).toMatchObject({balance:11500,income:1500,expense:0})
 })
 it('processes same-day credits before card spending without duplicating own funds',()=>{
  const f=forecast([bank(),card(-1000)],[plan(),plan({id:'topup',kind:'transfer',accountId:'bank',counterAccountId:'card',amount:3000,counterAmount:3000})])
  expect(f.points[1].balance).toBe(7500)
  expect(f.creditCards.accounts[0].projectedBalance).toBe(500)
 })
 it('a changed credit limit affects capacity but not own funds or projected debt',()=>{
  const before=forecast([bank(),card(-2000,50000)],[plan()]),after=forecast([bank(),card(-2000,40000)],[plan()])
  expect(after.points.at(-1)?.balance).toBe(before.points.at(-1)?.balance)
  expect(after.creditCards.accounts[0].projectedDebt).toBe(before.creditCards.accounts[0].projectedDebt)
  expect(before.creditCards.accounts[0].availableCredit-after.creditCards.accounts[0].availableCredit).toBe(10000)
 })
 it('does not repeat an already completed card top-up',()=>{
  const accounts=[bank(20000),card(-10000)],paid=plan({kind:'transfer',accountId:'bank',counterAccountId:'card',counterAmount:30000,amount:30000,status:'completed',transactionDate:'2026-09-15'})
  expect(forecast(accounts,[paid]).points).toEqual(forecast(accounts).points)
 })
})