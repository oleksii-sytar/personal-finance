import {beforeEach,describe,it,expect,vi} from 'vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {AccountForm} from '@/components/accounts/account-form'
import {makeAccount} from './_factories'
const state=vi.hoisted(()=>({create:vi.fn().mockResolvedValue({}),update:vi.fn().mockResolvedValue({}),push:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:state.push,back:vi.fn()})}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:vi.fn(),error:vi.fn()})}))
vi.mock('@/hooks/use-finance',()=>({useMembers:()=>({data:[]}),useCurrentUser:()=>({data:{id:'owner'}}),useCreateAccount:()=>({mutateAsync:state.create,isPending:false}),useUpdateAccount:()=>({mutateAsync:state.update,isPending:false})}))
beforeEach(()=>vi.clearAllMocks())
function newCard(){render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Test card'}});fireEvent.change(screen.getByLabelText('Тип'),{target:{value:'credit_card'}})}
describe('Credit limit and initial own funds have distinct meanings',()=>{
 it('does not put a new 100000 credit limit into the opening balance',async()=>{
  newCard();fireEvent.change(screen.getByLabelText('Кредитний ліміт'),{target:{value:'100000'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  await waitFor(()=>expect(state.create).toHaveBeenCalledWith(expect.objectContaining({type:'credit_card',creditLimit:100000,openingBalance:0})))
 })
 it('can create a card with positive own money, not a falsely negative debt',async()=>{
  newCard();fireEvent.change(screen.getByLabelText('Залишок кредитки'),{target:{value:'own'}})
  fireEvent.change(screen.getByLabelText('Власні кошти на картці'),{target:{value:'2500'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  await waitFor(()=>expect(state.create).toHaveBeenCalledWith(expect.objectContaining({openingBalance:2500})))
 })
 it('keeps debt entry negative in storage',async()=>{
  newCard();fireEvent.change(screen.getByLabelText('Поточна сума боргу'),{target:{value:'20000'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  await waitFor(()=>expect(state.create).toHaveBeenCalledWith(expect.objectContaining({openingBalance:-20000})))
 })
 it('edits only the limit, not debt, opening balance or transactions',async()=>{
  render(<AccountForm account={makeAccount({id:'card',type:'credit_card',name:'Test card',openingBalance:-20000,currentBalance:-19000,creditLimit:50000})}/>)
  fireEvent.change(screen.getByLabelText('Кредитний ліміт'),{target:{value:'40000'}})
  fireEvent.click(screen.getByRole('button',{name:'Зберегти зміни'}))
  await waitFor(()=>expect(state.update).toHaveBeenCalled())
  const patch=state.update.mock.calls[0][0].patch
  expect(patch.creditLimit).toBe(40000)
  expect(patch).not.toHaveProperty('openingBalance');expect(patch).not.toHaveProperty('currentBalance')
  expect(state.create).not.toHaveBeenCalled()
 })
})