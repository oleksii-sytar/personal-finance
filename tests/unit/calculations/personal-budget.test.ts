import {describe,it,expect} from 'vitest'
import {monthlyTotals,spendingByCategory,yearlyCashflow} from '@/lib/calculations/reports'
import {reportQuality} from '@/lib/money/statistical'
import {loanPaymentParts} from '@/lib/loans/accounting'
import type {Transaction} from '@/types/domain'
const tx=(patch:Partial<Transaction>={})=>({id:'payment',accountId:'cash',kind:'expense',amount:9060,currency:'UAH',transactionDate:'2026-09-03',status:'completed',description:'Loan payment',categoryId:'loan-category',loanAccountId:'loan',loanPrincipal:5277.86,loanBasis:'confirmed',loanComponents:{fees:3781,interest:.73},...patch} as Transaction)
describe('simple household budget',()=>{
 it.each(['confirmed','estimated','unknown','obligation'] as const)('recognizes known service and discloses %s allocation',loanBasis=>{
  const rows=[tx({loanBasis})],total=monthlyTotals(rows,2026,8,'UAH')
  const allocated=loanBasis==='confirmed'||loanBasis==='estimated'
  expect(total.expense).toBeCloseTo(allocated?3782.14:3781.73)
  const quality=reportQuality(rows,'UAH','2026-09')
  expect(quality.provisional).toBe(loanBasis!=='confirmed')
  expect(quality.incomplete).toBe(!allocated)
  expect(quality.unallocatedAmount).toBeCloseTo(allocated?0:5278.27)
  expect(quality.estimated).toEqual(loanBasis==='estimated'?['payment']:[])
  const categories=spendingByCategory(rows,[],2026,8,'UAH')
  expect(categories.reduce((sum,category)=>sum+category.total,0)).toBeCloseTo(total.expense)
 })
 it('uses the same recognized cost in categories and totals',()=>{
  const rows=[tx(),tx({id:'food',loanAccountId:null,loanPrincipal:null,loanComponents:null,amount:100,categoryId:'food'})]
  const categories=spendingByCategory(rows,[],2026,8,'UAH')
  expect(categories.find(c=>c.categoryId==='loan-category')?.total).toBeCloseTo(3782.14)
  expect(categories.reduce((n,c)=>n+c.total,0)).toBe(monthlyTotals(rows,2026,8,'UAH').expense)
 })
 it('does not duplicate card purchases when the card is topped up',()=>{
  const rows=[tx({id:'purchase',accountId:'card',amount:100,loanAccountId:null,loanPrincipal:null,loanComponents:null}),tx({id:'topup',kind:'transfer',counterAccountId:'card',amount:100,loanAccountId:null,loanPrincipal:null,loanComponents:null})]
  expect(monthlyTotals(rows,2026,8,'UAH').expense).toBe(100)
 })
 it('excludes planned and deleted payments',()=>{
  expect(monthlyTotals([tx({status:'planned'}),tx({deletedAt:'2026-09-04'})],2026,8,'UAH').expense).toBe(0)
 })
 it('keeps monthly and annual results consistent',()=>{
  const rows=[tx(),tx({id:'salary',kind:'income',amount:20000,loanAccountId:null,loanPrincipal:null,loanComponents:null})]
  const year=yearlyCashflow(rows,2026,'UAH')
  expect(year[8].income).toBe(20000);expect(year[8].expense).toBeCloseTo(3782.14);expect(year[8].net).toBeCloseTo(16217.86)
  expect(year.reduce((n,m)=>n+m.expense,0)).toBeCloseTo(3782.14)
 })
 it('preserves debt allocation as details without splitting the transaction',()=>{
  const payment=tx()
  expect(loanPaymentParts(payment).principal).toBe(5277.86)
  expect(Math.round(loanPaymentParts(payment).service!*100)).toBe(378214)
  expect(payment.amount).toBe(9060)
  expect(monthlyTotals([payment],2026,8,'UAH').expense).toBeCloseTo(3782.14)
 })
})

it('includes the entire service amount even when detailed components leave a rounding gap',()=>{
 const rows=[tx()]
 const quality=reportQuality(rows,'UAH','2026-09')
 expect(quality.componentGaps).toHaveLength(1)
 expect(quality.componentGaps[0].id).toBe('payment')
 expect(quality.componentGaps[0].amount).toBeCloseTo(.41)
 expect(quality.recognizedExpense).toBeCloseTo(3782.14)
 expect(quality.incomplete).toBe(false)
})