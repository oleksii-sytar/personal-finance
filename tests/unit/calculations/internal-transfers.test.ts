import {describe,it,expect} from 'vitest'
import {makeAccount,makeTxn} from '../_factories'
import {calculatedBalance,netWorthSummary} from '@/lib/money/balances'
import {monthlyTotals,spendingByCategory,yearlyCashflow} from '@/lib/calculations/reports'
import {automaticSpending,liquidityForecast,safetyReserve} from '@/lib/calculations/liquidity'
const source=makeAccount({id:'bank',type:'bank_debit',openingBalance:10000,currentBalance:10000})
const cash=makeAccount({id:'cash',openingBalance:500,currentBalance:500})
const transfer=makeTxn({kind:'transfer',accountId:'bank',counterAccountId:'cash',amount:3000,counterAmount:3000,transactionDate:'2026-09-10'})
const now=new Date(2026,8,10,12)
describe('Internal transfers',()=>{
 it('moves the amount exactly once between both balances',()=>{
  expect(calculatedBalance(source,[transfer])).toBe(7000)
  expect(calculatedBalance(cash,[transfer])).toBe(3500)
 })
 it('preserves total family net worth',()=>{
  const before=netWorthSummary([source,cash],'UAH').netWorth
  expect(netWorthSummary([source,cash].map(a=>({...a,currentBalance:calculatedBalance(a,[transfer])})),'UAH').netWorth).toBe(before)
 })
 it('does not inflate monthly or yearly income, expenses, or categories',()=>{
  expect(monthlyTotals([transfer],2026,8,'UAH')).toEqual({income:0,expense:0,net:0})
  expect(yearlyCashflow([transfer],2026,'UAH').every(p=>p.income===0&&p.expense===0&&p.net===0)).toBe(true)
  expect(spendingByCategory([transfer],[],2026,8,'UAH')).toEqual([])
 })
 it('does not create daily spending or a safety reserve',()=>{
  const trend=automaticSpending([source,cash],[transfer],'UAH','2026-09-30',now)
  expect(trend.daily).toBe(0)
  expect(trend.sampleCount).toBe(0)
  expect(safetyReserve(trend.daily,7)).toBe(0)
 })
 it('keeps planned transfers between liquid accounts cash-neutral',()=>{
  const result=liquidityForecast([source,cash],[{...transfer,status:'planned'}],'UAH','2026-09-10',now,0)
  expect(result.points[0]).toMatchObject({balance:10500,income:0,expense:0})
 })
 it('counts an actual bank fee separately, not the principal',()=>{
  const fee=makeTxn({accountId:'bank',kind:'expense',amount:25,transactionDate:'2026-09-10'})
  expect(monthlyTotals([transfer,fee],2026,8,'UAH')).toEqual({income:0,expense:25,net:-25})
  expect(calculatedBalance(source,[transfer,fee])).toBe(6975)
 })
 it('repays debt without adding a second expense and reduces liquid cash',()=>{
  const debt=makeAccount({id:'debt',type:'credit_card',openingBalance:-8000,currentBalance:-8000})
  const repayment={...transfer,counterAccountId:'debt'}
  expect(calculatedBalance(debt,[repayment])).toBe(-5000)
  expect(monthlyTotals([repayment],2026,8,'UAH').expense).toBe(0)
  expect(liquidityForecast([source,debt],[{...repayment,status:'planned'}],'UAH','2026-09-10',now,0).points[0].balance).toBe(7000)
 })
 it('uses the actual received amount for a currency exchange',()=>{
  const usd=makeAccount({id:'usd',currency:'USD',openingBalance:100})
  const exchange={...transfer,counterAccountId:'usd',amount:4200,counterAmount:100}
  expect(calculatedBalance(source,[exchange])).toBe(5800)
  expect(calculatedBalance(usd,[exchange])).toBe(200)
  expect(monthlyTotals([exchange],2026,8,'UAH')).toEqual({income:0,expense:0,net:0})
 })
 it('does not repost historical transfers included in the balance snapshot',()=>{
  const bank={...source,balanceAnchorAmount:7000,balanceAnchorAt:'2026-09-10T12:00:00.000Z'}
  const target={...cash,balanceAnchorAmount:3500,balanceAnchorAt:'2026-09-10T12:00:00.000Z'}
  expect(calculatedBalance(bank,[{...transfer,balancePostedAt:null}])).toBe(7000)
  expect(calculatedBalance(target,[{...transfer,counterBalancePostedAt:null}])).toBe(3500)
 })
 it('ignores deleted and planned transfers in actual balances',()=>{
  const rows=[{...transfer,deletedAt:'2026-09-10T13:00:00Z'},{...transfer,status:'planned' as const}]
  expect(calculatedBalance(source,rows)).toBe(10000)
  expect(calculatedBalance(cash,rows)).toBe(500)
 })
})