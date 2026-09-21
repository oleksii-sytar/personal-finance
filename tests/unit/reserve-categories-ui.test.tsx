import {beforeEach,describe,it,expect,vi} from 'vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ReserveCategories,ForecastCategories} from '@/components/settings/reserve-categories'

const state=vi.hoisted(()=>({editable:true,save:vi.fn(),error:vi.fn()}))
vi.mock('@/hooks/use-finance',()=>({
 useCategories:()=>({data:[
  {id:'food',name:'Продукти',type:'expense'},
  {id:'home',name:'Житло та комунальні',type:'expense',isEssential:true,includeInDailyForecast:false},
  {id:'fun',name:'Розваги',type:'expense',isEssential:false},
  {id:'salary',name:'Зарплата',type:'income'}
 ]}),
 useUpdateCategory:()=>({mutateAsync:state.save,isPending:false})
}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({can:()=>state.editable})}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({error:state.error})}))
beforeEach(()=>{state.editable=true;state.save.mockReset().mockResolvedValue(undefined);state.error.mockReset()})
describe('mobile reserve category selection',()=>{
 it('shows only expense categories, defaults and an accurate selection count',()=>{
  render(<ReserveCategories/>)
  expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  expect(screen.getByRole('checkbox',{name:'Продукти'})).toBeChecked()
  expect(screen.getByRole('checkbox',{name:'Житло та комунальні'})).toBeChecked()
  expect(screen.getByRole('checkbox',{name:'Розваги'})).not.toBeChecked()
  expect(screen.getByText('Обрано 2 із 3')).toBeVisible()
  expect(screen.queryByRole('checkbox',{name:'Зарплата'})).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox',{name:'Продукти'}).closest('label')).toHaveClass('w-full','min-h-14')
  expect(screen.getByText(/Впливає лише на резерв/)).toBeVisible()
 })
 it('saves only the category inclusion flag and confirms the result',async()=>{
  render(<ReserveCategories/>)
  fireEvent.click(screen.getByRole('checkbox',{name:'Продукти'}))
  await waitFor(()=>expect(state.save).toHaveBeenCalledWith({id:'food',patch:{isEssential:false}}))
  expect(await screen.findByRole('status')).toHaveTextContent('Продукти: виключено з резерву.')
 })
 it('keeps failures visible beside the category controls',async()=>{
  state.save.mockRejectedValueOnce(new Error('З’єднання перервано'))
  render(<ReserveCategories/>)
  fireEvent.click(screen.getByRole('checkbox',{name:'Розваги'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Не вдалося зберегти вибір.')
  expect(state.error).toHaveBeenCalled()
  expect(screen.getByRole('checkbox',{name:'Розваги'})).not.toBeChecked()
 })
 it('prevents overlapping saves while keeping the selected category visible',async()=>{
  let finish:()=>void=()=>{}
  state.save.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve}))
  render(<ReserveCategories/>)
  fireEvent.click(screen.getByRole('checkbox',{name:'Розваги'}))
  for(const checkbox of screen.getAllByRole('checkbox'))expect(checkbox).toBeDisabled()
  expect(screen.getByText('Зберігаємо…')).toBeVisible()
  finish()
  await waitFor(()=>expect(screen.getByRole('checkbox',{name:'Продукти'})).toBeEnabled())
 })
 it('preserves read-only permissions',()=>{
  state.editable=false
  render(<ReserveCategories/>)
  for(const checkbox of screen.getAllByRole('checkbox'))expect(checkbox).toBeDisabled()
  expect(screen.getByText(/Змінювати цей вибір може власник/)).toBeVisible()
  expect(state.save).not.toHaveBeenCalled()
 })
})

describe('independent daily forecast categories',()=>{
 it('does not inherit the reserve selection and explains the rolling window',()=>{
  render(<ForecastCategories/>)
  expect(screen.getByRole('checkbox',{name:'Продукти'})).toBeChecked()
  expect(screen.getByRole('checkbox',{name:'Житло та комунальні'})).not.toBeChecked()
  expect(screen.getByRole('checkbox',{name:'Розваги'})).toBeChecked()
  expect(screen.getByText(/останні 90 завершених днів/)).toBeVisible()
  expect(screen.getByText(/Статистика, резерв і створені плани не змінюються/)).toBeVisible()
 })
 it('saves only the forecast flag, without changing reserve categories',async()=>{
  render(<ForecastCategories/>)
  fireEvent.click(screen.getByRole('checkbox',{name:'Житло та комунальні'}))
  await waitFor(()=>expect(state.save).toHaveBeenCalledWith({id:'home',patch:{includeInDailyForecast:true}}))
  expect(await screen.findByRole('status')).toHaveTextContent('Житло та комунальні: враховано у щоденній оцінці.')
 })
})