import {useState} from 'react'
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {useFormDraft} from '@/hooks/use-form-draft'
import {AccountForm} from '@/components/accounts/account-form'
import {CategoryForm} from '@/components/categories/category-form'
import {CategoryRulesManager} from '@/components/settings/category-rules-manager'
import {QuickEntrySheet} from '@/components/transactions/quick-entry-sheet'
import {ImportDialog} from '@/components/transactions/import-dialog'
import {ImportWorkflow} from '@/components/transactions/import-workflow'
import {makeAccount} from './_factories'
const state=vi.hoisted(()=>({workspace:'draft-family',user:'draft-user',write:vi.fn().mockResolvedValue({id:'saved'}),settingsReady:true,pendingClear:undefined as undefined|(()=>void),close:vi.fn()}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({workspace:{id:state.workspace},currentUser:{id:state.user},can:()=>true})}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),back:state.close})}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:vi.fn(),error:vi.fn()})}))
vi.mock('@/components/transactions/detailed-entry-form',()=>({DetailedEntryForm:()=>null}))
vi.mock('@/hooks/use-finance',()=>({
 useMembers:()=>({data:[]}),useCurrentUser:()=>({data:{id:state.user}}),
 useAccounts:()=>({data:[makeAccount({id:'bank',name:'Draft bank',balanceAnchorAt:'2026-01-01T00:00:00Z',balanceAnchorDate:'2026-01-01'})]}),
 useSettings:()=>({data:state.settingsReady?{defaultAccountId:'bank'}:undefined}),useCategories:()=>({data:[{id:'food',name:'Food',type:'expense',color:'#000000',icon:'tag'}]}),
 useCategoryRules:()=>({data:[]}),useTransactions:()=>({data:[]}),
 useCreateAccount:()=>({mutateAsync:state.write}),useUpdateAccount:()=>({mutateAsync:state.write}),
 useCreateCategory:()=>({mutateAsync:state.write}),useUpdateCategory:()=>({mutateAsync:state.write}),useDeleteCategory:()=>({mutateAsync:state.write}),
 useCreateCategoryRule:()=>({mutateAsync:state.write}),useUpdateCategoryRule:()=>({mutateAsync:state.write}),useDeleteCategoryRule:()=>({mutateAsync:state.write}),
 useCreateTransaction:()=>({mutateAsync:state.write}),useImportTransactions:()=>({mutateAsync:state.write}),
}))
function Harness({name='harness',enabled=true}:{name?:string;enabled?:boolean}){
 const [value,setValue]=useState(''),draft=useFormDraft(name,{value},{value:''},v=>setValue(v.value),enabled)
 return <><input aria-label="Draft value" value={value} onChange={e=>setValue(e.target.value)}/><button onClick={draft.clear}>Commit</button><button onClick={()=>{state.pendingClear=draft.clear}}>Capture save</button><button onClick={draft.discard}>Discard</button><button onClick={()=>draft.close(state.close)}>Close</button>{draft.restored&&<p>Restored</p>}{draft.storageError&&<p>Storage unavailable</p>}</>
}
beforeEach(()=>{sessionStorage.clear();state.workspace='draft-family';state.user='draft-user';state.settingsReady=true;vi.clearAllMocks();state.write.mockReset().mockResolvedValue({id:'saved'})})
afterEach(()=>{vi.restoreAllMocks()})
describe('Draft lifecycle and isolation',()=>{
 it('restores after unmount, including invalid input that still needs correction',()=>{
  let view=render(<Harness/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'1e3 invalid'}});view.unmount()
  render(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('1e3 invalid');expect(screen.getByText('Restored')).toBeInTheDocument()
 })
 it('does not restore a successfully committed entry',()=>{
  const view=render(<Harness/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'saved'}});fireEvent.click(screen.getByText('Commit'));view.unmount()
  render(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('')
 })
 it('explicit discard removes the draft and clears its fields',()=>{
  const view=render(<Harness/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'discard'}});fireEvent.click(screen.getByText('Discard'));expect(screen.getByLabelText('Draft value')).toHaveValue('');view.unmount()
  render(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('')
 })
 it('keeps users and households isolated even within the same mounted component',()=>{
  const view=render(<Harness/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'member A'}})
  state.user='member-b';view.rerender(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('')
  fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'member B'}})
  state.workspace='another-family';view.rerender(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('')
  state.workspace='draft-family';state.user='draft-user';view.rerender(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('member A')
 })
 it('keeps different records separate',()=>{
  const view=render(<Harness name="record-a"/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'record A'}})
  view.rerender(<Harness name="record-b"/>);expect(screen.getByLabelText('Draft value')).toHaveValue('')
  view.rerender(<Harness name="record-a"/>);expect(screen.getByLabelText('Draft value')).toHaveValue('record A')
 })
 it.each(['{broken',JSON.stringify({version:1,values:{value:42}}),JSON.stringify({version:0,values:{value:'old'}})])('ignores malformed or incompatible saved state',raw=>{
  sessionStorage.setItem('forma:draft:v1:draft-family:draft-user:harness',raw);render(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('')
 })
 it('retains early input while account/settings data is loading',()=>{
  const view=render(<Harness enabled={false}/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'typed early'}});view.rerender(<Harness/>);expect(screen.getByLabelText('Draft value')).toHaveValue('typed early')
 })
 it('uses memory during blocked storage, warns on reload, and lets the user keep editing',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new DOMException('blocked')})
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota')})
  vi.spyOn(Storage.prototype,'removeItem').mockImplementation(()=>{throw new DOMException('blocked')})
  vi.spyOn(window,'confirm').mockReturnValue(false)
  const view=render(<Harness name="blocked-storage"/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'keep me'}})
  expect(screen.getByText('Storage unavailable')).toBeInTheDocument()
  const event=new Event('beforeunload',{cancelable:true});act(()=>{window.dispatchEvent(event)});expect(event.defaultPrevented).toBe(true)
  fireEvent.click(screen.getByText('Close'));expect(state.close).not.toHaveBeenCalled();view.unmount()
  render(<Harness name="blocked-storage"/>);expect(screen.getByLabelText('Draft value')).toHaveValue('keep me')
 })
})
describe('All five reported draft-loss flows',()=>{
 it('BUG-005: category survives closing and reopening',()=>{
  const view=render(<CategoryForm open onClose={state.close}/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Category draft'}})
  view.rerender(<CategoryForm open={false} onClose={state.close}/>);view.rerender(<CategoryForm open onClose={state.close}/>)
  expect(screen.getByLabelText('Назва')).toHaveValue('Category draft')
 })
 it('BUG-092: account values and type survive leaving the page',()=>{
  const view=render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Cash draft'}});fireEvent.change(screen.getByLabelText('Тип'),{target:{value:'cash'}});fireEvent.change(screen.getByLabelText('Залишок зараз'),{target:{value:'1234,56'}});view.unmount()
  render(<AccountForm/>);expect(screen.getByLabelText('Назва')).toHaveValue('Cash draft');expect(screen.getByLabelText('Тип')).toHaveValue('cash');expect(screen.getByLabelText('Залишок зараз')).toHaveValue('1234,56')
 })
 it('BUG-100: rule conditions survive leaving settings',()=>{
  const view=render(<CategoryRulesManager/>);fireEvent.change(screen.getByLabelText('Назва правила'),{target:{value:'Rule draft'}});fireEvent.change(screen.getByLabelText('Ключові слова через кому або крапку з комою'),{target:{value:'one;two'}});view.unmount()
  render(<CategoryRulesManager/>);expect(screen.getByLabelText('Назва правила')).toHaveValue('Rule draft');expect(screen.getByLabelText('Ключові слова через кому або крапку з комою')).toHaveValue('one;two')
 })
 it('BUG-110: CSV, selected account and mapping survive dialog unmount',()=>{
  const csv='Date;Description;Amount\n2026-11-09;Unfinished;12'
  const view=render(<ImportWorkflow onDone={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Рахунок для імпорту'),{target:{value:'bank'}});fireEvent.change(screen.getByLabelText('Виписка CSV'),{target:{value:csv}});fireEvent.change(screen.getByLabelText('Колонка із сумою'),{target:{value:'1'}});view.unmount()
  render(<ImportWorkflow onDone={vi.fn()}/>);expect(screen.getByLabelText('Виписка CSV')).toHaveValue(csv);expect(screen.getByLabelText('Рахунок для імпорту')).toHaveValue('bank');expect(screen.getByLabelText('Колонка із сумою')).toHaveValue('1')
 })
 it('BUG-115: quick amount and operation kind survive reopening',()=>{
  const view=render(<QuickEntrySheet open onClose={state.close}/>);fireEvent.click(screen.getByRole('tab',{name:'Дохід'}));fireEvent.change(screen.getByLabelText('Сума (UAH)'),{target:{value:'88,25'}});view.unmount()
  render(<QuickEntrySheet open onClose={state.close}/>);expect(screen.getByLabelText('Сума (UAH)')).toHaveValue('88,25');expect(screen.getByRole('tab',{name:'Дохід'})).toHaveAttribute('aria-selected','true')
 })
 it('clears a category draft only after the save actually succeeds',async()=>{
  const view=render(<CategoryForm open onClose={state.close}/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Save category'}});fireEvent.click(screen.getByRole('button',{name:'Створити'}));await waitFor(()=>expect(state.close).toHaveBeenCalled());view.unmount()
  render(<CategoryForm open onClose={state.close}/>);expect(screen.getByLabelText('Назва')).toHaveValue('')
 })
 it('keeps an account draft after a failed API save',async()=>{
  state.write.mockRejectedValueOnce(Error('network'));const view=render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Retry account'}});fireEvent.change(screen.getByLabelText('Залишок зараз'),{target:{value:'123'}});fireEvent.click(screen.getByRole('button',{name:'Створити рахунок'}));await waitFor(()=>expect(state.write).toHaveBeenCalled());view.unmount()
  render(<AccountForm/>);expect(screen.getByLabelText('Назва')).toHaveValue('Retry account');expect(screen.getByLabelText('Залишок зараз')).toHaveValue('123')
 })
})

describe('Validation message lifecycle',()=>{
 it('removes obsolete field errors before a valid request is rejected by the API',async()=>{
  state.write.mockRejectedValueOnce(Error('duplicate'));render(<CategoryForm open onClose={state.close}/>)
  fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'x'.repeat(41)}});fireEvent.click(screen.getByRole('button',{name:'Створити'}));expect(screen.getByText('Не більше ніж 40 символів')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Valid name'}});fireEvent.click(screen.getByRole('button',{name:'Створити'}));await waitFor(()=>expect(state.write).toHaveBeenCalled())
  expect(screen.queryByText('Не більше ніж 40 символів')).not.toBeInTheDocument()
 })
})

describe('Explicit draft removal',()=>{
 it('requires a second deliberate action and clears only the current draft',()=>{
  render(<AccountForm/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Do not erase accidentally'}})
  fireEvent.click(screen.getByRole('button',{name:'Очистити чернетку'}));expect(screen.getByLabelText('Назва')).toHaveValue('Do not erase accidentally')
  fireEvent.click(screen.getByRole('button',{name:'Продовжити редагування'}));expect(screen.getByLabelText('Назва')).toHaveValue('Do not erase accidentally')
  fireEvent.click(screen.getByRole('button',{name:'Очистити чернетку'}));fireEvent.click(screen.getByRole('button',{name:'Підтвердити очищення'}));expect(screen.getByLabelText('Назва')).toHaveValue('')
 })
})

describe('Chaotic repeated save clicks',()=>{
 it('posts quick entry only once while the first API request is still unresolved',async()=>{
  let finish!:(value:{id:string})=>void
  state.write.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  render(<QuickEntrySheet open onClose={state.close}/>)
  fireEvent.change(screen.getByLabelText('Сума (UAH)'),{target:{value:'12.34'}})
  fireEvent.click(screen.getByRole('button',{name:'Додати витрату'}));fireEvent.click(screen.getByRole('button',{name:'Додати витрату'}))
  expect(state.write).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button',{name:'Закрити'}));expect(state.close).not.toHaveBeenCalled()
  await act(async()=>{finish({id:'saved'})})
 })
})

describe('Late completion of a previous save',()=>{
 it('does not erase newer input in the same form',()=>{
  const view=render(<Harness name="late-save"/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'submitted'}});fireEvent.click(screen.getByText('Capture save'))
  fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'newer edit'}});act(()=>state.pendingClear?.());view.unmount()
  render(<Harness name="late-save"/>);expect(screen.getByLabelText('Draft value')).toHaveValue('newer edit')
 })
 it('does not erase another member draft after a session switch',()=>{
  const view=render(<Harness name="late-member"/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'submitted by A'}});fireEvent.click(screen.getByText('Capture save'))
  state.user='late-member-b';view.rerender(<Harness name="late-member"/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'private draft B'}});act(()=>state.pendingClear?.());view.unmount()
  render(<Harness name="late-member"/>);expect(screen.getByLabelText('Draft value')).toHaveValue('private draft B')
 })
})

describe('In-flight mutations stay attached to their form',()=>{
 it('blocks duplicate category submits and prevents closing until the response arrives',async()=>{
  let finish!:(value:{id:string})=>void;state.write.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  render(<CategoryForm open onClose={state.close}/>);fireEvent.change(screen.getByLabelText('Назва'),{target:{value:'Pending category'}})
  fireEvent.click(screen.getByRole('button',{name:'Створити'}));fireEvent.click(screen.getByRole('button',{name:'Створити'}));fireEvent.click(screen.getByRole('button',{name:'Закрити'}))
  expect(state.write).toHaveBeenCalledTimes(1);expect(state.close).not.toHaveBeenCalled();await act(async()=>{finish({id:'saved'})});expect(state.close).toHaveBeenCalledTimes(1)
 })
 it('blocks duplicate imports and cannot close the active request',async()=>{
  let finish!:(value:unknown[])=>void;state.write.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  render(<ImportDialog open onClose={state.close} onDone={vi.fn()}/>)
  fireEvent.change(screen.getByLabelText('Рахунок для імпорту'),{target:{value:'bank'}})
  fireEvent.change(screen.getByLabelText('Виписка CSV'),{target:{value:'Date;Description;Amount\n2026-11-09;Pending;12'}})
  fireEvent.click(screen.getByRole('button',{name:'Підтвердити імпорт (1)'}));fireEvent.click(screen.getByRole('button',{name:'Підтвердити імпорт (1)'}));fireEvent.click(screen.getByRole('button',{name:'Закрити'}))
  expect(state.write).toHaveBeenCalledTimes(1);expect(state.close).not.toHaveBeenCalled();await act(async()=>{finish([])})
  fireEvent.click(screen.getByRole('button',{name:'Закрити'}));expect(state.close).toHaveBeenCalledTimes(1)
 })
})

describe('Quota failures with an older saved draft',()=>{
 it('restores the newest memory version when only writes fail',()=>{
  const view=render(<Harness name="quota-newest"/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'older stored'}})
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota')})
  fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'newest input'}});view.unmount()
  render(<Harness name="quota-newest"/>);expect(screen.getByLabelText('Draft value')).toHaveValue('newest input')
 })
 it('removes the older disk copy after a newer fallback draft is successfully committed',()=>{
  const view=render(<Harness name="quota-commit"/>);fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'older stored'}})
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota')})
  fireEvent.change(screen.getByLabelText('Draft value'),{target:{value:'newer saved'}});fireEvent.click(screen.getByText('Commit'));view.unmount()
  render(<Harness name="quota-commit"/>);expect(screen.getByLabelText('Draft value')).toHaveValue('')
 })
})
