'use client'
import {isPaymentAccount} from '@/lib/loans/destination'
import {useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {StatementImportPrompt} from '@/components/settings/statement-import-prompt'
import {Card} from '@/components/ui/Card'
import {Button} from '@/components/ui/Button'
import {Select} from '@/components/ui/select'
import {Checkbox} from '@/components/ui/checkbox'
import {Badge} from '@/components/ui/badge'
import {useToast} from '@/components/ui/toast'
import {useAccounts,useMembers,useImportTransactions,useTransactions} from '@/hooks/use-finance'
import {parseDelimited,guessColumns,toParsedRows,type ColumnMapping} from '@/lib/import/parse-statement'
import {manualCandidates} from '@/lib/import/matching'
import {accountOwner} from '@/lib/money/entry'
import {bankLegAmount} from '@/lib/reconciliation/model'
import {isAfterBalanceAnchor,transactionEffect} from '@/lib/money/balances'
import {localDay} from '@/lib/calculations/liquidity'
import {formatMoney} from '@/lib/money/format'
import type {CreateTransactionInput} from '@/lib/data/repository'
export function ImportWorkflow({onDone}:{onDone:(batchId:string)=>void}){
 const toast=useToast(),{data:accounts=[]}=useAccounts(),{data:members=[]}=useMembers(),{data:existing=[]}=useTransactions(),importer=useImportTransactions()
 const [accountId,setAccountId]=useState(''),[text,setText]=useState(''),[fileName,setFileName]=useState('Вставлений CSV'),[mapping,setMapping]=useState<ColumnMapping|null>(null),[choices,setChoices]=useState<Record<number,string>>({}),[newActivity,setNewActivity]=useState<Record<number,boolean>>({})
 const fileRef=useRef<HTMLInputElement>(null),nonce=useRef(crypto.randomUUID()),request=useRef<{signature:string;id:string}>()
 const account=accounts.find(a=>a.id===accountId&&isPaymentAccount(a)),parsed=useMemo(()=>parseDelimited(text),[text]),map=mapping||guessColumns(parsed.headers)
 const rows=useMemo(()=>toParsedRows(parsed.rows,map),[parsed,map.date,map.description,map.amount])
 const importedKeys=new Set(existing.flatMap(t=>[...(t.accountId===accountId&&t.importKey?[t.importKey]:[]),...(t.counterAccountId===accountId&&t.counterImportKey?[t.counterImportKey]:[])]))
 const currencyColumn=parsed.headers.findIndex(h=>/^(currency|валюта)$/i.test(h.trim()))
 const seen=new Map<string,number>()
 const bankIdColumn=parsed.headers.findIndex(h=>/^(bank_id|transaction_id|reference_id)$/i.test(h.trim()))
 const meta=rows.map((r,index)=>{
  const base=bankIdColumn>=0&&r.raw[bankIdColumn]?'bank:'+r.raw[bankIdColumn]:JSON.stringify([r.date,r.amount<0?'expense':'income',Math.abs(r.amount).toFixed(2),r.description.trim().toLocaleLowerCase()])+(r.occurredAt?'|time:'+r.occurredAt:'')
  const occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence)
  const key=base+(occurrence>1?'|occurrence:'+occurrence:'')
  const duplicate=importedKeys.has(key),candidates=account?manualCandidates(r,account.id,account.currency,existing):[]
  const valid=r.valid&&r.date<=localDay()&&(currencyColumn<0||!r.raw[currencyColumn]?.trim()||r.raw[currencyColumn].trim().toUpperCase()===account?.currency),choice=choices[index]??(duplicate?'skip':candidates.length?'':'new')
  const matched=candidates.find(c=>c.transaction.id===choice)?.transaction
  const historical=account?matched&&r.date===matched.transactionDate?!isAfterBalanceAnchor(matched,account):!!account.balanceAnchorDate&&(r.date<account.balanceAnchorDate||(r.date===account.balanceAnchorDate&&!newActivity[index])):true
  const previous=matched&&account&&isAfterBalanceAnchor(matched,account)?transactionEffect(matched,account):0
  const delta=matched?.kind==='transfer'?0:(historical?0:r.amount)-previous
  return {...r,index,key,duplicate,candidates,valid,choice,matched,historical,delta}
 })
 const included=meta.filter(r=>r.valid&&r.choice&&r.choice!=='skip'),unresolved=meta.filter(r=>r.valid&&!r.choice).length,delta=included.reduce((s,r)=>s+r.delta,0)
 const repeatedMatches=included.some((r,i)=>r.matched&&included.slice(0,i).some(other=>other.matched?.id===r.matched?.id))
 function reset(){setMapping(null);setChoices({});setNewActivity({});nonce.current=crypto.randomUUID();request.current=undefined}
 async function onFile(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){toast.error('Максимальний розмір CSV: 5 МБ');return}try{setText(await f.text());setFileName(f.name);reset()}catch{toast.error('Не вдалося прочитати CSV')}}
 async function run(){if(!account?.balanceAnchorAt||!included.length||unresolved||repeatedMatches)return;const inputs:CreateTransactionInput[]=included.map(r=>({accountId:account.id,kind:r.amount<0?'expense':'income',amount:Math.abs(r.amount),currency:account.currency,description:r.description.slice(0,120),transactionDate:r.date,occurredAt:r.occurredAt,notes:'Імпортовано з виписки',balanceTreatment:newActivity[r.index]?'new_activity':'auto',importAnchorAt:account.balanceAnchorAt,matchedTransactionId:r.matched?.id,matchUpdatedAt:r.matched?.updatedAt,importKeyOverride:r.duplicate&&r.choice==='new'?r.key+'|separate:'+nonce.current:r.key}));try{const signature=JSON.stringify({inputs,fileName});if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};const result=await importer.mutateAsync({inputs,fileName,requestId:request.current!.id});toast.success('Оброблено операцій: '+result.length,'Підтверджені збіги оновлено без другого списання.');onDone(request.current!.id)}catch(e){toast.error('Імпорт не виконано',e)}}
 const options=parsed.headers.map((h,i)=>({value:String(i),label:h||'Колонка '+(i+1)}))
 return <div className="min-w-0">
 <section className="import-source mb-5 min-w-0 space-y-4"><Select label="Рахунок для імпорту" value={accountId} onChange={e=>{setAccountId(e.target.value);setChoices({});setNewActivity({})}} options={[{value:'',label:'Оберіть рахунок для цієї виписки'},...accounts.filter(isPaymentAccount).map(a=>({value:a.id,label:a.name+' · '+a.currency+' · '+accountOwner(a,members)}))]}/>{!accounts.length&&<Link href="/accounts/new" className="underline">Додати перший рахунок</Link>}
 <p className="text-sm text-secondary">Стара історія не змінює зафіксований залишок. Для дня звірки позначте лише ті операції, які ще не були враховані в залишку.</p><Button variant="secondary" onClick={()=>fileRef.current?.click()}>Завантажити CSV</Button><input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden"/>
 <details><summary className="cursor-pointer py-2 text-sm underline">Або вставити CSV текстом</summary><textarea aria-label="Виписка CSV" className="form-input h-36 w-full font-mono" placeholder="Date;Description;Amount" value={text} onChange={e=>{setText(e.target.value);setFileName('Вставлений CSV');reset()}}/></details>
 <Link className="inline-flex min-h-11 items-center text-sm underline" href="/transactions/imports">Історія імпортів і скасування</Link>
 <details className="import-prompt-disclosure"><summary className="cursor-pointer py-3 text-sm text-[var(--accent-primary)]">PDF або фото: промпт для конвертації</summary><StatementImportPrompt embedded/></details></section>
 {rows.length>0&&<><Card className="mb-5 space-y-3"><h2 className="break-words font-semibold">{account?'Імпортуємо на: '+account.name+' · '+account.currency:'Спочатку оберіть рахунок'}</h2>{account&&<p className="text-sm">Зараз: {formatMoney(account.currentBalance,account.currency)}. Після підтверджених рядків: {formatMoney(account.currentBalance+delta,account.currency)}.</p>}<p className="text-xs text-muted">Період: {[...rows.filter(r=>r.valid).map(r=>r.date)].sort()[0]} – {[...rows.filter(r=>r.valid).map(r=>r.date)].sort().at(-1)}. Це попередній перегляд. Жодного запису ще не збережено.</p><div className="grid gap-3 sm:grid-cols-3">{(['date','description','amount'] as const).map((key,i)=><Select key={key} label={['Колонка з датою','Колонка з описом','Колонка із сумою'][i]} value={String(map[key])} options={options} onChange={e=>{setMapping({...map,[key]:Number(e.target.value)});setChoices({})}}/>)}</div><p className="text-sm">Рядків: {rows.length}. До імпорту: {included.length}. Потребують рішення: {unresolved}.</p></Card>
 <div className="space-y-3">{meta.map(r=><Card key={r.index} className="min-w-0 space-y-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-medium">{r.description}</p><p className="text-xs text-muted">{r.occurredAt?.replace('T',' ')||r.date||'Некоректна дата'}</p></div><p className="break-words font-semibold tabular-nums">{account?formatMoney(r.amount,account.currency):r.amount}</p></div>
 {!r.valid?<p role="alert" className="text-sm text-[var(--accent-error)]">Перевірте дату, суму та валюту. Валюта рядка має збігатися з рахунком; майбутні платежі не імпортуємо як виконані.</p>:<><div className="flex flex-wrap gap-2">{r.duplicate&&<Badge tone="warning">Такий рядок уже імпортовано</Badge>}{r.candidates.length>0&&<Badge tone="warning">Можливий ручний запис</Badge>}<Badge>{r.historical?'Лише історія':'Впливає на залишок'}</Badge></div>
 {r.candidates.map(c=><div key={c.transaction.id} className="rounded-lg bg-[var(--ambient-glow)] p-3 text-sm"><p className="break-words">Ручний запис: {c.transaction.description} · {account?formatMoney(bankLegAmount(c.transaction,account.id),account.currency):c.transaction.amount} · {c.transaction.transactionDate}</p><p className="mt-1 text-xs text-secondary">{c.reasons.join('. ')}. Це лише припущення.</p></div>)}
 <Select label={'Дія для рядка '+(r.index+1)} value={r.choice} onChange={e=>setChoices(v=>({...v,[r.index]:e.target.value}))} options={[...(r.candidates.length?[{value:'',label:'Підтвердьте: це та сама операція?'}]:[]),{value:'new',label:r.duplicate||r.candidates.length?'Це окрема справжня операція':'Додати нову операцію'},...r.candidates.map(c=>({value:c.transaction.id,label:'Це та сама: '+c.transaction.description+' · '+c.transaction.amount})),{value:'skip',label:'Не імпортувати цей рядок'}]}/>
 {r.matched&&<p className="text-xs text-secondary">Залишиться один запис із точною сумою та описом банку. Ваша категорія і примітки збережуться.</p>}
 {account?.balanceAnchorDate===r.date&&!r.matched&&<Checkbox checked={!!newActivity[r.index]} onChange={e=>setNewActivity(v=>({...v,[r.index]:e.target.checked}))}>Нова операція після зафіксованого залишку</Checkbox>}</>}
 </Card>)}</div>
 <Card className="mt-5 space-y-3"><p className="text-xs text-secondary">Однакова сума не означає дубль. Повторні поїздки та покупки можна залишити окремими. Власний переказ можна оформити в редагуванні транзакції.</p>{repeatedMatches&&<p role="alert" className="text-sm text-[var(--accent-error)]">Один ручний запис не можна зіставити з двома рядками виписки.</p>}<Button className="w-full" onClick={run} disabled={!account||!included.length||included.length>5000||unresolved>0||repeatedMatches||importer.isPending}>{importer.isPending?'Імпортуємо…':'Підтвердити імпорт ('+included.length+')'}</Button><Link className="inline-flex min-h-11 items-center underline" href="/transactions/imports">Історія імпортів і скасування</Link></Card></>}
 </div>
}