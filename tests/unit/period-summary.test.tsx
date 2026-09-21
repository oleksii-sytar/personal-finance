import {describe,it,expect} from 'vitest'
import type {ComponentProps} from 'react'
import {render,screen,within} from '@testing-library/react'
import {PeriodSummary} from '@/components/reports/period-summary'
const renderSummary=(over:Partial<ComponentProps<typeof PeriodSummary>>={})=>render(<PeriodSummary title="Результат місяця" totals={{income:1000,expense:3000,net:-2000}} currency="UAH" hasData {...over}/>)
const region=()=>screen.getByRole('region',{name:'Результат місяця'})
const heroText=()=>region().querySelector('.money-hero')?.textContent?.replace(/\s/g,'')

describe('The monthly result is income minus expenses, not an account balance',()=>{
 it('preserves the negative sign for a deficit',()=>{
  renderSummary()
  expect(heroText()).toMatch(/^[-−]2000,00/)
  expect(screen.getByText('Доходи мінус витрати')).toBeVisible()
 })
 it('shows a positive sign for a surplus',()=>{
  renderSummary({totals:{income:5000,expense:3000,net:2000}})
  expect(heroText()).toMatch(/^\+2000,00/)
 })
 it('shows a neutral zero when income equals expenses',()=>{
  renderSummary({totals:{income:3000,expense:3000,net:0}})
  expect(heroText()).toContain('0,00')
  expect(heroText()).not.toMatch(/[-−+]/)
 })
 it('shows only three amounts without opening, current or balance-change metrics',()=>{
  renderSummary()
  expect(region().querySelectorAll('.money-value')).toHaveLength(3)
  expect(screen.queryByLabelText('Власні гроші за період')).toBeNull()
  for(const label of ['На початок','Зараз','На кінець','Розраховано','Зміна власних грошей'])expect(screen.queryByText(label,{exact:true})).toBeNull()
 })
 it('keeps the actual income and expense totals beneath the result',()=>{
  renderSummary()
  const breakdown=region().querySelector('.report-income-expense')
  expect(breakdown?.textContent?.replace(/\s/g,'')).toContain('Доходи1000,00')
  expect(breakdown?.textContent?.replace(/\s/g,'')).toContain('Витрати3000,00')
 })
 it('does not invent a zero result when no transactions have been entered',()=>{
  renderSummary({hasData:false,totals:{income:0,expense:0,net:0}})
  expect(region().querySelector('.money-hero')).toBeNull()
  expect(screen.getByText('Без транзакцій')).toBeVisible()
  expect(screen.getAllByText('Немає даних')).toHaveLength(3)
 })
 it('retains the statistics link in the shared overview card',()=>{
  renderSummary({children:<a href="/reports">Статистика</a>})
  expect(within(region()).getByRole('link',{name:'Статистика'})).toHaveAttribute('href','/reports')
 })
 it('also renders a signed result for an annual reporting period',()=>{
  renderSummary({title:'2026 рік',totals:{income:20000,expense:6000,net:14000}})
  const annual=screen.getByRole('region',{name:'2026 рік'})
  expect(annual.querySelector('.money-hero')?.textContent?.replace(/\s/g,'')).toMatch(/^\+14000,00/)
 })
 it('does not repeat the result with a second amount and verbose comparison label',()=>{
  renderSummary()
  expect(screen.queryByText('Витрати перевищили доходи на')).toBeNull()
  expect(screen.queryByText('Доходи перевищили витрати на')).toBeNull()
  expect(region().querySelector('.period-result-line')).toBeNull()
 })
})