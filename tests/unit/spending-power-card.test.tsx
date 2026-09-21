import {describe,it,expect} from 'vitest'
import {render,screen} from '@testing-library/react'
import {SpendingPowerCard} from '@/components/dashboard/spending-power-card'
import {makeAccount} from './_factories'
const amount=(id:string)=>screen.getByTestId(id).textContent?.replace(/\s/g,'')
describe('SpendingPowerCard',()=>{
 it('shows separate own, credit and total values',()=>{render(<SpendingPowerCard displayCurrency="UAH" accounts={[makeAccount({currentBalance:14000}),makeAccount({type:'credit_card',creditLimit:50000,currentBalance:-43080.75})]}/>);expect(amount('own-funds')).toContain('14000,00');expect(amount('available-credit')).toContain('6919,25');expect(amount('total-available')).toContain('20919,25')})
 it('never shows negative spending capacity for an over-limit card',()=>{render(<SpendingPowerCard displayCurrency="UAH" accounts={[makeAccount({name:'IRON test',type:'credit_card',creditLimit:160000,currentBalance:-186835.25})]}/>);expect(amount('available-credit')).toContain('0,00');expect(amount('total-available')).toContain('0,00');expect(screen.getByText(/Перевищення/)).toBeInTheDocument();expect(screen.getByText(/Борг/).textContent).toContain('-186')})
 it('keeps explanations behind an accessible info control',()=>{render(<SpendingPowerCard displayCurrency="UAH" accounts={[]}/>);expect(screen.getByRole('button',{name:'Як рахуються доступні гроші'})).toBeInTheDocument();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByText('Кредитні кошти').closest('details')).not.toHaveAttribute('open')})
 it('links the credit breakdown to its account without mutation controls',()=>{render(<SpendingPowerCard displayCurrency="UAH" accounts={[makeAccount({id:'card-1',name:'Card test',type:'credit_card',currentBalance:500,creditLimit:1000})]}/>);expect(screen.getByText('Card test').closest('a')).toHaveAttribute('href','/accounts/card-1');expect(amount('own-funds')).toContain('500,00');expect(amount('total-available')).toContain('1500,00')})
})

describe('personal money on the family overview',()=>{
 it('shows my amount separately without altering the family total',()=>{
  render(<SpendingPowerCard displayCurrency="UAH" currentUserId="me" accounts={[makeAccount({ownerUserId:'me',currentBalance:700}),makeAccount({ownerUserId:'wife',currentBalance:900})]}/>)
  expect(amount('personal-own-funds')).toContain('700,00')
  expect(amount('own-funds')).toContain('1600,00')
  expect(screen.getByText('Мої гроші')).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Мої рахунки'})).toBeInTheDocument()
 })
 it('shows the second member their own money',()=>{
  render(<SpendingPowerCard displayCurrency="UAH" currentUserId="wife" accounts={[makeAccount({ownerUserId:'me',currentBalance:700}),makeAccount({ownerUserId:'wife',currentBalance:900})]}/>)
  expect(amount('personal-own-funds')).toContain('900,00')
  expect(amount('own-funds')).toContain('1600,00')
 })
})