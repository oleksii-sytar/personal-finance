'use client'

import {useEffect,useMemo,useState,useRef,useId} from 'react'
import Link from 'next/link'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {CalendarClock,Trash2,Repeat} from 'lucide-react'
import {TransferDialog} from './transfer-dialog'
import {SpendingBadge} from './spending-badge'
import {CompletePlanButton} from './complete-plan-button'
import {useDailySpending} from '@/hooks/use-daily-spending'
import {LOAN_PAYMENT_CATEGORY,isLoanDestination,transactionDestination,emptyDestination,destinationPatch,destinationChanged,type LoanDestination} from '@/lib/loans/destination'
import {financialChange,hasConfirmation} from '@/lib/reconciliation/model'
import {parseEntryAmount,accountOwner} from '@/lib/money/entry'
import {convert,FX_STATUS} from '@/lib/money/fx'
import {formatMoney} from '@/lib/money/format'
import {FREQUENCIES,nextRepeatDate,parsePlanRate,validDay} from '@/lib/planning/model'
import {Dialog,DialogActions} from '@/components/ui/dialog'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/select'
import {Textarea} from '@/components/ui/textarea'
import {Button} from '@/components/ui/Button'
import {Checkbox} from '@/components/ui/checkbox'
import {SegmentedControl} from '@/components/ui/segmented'
import {Spinner} from '@/components/ui/spinner'
import {useToast} from '@/components/ui/toast'
import {useAccounts,useMembers,useCategories,useCreateTransaction,useDeleteTransaction,useUpdateTransaction,useSaveRecurring} from '@/hooks/use-finance'
import {transactionSchema} from '@/lib/validations/finance'
import {getCurrencySymbol} from '@/lib/utils/currency'
import type {Transaction,TransactionKind,CurrencyCode,RecurringTransaction,RecurringFrequency} from '@/types/domain'

export interface EntryDraft {kind?:TransactionKind;amount?:string;accountId?:string;categoryId?:string;transactionDate?:string;description?:string;notes?:string;status?:'completed'|'planned';loanAccountId?:string;counterAccountId?:string}
interface DetailedEntryFormProps{
 initialValues?:EntryDraft;open:boolean;onClose:()=>void;transaction?:Transaction|null
 repeatFrom?:Transaction|null;series?:RecurringTransaction|null;onRepeat?:(transaction:Transaction)=>void
}
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const currencies:CurrencyCode[]=['UAH','USD','EUR','GBP','PLN']

export function DetailedEntryForm({open,onClose,transaction,initialValues,repeatFrom,series,onRepeat}:DetailedEntryFormProps){
 const {can}=useWorkspaceContext()
 const spending=useDailySpending()
 const [forecastPlanId,setForecastPlanId]=useState('')
 const {data:members=[]}=useMembers(),{data:accounts=[]}=useAccounts(),{data:categories=[]}=useCategories()
 const create=useCreateTransaction(),update=useUpdateTransaction(),del=useDeleteTransaction(),saveSeries=useSaveRecurring(),toast=useToast()
 const wasLoanPayment=!!transaction?.loanAccountId,isEdit=!!transaction,formId=useId()
 const [loanDestination,setLoanDestination]=useState<LoanDestination|null>(()=>transactionDestination(transaction))
 const isLoanPayment=!!loanDestination
 const [kind,setKind]=useState<TransactionKind>('expense'),[accountId,setAccountId]=useState(''),[counterAccountId,setCounterAccountId]=useState('')
 const [amount,setAmount]=useState(''),[categoryId,setCategoryId]=useState(''),[date,setDate]=useState(today()),[description,setDescription]=useState(''),[notes,setNotes]=useState('')
 const [errors,setErrors]=useState<Partial<Record<string,string[]>>>({}),[confirmDelete,setConfirmDelete]=useState(false),[counterAmount,setCounterAmount]=useState('')
 const [status,setStatus]=useState<'completed'|'planned'>('completed'),[transferOpen,setTransferOpen]=useState(false),[confirmedFinancial,setConfirmedFinancial]=useState(false),[discard,setDiscard]=useState(false)
 const [planCurrency,setPlanCurrency]=useState<CurrencyCode|null>(null),[exchangeMode,setExchangeMode]=useState<'nbu'|'manual'>('nbu'),[manualRate,setManualRate]=useState('')
 const [accountingClass,setAccountingClass]=useState<'ordinary'|'principal'>('ordinary'),[forecastBehavior,setForecastBehavior]=useState<'auto'|'scheduled'|'one_off'>('auto'),[flowKey,setFlowKey]=useState('')
 const [frequency,setFrequency]=useState<'once'|RecurringFrequency>('once'),[interval,setInterval]=useState('1'),[endDate,setEndDate]=useState(''),[plannedTime,setPlannedTime]=useState('')
 const initialized=useRef<string|null>(null),dirty=useRef(false),requestId=useRef('')
 const key=series?'series:'+series.id:repeatFrom?'repeat:'+repeatFrom.id:transaction?'transaction:'+transaction.id:'new'

 useEffect(()=>{
  if(!open){initialized.current=null;return}
  if(initialized.current===key||!accounts.length)return
  initialized.current=key;dirty.current=false;requestId.current=crypto.randomUUID()
  setErrors({});setConfirmedFinancial(false);setDiscard(false);setConfirmDelete(false);setForecastPlanId('')
  const basis=series?.template||repeatFrom||transaction
  const linkedId=initialValues?.loanAccountId||basis?.loanAccountId
  setLoanDestination(linkedId?{accountId:linkedId,installmentId:transaction?.loanAccountId===linkedId?transaction.loanInstallmentId||null:null}:null)
   setAccountingClass(basis?.accountingClass||'ordinary');setForecastBehavior(basis?.forecastBehavior||'auto');setFlowKey(basis?.flowKey||'')
  const planned=!!series||!!repeatFrom||transaction?.status==='planned'||!transaction&&initialValues?.status==='planned'
  const def=accounts.find(a=>a.isDefault)||accounts[0]
  setStatus(planned?'planned':'completed');setKind(linkedId?'expense':basis?.kind||initialValues?.kind||'expense')
  setAccountId(basis?.accountId||initialValues?.accountId||def?.id||'')
  setCounterAccountId(linkedId?'':transaction?.counterAccountId||initialValues?.counterAccountId||'');setCounterAmount(transaction?.counterAmount!=null?String(transaction.counterAmount):'')
  setAmount(basis?String(planned&&basis.planExchangeMode&&basis.originalAmount?basis.originalAmount:basis.amount):initialValues?.amount||'')
  setCategoryId(basis?.categoryId||initialValues?.categoryId||(linkedId?categories.find(c=>c.name===LOAN_PAYMENT_CATEGORY)?.id:'')||'')
  setDate(series?.startDate||(repeatFrom?(repeatFrom.status==='planned'&&repeatFrom.transactionDate>=today()?repeatFrom.transactionDate:nextRepeatDate(repeatFrom.transactionDate,today())):transaction?.transactionDate||initialValues?.transactionDate||today()))
  setDescription(basis?.description||initialValues?.description||'');setNotes(basis?.notes||initialValues?.notes||'')
  setPlanCurrency(planned&&basis?.planExchangeMode?basis.originalCurrency||null:basis?.currency||null)
  setExchangeMode(basis?.planExchangeMode||'nbu');setManualRate(basis?.planExchangeRate!=null?String(basis.planExchangeRate):'')
  setPlannedTime(basis?.plannedTime||'');setFrequency(series?.frequency||(repeatFrom?'monthly':'once'));setInterval(String(series?.intervalCount||1));setEndDate(series?.endDate||'')
 },[open,key,accounts,transaction,repeatFrom,series,initialValues])

 const account=accounts.find(a=>a.id===accountId),currency=account?.currency||'UAH',isPlanned=status==='planned'
 const enteredCurrency=isPlanned&&kind!=='transfer'?(planCurrency||currency):currency,foreign=isPlanned&&kind!=='transfer'&&enteredCurrency!==currency
 const rate=exchangeMode==='manual'?parsePlanRate(manualRate):convert(1,enteredCurrency,currency)
 const parsedAmount=parseEntryAmount(amount),estimated=foreign&&parsedAmount!=null&&rate!=null?Math.round(parsedAmount*rate*100)/100:parsedAmount
 const ratesReady=exchangeMode==='manual'||FX_STATUS.source==='nbu'
 const destination=accounts.find(a=>a.id===counterAccountId),isExchange=kind==='transfer'&&!!destination&&destination.currency!==currency
 const relevantCategories=useMemo(()=>categories.filter(c=>c.type===(kind==='income'?'income':'expense')),[categories,kind])
 const changed=!!transaction&&financialChange(transaction,{kind,accountId,counterAccountId:kind==='transfer'?counterAccountId:null,counterAmount:kind==='transfer'?(isExchange?parseEntryAmount(counterAmount):estimated):null,amount:estimated??NaN,currency,transactionDate:date,status})
 const loanChanged=!!transaction&&destinationChanged(transaction,loanDestination)
 const recurring=frequency!=='once'&&isPlanned&&kind!=='transfer'&&!transaction
 function markDirty(){dirty.current=true;setConfirmedFinancial(false);setDiscard(false);requestId.current=crypto.randomUUID()}
 function chooseLoan(value:string){
  markDirty()
  setLoanDestination(value?value===transaction?.loanAccountId?transactionDestination(transaction):emptyDestination(value):null)
  if(value){setKind('expense');setCounterAccountId('');setCounterAmount('');if(!categoryId)setCategoryId(categories.find(c=>c.type==='expense'&&c.name===LOAN_PAYMENT_CATEGORY)?.id||'')}
 }
 function requestClose(){if(dirty.current&&!discard){setDiscard(true);return}onClose()}
 function changeStatus(planned:boolean){
  markDirty()
  if(!planned&&foreign&&estimated!=null){setAmount(String(estimated));setPlanCurrency(currency)}
  setStatus(planned?'planned':'completed')
  if(!planned&&date>today())setDate(today())
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();setErrors({})
  if(foreign&&(!ratesReady||rate==null||rate<=0)){setErrors({rate:[ratesReady?'Введіть коректний курс':'Курс НБУ ще недоступний. Зачекайте або вкажіть власний курс.']});return}
  if(recurring&&(!validDay(date)||(!series||date!==series.startDate)&&date<today()||!Number.isInteger(Number(interval))||Number(interval)<1||Number(interval)>120||(endDate&&(!validDay(endDate)||endDate<date)))){
   setErrors({recurrence:['Перевірте дати й інтервал повторення (від 1 до 120). Новий початок не може бути в минулому.']});return
  }
  const rateDate=FX_STATUS.date?(FX_STATUS.date.includes('.')?FX_STATUS.date.split('.').reverse().join('-'):FX_STATUS.date):null
  const fx={
   originalAmount:foreign?parsedAmount:transaction?.originalAmount??null,
   originalCurrency:foreign?enteredCurrency:transaction?.originalCurrency??null,
   planExchangeMode:foreign?exchangeMode:null,
   planExchangeRate:foreign?rate:transaction?.planExchangeRate??null,
   planExchangeDate:foreign&&exchangeMode==='nbu'?rateDate:null,
   plannedTime:isPlanned&&kind!=='transfer'?plannedTime||null:null,
  }
  const parsed=transactionSchema.safeParse({
   loanAccountId:loanDestination?.accountId||null,loanInstallmentId:loanDestination?.installmentId||null,
   accountingClass:kind==='transfer'||isLoanPayment?'ordinary':accountingClass,forecastBehavior,flowKey:flowKey.trim()||null,
   accountId,counterAccountId:kind==='transfer'?counterAccountId:null,counterAmount:kind==='transfer'?(isExchange?parseEntryAmount(counterAmount)??NaN:estimated??NaN):null,
   categoryId:kind==='transfer'?null:categoryId||null,kind,amount:estimated??NaN,currency,
   description:description.trim()||relevantCategories.find(c=>c.id===categoryId)?.name||(kind==='income'?'Дохід':kind==='expense'?'Витрата':'Переказ'),
   notes:notes||null,transactionDate:date,status,plannedDate:isPlanned?date:null,...fx,
  })
  if(!parsed.success){setErrors(parsed.error.flatten().fieldErrors);return}
  const v=parsed.data
  if(transaction?.status==='completed'&&changed&&!confirmedFinancial){setErrors({financial:['Підтвердьте фінансові зміни нижче.']});return}
  try{
   if(recurring){
    await saveSeries.mutateAsync({
     id:series?.id,expectedUpdatedAt:series?.updatedAt,requestId:requestId.current,
     sourceTransactionId:repeatFrom?.id,sourceExpectedUpdatedAt:repeatFrom?.updatedAt,
     template:{loanAccountId:v.loanAccountId,accountingClass:v.accountingClass,forecastBehavior:v.forecastBehavior,flowKey:v.flowKey,accountId:v.accountId,categoryId:v.categoryId,kind:v.kind,amount:v.amount,currency:v.currency,description:v.description,notes:v.notes,originalAmount:v.originalAmount,originalCurrency:v.originalCurrency,planExchangeMode:v.planExchangeMode,planExchangeRate:v.planExchangeRate,planExchangeDate:v.planExchangeDate,plannedTime:v.plannedTime},
     frequency:frequency as RecurringFrequency,intervalCount:Number(interval),startDate:date,endDate:endDate||null,
    })
    toast.success(series?'Повторення оновлено':'Повторення створено','Майбутні транзакції доступні у «Планах».')
   }else if(transaction){
    await update.mutateAsync({id:transaction.id,patch:{...v,...(can('reconcile')&&v.status==='completed'&&(v.kind==='transfer'||v.categoryId)?{reviewRequired:false}:{}),...(forecastPlanId?{forecastPlanId,forecastPlanExpected:spending.transactions.find(t=>t.id===forecastPlanId)?.updatedAt}:{}),...(loanChanged?destinationPatch(loanDestination):{}),expectedUpdatedAt:transaction.updatedAt,confirmedFinancialEdit:confirmedFinancial}})
    toast.success('Операцію оновлено')
   }else{
    await create.mutateAsync(v);toast.success(isPlanned?'План додано':'Операцію додано')
   }
   onClose()
  }catch(error){toast.error('Не вдалося зберегти',error)}
 }
 async function handleDelete(){
  if(!transaction)return
  if(!confirmDelete){setConfirmDelete(true);return}
  try{await update.mutateAsync({id:transaction.id,patch:{deletedAt:new Date().toISOString(),expectedUpdatedAt:transaction.updatedAt,confirmedFinancialEdit:true}});toast.success('Операцію видалено');onClose()}
  catch(error){toast.error('Не вдалося видалити',error)}
 }
 const submitting=create.isPending||update.isPending||saveSeries.isPending
 const accountOptions=accounts.filter(a=>!isLoanDestination(a)).map(a=>({value:a.id,label:a.name+' · '+a.currency+' · '+accountOwner(a,members)}))
 return <><Dialog open={open&&!transferOpen} onClose={requestClose} title={series?'Налаштувати повторення':repeatFrom?'Зробити повторюваною':isEdit?'Редагувати транзакцію':'Додати транзакцію'} footer={<DialogActions>
  {isEdit&&<Button type="button" variant="ghost" onClick={handleDelete} disabled={submitting||del.isPending} className="text-[var(--accent-error)] sm:mr-auto"><Trash2 className="mr-1.5 h-4 w-4"/>{confirmDelete?'Підтвердити видалення?':'Видалити'}</Button>}
  <Button type="button" variant="secondary" onClick={requestClose} disabled={submitting}>{discard?'Відкинути зміни?':'Скасувати'}</Button>
  <Button type="submit" form={formId} disabled={submitting}>{submitting&&<Spinner className="mr-2"/>}{recurring?'Зберегти повторення':isPlanned?'Зберегти план':isEdit?'Зберегти':'Додати'}</Button>
 </DialogActions>}>
 <form id={formId} onSubmit={submit} onChange={markDirty} className="space-y-4">
  {transaction?.status==='planned'&&!dirty.current&&<div className="flex items-center justify-between gap-3 rounded-xl border border-primary p-3"><span className="text-sm">Оплата вже відбулась?</span><CompletePlanButton transaction={transaction} onCompleted={onClose}/></div>}
  {discard&&<p role="alert" className="text-sm text-[var(--accent-warning)]">Є незбережені дані. Натисніть «Відкинути зміни?» ще раз або продовжуйте редагування.</p>}
  {transaction&&onRepeat&&transaction.kind!=='transfer'&&<Button type="button" variant="secondary" className="w-full" onClick={()=>onRepeat(transaction)}><Repeat size={16} className="mr-2"/>{transaction.recurringTransactionId?'Налаштувати всю серію':'Зробити повторюваною'}</Button>}
  {transaction?.recurringTransactionId&&<p className="plan-inline-note">Тут змінюється лише ця операція. Налаштування серії та інші повторення залишаться без змін.</p>}
  {transaction&&!wasLoanPayment&&!isLoanPayment&&transaction.status==='completed'&&<Button type="button" variant="secondary" className="w-full" onClick={()=>setTransferOpen(true)}>{transaction.kind==='transfer'?'Перевірити другий запис переказу':'Власний переказ / зняття готівки'}</Button>}
  {isLoanPayment&&<Link className="finance-link text-sm" href={'/loans/'+loanDestination!.accountId} onClick={onClose}>Деталі кредиту</Link>}
  <fieldset className="min-w-0 space-y-4">
   {<SegmentedControl aria-label="Тип транзакції" value={kind} onChange={v=>{if(v==='transfer'&&transaction&&transaction.kind!=='transfer'){setTransferOpen(true);return}markDirty();setKind(v);setCategoryId('');setLoanDestination(null);if(v==='transfer')setFrequency('once')}} className="w-full" options={[{value:'expense',label:'Витрата'},{value:'income',label:'Дохід'},...(!series&&!repeatFrom?[{value:'transfer' as const,label:'Переказ'}]:[])]}/>}
   <Input label={(transaction?.status==='planned'&&!isPlanned?'Фактична сума':'Сума')+' ('+getCurrencySymbol(enteredCurrency)+')'} type="text" inputMode="decimal" className="amount-input" autoComplete="off" value={amount} onChange={e=>setAmount(e.target.value)} error={errors.amount?.[0]} autoFocus/>
   {isPlanned&&kind!=='transfer'&&<Select label="Валюта плану" value={enteredCurrency} onChange={e=>{setPlanCurrency(e.target.value as CurrencyCode);setExchangeMode('nbu');setManualRate('')}} options={currencies.map(c=>({value:c,label:c+' · '+getCurrencySymbol(c)}))}/>}
   <Input label={recurring?'Перша дата повторення':'Дата'} type="date" value={date} onChange={e=>{setDate(e.target.value);if(!isEdit&&!series&&!repeatFrom)setStatus(e.target.value>today()?'planned':status)}} error={errors.transactionDate?.[0]}/>
   <Select label={kind==='transfer'?'З рахунку':'Рахунок'} value={accountId} onChange={e=>{setAccountId(e.target.value);if(foreign&&exchangeMode==='manual')setManualRate('')}} options={accountOptions} error={errors.accountId?.[0]}/>
   {foreign&&<div className="plan-options">
    <Select label="Курс для плану" value={exchangeMode} onChange={e=>setExchangeMode(e.target.value as 'nbu'|'manual')} options={[{value:'nbu',label:'Поточний курс НБУ'},{value:'manual',label:'Мій орієнтовний курс'}]}/>
    {exchangeMode==='manual'&&<Input label={'1 '+enteredCurrency+' у '+currency} type="text" inputMode="decimal" value={manualRate} onChange={e=>setManualRate(e.target.value)} error={errors.rate?.[0]}/>}
    <div className="plan-fx-preview">{ratesReady&&estimated!=null&&rate!=null&&rate>0?<strong>≈ {formatMoney(estimated,currency)}</strong>:<strong>Потрібен курс</strong>}<p>{exchangeMode==='manual'?'Орієнтир за вашим курсом.':'Оцінка за поточним курсом НБУ'+(FX_STATUS.date?' на '+FX_STATUS.date:'')+'.'} Це не прогноз майбутнього курсу. Фактичну суму можна уточнити після виконання.</p></div>
    {errors.rate&&exchangeMode==='nbu'&&<p role="alert" className="text-sm text-[var(--accent-error)]">{errors.rate[0]}</p>}
   </div>}
   {kind==='transfer'?<Select label="На рахунок" value={counterAccountId} onChange={e=>setCounterAccountId(e.target.value)} options={[{value:'',label:'Оберіть рахунок одержувача'},...accountOptions.filter(o=>o.value!==accountId)]} error={errors.counterAccountId?.[0]}/>:<Select label="Категорія" value={categoryId} onChange={e=>setCategoryId(e.target.value)} options={[{value:'',label:'Без категорії'},...relevantCategories.map(c=>({value:c.id,label:c.name}))]}/>}
   {kind!=='income'&&<Select label="Кредит або борг (необов’язково)" value={loanDestination?.accountId||''} onChange={e=>chooseLoan(e.target.value)} options={[{value:'',label:'Не пов’язано з кредитом'},...accounts.filter(isLoanDestination).map(a=>({value:a.id,label:a.name}))]}/>}
   {loanDestination&&<p className="finance-caption">Повна сума увійде у витрати. Борг підтверджується окремо за даними банку.</p>}
   {transaction?.kind==='transfer'&&loanDestination&&<p role="status" className="finance-caption">Переказ стане оплатою кредиту. Повторного списання з рахунку не буде.</p>}
   {wasLoanPayment&&!loanDestination&&<p className="finance-caption" role="status">Зв’язок із кредитом буде прибрано. Списання залишиться.</p>}
   {errors.loan&&<p role="alert" className="text-sm text-[var(--accent-error)]">{errors.loan[0]}</p>}
   <Input label="Опис (необов’язково)" value={description} onChange={e=>setDescription(e.target.value)} placeholder={kind==='income'?'Наприклад, зарплата':'Наприклад, продукти в Сільпо'} error={errors.description?.[0]}/>
   {isExchange&&<Input label={'Фактично отримано, '+destination?.currency} type="text" inputMode="decimal" value={counterAmount} onChange={e=>setCounterAmount(e.target.value)} error={errors.counterAmount?.[0]} required/>}
   {!series&&!repeatFrom&&<Checkbox checked={isPlanned} onChange={e=>changeStatus(e.target.checked)}>Запланована операція, ще не виконана</Checkbox>}
   {transaction?.status==='planned'&&!isPlanned&&<p className="plan-inline-note">Вкажіть фактичну суму у валюті рахунку та дату надходження або оплати. Лише після збереження зміниться залишок.</p>}
   {isPlanned&&kind!=='transfer'&&<div className="plan-options">
    {!transaction&&<Select label="Повторення" value={frequency} onChange={e=>setFrequency(e.target.value as typeof frequency)} options={FREQUENCIES.filter(f=>!series&&!repeatFrom||f.value!=='once').map(f=>({...f}))}/>}
    {recurring&&<div className="plan-recurrence-grid"><Input label="Інтервал повторення" type="number" min="1" max="120" inputMode="numeric" value={interval} onChange={e=>setInterval(e.target.value)}/><Input label="Остання дата (необов’язково)" type="date" min={date} value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>}
    <details><summary className="finance-link cursor-pointer">Час (необов’язково)</summary><Input label="Час за Києвом" type="time" value={plannedTime} onChange={e=>setPlannedTime(e.target.value)} error={errors.plannedTime?.[0]}/></details>
    {recurring&&<p className="plan-inline-note">{series?'Зміни стосуються майбутніх повторень. Виконані та окремо відредаговані транзакції збережуться.':'Створимо плани на рік уперед та автоматично продовжуватимемо серію.'} {repeatFrom?.status==='completed'?'Початкова виконана операція не зміниться. ':''}Якщо в місяці немає обраного числа, використаємо останній день. Автоматичних списань немає.</p>}
    {errors.recurrence&&<p role="alert" className="text-sm text-[var(--accent-error)]">{errors.recurrence[0]}</p>}
   </div>}
   {account?.balanceAnchorDate&&date<account.balanceAnchorDate&&!isPlanned&&<p className="text-xs text-secondary">Історична операція: увійде у звіти, але не змінить зафіксований залишок цього рахунку.</p>}
   {kind==='expense'&&<section className="space-y-3 rounded-xl border border-primary p-3">
    <h3 className="text-sm font-semibold">Щоденні витрати</h3>
    {transaction&&<SpendingBadge value={spending.isLoading||spending.isError?undefined:spending.statuses.get(transaction.id)}/>}
    <div className="space-y-3">
    <Select label="Як враховувати витрату" value={forecastBehavior} onChange={e=>setForecastBehavior(e.target.value as typeof forecastBehavior)} options={[{value:'auto',label:'За категорією та історією'},{value:'one_off',label:'Разова: не повторювати в прогнозі'},{value:'scheduled',label:'Окрема: лише за створеними планами'}]}/>
    {transaction&&!isPlanned&&!isLoanPayment&&<Select label="Ця витрата вже запланована?" value={forecastPlanId} onChange={e=>setForecastPlanId(e.target.value)} options={[{value:'',label:'Не пов’язувати з планом'},...spending.transactions.filter(t=>t.status==='planned'&&t.kind==='expense'&&!t.deletedAt&&!t.recurrenceSuspended&&t.id!==transaction.id&&t.categoryId===categoryId).sort((a,b)=>a.transactionDate.localeCompare(b.transactionDate)).map(t=>({value:t.id,label:t.description+' · '+t.transactionDate+' · '+formatMoney(t.amount,t.currency)}))]}/>}
    {forecastPlanId&&<p className="finance-caption">Після збереження пов’яжемо цю витрату з обраним планом і не повторюватимемо її щодня. Суми та дати не зміняться.</p>}
    <details><summary className="finance-link cursor-pointer text-sm">Група витрати</summary><Input label="Група витрати (необов’язково)" value={flowKey} onChange={e=>setFlowKey(e.target.value)} maxLength={120} placeholder="Наприклад: оренда квартири"/></details>
    <p className="finance-caption">Однакова група у фактичній витраті та її плані пов’язує їх лише для прогнозу. Для різних отримувачів використовуйте різні групи. Разова витрата залишається у статистиці; вже створений план не видаляється.</p>
   </div></section>}
   <details><summary className="finance-link cursor-pointer">Примітки (необов’язково)</summary><Textarea aria-label="Примітки (необов’язково)" value={notes} onChange={e=>setNotes(e.target.value)}/></details>{errors.notes&&<p role="alert" className="text-sm text-[var(--accent-error)]">{errors.notes[0]}</p>}
   {isPlanned&&<p className="plan-inline-note flex items-center gap-2"><CalendarClock size={16} className="shrink-0"/>План не змінює поточний залишок до фактичного виконання.</p>}
  </fieldset>
  {transaction?.status==='completed'&&changed&&<div className="space-y-2 rounded-xl border border-[var(--accent-warning)] p-3"><p className="text-sm">{hasConfirmation(transaction)?'Цю транзакцію вже включали в підтвердження залишку. ':''}Залишки будуть перераховані за збереженими змінами.</p><div onChange={e=>e.stopPropagation()}><Checkbox checked={confirmedFinancial} onChange={e=>setConfirmedFinancial(e.target.checked)}>Підтверджую фінансові зміни</Checkbox></div></div>}
  {errors.financial&&<p role="alert" className="text-sm text-[var(--accent-error)]">{errors.financial[0]}</p>}
 </form>
 </Dialog>{transaction&&<TransferDialog transaction={transaction} open={transferOpen} onClose={()=>setTransferOpen(false)} onDone={()=>{setTransferOpen(false);onClose()}}/>}</>
}
