'use client'
import {isLoanDestination} from '@/lib/loans/destination'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {Money,Disclosure} from '@/components/ui/finance-visuals'
import {Dialog,DialogActions} from '@/components/ui/dialog'
import {Input} from '@/components/ui/Input'
import {Textarea} from '@/components/ui/textarea'
import {Button} from '@/components/ui/Button'
import {Checkbox} from '@/components/ui/checkbox'
import {useToast} from '@/components/ui/toast'
import {useTransactions} from '@/hooks/use-finance'
import {useFinanceAction} from '@/hooks/use-loans'
import {parseSignedBalance} from '@/lib/reconciliation/model'
import {reconciliationHints} from '@/lib/import/matching'
import {formatMoney} from '@/lib/money/format'
import type {Account} from '@/types/domain'
export function UpdateBalanceDialog({account,calculated,open,onClose}:{account:Account;calculated:number;open:boolean;onClose:()=>void}){
 const snapshot=useRef({account,calculated}),initialized=useRef(false)
 const [value,setValue]=useState(''),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('')
 const action=useFinanceAction(),toast=useToast(),{data:transactions=[]}=useTransactions({accountId:account.id})
 useEffect(()=>{if(!open){initialized.current=false;return}if(initialized.current)return;initialized.current=true;snapshot.current={account,calculated};setValue(String(isLoanDestination(account)?Math.abs(account.currentBalance):account.currentBalance));setNote('');setConfirmed(false);setError('')},[open,account,calculated])
 const a=snapshot.current.account,manualDebt=isLoanDestination(a),parsedValue=parseSignedBalance(value),n=parsedValue===null?null:manualDebt?-Math.abs(parsedValue):parsedValue,diff=n===null?null:Math.round((n-snapshot.current.calculated)*100)/100,hints=reconciliationHints(a,transactions,diff??0)
 const debt=value.trim().startsWith('-')||value.trim().startsWith('−')
 function change(v:string){setValue(v);setConfirmed(false);setError('')}
 function close(){if(!action.isPending)onClose()}
 async function save(){if(n===null){setError('Введіть залишок. Порожнє поле не є нулем.');return}if(diff!==0&&!confirmed){setError('Перевірте та підтвердьте різницю.');return}try{await action.mutateAsync({name:'finance_confirm_balance',args:{p_account:a.id,p_value:String(n),p_version:a.ledgerVersion??0,p_anchor:a.balanceAnchorAt,p_confirm_difference:confirmed,p_note:note||null}});toast.success('Залишок підтверджено',a.name);onClose()}catch(e){setError(e instanceof Error?e.message:'Не вдалося звірити залишок')}}
 return <Dialog open={open} onClose={close} title={manualDebt?"Звірити борг":"Звірити залишок"} description={a.name+' · '+a.currency} footer={<DialogActions><Button variant="secondary" onClick={close} disabled={action.isPending}>Скасувати</Button><Button onClick={save} disabled={action.isPending||n===null||(diff!==0&&!confirmed)}>{action.isPending?'Зберігаємо…':manualDebt?'Підтвердити борг':'Підтвердити залишок'}</Button></DialogActions>}>
 <div className="space-y-4"><div className="balance-reference"><span>{manualDebt?'Збережена сума боргу':'За обліком'}</span><Money value={manualDebt?Math.abs(snapshot.current.calculated):snapshot.current.calculated} currency={a.currency}/></div>
 {!manualDebt&&<div className="grid grid-cols-2 gap-2" role="group" aria-label="Знак залишку"><Button variant={debt?'secondary':'primary'} aria-pressed={!debt} onClick={()=>change(value.replace(/^[-−+]/,''))}>Власні кошти (+)</Button><Button variant={debt?'primary':'secondary'} aria-pressed={debt} onClick={()=>change('-'+value.replace(/^[-−+]/,''))}>Борг (−)</Button></div>}
 <Input label={manualDebt?"Сума до повного погашення з банку":"Фактичний залишок"} type="text" inputMode="decimal" autoComplete="off" className="amount-input" value={value} onChange={e=>change(e.target.value)} error={error} autoFocus/>
 {a.type==='credit_card'&&<p className="text-sm text-secondary">Для кредитки введіть борг зі знаком мінус або власні кошти зі знаком плюс. Не вводьте доступний кредитний ліміт.</p>}
 <p className="rounded-xl border border-primary p-3 text-sm">Різниця: <strong>{diff===null?'Спочатку введіть суму':formatMoney(diff,a.currency)}</strong></p>
 {diff!==null&&Math.abs(diff)>=0.01&&<>{!manualDebt&&<section className="space-y-2"><h3 className="font-semibold">Що може пояснити різницю</h3><p className="text-xs text-muted">Це підказки, не автоматичні виправлення.</p>{hints.map((h,i)=><Link key={i} className="block rounded-xl border border-primary p-3 text-sm" href={'/transactions?ids='+h.ids.join(',')} onClick={close}><span className="block break-words font-medium">{h.label}</span><span className="text-xs text-secondary">{h.explanation}</span></Link>)}{!hints.length&&<p className="text-sm text-secondary">Точного збігу немає. Перевірте пропущені платежі, комісії та дублікати.</p>}</section>}<Checkbox checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}>Підтверджую зміну з {formatMoney(manualDebt?Math.abs(snapshot.current.calculated):snapshot.current.calculated,a.currency)} на {formatMoney(manualDebt?Math.abs(n!):n!,a.currency)}. Це коригування залишку, а не дохід чи витрата.</Checkbox></>}
 <Disclosure title="Примітка та правила звірки"><Textarea label="Примітка (необов’язково)" maxLength={200} value={note} onChange={e=>setNote(e.target.value)}/><p>Введіть суму з банку або перерахуйте готівку. Це підтверджує лише цей рахунок, не категорії та не інший бік переказу.</p><p>Старі виписки не змінять цю точку відліку. Історія та безпечне скасування доступні в деталях рахунку.</p></Disclosure><Link className="inline-flex min-h-11 items-center underline" href={'/accounts/'+a.id} onClick={close}>Історія підтверджень</Link>
 </div></Dialog>
}
