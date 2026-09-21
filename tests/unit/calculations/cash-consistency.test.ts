import {describe,it,expect} from 'vitest'
import {cashMovement,forecastPaymentRows} from '@/lib/calculations/cash-movement'
import {loanPaymentParts,profileLoanBasis} from '@/lib/loans/accounting'
import {expenseAmount} from '@/lib/money/entry'
import {spendingByCategory} from '@/lib/calculations/reports'
import {matchesCategory} from '@/lib/planning/model'
import {liquidityForecast} from '@/lib/calculations/liquidity'
import type {Account,Transaction,Category} from '@/types/domain'
const a=(id:string,type:Account['type']='bank_debit')=>({id,type,currency:'UAH',name:id,currentBalance:10000,creditLimit:1000,createdAt:'2026-09-01T00:00:00Z'} as Account)
const t=(patch:Partial<Transaction>={})=>({id:'t',accountId:'cash',kind:'expense',amount:9060,currency:'UAH',transactionDate:'2026-09-03',status:'completed',description:'Payment',...patch} as Transaction)
const accounts=[a('cash'),a('other'),a('card','credit_card'),a('loan','bank_loan')]
describe('consistent cash, costs and debt',()=>{
 it('keeps full payment and internal servicing details',()=>{
  const tx=t({loanAccountId:'loan',loanPrincipal:5277.86,loanBasis:'confirmed',loanComponents:{interest:.73,fees:3781}})
  expect(cashMovement(accounts,[tx],'UAH','2026-09')).toMatchObject({outgoing:9060,loanPayments:9060,principal:5277.86,unallocated:.41})
  expect(expenseAmount(tx)).toBeCloseTo(3782.14)
  expect(loanPaymentParts(tx)).toMatchObject({specified:3781.73})
 })
 it('does not call an unknown obligation zero-cost principal',()=>{
  const tx=t({amount:7426.67,loanAccountId:'loan',loanPrincipal:7426.67,loanBasis:'obligation'})
  expect(loanPaymentParts(tx)).toMatchObject({principal:null,service:null,unallocated:7426.67})
  expect(cashMovement(accounts,[tx],'UAH','2026')).toMatchObject({outgoing:7426.67,principal:0,unallocated:7426.67})
 })
 it('keeps estimates visibly separate from confirmed principal',()=>{
  const tx=t({loanAccountId:'loan',loanPrincipal:5000,loanBasis:'estimated'})
  expect(cashMovement(accounts,[tx],'UAH','2026-09')).toMatchObject({principal:0,estimatedPrincipal:5000})
  expect(loanPaymentParts(tx).estimated).toBe(true)
 })
 it('excludes transfers between own cash accounts',()=>{
  expect(cashMovement(accounts,[t({kind:'transfer',counterAccountId:'other'})],'UAH','2026-09').outgoing).toBe(0)
 })
 it('shows card repayment once in cash and excludes card purchases from cash',()=>{
  const rows=[t({id:'buy',accountId:'card',amount:100}),t({id:'repay',kind:'transfer',counterAccountId:'card',amount:100})]
  expect(cashMovement(accounts,rows,'UAH','2026-09')).toMatchObject({outgoing:100,cardRepayments:100,creditCharges:100,otherOutflows:0})
 })
 it('does not count planned or deleted payments in actuals',()=>{
  expect(cashMovement(accounts,[t({status:'planned'}),t({deletedAt:'2026-09-04'})],'UAH','2026-09').outgoing).toBe(0)
 })
 it('preserves unknowns and distinguishes bank from estimated schedules',()=>{
  expect(profileLoanBasis({balance_basis:'total_obligation',schedule_basis:'bank'} as never)).toBe('obligation')
  expect(profileLoanBasis({balance_basis:'principal',schedule_basis:'estimated'} as never)).toBe('estimated')
  expect(profileLoanBasis(undefined)).toBe('unknown')
 })
 it('keeps actual categories separate, with exact matching drilldowns',()=>{
  const categories=[{id:'a',name:'Відсотки та комісії'},{id:'b',name:'Обслуговування кредитів'}] as Category[]
  const rows=[t({id:'a',categoryId:'a',amount:100}),t({id:'b',categoryId:'b',amount:200})]
  expect(spendingByCategory(rows,categories,2026,8,'UAH')).toMatchObject([{categoryId:'b',total:200},{categoryId:'a',total:100}])
  expect(rows.filter(tx=>matchesCategory(tx,'a')).map(tx=>tx.id)).toEqual(['a'])
 })
 it('uses one timeline for card and debit-funded plans without writing operations',()=>{
  const rows=[t({id:'own',status:'planned',transactionDate:'2026-09-19',amount:8000,loanAccountId:'loan'}),t({id:'card',status:'planned',transactionDate:'2026-09-27',accountId:'card',amount:7426.67,loanAccountId:'loan'})]
  const forecast=liquidityForecast(accounts,rows,'UAH','2026-09-30',new Date(2026,8,14,12),0)
  expect(forecastPaymentRows(accounts,rows,'UAH','2026-09-14','2026-09-30',forecast).map(p=>[p.id,p.card,p.amount])).toEqual([['own',false,8000],['card',true,7426.67]])
  expect(rows.every(x=>x.status==='planned')).toBe(true)
 })
 it('excludes internal own-account transfers from the payment timeline',()=>{
  const rows=[t({status:'planned',transactionDate:'2026-09-19',kind:'transfer',counterAccountId:'other'})]
  const forecast=liquidityForecast(accounts,rows,'UAH','2026-09-30',new Date(2026,8,14,12),0)
  expect(forecastPaymentRows(accounts,rows,'UAH','2026-09-14','2026-09-30',forecast)).toEqual([])
 })
})