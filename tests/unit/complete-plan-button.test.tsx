import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import {CompletePlanButton} from '@/components/transactions/complete-plan-button'
import {makeTxn} from './_factories'
const state=vi.hoisted(()=>({save:vi.fn(),success:vi.fn(),error:vi.fn(),role:'owner',pending:false}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({role:state.role,can:()=>true})}))
vi.mock('@/hooks/use-finance',()=>({useUpdateTransaction:()=>({mutateAsync:state.save,isPending:state.pending}),useCurrentUser:()=>({data:{id:'owner'}})}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:state.success,error:state.error})}))
const plan=()=>makeTxn({id:'same-plan',status:'planned',transactionDate:'2026-09-25',plannedDate:'2026-09-25',accountId:'cash',loanAccountId:'loan',loanInstallmentId:'schedule',categoryId:'loan-category',amount:14800.60,createdBy:'owner'})
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-21T12:00:00Z'));state.role='owner';state.pending=false;state.save.mockReset().mockResolvedValue({});state.error.mockReset();state.success.mockReset()})
afterEach(()=>{cleanup();vi.useRealTimers()})
describe('one-click plan completion',()=>{
 it('completes the same loan plan today and preserves its intended date',async()=>{
  const done=vi.fn(),t=plan()
  render(<CompletePlanButton transaction={t} onCompleted={done}/>)
  fireEvent.click(screen.getByRole('button',{name:'Оплачено'}))
  await waitFor(()=>expect(done).toHaveBeenCalledOnce())
  expect(state.save).toHaveBeenCalledTimes(1)
  expect(state.save).toHaveBeenCalledWith({id:'same-plan',patch:{status:'completed',amount:14800.60,transactionDate:'2026-09-21',plannedDate:'2026-09-25',planExchangeMode:null,plannedTime:null,reviewRequired:false,expectedUpdatedAt:t.updatedAt}})
  expect(t.status).toBe('planned')
  expect(state.save.mock.calls[0][0].patch).not.toHaveProperty('loanAccountId')
  expect(state.save.mock.calls[0][0].patch).not.toHaveProperty('loanPrincipal')
 })
 it('confirms income through the same action',async()=>{
  render(<CompletePlanButton transaction={{...plan(),kind:'income',loanAccountId:null}}/>)
  fireEvent.click(screen.getByRole('button',{name:'Отримано'}))
  await waitFor(()=>expect(state.success).toHaveBeenCalledWith('Надходження підтверджено'))
 })
 it('does not report success or close after a rejected update',async()=>{
  const failure=new Error('Changed by another user'),done=vi.fn();state.save.mockRejectedValue(failure)
  render(<CompletePlanButton transaction={plan()} onCompleted={done}/>)
  fireEvent.click(screen.getByRole('button',{name:'Оплачено'}))
  await waitFor(()=>expect(state.error).toHaveBeenCalledWith('Не вдалося підтвердити оплату',failure))
  expect(done).not.toHaveBeenCalled();expect(state.success).not.toHaveBeenCalled()
 })
 it('disables repeat submission while the update is pending',()=>{
  state.pending=true;render(<CompletePlanButton transaction={plan()}/>)
  expect(screen.getByRole('button',{name:'Зберігаємо…'})).toBeDisabled()
 })
 it.each(['viewer','member'])('does not offer another user payment to a %s',role=>{
  state.role=role;render(<CompletePlanButton transaction={{...plan(),createdBy:'another'}}/>)
  expect(screen.queryByRole('button')).toBeNull()
 })
 it('allows a member to complete their own plan',()=>{
  state.role='member';render(<CompletePlanButton transaction={plan()}/>)
  expect(screen.getByRole('button',{name:'Оплачено'})).toBeEnabled()
 })
 it.each(['completed','deleted'])('does not offer completion for %s records',state=>{
  const t=plan();render(<CompletePlanButton transaction={state==='completed'?{...t,status:'completed'}:{...t,deletedAt:'2026-09-21'}}/>)
  expect(screen.queryByRole('button')).toBeNull()
 })
})
