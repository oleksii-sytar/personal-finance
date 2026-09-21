import {describe,it,expect,vi,afterEach} from 'vitest'
import {render,screen,cleanup,fireEvent} from '@testing-library/react'
import {LiquidityCard} from '@/components/dashboard/liquidity-card'
import {liquidityForecast} from '@/lib/calculations/liquidity'
import {makeAccount,makeTxn} from './_factories'
const {state}=vi.hoisted(()=>({state:{accounts:[] as any[],transactions:[] as any[]}}))
vi.mock('@/hooks/use-finance',()=>({useAccounts:()=>({data:state.accounts}),useTransactions:()=>({data:state.transactions}),useSettings:()=>({data:{safetyBufferDays:7}})}))
vi.mock('@/hooks/use-financial-model',()=>({useModelInputs:()=>({accounts:state.accounts,transactions:state.transactions,model:{coverage:[],positions:[],forecasts:[]},options:{coverage:[],categories:[],rates:[]},isLoading:false,isError:false}),useRecordForecast:()=>undefined}))
vi.mock('@/hooks/use-loans',()=>({useLoanData:()=>({data:{profiles:[],rows:[]}})}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({displayCurrency:'UAH'})}))
const card=makeAccount({id:'card',name:'Monobank IRON',type:'credit_card',creditLimit:160000,currentBalance:-186835.25})
const transactions=['2026-09-27','2026-10-27'].map((date,i)=>makeTxn({id:'plan'+i,accountId:'card',loanAccountId:'loan',loanInstallmentId:'row'+i,status:'planned',amount:i?7426.65:7426.67,transactionDate:date,description:'Платіж: Mono loan'}))
const f=liquidityForecast([card],transactions,'UAH','2026-10-31',new Date(2026,8,14,12),0)
afterEach(()=>{cleanup();vi.useRealTimers()})
describe('visible credit-funded forecast',()=>{
 it('keeps day controls above the day table without a duplicate payment list',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date(2026,8,14,12));state.accounts=[card];state.transactions=transactions
  const {container}=render(<LiquidityCard detailed/>)
  expect(screen.queryByRole('heading',{name:/Майбутні платежі|Майбутні транзакції/})).toBeNull()
  fireEvent.click(screen.getByText('Усі дні прогнозу'))
  const table=screen.getByRole('table',{name:'Прогноз за днями'})
  expect(table.querySelectorAll('[role=row]').length).toBeGreaterThan(2)
  expect(container.querySelector('#forecast-day')!.compareDocumentPosition(table)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 })
 it('shows card payments in the selected day, not the empty-payment message',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date(2026,8,14,12))
  state.accounts=[card];state.transactions=transactions
  const {container}=render(<LiquidityCard detailed/>)
  fireEvent.change(screen.getByLabelText('Прогноз до'),{target:{value:'2026-10-31'}})
  fireEvent.change(container.querySelector('#forecast-day')!,{target:{value:'43'}})
  const selected=container.querySelector('.selected-day-card')!
  expect(selected.textContent).toContain('Платіж: Mono loan')
  expect(selected.textContent).not.toContain('З кредитки')
  expect(selected.textContent?.replace(/[\s\u00a0\u202f]/g,'')).toContain('7426,65')
  expect(selected.textContent).not.toContain('Відомих платежів немає')
 })
})