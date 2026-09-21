import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {render,screen,within} from '@testing-library/react'
import DashboardPage from '@/app/(dashboard)/dashboard/page'
import type {Account,Transaction} from '@/types/domain'
import {makeAccount,makeTxn} from './_factories'

const state=vi.hoisted(()=>({
 accounts:[] as Account[],transactions:[] as Transaction[],
 loanReads:vi.fn(()=>({data:{profiles:[],rows:[]}})),
}))
vi.mock('@/hooks/use-finance',()=>({
 useAccounts:()=>({data:state.accounts,isLoading:false}),
 useTransactions:()=>({data:state.transactions}),
}))
vi.mock('@/hooks/use-financial-model',()=>({useFinancialModel:()=>({data:{coverage:[],positions:[],forecasts:[]}}),useHistoricalRates:()=>({data:[],isLoading:false})}))
vi.mock('@/hooks/use-loans',()=>({useLoanData:state.loanReads}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({displayCurrency:'UAH'})}))
vi.mock('@/components/dashboard/liquidity-card',()=>({LiquidityCard:()=><section aria-label="До кінця місяця"/>}))
vi.mock('@/components/dashboard/spending-power-card',()=>({SpendingPowerCard:()=>null}))
vi.mock('@/components/onboarding/getting-started',()=>({GettingStarted:()=>null}))
vi.mock('@/components/settings/import-reminders',()=>({ImportReminderSuggestion:()=>null}))

const planned=(over:Partial<Transaction>={})=>makeTxn({
 status:'planned',transactionDate:'2026-09-15',plannedDate:'2026-09-15',
 completedAt:null,description:'Planned salary',kind:'income',...over,
})
beforeEach(()=>{
 vi.useFakeTimers({toFake:['Date']})
 vi.setSystemTime(new Date('2026-09-11T12:00:00'))
 vi.clearAllMocks()
 state.accounts=[makeAccount({currentBalance:3000})]
 state.transactions=[]
})
afterEach(()=>vi.useRealTimers())

describe('Dashboard keeps compact, consistent summaries',()=>{
 it('groups forecast, month result and family wealth in a spaced stack',()=>{
  render(<DashboardPage/>)
  const forecast=screen.getByRole('region',{name:'До кінця місяця'}),summary=screen.getByRole('region',{name:'Результат місяця'}),wealth=screen.getByRole('region',{name:'Майно та борги сім’ї'})
  expect(forecast.parentElement).toHaveClass('dashboard-summary-stack')
  expect(summary.parentElement).toBe(forecast.parentElement)
  expect(wealth.parentElement).toBe(forecast.parentElement)
  expect(forecast.nextElementSibling).toBe(summary)
 })
 it('uses the same actual month totals and links to statistics',()=>{
  state.transactions=[makeTxn({kind:'income',amount:10000,transactionDate:'2026-09-10'}),makeTxn({amount:9060,loanAccountId:'loan',loanPrincipal:5000,loanBasis:'confirmed',transactionDate:'2026-09-10'}),planned({amount:100000})]
  render(<DashboardPage/>)
  const summary=screen.getByRole('region',{name:'Результат місяця'})
  expect(summary.textContent?.replace(/[\s\u00a0\u202f]/g,'')).toContain('5940')
  expect(within(summary).getByRole('link',{name:'Статистика'})).toHaveAttribute('href','/reports')
  expect(within(summary).queryByText('Гроші зараз')).toBeNull()
  expect(state.loanReads).not.toHaveBeenCalled()
 })
 it('renders family assets and debts without a collapsed disclosure',()=>{
  state.transactions=[planned()]
  state.accounts.push(makeAccount({type:'credit_card',currentBalance:-1000,creditLimit:5000}))
  render(<DashboardPage/>)
  expect(screen.queryByRole('heading',{name:'Найближче'})).not.toBeInTheDocument()
  const region=screen.getByRole('region',{name:'Майно та борги сім’ї'})
  expect(region.closest('details')).toBeNull()
  expect(within(region).getByText('Усього активів')).toBeVisible()
  expect(within(region).getByText('Усього боргів')).toBeVisible()
  expect(within(region).getByText('Чисті активи сім’ї')).toBeVisible()
 })
})