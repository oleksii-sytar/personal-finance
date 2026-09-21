import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {ReservePreview} from '@/components/settings/user-settings-form'
import {MobileTabBar} from '@/components/layout/mobile-tab-bar'
import {ImportReminderCard} from '@/components/settings/import-reminders'
import {formatMoney} from '@/lib/money/format'
import type {automaticSpending} from '@/lib/calculations/liquidity'

const state=vi.hoisted(()=>({settings:{userId:'test-user',importReminderEnabled:true,importReminderWeekday:1},path:'/reports',save:vi.fn().mockResolvedValue(undefined),rpc:vi.fn(),permission:vi.fn()}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({can:()=>true})}))
vi.mock('next/navigation',()=>({usePathname:()=>state.path}))
vi.mock('@/hooks/use-finance',()=>({useSettings:()=>({data:state.settings}),useUpdateSettings:()=>({mutateAsync:state.save,isPending:false}),useAccounts:()=>({data:[]}),useTransactions:()=>({data:[]}),useImportBatches:()=>({data:[]})}))
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:state.rpc})}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:vi.fn(),error:vi.fn()})}))
const trend=(over:Partial<ReturnType<typeof automaticSpending>>={}):ReturnType<typeof automaticSpending>=>({daily:100,cashDaily:100,cashDailyBase:100,essentialDaily:100,baseEssential:100,essentialDiscounts:{},monthlyDiscounts:{},canEstimate:true,confidence:'history',method:'mean',lowDaily:50,highDaily:150,missingCoverage:[],missingFx:0,streams:[],excludedOneOff:0,scheduledHistory:0,comparison:{folds:3,baselineMAE:0,smoothingMAE:0,horizon:7},longComparison:{folds:3,baselineMAE:0,smoothingMAE:0,horizon:14},days:30,sampleCount:10,hasHistory:true,provisional:false,partialDay:false,unknownAccounts:0,recurringStreams:0,from:'2026-06-01',to:'2026-09-10',...over})
beforeEach(()=>{
 vi.clearAllMocks();state.path='/reports'
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false})))
 vi.stubGlobal('Notification',{permission:'default',requestPermission:state.permission})
})
afterEach(()=>vi.unstubAllGlobals())
describe('Consistent reserve confidence',()=>{
 it.each([{hasHistory:false,canEstimate:false,confidence:'plans_only' as const,sampleCount:0,days:0},{canEstimate:false,confidence:'plans_only' as const,missingFx:1}])('does not invent a reserve without usable history: %o',over=>{
  render(<ReservePreview trend={trend(over)} currency="UAH" days={30}/>)
  expect(screen.getByText('Лише відомі плани')).toBeVisible()
  expect(screen.queryByText(formatMoney(3000,'UAH'),{normalizer:text=>text})).not.toBeInTheDocument()
  expect(screen.getByText('На чому ґрунтується оцінка')).toBeVisible()
 })
 it('shows the shared reserve with its confidence label',()=>{
  render(<ReservePreview trend={trend()} currency="UAH" days={30}/>)
  expect(screen.getByText('За підтвердженою історією')).toBeVisible()
  expect(screen.getByText(formatMoney(3000,'UAH'),{normalizer:text=>text})).toBeVisible()
  expect(screen.getByText(/Це цільова сума запасу, не залишок на рахунках\./)).toBeVisible()
  expect(screen.getByText(/сьогодні лише плани, щоденні потреби відзавтра/)).toBeVisible()
 })
 it('allows a preliminary estimate without arbitrary event and day gates',()=>{render(<ReservePreview trend={trend({days:5,sampleCount:1,unknownAccounts:2,confidence:'preliminary',provisional:true})} currency="UAH" days={30}/>);expect(screen.getByText('Попередня оцінка')).toBeVisible();expect(screen.getByText(formatMoney(3000,'UAH'),{normalizer:text=>text})).toBeVisible()})
 it('does not calculate a reserve from an invalid day count',()=>{
  render(<ReservePreview trend={trend()} currency="UAH" days={0}/>)
  expect(screen.getByText('Вкажіть 1–365 днів')).toBeVisible()
 })
})
describe('Mobile home navigation',()=>{
 it('puts reports on the left and home in the centre without quick add',()=>{
  render(<MobileTabBar/>)
  const nav=screen.getByRole('navigation',{name:'Основна навігація'})
  expect(Array.from(nav.querySelectorAll(':scope > div > a')).map(a=>a.getAttribute('href'))).toEqual(['/reports','/transactions','/dashboard','/accounts'])
  expect(within(nav).getByRole('link',{name:'Статистика',exact:true})).toHaveAttribute('aria-current','page')
  expect(within(nav).getByRole('link',{name:'Огляд',exact:true})).toHaveClass('mobile-navigation-home')
  expect(within(nav).queryByRole('button',{name:/Швидко/})).not.toBeInTheDocument()
 })
 it('marks the home destination, not reports, on the dashboard',()=>{
  state.path='/dashboard';render(<MobileTabBar/>)
  expect(screen.getByRole('link',{name:'Огляд',exact:true})).toHaveAttribute('aria-current','page')
  expect(screen.getByRole('link',{name:'Статистика',exact:true})).not.toHaveAttribute('aria-current')
 })
})
it('saves the reminder day without asking for push permission or connecting a device',async()=>{
 render(<ImportReminderCard/>)
 fireEvent.change(screen.getByLabelText('День нагадування'),{target:{value:'2'}})
 fireEvent.click(screen.getByRole('button',{name:'Зберегти день'}))
 await waitFor(()=>expect(state.save).toHaveBeenCalledWith({importReminderWeekday:2}))
 expect(state.permission).not.toHaveBeenCalled()
 expect(state.rpc).not.toHaveBeenCalled()
 expect(screen.getByRole('button',{name:'Підключити цей пристрій'})).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Тестове сповіщення'})).toBeInTheDocument()
})