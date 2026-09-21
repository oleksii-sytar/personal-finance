import React from 'react'
import {describe,it,expect,afterEach} from 'vitest'
import {render,screen,cleanup} from '@testing-library/react'
import {ForecastPayments} from '@/components/dashboard/forecast-payments'
import {TransactionRow} from '@/components/transactions/transaction-row'
import type {Transaction} from '@/types/domain'

afterEach(cleanup)
const summary={income:120000,incomeCount:2,expense:8426.67,expenseCount:3}
describe('concise personal finance UI',()=>{
 it('shows both future totals and counts without a second management list',()=>{
  render(<ForecastPayments summary={summary} currency="UAH"/>)
  const section=screen.getByLabelText('Майбутні транзакції')
  expect(section.textContent?.replace(/[\s\u00a0\u202f]/g,'')).toContain('120000')
  expect(section.textContent?.replace(/[\s\u00a0\u202f]/g,'')).toContain('8426,67')
  expect(section.querySelectorAll('small')[0].textContent).toBe('2')
  expect(section.querySelectorAll('small')[1].textContent).toBe('3')
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.queryByText(/Не покрито|Ліміту недостатньо/i)).toBeNull()
 })
 it('keeps both directions visible when there are no plans',()=>{
  render(<ForecastPayments summary={{income:0,incomeCount:0,expense:0,expenseCount:0}} currency="UAH"/>)
  expect(screen.getByText('Надходження')).toBeVisible();expect(screen.getByText('Списання')).toBeVisible()
 })
 it('shows one amount in the transaction row without accounting prose',()=>{
  const transaction={id:'loan-payment',kind:'expense',amount:9060,currency:'UAH',status:'completed',transactionDate:'2026-09-03',description:'Loan payment',loanAccountId:'loan',loanPrincipal:5277.86,loanBasis:'confirmed',loanComponents:{fees:3781,interest:.73}} as Transaction
  render(<TransactionRow transaction={transaction} accountName="Mono" categoryName="Моя категорія"/>)
  expect(screen.getByRole('button').textContent).toMatch(/9\s*060/)
  expect(screen.queryByText(/тіло|обслуговування|нерозподілено/i)).toBeNull()
  expect(screen.getByText(/Моя категорія/)).toBeTruthy()
  expect(screen.queryByText(/Платіж кредиту/)).toBeNull()
 })
})