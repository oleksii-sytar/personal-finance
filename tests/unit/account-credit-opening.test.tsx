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
  newCard();fireEvent.change(screen.getByLabelText('Поточна сума боргу'),{target:{value:'0'}});fireEvent.change(screen.getByLabelText('Кредитний ліміт'),{target:{value:'100000'}})
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
describe('Account input regressions found in the real browser',()=>{
 it('requires an explicit opening balance, including explicit zero',()=>{
  render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Empty balance'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  expect(state.create).not.toHaveBeenCalled();expect(screen.getByText(/Якщо коштів немає, вкажіть 0/)).toBeVisible()
 })
 it('accepts a Ukrainian amount with spaces and a decimal comma',async()=>{
  render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Cash'}})
  fireEvent.change(screen.getByLabelText('Залишок зараз'),{target:{value:'3 000,25'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  await waitFor(()=>expect(state.create).toHaveBeenCalledWith(expect.objectContaining({openingBalance:3000.25})))
 })
 it('shows the negative credit limit error beside the field',()=>{
  newCard();fireEvent.change(screen.getByLabelText('Поточна сума боргу'),{target:{value:'0'}})
  fireEvent.change(screen.getByLabelText('Кредитний ліміт'),{target:{value:'-1'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  expect(state.create).not.toHaveBeenCalled();expect(screen.getByText('Ліміт не може бути від’ємним')).toBeVisible()
 })
 it('does not validate stale hidden credit fields after switching to cash',async()=>{
  newCard();fireEvent.change(screen.getByLabelText('Поточна сума боргу'),{target:{value:'100'}})
  fireEvent.change(screen.getByLabelText('Кредитний ліміт'),{target:{value:'-1'}})
  fireEvent.change(screen.getByLabelText('Відсоткова ставка, %'),{target:{value:'1500'}})
  fireEvent.change(screen.getByLabelText('Тип'),{target:{value:'cash'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  await waitFor(()=>expect(state.create).toHaveBeenCalledWith(expect.objectContaining({type:'cash',openingBalance:100,creditLimit:null,interestRate:null})))
 })
 it('shows an out-of-range interest rate error',()=>{
  newCard();fireEvent.change(screen.getByLabelText('Поточна сума боргу'),{target:{value:'0'}})
  fireEvent.change(screen.getByLabelText('Відсоткова ставка, %'),{target:{value:'1001'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  expect(screen.getByText('Ставка має бути не більшою за 1000%')).toBeVisible()
 })
 it('shows an overlong institution error',()=>{
  render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Bank'}})
  fireEvent.change(screen.getByLabelText('Залишок зараз'),{target:{value:'0'}})
  fireEvent.change(screen.getByLabelText('Фінансова установа'),{target:{value:'x'.repeat(81)}})
  fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}))
  expect(screen.getByText('Не більше ніж 80 символів')).toBeVisible();expect(state.create).not.toHaveBeenCalled()
 })
 it('does not offer a manually tracked loan as the default payment account',()=>{
  render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Тип'),{target:{value:'bank_loan'}})
  expect(screen.getByLabelText('Сума до повного погашення')).toBeVisible()
  expect(screen.queryByRole('switch',{name:/Мій основний рахунок/})).toBeNull()
 })
 it('blocks duplicate submissions while the first write is pending',async()=>{
  let finish!:(value:unknown)=>void;state.create.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Once'}})
  fireEvent.change(screen.getByLabelText('Залишок зараз'),{target:{value:'0'}})
  const button=screen.getByRole('button',{name:'Створити рахунок'})
  fireEvent.click(button);fireEvent.click(button);expect(state.create).toHaveBeenCalledTimes(1)
  finish({});await waitFor(()=>expect(state.push).toHaveBeenCalled())
 })
})
