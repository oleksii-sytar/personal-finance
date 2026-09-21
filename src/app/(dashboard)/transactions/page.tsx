'use client'
import {useDailySpending} from '@/hooks/use-daily-spending'
import {Suspense,useEffect,useMemo,useRef,useState} from 'react'
import {useRouter,useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {Plus,SlidersHorizontal,Upload,Repeat} from 'lucide-react'
import {Card} from '@/components/ui/Card'
import {Button} from '@/components/ui/Button'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/select'
import {Checkbox} from '@/components/ui/checkbox'
import {Dialog,DialogActions} from '@/components/ui/dialog'
import {SegmentedControl} from '@/components/ui/segmented'
import {TransactionList} from '@/components/transactions/transaction-list'
import {DetailedEntryForm} from '@/components/transactions/detailed-entry-form'
import {ImportDialog} from '@/components/transactions/import-dialog'
import {BulkActionDialog,type BulkAction} from '@/components/transactions/bulk-action-dialog'
import {useAccounts,useCategories,useTransactionPages,useSelectTransactions,useRecurring} from '@/hooks/use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {hasLedgerFilters,transactionSelection,BULK_SELECTION_LIMIT} from '@/lib/data/ledger-filter'
import type {LedgerFilter,TransactionSelection} from '@/lib/data/repository'
import {RecurringManager} from '@/components/transactions/recurring-manager'
import type {Transaction,RecurringTransaction} from '@/types/domain'
export default function TransactionsPage(){return <Suspense fallback={<p>Завантажуємо транзакції…</p>}><Ledger/></Suspense>}
function Ledger(){
 const router=useRouter(),params=useSearchParams(),{data:accounts=[]}=useAccounts(),{data:categories=[]}=useCategories(),{data:recurring=[]}=useRecurring(),{role,can}=useWorkspaceContext()
 const canBulk=role==='owner'||role==='manager'
 const purpose=params.get('purpose')==='reserve'?'reserve':'forecast',spending=useDailySpending(purpose)
 const [spendingView,setSpendingView]=useState(params.get('spending')||'')
 const spendingIds=useMemo(()=>spendingView==='included'?spending.trend.ordinary.map(r=>r.id):spendingView==='excluded'?spending.trend.exclusions.map(r=>r.id):spendingView==='review'?spending.trend.reviewRows.map(r=>r.id):null,[spendingView,spending.trend])
 const requestedEdit=params.get('edit'),openedEdit=useRef('')
 const spendingScope=spendingIds?(spendingIds.length?spendingIds:['00000000-0000-0000-0000-000000000000']):undefined
 const [category,setCategory]=useState(params.get('category')||''),[seriesOpen,setSeriesOpen]=useState(false),[series,setSeries]=useState<RecurringTransaction|null>(null),[repeatFrom,setRepeatFrom]=useState<Transaction|null>(null)
 const [account,setAccount]=useState(params.get('account')||''),[kind,setKind]=useState(params.get('kind')||'all'),[view,setView]=useState<'all'|'review'|'planned'>(params.get('view')==='planned'?'planned':params.get('view')==='review'?'review':'all'),[search,setSearch]=useState(''),[from,setFrom]=useState(params.get('from')||''),[to,setTo]=useState(params.get('to')||''),[deleted,setDeleted]=useState(false),[filters,setFilters]=useState(false),[selected,setSelected]=useState<Map<string,TransactionSelection>>(new Map()),[action,setAction]=useState<BulkAction|null>(null),[editing,setEditing]=useState<Transaction|null>(null),[form,setForm]=useState(!!params.get('newLoan')),[importing,setImporting]=useState(params.get('import')==='1')
 const [batch,setBatch]=useState(params.get('batch')||''),[ids,setIds]=useState(params.get('ids')||''),[pending,setPending]=useState(params.get('pending')==='1')
 useEffect(()=>{setSpendingView(params.get('spending')||'');setCategory(params.get('category')||'');setKind(params.get('kind')||'all');setFrom(params.get('from')||'');setTo(params.get('to')||'');setAccount(params.get('account')||'');setBatch(params.get('batch')||'');setIds(params.get('ids')||'');setPending(params.get('pending')==='1');setView(params.get('view')==='planned'?'planned':params.get('view')==='review'?'review':'all')},[params])
 const [querySearch,setQuerySearch]=useState(search),[selectionError,setSelectionError]=useState('')
 useEffect(()=>{const timer=setTimeout(()=>setQuerySearch(search.trim()),250);return()=>clearTimeout(timer)},[search])
 const filter=useMemo<LedgerFilter>(()=>({categoryId:category||undefined,accountId:account||undefined,kind:kind==='all'?undefined:kind as Transaction['kind'],status:view==='planned'?'planned':'completed',needsReview:view==='review',from:from||undefined,to:to||undefined,deletedOnly:deleted,pendingAccountId:pending?account:undefined,importBatchId:batch||undefined,ids:spendingScope?ids?spendingScope.filter(id=>ids.split(',').includes(id)).concat('00000000-0000-0000-0000-000000000000'):spendingScope:ids?ids.split(',').filter(Boolean):undefined,search:querySearch||undefined}),[category,account,kind,view,from,to,deleted,pending,batch,ids,querySearch,spendingScope])
 const pages=useTransactionPages(filter),selectAll=useSelectTransactions(),scope=JSON.stringify(filter),scopeRef=useRef(scope)
 scopeRef.current=scope+'|'+search
 const searchPending=querySearch!==search.trim()
 const filtered=useMemo(()=>Array.from(new Map((pages.data?.pages.flatMap(p=>p.items)||[]).map(t=>[t.id,t])).values()),[pages.data])
 const isLoading=pages.isLoading||!!spendingView&&spending.isLoading,total=pages.data?.pages[0]?.total??0,reviewCount=pages.data?.pages[0]?.reviewCount??0
 useEffect(()=>{setSelected(new Map());setSelectionError('')},[scope,search])
 const chosen=[...selected.values()],selectedIds=new Set(selected.keys()),filterCount=[!!category,!!account,kind!=='all',!!from,!!to,deleted,pending,!!batch,!!ids,!!spendingView,!!search.trim()].filter(Boolean).length
 const loadedSelected=filtered.filter(t=>selected.has(t.id)).length
 const toggle=(id:string,checked:boolean)=>setSelected(old=>{const next=new Map(old),t=filtered.find(t=>t.id===id);if(checked&&t&&next.size<BULK_SELECTION_LIMIT)next.set(id,transactionSelection(t));else if(!checked)next.delete(id);return next})
 async function chooseAll(){
  const snapshot=pages.data?.pages[0]?.snapshot,requestScope=scope+'|'+search
  if(!snapshot||searchPending||!hasLedgerFilters(filter))return
  setSelectionError('')
  try{const rows=await selectAll.mutateAsync({filter,snapshot});if(scopeRef.current===requestScope)setSelected(new Map(rows.map(t=>[t.id,t])))}
  catch(e){if(scopeRef.current===requestScope)setSelectionError(e instanceof Error?e.message:'Не вдалося обрати транзакції')}
 }
 function closeImport(){setImporting(false);if(params.has('import')){const next=new URLSearchParams(params.toString());next.delete('import');router.replace('/transactions'+(next.size?'?'+next.toString():''),{scroll:false})}}
 function resetFilters(nextBatch=''){setCategory('');setAccount('');setKind('all');setFrom('');setTo('');setDeleted(false);setPending(false);setBatch(nextBatch);setIds('');setSpendingView('');setSearch('');setQuerySearch('');setView('all');setSelected(new Map());setFilters(false);router.replace(nextBatch?'/transactions?batch='+encodeURIComponent(nextBatch):'/transactions',{scroll:false})}
 useEffect(()=>{
  if(!requestedEdit){openedEdit.current='';return}
  if(openedEdit.current===requestedEdit)return
  const t=spending.transactions.find(t=>t.id===requestedEdit&&!t.deletedAt)
  if(t){openedEdit.current=requestedEdit;setEditing(t);setSeries(null);setRepeatFrom(null);setForm(true)}
 },[requestedEdit,spending.transactions])
 function closeForm(){
  setForm(false)
  if(params.has('edit')||params.has('newLoan')){const next=new URLSearchParams(params.toString());next.delete('edit');next.delete('newLoan');router.replace('/transactions'+(next.size?'?'+next.toString():''),{scroll:false})}
 }
 return <><header className="mb-3 space-y-3 ledger-page-heading"><h1 className="font-space-grotesk text-2xl font-bold">Транзакції</h1>{can('transaction.create')&&<div className="flex gap-2"><Button onClick={()=>{setEditing(null);setSeries(null);setRepeatFrom(null);setForm(true)}} className="min-w-0 flex-1"><Plus className="mr-1 h-4 w-4 shrink-0"/>Додати транзакцію</Button>{canBulk&&<Button variant="secondary" onClick={()=>setImporting(true)}><Upload className="mr-1 h-4 w-4"/>Імпорт</Button>}</div>}</header>
 {(spendingView||params.has('edit'))&&<div className="mb-3 space-y-2 rounded-xl border border-primary p-3"><Link className="finance-link" href={purpose==='reserve'?'/settings#reserve-categories':'/forecast'}>Повернутися до розрахунку</Link><p className="text-sm">{purpose==='reserve'?'Резерв':'Щоденні витрати'} · {spending.trend.from} - {spending.trend.to}</p>{spendingView==='review'&&<p className="text-sm">Ці витрати зараз враховані. Відкрийте потрібну, щоб залишити її, позначити разовою або пов’язати з планом.</p>}</div>}
 <SegmentedControl aria-label="Список транзакцій" className="ledger-tabs mb-3 w-full" value={view} onChange={setView} options={[{value:'all',label:'Виконані'},{value:'review',label:'Перевірити',count:reviewCount},{value:'planned',label:'Плани'}]}/>
 {view==='planned'&&<div className="plans-toolbar"><span>Найближчі спочатку</span><Button variant="secondary" size="sm" onClick={()=>setSeriesOpen(true)}><Repeat size={15} className="mr-1"/>Повторення{recurring.length?' · '+recurring.length:''}</Button></div>}
 <div className="mb-3 flex items-center gap-2"><input type="search" aria-label="Пошук транзакцій" placeholder="Пошук транзакцій" className="form-input min-w-0 flex-1" value={search} onChange={e=>setSearch(e.target.value)}/><Button variant="secondary" aria-label="Фільтри транзакцій" onClick={()=>setFilters(true)}><SlidersHorizontal className="mr-1 h-4 w-4"/>{filterCount||'Фільтри'}</Button></div>
 {(batch||ids||filterCount>0)&&<div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{category?(category==='none'?'Без категорії':categories.find(c=>c.id===category)?.name||'Обрана категорія')+'. ':''}{from||to?((from||'…')+' — '+(to||'…')+'. '):''}{batch?'Транзакції цього імпорту. ':''}{account?accounts.find(a=>a.id===account)?.name+'. ':''}{pending?'Без підтвердження залишку. ':''}{ids?'Вибрані підказкою записи. ':''}Знайдено: {total}</span><Button variant="ghost" size="sm" onClick={()=>resetFilters()}>Скинути фільтри</Button></div>}
 {canBulk&&!searchPending&&hasLedgerFilters(filter)&&filtered.length>0&&<div className="ledger-selection-tools">
 <Checkbox className="ledger-select-all" checked={loadedSelected===filtered.length} indeterminate={loadedSelected>0&&loadedSelected<filtered.length} disabled={selectAll.isPending||filtered.length>BULK_SELECTION_LIMIT} onChange={e=>setSelected(e.target.checked?new Map(filtered.map(t=>[t.id,transactionSelection(t)])):new Map())}>Обрати показані ({filtered.length})</Checkbox>
 {total>filtered.length&&<Button variant="ghost" size="sm" onClick={chooseAll} disabled={selectAll.isPending||total>BULK_SELECTION_LIMIT}>{selectAll.isPending?'Обираємо…':'Обрати всі за фільтром ('+total+')'}</Button>}
 {total>BULK_SELECTION_LIMIT&&<p className="text-xs text-muted">Для масової дії звузьте фільтри до 5000 транзакцій.</p>}
 </div>}
 {selectionError&&<p role="alert" className="mb-3 text-sm text-[var(--accent-error)]">{selectionError}</p>}
 {!searchPending&&chosen.length>0&&<div className="mb-3 space-y-2 rounded-xl border border-[var(--accent-primary)] bg-glass p-3"><p className="text-sm font-semibold">Обрано: {chosen.length}</p><div className="flex flex-wrap gap-2">{!deleted&&<><Button variant="secondary" size="sm" onClick={()=>setAction('categorize')}>Категорія</Button><Button variant="secondary" size="sm" onClick={()=>setAction('move')}>Рахунок</Button></>}<Button variant="secondary" size="sm" onClick={()=>setAction(deleted?'restore':'delete')}>{deleted?'Відновити':'Видалити'}</Button><Button variant="ghost" size="sm" onClick={()=>setSelected(new Map())}>Зняти вибір</Button></div></div>}
 {spendingView&&spending.isError?<Card><p role="alert">Не вдалося завантажити розрахунок витрат. Оновіть сторінку.</p></Card>:pages.isError?<Card><p role="alert">{pages.error.message}</p><Button variant="secondary" onClick={()=>pages.refetch()}>Спробувати ще</Button></Card>:isLoading?<p role="status">Завантажуємо…</p>:filtered.length?<Card className="ledger-surface"><TransactionList spendingStatuses={spending.isLoading||spending.isError?undefined:spending.statuses} spendingPurpose={purpose} transactions={filtered} accounts={accounts} categories={categories} selectedIds={selectedIds} onToggle={canBulk&&!searchPending?toggle:undefined} onSelect={t=>{if(!deleted){setEditing(t);setSeries(null);setRepeatFrom(null);setForm(true)}}}/></Card>:<Card><p className="text-sm">{view==='review'?'У цьому списку все перевірено. Залишки рахунків підтверджуються окремо.':'За цими умовами транзакцій немає.'}</p>{view==='review'&&<Link className="mt-3 inline-flex min-h-11 items-center underline" href="/accounts">Перевірити залишки</Link>}</Card>}
 {filtered.length>0&&<div className="ledger-pagination"><span>Показано {filtered.length} із {total}</span>{pages.hasNextPage&&<Button variant="secondary" onClick={()=>pages.fetchNextPage()} disabled={pages.isFetchingNextPage}>{pages.isFetchingNextPage?'Завантажуємо…':'Показати ще'}</Button>}</div>}
 <Dialog open={filters} onClose={()=>setFilters(false)} title="Фільтри транзакцій" footer={<DialogActions><Button variant="secondary" onClick={()=>resetFilters()}>Скинути</Button><Button onClick={()=>setFilters(false)}>Показати ({total})</Button></DialogActions>}><div className="space-y-4"><Select label="У щоденному розрахунку" value={spendingView} onChange={e=>{setSpendingView(e.target.value);setView('all');setIds('')}} options={[{value:'',label:'Усі транзакції'},{value:'included',label:'Враховано'},{value:'excluded',label:'Не враховано за період'},{value:'review',label:'Потребують уваги'}]}/><Select label="Категорія" value={category} onChange={e=>setCategory(e.target.value)} options={[{value:'',label:'Усі категорії'},{value:'none',label:'Без категорії'},...categories.map(c=>({value:c.id,label:c.name+(c.type==='income'?' · дохід':' · витрата')}))]}/><Select label="Рахунок" value={account} onChange={e=>{setAccount(e.target.value);setPending(false)}} options={[{value:'',label:'Усі рахунки'},...accounts.map(a=>({value:a.id,label:a.name}))]}/><Select label="Тип транзакції" value={kind} onChange={e=>setKind(e.target.value)} options={[{value:'all',label:'Усі типи'},{value:'income',label:'Доходи'},{value:'expense',label:'Витрати'},{value:'transfer',label:'Власні перекази'}]}/><Input type="date" label="Від дати" value={from} onChange={e=>setFrom(e.target.value)}/><Input type="date" label="До дати" value={to} onChange={e=>setTo(e.target.value)}/><Checkbox checked={deleted} onChange={e=>setDeleted(e.target.checked)}>Показати видалені</Checkbox>{account&&<Checkbox checked={pending} onChange={e=>setPending(e.target.checked)}>Без підтвердження залишку цього рахунку</Checkbox>}</div></Dialog>
 <BulkActionDialog action={action} transactions={chosen} accounts={accounts} onClose={()=>{setAction(null);setSelected(new Map())}}/>{form&&<DetailedEntryForm open={form} transaction={editing} series={series} repeatFrom={repeatFrom} initialValues={{status:view==='planned'?'planned':'completed',loanAccountId:params.get('newLoan')||undefined}} onClose={closeForm} onRepeat={t=>{const existing=recurring.find(r=>r.id===t.recurringTransactionId||r.sourceTransactionId===t.id);setEditing(null);setRepeatFrom(existing?null:t);setSeries(existing||null)}}/>}
 {seriesOpen&&<RecurringManager recurring={recurring} accounts={accounts} onClose={()=>setSeriesOpen(false)} onEdit={r=>{setSeriesOpen(false);setEditing(null);setRepeatFrom(null);setSeries(r);setForm(true)}}/>}{importing&&<ImportDialog open onClose={closeImport} onDone={id=>{setImporting(false);resetFilters(id)}}/>}
 </>
}
