import {describe,it,expect} from 'vitest'
import {liquidityForecast} from '@/lib/calculations/liquidity'
import {buildForecast} from '@/lib/calculations/forecast'
import {monthlyTotals} from '@/lib/calculations/reports'
import {makeAccount,makeTxn} from '../_factories'
const ref=new Date(2026,8,14,12),cash=makeAccount({id:'cash',currentBalance:50000}),card=makeAccount({id:'card',type:'credit_card',currentBalance:-186835.25,creditLimit:160000}),loan=makeAccount({id:'loan',type:'bank_loan',currentBalance:-14853.32}),accounts=[cash,card,loan]
const plans=['2026-09-27','2026-10-27'].map((transactionDate,i)=>makeTxn({id:'plan'+i,accountId:'card',loanAccountId:'loan',loanInstallmentId:'row'+i,amount:i?7426.65:7426.67,transactionDate,status:'planned'}))
const forecast=(rows=plans,acc=accounts)=>liquidityForecast(acc,rows,'UAH','2026-10-31',ref,0)
describe('Only real planned transactions enter the forecast',()=>{
 it('keeps cash unchanged for explicitly planned credit-card spending',()=>{
  const result=forecast();expect(result.points.at(-1)?.balance).toBe(50000)
  expect(result.creditCards.totalOutflow).toBe(14853.32)
  expect(result.creditCards.accounts[0].projectedBalance).toBe(-201688.57)
  expect(result.creditCards.accounts[0].availableToSpend).toBe(0)
 })
 it('reflects changing the source to cash without an extra copy',()=>{
  const result=forecast(plans.map(t=>({...t,accountId:'cash'})))
  expect(result.points.at(-1)?.balance).toBe(35146.68);expect(result.creditCards.totalOutflow).toBe(0)
 })
 it.each([{status:'completed' as const},{deletedAt:'2026-09-14'},{recurrenceSuspended:true},{transactionDate:'2026-11-27'}])('ignores non-active or out-of-range plans: %j',over=>expect(forecast([{...plans[0],...over}]).creditCards.payments).toHaveLength(0))
 it('ignores archived cards',()=>expect(forecast(plans,[cash,{...card,archivedAt:'2026-09-14'},loan]).creditCards.payments).toHaveLength(0))
 it('creates no obligations when only loan accounts exist',()=>{
  const result=buildForecast(accounts,[],'UAH','2026-10-31',ref)
  expect(result.summary).toEqual({income:0,incomeCount:0,expense:0,expenseCount:0})
  expect(result.forecast.points.at(-1)?.balance).toBe(50000)
 })
 it('shows future income and outgoing counts for the same month only',()=>{
  const salary=makeTxn({accountId:'cash',kind:'income',status:'planned',amount:120000,transactionDate:'2026-09-15'})
  const result=buildForecast(accounts,[salary,...plans],'UAH','2026-09-30',ref)
  expect(result.summary).toEqual({income:120000,incomeCount:1,expense:7426.67,expenseCount:1})
  expect(monthlyTotals([salary,...plans],2026,8,'UAH')).toEqual({income:0,expense:0,net:0})
 })
 it('does not present an internal cash transfer as income or spending',()=>{
  const other=makeAccount({id:'other'}),transfer=makeTxn({kind:'transfer',accountId:'cash',counterAccountId:'other',amount:1000,status:'planned',transactionDate:'2026-09-15'})
  expect(buildForecast([...accounts,other],[transfer],'UAH','2026-09-30',ref).summary).toEqual({income:0,incomeCount:0,expense:0,expenseCount:0})
 })
 it('uses the explicit exchange rate of a foreign-currency income plan',()=>{
  const salary=makeTxn({accountId:'cash',kind:'income',status:'planned',amount:1,transactionDate:'2026-09-15',originalCurrency:'EUR',originalAmount:2000,planExchangeMode:'manual',planExchangeRate:50})
  const result=buildForecast(accounts,[salary],'UAH','2026-09-30',ref)
  expect(result.summary.income).toBe(100000);expect(result.forecast.points.at(-1)?.balance).toBe(150000)
 })
})