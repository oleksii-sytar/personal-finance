'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {Dialog} from '@/components/ui/dialog'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/select'
import {Button} from '@/components/ui/Button'
import {SegmentedControl} from '@/components/ui/segmented'
import {useToast} from '@/components/ui/toast'
import {useAccounts,useCategories,useCreateTransaction,useSettings,useMembers} from '@/hooks/use-finance'
import {accountOwner,parseEntryAmount,preferredAccounts} from '@/lib/money/entry'
import {localDay} from '@/lib/calculations/liquidity'
import {DetailedEntryForm,type EntryDraft} from './detailed-entry-form'
import {cn} from '@/lib/utils'
interface Props {open:boolean;onClose:()=>void;preselectAccountId?:string}
export function QuickEntrySheet({open,onClose,preselectAccountId}:Props){
 const {data:accounts=[]}=useAccounts(),{data:categories=[]}=useCategories(),{data:settings}=useSettings(),{data:members=[]}=useMembers()
 const create=useCreateTransaction(),toast=useToast(),initialized=useRef(false)
 const [kind,setKind]=useState<'income'|'expense'>('expense'),[amount,setAmount]=useState(''),[accountId,setAccountId]=useState(''),[categoryId,setCategoryId]=useState(''),[advanced,setAdvanced]=useState(false),[draft,setDraft]=useState<EntryDraft>()
 useEffect(()=>{if(!open){initialized.current=false;setAdvanced(false);return}if(initialized.current||!accounts.length||!settings)return;initialized.current=true;setKind('expense');setAmount('');setCategoryId('');setAccountId(preselectAccountId||settings.defaultAccountId||preferredAccounts(accounts,settings)[0]?.id||'')},[open,accounts,settings,preselectAccountId])
 const account=accounts.find(a=>a.id===accountId),numeric=parseEntryAmount(amount),relevant=categories.filter(c=>c.type===kind),ordered=preferredAccounts(accounts,settings)
 const favorites=ordered.filter(a=>a.id===settings?.defaultAccountId||settings?.favoriteAccountIds?.includes(a.id))
 async function save(){if(!numeric||!account||create.isPending)return;try{await create.mutateAsync({accountId:account.id,kind,amount:numeric,currency:account.currency,categoryId:categoryId||null,description:relevant.find(c=>c.id===categoryId)?.name||(kind==='income'?'Дохід':'Витрата'),transactionDate:localDay()});toast.success('Операцію додано');onClose()}catch(e){toast.error('Не вдалося зберегти',e)}}
 function expand(){setDraft({kind,amount,accountId,categoryId,transactionDate:localDay()});setAdvanced(true)}
 return <><Dialog open={open&&!advanced} onClose={onClose} variant="sheet" title="Швидке додавання" footer={<Button className="w-full" disabled={!numeric||!account||create.isPending} onClick={save}>{create.isPending?'Зберігаємо…':kind==='income'?'Додати дохід':'Додати витрату'}</Button>}>
  <div className="space-y-4">
   <SegmentedControl aria-label="Тип операції" value={kind} onChange={v=>{setKind(v);setCategoryId('')}} options={[{value:'expense',label:'Витрата'},{value:'income',label:'Дохід'}]} className="w-full [&>button]:flex-1"/>
   <div className="sticky top-0 z-10 rounded-xl bg-[var(--bg-primary)] py-2"><Input label={'Сума ('+(account?.currency||'UAH')+')'} type="text" inputMode="decimal" autoComplete="off" enterKeyHint="done" placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)} className="amount-input" onFocus={e=>e.currentTarget.scrollIntoView({block:'nearest'})}/>{amount&&!numeric&&<p role="alert" className="mt-1 text-xs text-[var(--accent-error)]">Введіть додатну суму, не більше двох знаків після коми.</p>}</div>
   {!!favorites.length&&<div><p className="mb-2 text-xs text-muted">Мої обрані рахунки</p><div className="flex flex-wrap gap-2">{favorites.map(a=><button type="button" key={a.id} onClick={()=>setAccountId(a.id)} aria-pressed={a.id===accountId} className={cn('min-h-11 max-w-full break-words rounded-xl border px-3 py-2 text-left text-sm',a.id===accountId?'border-[var(--accent-primary)] bg-[var(--ambient-glow)]':'border-primary')}>{a.name}<span className="block text-xs text-muted">{accountOwner(a,members)}</span></button>)}</div></div>}
   <Select label="Рахунок" value={accountId} onChange={e=>setAccountId(e.target.value)} options={[{value:'',label:'Оберіть рахунок'},...ordered.map(a=>({value:a.id,label:a.name+' · '+a.currency+' · '+accountOwner(a,members)}))]}/>
   {!accounts.length&&<Link className="block min-h-11 text-[var(--accent-primary)] underline" href="/accounts/new" onClick={onClose}>Додати перший рахунок</Link>}
   <Select label="Категорія (необов’язково)" value={categoryId} onChange={e=>setCategoryId(e.target.value)} options={[{value:'',label:'Призначу пізніше'},...relevant.map(c=>({value:c.id,label:c.name}))]}/>
   <p className="text-xs text-muted">Рахунок потрібен для правильного залишку. Категорію можна призначити пізніше, зокрема масово.</p>
   <Button variant="secondary" className="w-full" onClick={expand}>Розширене додавання</Button><p className="text-center text-xs text-muted">Дата, опис, переказ і планування. Введені дані збережуться.</p>
  </div></Dialog><DetailedEntryForm open={open&&advanced} onClose={onClose} initialValues={draft}/></>
}