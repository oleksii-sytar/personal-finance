'use client'
import {useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {PageHeader} from '@/components/layout/page-header'
import {Card,CardTitle} from '@/components/ui/Card'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/select'
import {Button} from '@/components/ui/Button'
import {Dialog,DialogActions} from '@/components/ui/dialog'
import {useToast} from '@/components/ui/toast'
import {useAccounts,useMembers,useTransactions} from '@/hooks/use-finance'
import {useLoanData,useFinanceAction} from '@/hooks/use-loans'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {DetailedEntryForm,type EntryDraft} from '@/components/transactions/detailed-entry-form'
import {TransactionList} from '@/components/transactions/transaction-list'
import {UpdateBalanceDialog} from '@/components/accounts/update-balance-dialog'
import {accountVerificationStatus} from '@/lib/reconciliation/model'
import {isLoanDestination,isPaymentAccount} from '@/lib/loans/destination'
import {parseLoanSchedule,loanOcrPrompt,type LoanProfile,type LoanInstallment} from '@/lib/loans/model'
import {accountOwner} from '@/lib/money/entry'
import {localDay} from '@/lib/calculations/dates'
import {formatMoney} from '@/lib/money/format'
import type {Account,Transaction} from '@/types/domain'
import {useCategories} from '@/hooks/use-finance'

export function LoanDetail({accountId}:{accountId:string}){
 const accountsQuery=useAccounts(),membersQuery=useMembers(),transactionsQuery=useTransactions(),loans=useLoanData()
 const accounts=accountsQuery.data||[],account=accounts.find(a=>a.id===accountId&&!a.archivedAt&&(isLoanDestination(a)||a.type==='credit_card'))
 if(accountsQuery.isLoading||loans.isLoading||transactionsQuery.isLoading)return <p role="status">Завантажуємо кредит…</p>
 if(accountsQuery.isError||loans.isError||transactionsQuery.isError)return <Card><p role="alert">Не вдалося завантажити кредит. Оновіть сторінку.</p></Card>
 if(!account)return <Card><p>Кредит недоступний.</p><Link href="/loans">Усі кредити та борги</Link></Card>
 return <div className="loan-detail-page">
  <Link href="/loans" className="loan-back-link">Усі кредити та борги</Link>
  <PageHeader title={account.name} subtitle={accountOwner(account,membersQuery.data||[])+' · '+account.currency}/>
  <LoanPanel key={account.id} account={account} accounts={accounts} transactions={transactionsQuery.data||[]} profile={loans.data?.profiles.find(p=>p.account_id===account.id)} rows={loans.data?.rows.filter(r=>r.account_id===account.id)||[]}/>
 </div>
}
function LoanPanel({account,accounts,transactions,profile,rows}:{account:Account;accounts:Account[];transactions:Transaction[];profile?:LoanProfile;rows:LoanInstallment[]}){
 const {can,currentUser}=useWorkspaceContext(),{data:categories=[]}=useCategories()
 const [balance,setBalance]=useState(false),[form,setForm]=useState(false),[editing,setEditing]=useState<Transaction|null>(null),[draft,setDraft]=useState<EntryDraft>({}),[linking,setLinking]=useState(false),[picked,setPicked]=useState(''),[limit,setLimit]=useState(12)
 const card=account.type==='credit_card',source=profile?.payment_account_id||accounts.find(a=>a.isDefault&&!isLoanDestination(a)&&a.id!==account.id)?.id||accounts.find(a=>a.type==='bank_debit'&&a.currency===account.currency)?.id||''
 const linked=transactions.filter(t=>!t.deletedAt&&(t.loanAccountId===account.id||card&&t.kind==='transfer'&&t.counterAccountId===account.id))
 const plans=linked.filter(t=>t.status==='planned'&&!t.recurrenceSuspended).sort((a,b)=>a.transactionDate.localeCompare(b.transactionDate))
 const actual=linked.filter(t=>t.status==='completed'&&t.transactionDate<=localDay()).sort((a,b)=>b.transactionDate.localeCompare(a.transactionDate))
 const candidates=transactions.filter(t=>(can('transaction.manageAll')||t.createdBy===currentUser?.id)&&!t.deletedAt&&!t.loanAccountId&&t.accountId!==account.id&&(t.kind==='expense'||t.kind==='transfer'&&t.counterAccountId===account.id)).sort((a,b)=>b.transactionDate.localeCompare(a.transactionDate))
 const verification=accountVerificationStatus(account,transactions)
 function add(planned:boolean){
  setEditing(null);setDraft({kind:card?'transfer':'expense',accountId:source,amount:'',description:'Платіж: '+account.name,status:planned?'planned':'completed',...(card?{counterAccountId:account.id}:{loanAccountId:account.id})});setForm(true)
 }
 function open(t:Transaction){setEditing(t);setDraft({});setForm(true)}
 return <div className="mt-5 space-y-5">
  <Card className="space-y-3"><p className="text-sm text-muted">{card?'Використаний кредит':'Збережена сума боргу'}</p>
   <p className="break-words text-3xl font-semibold">{formatMoney(Math.max(0,-account.currentBalance),account.currency)}</p>
   <p className="text-sm text-muted">{verification.confirmed?verification.label:card?verification.label:'Потрібно підтвердити суму до повного погашення'}</p>
   {!card&&<p className="text-sm text-secondary">Введіть суму до повного погашення з банку. Запис оплати не змінює її автоматично.</p>}
   {can('reconcile')&&<Button variant="secondary" onClick={()=>setBalance(true)}>{card?'Звірити залишок':'Звірити борг'}</Button>}
  </Card>
  <Card className="space-y-4"><CardTitle>Платежі</CardTitle>
   {can('transaction.create')&&<div className="flex flex-wrap gap-2"><Button onClick={()=>add(false)}>Додати оплату</Button><Button variant="secondary" onClick={()=>add(true)}>Запланувати</Button>{!card&&<Button variant="ghost" onClick={()=>{setPicked('');setLinking(true)}}>Прив’язати транзакцію</Button>}</div>}
   <p className="text-sm text-muted">{card?'Погашення картки є переказом. Покупки з картки вже враховані у витратах.':'Повна сума оплати входить у витрати обраної категорії.'}</p>
   {!!plans.length&&<section><h3 className="mb-2 font-semibold">Заплановано · {plans.length}</h3><TransactionList transactions={plans.slice(0,limit)} accounts={accounts} categories={categories} onSelect={open}/></section>}
   <section><h3 className="mb-2 font-semibold">Сплачено · {actual.length}</h3>{actual.length?<TransactionList transactions={actual.slice(0,limit)} accounts={accounts} categories={categories} onSelect={open}/>:<p className="text-sm text-muted">Пов’язаних оплат ще немає.</p>}</section>
   {(plans.length>limit||actual.length>limit)&&<Button variant="secondary" onClick={()=>setLimit(n=>n+12)}>Показати ще</Button>}
  </Card>
  <LoanSettings account={account} accounts={accounts} profile={profile}/>
  {!card&&<ScheduleReference account={account} profile={profile} rows={rows}/>}
  <UpdateBalanceDialog account={account} calculated={account.currentBalance} open={balance} onClose={()=>setBalance(false)}/>
  <Dialog open={linking} onClose={()=>setLinking(false)} title="Прив’язати наявну транзакцію" footer={<DialogActions><Button variant="secondary" onClick={()=>setLinking(false)}>Скасувати</Button><Button disabled={!picked} onClick={()=>{const t=candidates.find(t=>t.id===picked);if(t){setEditing(t);setDraft({loanAccountId:account.id});setLinking(false);setForm(true)}}}>Далі</Button></DialogActions>}>
   <Select label="Транзакція" value={picked} onChange={e=>setPicked(e.target.value)} options={[{value:'',label:'Оберіть витрату або переказ'},...candidates.map(t=>({value:t.id,label:t.description+' · '+t.transactionDate+' · '+formatMoney(t.amount,t.currency)+(t.status==='planned'?' · план':'')}))]}/>
   <p className="mt-3 text-sm text-muted">Збережемо зв’язок у цій транзакції, без створення нового списання.</p>
  </Dialog>
  {form&&<DetailedEntryForm open transaction={editing} initialValues={draft} onClose={()=>setForm(false)}/>}
 </div>
}
function LoanSettings({account,accounts,profile}:{account:Account;accounts:Account[];profile?:LoanProfile}){
 const action=useFinanceAction(),toast=useToast(),{can}=useWorkspaceContext()
 const [source,setSource]=useState(profile?.payment_account_id||''),[due,setDue]=useState(profile?.card_due_date||''),[minimum,setMinimum]=useState(profile?.card_minimum==null?'':String(profile.card_minimum))
 const card=account.type==='credit_card'
 async function save(e:React.FormEvent){e.preventDefault();const amount=minimum.trim()?Number(minimum.replace(',','.')):null;if(amount!==null&&(!Number.isFinite(amount)||amount<0)){toast.error('Перевірте суму мінімального платежу');return}
  try{await action.mutateAsync({name:'finance_save_loan',args:{p_account:account.id,p_values:{...profile,tracking_start_date:profile?.tracking_start_date||account.balanceAnchorDate||localDay(),payment_account_id:source||null,...(card?{card_due_date:due||null,card_minimum:amount}:{})}}});toast.success('Налаштування збережено')}catch(e){toast.error('Не вдалося зберегти',e)}
 }
 return <Card><details><summary className="cursor-pointer font-semibold">Налаштування платежів</summary><form onSubmit={save} className="mt-4 space-y-3">
  <Select label="Рахунок для нових платежів" value={source} onChange={e=>setSource(e.target.value)} options={[{value:'',label:'Обирати під час оплати'},...accounts.filter(a=>isPaymentAccount(a)&&a.id!==account.id&&a.currency===account.currency).map(a=>({value:a.id,label:a.name}))]}/>
  {card&&<><Input label="Мінімальний платіж за випискою" inputMode="decimal" value={minimum} onChange={e=>setMinimum(e.target.value)}/><Input label="Сплатити до" type="date" value={due} onChange={e=>setDue(e.target.value)}/><p className="text-sm text-muted">Ці дані не створюють план автоматично. Для прогнозу натисніть «Запланувати».</p></>}
  <Button type="submit" disabled={!can('account.manage')||action.isPending}>Зберегти</Button>
 </form></details></Card>
}
function ScheduleReference({account,profile,rows}:{account:Account;profile?:LoanProfile;rows:LoanInstallment[]}){
 const action=useFinanceAction(),toast=useToast(),{can}=useWorkspaceContext(),[csv,setCsv]=useState(''),request=useRef({text:'',id:''})
 const parsed=useMemo(()=>csv.trim()?parseLoanSchedule(csv,account.currency):null,[csv,account.currency])
 async function importSchedule(){if(!parsed||parsed.errors.length)return;try{
  if(!profile)await action.mutateAsync({name:'finance_save_loan',args:{p_account:account.id,p_values:{tracking_start_date:account.balanceAnchorDate||localDay()}}})
  if(request.current.text!==csv)request.current={text:csv,id:crypto.randomUUID()}
  await action.mutateAsync({name:'finance_import_loan_schedule',args:{p_account:account.id,p_rows:parsed.rows,p_filename:'Графік CSV',p_request:request.current.id}})
  setCsv('');toast.success('Довідковий графік збережено')
 }catch(e){toast.error('Не вдалося імпортувати графік',e)}}
 return <Card><details><summary className="cursor-pointer font-semibold">Графік банку · довідково ({rows.length})</summary>
  <p className="my-3 text-sm text-muted">Не змінює борг, статистику чи прогноз. Ваші оплати та плани показані вище.</p>
  <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Дата</th><th className="p-2">Платіж</th><th className="p-2">Тіло</th><th className="p-2">Обслуговування</th></tr></thead><tbody>{rows.filter(r=>r.status!=='superseded').sort((a,b)=>a.payment_date.localeCompare(b.payment_date)).map(r=><tr key={r.id} className="border-t border-primary"><td className="whitespace-nowrap p-2">{r.payment_date}</td><td className="whitespace-nowrap p-2">{formatMoney(r.payment_total,account.currency)}</td><td className="whitespace-nowrap p-2">{formatMoney(r.principal,account.currency)}</td><td className="whitespace-nowrap p-2">{formatMoney(r.payment_total-r.principal,account.currency)}</td></tr>)}</tbody></table></div>
  {can('account.manage')&&<details className="mt-4"><summary className="cursor-pointer">Імпортувати графік</summary><div className="mt-3 space-y-3">
   <input aria-label="Файл графіка CSV" type="file" accept=".csv,text/csv" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){toast.error('Файл має бути до 5 МБ');return}setCsv(await f.text())}}/>
   <textarea aria-label="Графік CSV" className="form-input h-40 w-full font-mono" value={csv} onChange={e=>setCsv(e.target.value)}/>
   {parsed&&<><p className="text-sm">Рядків: {parsed.rows.length}</p>{parsed.errors.map((e,i)=><p key={i} role="alert">{e}</p>)}<Button disabled={action.isPending||!!parsed.errors.length} onClick={importSchedule}>Імпортувати довідковий графік</Button></>}
   <details><summary className="cursor-pointer">Промпт для PDF або фото</summary><textarea aria-label="Промпт для графіка" className="form-input mt-3 h-40 w-full" readOnly value={loanOcrPrompt(profile?.tracking_start_date||account.balanceAnchorDate||localDay())}/></details>
  </div></details>}
 </details></Card>
}
