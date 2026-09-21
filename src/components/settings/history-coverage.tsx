'use client'
import {useRef,useState} from 'react'
import {useAccounts} from '@/hooks/use-finance'
import {useFinancialModel,useConfirmHistory} from '@/hooks/use-financial-model'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {localDay,addDays} from '@/lib/calculations/dates'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/select'
import {Button} from '@/components/ui/Button'
import {useToast} from '@/components/ui/toast'
import type {HistoryCoverage as Coverage} from '@/types/domain'
export function HistoryCoverage(){
 const {data:accounts=[]}=useAccounts(),model=useFinancialModel(),confirm=useConfirmHistory(),{can}=useWorkspaceContext(),toast=useToast(),request=useRef(crypto.randomUUID())
 const [account,setAccount]=useState('all'),[from,setFrom]=useState(localDay().slice(0,7)+'-01'),[to,setTo]=useState(addDays(localDay(),-1)),[kind,setKind]=useState<Coverage['kind']>('complete'),[error,setError]=useState('')
 const selected=account==='all'?accounts.filter(a=>['cash','bank_debit','credit_card','savings'].includes(a.type)):accounts.filter(a=>a.id===account)
 async function submit(e:React.FormEvent){e.preventDefault();setError('');try{await confirm.mutateAsync({accountIds:selected.map(a=>a.id),from,to,kind,requestId:request.current});request.current=crypto.randomUUID();toast.success('Історію підтверджено','Прогноз і статистика оновляться.')}catch(e){setError(e instanceof Error?e.message:'Не вдалося підтвердити період')}}
 return <section id="history-coverage" className="space-y-3" aria-label="Повнота історії"><p className="finance-caption">Підтвердження залишку не підтверджує повноту виписки. Тут вкажіть, за який період усі транзакції вже внесені, включно з днями без витрат.</p>
 {model.isError?<p role="alert">Не вдалося завантажити періоди історії.</p>:<ul className="coverage-status-list">{accounts.filter(a=>['cash','bank_debit','credit_card','savings'].includes(a.type)).map(a=>{const rows=(model.data?.coverage||[]).filter(c=>c.accountId===a.id&&!c.invalidatedAt).sort((a,b)=>b.toDate.localeCompare(a.toDate)),latest=rows[0];return <li key={a.id}><span>{a.name}</span><small>{latest?latest.fromDate+' — '+latest.toDate:'Повноту ще не підтверджено'}</small></li>})}</ul>}
 {can('account.manage')&&<form onSubmit={submit} onChange={()=>{request.current=crypto.randomUUID()}} className="space-y-3"><Select label="Рахунки" value={account} onChange={e=>setAccount(e.target.value)} options={[{value:'all',label:'Усі платіжні рахунки'},...accounts.map(a=>({value:a.id,label:a.name}))]}/><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Input label="Від дати" type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)} required/><Input label="До дати включно" type="date" value={to} min={from} max={addDays(localDay(),-1)} onChange={e=>setTo(e.target.value)} required/></div><Select label="Що підтверджуєте" value={kind} onChange={e=>setKind(e.target.value as Coverage['kind'])} options={[{value:'complete',label:'Уся історія за період внесена'},{value:'no_activity',label:'За період не було жодної транзакції'},{value:'not_open',label:'Рахунку ще не існувало'}]}/>{error&&<p role="alert" className="money-bad">{error}</p>}<Button type="submit" className="w-full" disabled={confirm.isPending||!selected.length}>{confirm.isPending?'Підтверджуємо…':'Підтвердити період'}</Button></form>}
 </section>
}