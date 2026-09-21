'use client'
import {useState} from 'react'
import {useFinanceAction} from '@/hooks/use-loans'
import {useToast} from '@/components/ui/toast'
import {Dialog,DialogActions} from '@/components/ui/dialog'
import Link from 'next/link'
import {PageHeader} from '@/components/layout/page-header'
import {Card} from '@/components/ui/Card'
import {Button} from '@/components/ui/Button'
import {useAccounts,useTransactions,useImportBatches,useBulkHistory,useCategories} from '@/hooks/use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {TransactionList} from '@/components/transactions/transaction-list'
import {DetailedEntryForm} from '@/components/transactions/detailed-entry-form'
import {BulkActionDialog,type BulkAction} from '@/components/transactions/bulk-action-dialog'
import type {Transaction} from '@/types/domain'
export default function ImportHistoryPage(){
 const batches=useImportBatches(),history=useBulkHistory(),cancelImport=useFinanceAction(),toast=useToast()
 const [cancelBatch,setCancelBatch]=useState<string|null>(null)
 const {data:accounts=[]}=useAccounts(),{data:transactions=[]}=useTransactions({includeDeleted:true}),{data:categories=[]}=useCategories()
 const {role}=useWorkspaceContext(),canManage=role==='owner'||role==='manager'
 const [action,setAction]=useState<BulkAction|null>(null),[ids,setIds]=useState<string[]>([]),[editing,setEditing]=useState<Transaction|null>(null)
 function open(action:BulkAction,rows:Transaction[]){setIds(rows.map(t=>t.id));setAction(action)}
 const name=(id:string)=>accounts.find(a=>a.id===id)?.name||'Архівний рахунок'
 return <><PageHeader title="Історія імпортів" subtitle="Кожна виписка окремо. Помилковий рахунок можна змінити без повторного завантаження." action={<Link href="/transactions?import=1"><Button>Новий імпорт</Button></Link>}/>
 <Link className="mb-4 inline-block text-sm text-[var(--accent-primary)]" href="/transactions">Усі транзакції</Link>
 {batches.isLoading&&<p role="status">Завантажуємо історію…</p>}
 {batches.isError&&<p role="alert">{batches.error.message}</p>}
 {!batches.isLoading&&!batches.isError&&!batches.data?.length&&<Card>Імпортів ще немає. Завантажте CSV, і він з’явиться тут.</Card>}
 <div className="space-y-4">{batches.data?.map(batch=>{
  const rows=transactions.filter(t=>(t.importBatchId===batch.id||t.counterImportBatchId===batch.id)),active=rows.filter(t=>!t.deletedAt),deleted=rows.filter(t=>!!t.deletedAt)
  const names=[...new Set(active.map(t=>name(t.counterImportBatchId===batch.id?t.counterAccountId!:t.accountId)))]
  const dates=rows.map(t=>t.transactionDate).sort()
  return <Card key={batch.id}><h2 className="break-words text-lg font-semibold">{batch.file_name}</h2>
   <p className="mt-1 text-xs text-muted">{new Date(batch.created_at).toLocaleString('uk-UA')} · {batch.recovered?'Назву первинного файлу не було збережено':'CSV'}</p>
   <p className="mt-3 break-words text-sm">Рахунок: <strong>{names.join(', ')||name(batch.account_id)}</strong></p>
   <p className="mt-1 text-sm text-secondary">Активних: {active.length} · Видалених: {deleted.length} · Пропущено дублікатів: {batch.skipped_count}{dates.length>0?' · '+dates[0]+' – '+dates[dates.length-1]:''}</p>
   {canManage&&<div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" disabled={!active.length||active.some(t=>t.kind==='transfer')} onClick={()=>open('move',active)}>Змінити рахунок імпорту</Button><Button variant="secondary" disabled={!active.length} onClick={()=>setCancelBatch(batch.id)}>Скасувати імпорт</Button>{deleted.length>0&&<Button variant="secondary" onClick={()=>open('restore',deleted)}>Відновити видалені ({deleted.length})</Button>}</div>}
   {active.length>0&&<details className="mt-4"><summary className="cursor-pointer text-sm text-[var(--accent-primary)]">Переглянути транзакції ({active.length})</summary><div className="mt-3"><TransactionList transactions={active} accounts={accounts} categories={categories} onSelect={setEditing}/></div></details>}
  </Card>
 })}</div>
 <Card className="mt-6"><h2 className="mb-3 font-semibold">Історія масових змін</h2>{history.isError?<p role="alert">{history.error.message}</p>:!history.data?.length?<p className="text-sm text-secondary">Масових змін ще не було.</p>:<ul className="space-y-3">{history.data.slice(0,30).map(e=><li key={e.id} className="border-b border-glass pb-2 text-sm"><strong>{{move:'Зміна рахунку',delete:'Видалення',restore:'Відновлення',categorize:'Призначення категорії'}[e.action]}</strong> · {e.transaction_ids.length} транзакцій{e.account_id?' · '+name(e.account_id):''}{e.category_id?' · '+(categories.find(c=>c.id===e.category_id)?.name||'Категорію видалено'):''}<p className="text-xs text-muted">{new Date(e.created_at).toLocaleString('uk-UA')}</p></li>)}</ul>}</Card>
 <Dialog open={!!cancelBatch} onClose={()=>setCancelBatch(null)} title="Скасувати імпорт виписки?"><p className="text-sm text-secondary">Нові записи цієї виписки буде видалено. Зіставлені ручні транзакції повернуться до свого стану перед імпортом, а не зникнуть. Якщо їх уже редагували після зіставлення, скасування буде зупинено для безпеки.</p><DialogActions><Button variant="secondary" onClick={()=>setCancelBatch(null)}>Залишити імпорт</Button><Button disabled={cancelImport.isPending} onClick={async()=>{try{await cancelImport.mutateAsync({name:'finance_cancel_statement',args:{p_batch:cancelBatch}});toast.success('Імпорт скасовано','Ручні записи збережено.');setCancelBatch(null)}catch(e){toast.error('Не вдалося скасувати',e)}}}>Підтвердити скасування</Button></DialogActions></Dialog>
 <BulkActionDialog action={action} transactions={transactions.filter(t=>ids.includes(t.id))} accounts={accounts} onClose={()=>{setAction(null);setIds([])}}/>
 <DetailedEntryForm open={!!editing} transaction={editing} onClose={()=>setEditing(null)}/>
 </>
}