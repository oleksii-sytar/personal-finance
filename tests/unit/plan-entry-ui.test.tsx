vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({can:()=>true})}))
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {DetailedEntryForm} from '@/components/transactions/detailed-entry-form'
import {FX_STATUS} from '@/lib/money/fx'
const state=vi.hoisted(()=>({create:vi.fn(),update:vi.fn(),save:vi.fn(),close:vi.fn(),accounts:[{id:'cash',name:'Гаманець',currency:'UAH',isDefault:true,type:'cash'}]}))
vi.mock('@/hooks/use-finance',()=>({useAccounts:()=>({data:state.accounts}),useMembers:()=>({data:[]}),useCategories:()=>({data:[]}),useCreateTransaction:()=>({mutateAsync:state.create}),useUpdateTransaction:()=>({mutateAsync:state.update}),useDeleteTransaction:()=>({}),useSaveRecurring:()=>({mutateAsync:state.save})}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:vi.fn(),error:vi.fn()})}))
vi.mock('@/components/transactions/transfer-dialog',()=>({TransferDialog:()=>null}))
beforeEach(()=>{state.create.mockReset().mockResolvedValue({id:'new'});state.save.mockReset().mockResolvedValue({id:'series'});state.update.mockReset().mockResolvedValue({id:'updated'});state.close.mockClear();FX_STATUS.source='nbu';FX_STATUS.date='14.09.2026'})
afterEach(()=>{FX_STATUS.source='fallback';FX_STATUS.date=null})
describe('Plan entry UI',()=>{
 it('starts in planned mode from the Plans tab',()=>{render(<DetailedEntryForm open onClose={state.close} initialValues={{status:'planned'}}/>);expect(screen.getByLabelText('Запланована операція, ще не виконана')).toBeChecked();expect(screen.getByLabelText('Валюта плану')).toBeVisible();expect(screen.getByLabelText('Повторення')).toHaveValue('once')})
 it('saves original EUR amount and an account-currency estimate',async()=>{
  render(<DetailedEntryForm open onClose={state.close} initialValues={{status:'planned'}}/>)
  fireEvent.change(screen.getByLabelText('Сума (₴)'),{target:{value:'1000'}})
  fireEvent.change(screen.getByLabelText('Валюта плану'),{target:{value:'EUR'}})
  fireEvent.click(screen.getByRole('button',{name:'Зберегти план'}))
  await waitFor(()=>expect(state.create).toHaveBeenCalled())
  expect(state.create.mock.calls[0][0]).toMatchObject({amount:45200,currency:'UAH',originalAmount:1000,originalCurrency:'EUR',planExchangeMode:'nbu',status:'planned'})
 })
 it('creates a recurring series rather than a completed transaction',async()=>{
  render(<DetailedEntryForm open onClose={state.close} initialValues={{status:'planned'}}/>)
  fireEvent.change(screen.getByLabelText('Сума (₴)'),{target:{value:'100'}})
  fireEvent.change(screen.getByLabelText('Повторення'),{target:{value:'monthly'}})
  fireEvent.click(screen.getByRole('button',{name:'Зберегти повторення'}))
  await waitFor(()=>expect(state.save).toHaveBeenCalled())
  expect(state.create).not.toHaveBeenCalled();expect(state.save.mock.calls[0][0]).toMatchObject({frequency:'monthly',intervalCount:1,template:{amount:100,kind:'expense'}})
 })
 it('does not silently save a fallback rate as an official NBU rate',async()=>{
  FX_STATUS.source='fallback'
  render(<DetailedEntryForm open onClose={state.close} initialValues={{status:'planned'}}/>)
  fireEvent.change(screen.getByLabelText('Сума (₴)'),{target:{value:'1000'}})
  fireEvent.change(screen.getByLabelText('Валюта плану'),{target:{value:'EUR'}})
  fireEvent.click(screen.getByRole('button',{name:'Зберегти план'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Курс НБУ ще недоступний')
  expect(state.create).not.toHaveBeenCalled()
 })
})