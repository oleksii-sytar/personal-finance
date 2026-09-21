'use client'
import {isPaymentAccount} from '@/lib/loans/destination'
import {useEffect,useState} from 'react'
import {Dialog,DialogActions} from '@/components/ui/dialog'
import {Select} from '@/components/ui/select'
import {Button} from '@/components/ui/Button'
import {useToast} from '@/components/ui/toast'
import {useBulkTransactions,useCategories} from '@/hooks/use-finance'
import type {Account} from '@/types/domain'
import type {TransactionSelection} from '@/lib/data/repository'
export type BulkAction='move'|'delete'|'restore'|'categorize'
export function BulkActionDialog({action,transactions,accounts,onClose}:{action:BulkAction|null;transactions:TransactionSelection[];accounts:Account[];onClose:()=>void}){
 const [accountId,setAccountId]=useState(''),[categoryId,setCategoryId]=useState(''),[error,setError]=useState('')
 const mutation=useBulkTransactions(),toast=useToast()
 const {data:categories=[]}=useCategories()
 useEffect(()=>{setAccountId('');setCategoryId('');setError('')},[action])
 const candidates=accounts.filter(a=>isPaymentAccount(a)&&transactions.every(t=>t.currency===a.currency&&t.counterAccountId!==a.id))
 const categoryCandidates=categories.filter(c=>transactions.every(t=>!t.deletedAt&&t.kind===c.type))
 const close=()=>{if(!mutation.isPending)onClose()}
 async function apply(){
  if(!action||mutation.isPending)return
  setError('')
  try{
   const count=await mutation.mutateAsync({ids:transactions.map(t=>t.id),action,accountId,categoryId,versions:Object.fromEntries(transactions.map(t=>[t.id,t.updatedAt]))})
   toast.success('Оновлено транзакцій: '+count);onClose()
  }catch(e){setError(e instanceof Error?e.message:'Не вдалося виконати дію')}
 }
 const title=action==='categorize'?'Призначити категорію':action==='move'?'Змінити рахунок':action==='delete'?'Видалити вибрані транзакції':'Відновити транзакції'
 return <Dialog open={!!action} onClose={close} title={title} footer={<DialogActions>
  <Button variant="secondary" onClick={close} disabled={mutation.isPending}>Скасувати</Button>
  <Button onClick={apply} disabled={mutation.isPending||!transactions.length||transactions.length>5000||(action==='move'&&!accountId)||(action==='categorize'&&!categoryCandidates.some(c=>c.id===categoryId))}>{mutation.isPending?'Зберігаємо…':action==='categorize'?'Зберегти категорію':'Підтвердити'}</Button>
 </DialogActions>}>
 <div className="space-y-4">
  <p className="text-sm text-secondary">Обрано транзакцій: <strong>{transactions.length}</strong>. {action==='categorize'?'Одна категорія застосовується до всіх вибраних доходів або витрат.':action==='move'?'Зміниться прив’язка в обліку, а не гроші в банку.':action==='delete'?'Транзакції зникнуть зі звітів. Їх можна відновити в розділі видалених транзакцій або в історії імпортів.':'Транзакції знову з’являться у звітах.'}</p>
  {action==='move'&&<Select label="Новий рахунок" value={accountId} disabled={mutation.isPending} onChange={e=>setAccountId(e.target.value)} options={[{value:'',label:'Оберіть рахунок'},...candidates.map(a=>({value:a.id,label:a.name+' · '+a.currency}))]}/>}
  {action==='categorize'&&<>
   {categoryCandidates.length?<Select label="Категорія для вибраних транзакцій" value={categoryId} disabled={mutation.isPending} onChange={e=>setCategoryId(e.target.value)} options={[{value:'',label:'Оберіть категорію'},...categoryCandidates.map(c=>({value:c.id,label:c.name}))]}/>:<p role="alert" className="text-sm text-[var(--accent-warning)]">Оберіть окремо витрати або доходи. Перекази між власними рахунками не потребують категорії. За потреби спочатку створіть категорію відповідного типу.</p>}
   <p className="text-xs text-muted">Суми, рахунки й залишки не зміняться. Для виконаних транзакцій категорію буде підтверджено; банківський залишок звіряється окремо. Заплановані транзакції залишаться запланованими. Уже звірені транзакції збережуть свій статус.</p>
  </>}
  {action!=='categorize'&&<p className="text-xs text-muted">Залишки перерахуються автоматично. Історичні транзакції до зафіксованого стану не списуються повторно.</p>}
  <p className="text-xs text-muted">Якщо серед вибраних транзакцій є закритий місяць або недоступний запис, жодна операція не зміниться. Дія зберігається в історії масових змін.</p>
  {error&&<p role="alert" className="text-sm text-[var(--accent-error)]">{error}</p>}
 </div>
 </Dialog>
}