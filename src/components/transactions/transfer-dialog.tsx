'use client'
import {isLoanDestination} from '@/lib/loans/destination'
import {useEffect,useRef,useState} from 'react'
import {Dialog,DialogActions} from '@/components/ui/dialog'
import {Select} from '@/components/ui/select'
import {Input} from '@/components/ui/Input'
import {Button} from '@/components/ui/Button'
import {useAccounts,useTransactions} from '@/hooks/use-finance'
import {useFinanceAction} from '@/hooks/use-loans'
import {transferPartners,parseSignedBalance} from '@/lib/reconciliation/model'
import {formatMoney} from '@/lib/money/format'
import {useToast} from '@/components/ui/toast'
import type {Transaction} from '@/types/domain'
export function TransferDialog({transaction,open,onClose,onDone}:{transaction:Transaction;open:boolean;onClose:()=>void;onDone?:()=>void}){
 const {data:accounts=[]}=useAccounts(),{data:rows=[]}=useTransactions(),action=useFinanceAction(),toast=useToast()
 const [source,setSource]=useState(''),[destination,setDestination]=useState(''),[choice,setChoice]=useState(''),[otherAmount,setOtherAmount]=useState(''),[error,setError]=useState(''),initialized=useRef(false),snapshot=useRef(transaction)
 useEffect(()=>{if(!open){initialized.current=false;return}if(initialized.current)return;initialized.current=true;snapshot.current=transaction;setSource(transaction.kind==='income'?'':transaction.accountId);setDestination(transaction.kind==='income'?transaction.accountId:transaction.counterAccountId||'');setChoice('');setOtherAmount('');setError('')},[open,transaction])
 const t=snapshot.current,src=accounts.find(a=>a.id===source),dst=accounts.find(a=>a.id===destination),exchange=!!src&&!!dst&&src.currency!==dst.currency
 const candidates=source&&destination?transferPartners(t,source,destination,rows):[],partner=candidates.find(r=>r.id===choice)
 const sourceAmount=t.kind==='income'?(exchange?parseSignedBalance(otherAmount):t.amount):t.amount,received=t.kind==='income'?t.amount:(t.kind==='transfer'?t.counterAmount??t.amount:exchange?parseSignedBalance(otherAmount):t.amount)
 const label=(r:Transaction)=>r.description+' · '+formatMoney(r.amount,r.currency)+' · '+r.transactionDate
 const ready=!!src&&!!dst&&src.id!==dst.id&&!!choice&&(!!partner||(choice==='new'&&t.kind!=='transfer'&&!!sourceAmount&&sourceAmount>0&&!!received&&received>0))
 async function save(){if(!ready)return;setError('');try{await action.mutateAsync({name:'finance_make_transfer',args:{p_id:t.id,p_expected:t.updatedAt,p_source:source,p_destination:destination,p_source_amount:sourceAmount,p_received:received,p_match:partner?.id||null,p_match_updated:partner?.updatedAt||null,p_confirm_missing:choice==='new'}});toast.success('Власний переказ збережено','Категорія не потрібна. Доходи й витрати сім’ї не збільшуються.');onDone?.();onClose()}catch(e){setError(e instanceof Error?e.message:'Не вдалося зберегти переказ')}}
 return <Dialog open={open} onClose={()=>{if(!action.isPending)onClose()}} title="Власний переказ" footer={<DialogActions><Button variant="secondary" onClick={onClose} disabled={action.isPending}>Скасувати</Button><Button onClick={save} disabled={!ready||action.isPending}>{action.isPending?'Зберігаємо…':'Підтвердити переказ'}</Button></DialogActions>}><div className="space-y-4"><p className="break-words text-sm">{label(t)}</p><p className="text-sm text-secondary">Переказ дружині та зняття готівки є рухом між власними рахунками. Перевірте напрямок і знайдіть другий запис, якщо він уже є.</p>
 <Select label="З рахунку" value={source} disabled={t.kind!=='income'} onChange={e=>{setSource(e.target.value);setChoice('');setOtherAmount('')}} options={[{value:'',label:'Оберіть рахунок списання'},...accounts.filter(a=>a.id!==destination&&!isLoanDestination(a)).map(a=>({value:a.id,label:a.name+' · '+a.currency}))]}/>
 <Select label="На рахунок" value={destination} disabled={t.kind==='income'||t.kind==='transfer'} onChange={e=>{setDestination(e.target.value);setChoice('');setOtherAmount('')}} options={[{value:'',label:'Оберіть рахунок одержувача'},...accounts.filter(a=>a.id!==source&&!isLoanDestination(a)).map(a=>({value:a.id,label:a.name+' · '+a.currency}))]}/>
 {source&&destination&&<><Select label="Другий запис цього переказу" value={choice} onChange={e=>setChoice(e.target.value)} options={[{value:'',label:'Перевірте та оберіть варіант'},...candidates.map(r=>({value:r.id,label:label(r)})),...(t.kind!=='transfer'?[{value:'new',label:'Іншого запису немає. Додати другий бік переказу'}]:[])]}/>{!candidates.length&&<p className="text-xs text-secondary">Відповідних записів за сумою та датою ±2 дні не знайдено.{t.kind==='transfer'?' Цей переказ уже враховує обидва рахунки. Повторно його додавати не потрібно.':''}</p>}
 {exchange&&choice==='new'&&<Input label={t.kind==='income'?'Фактично списано, '+src?.currency:'Фактично отримано, '+dst?.currency} type="text" inputMode="decimal" value={otherAmount} onChange={e=>setOtherAmount(e.target.value)}/>}
 {partner&&<p className="rounded-xl bg-glass p-3 text-sm">Два записи стануть одним переказом. Банківські суми збережуться. Зайвий вплив уже записаного переказу буде прибрано, якщо він був порахований двічі. Дані до зафіксованих залишків не списуються повторно.</p>}
 {choice==='new'&&<p className="rounded-xl bg-glass p-3 text-sm">Залишиться один переказ: {src?.name} → {dst?.name}. Уже врахований бік не списується вдруге. Інший бік змінить залишок лише після його точки відліку.</p>}
 <p className="text-xs text-muted">Комісія банку є окремою витратою. Обидва залишки підтверджуються окремо. Оплата кредиту оформлюється як витрата з полем «Кредит або борг».</p></>}{error&&<p role="alert" className="text-sm text-[var(--accent-error)]">{error}</p>}
 </div></Dialog>
}
