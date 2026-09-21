'use client'
import {useState} from 'react'
import {Repeat,Pause,Play,ChevronRight} from 'lucide-react'
import {Dialog} from '@/components/ui/dialog'
import {Button} from '@/components/ui/Button'
import {useToast} from '@/components/ui/toast'
import {useSaveRecurring} from '@/hooks/use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {recurrenceLabel} from '@/lib/planning/model'
import {formatMoney} from '@/lib/money/format'
import type {Account,RecurringTransaction} from '@/types/domain'

export function RecurringManager({recurring,accounts,onClose,onEdit}:{recurring:RecurringTransaction[];accounts:Account[];onClose:()=>void;onEdit:(r:RecurringTransaction)=>void}){
 const save=useSaveRecurring(),toast=useToast(),{role,currentUser}=useWorkspaceContext(),[busy,setBusy]=useState<string|null>(null)
 async function toggle(series:RecurringTransaction){
  setBusy(series.id)
  try{await save.mutateAsync({id:series.id,expectedUpdatedAt:series.updatedAt,requestId:crypto.randomUUID(),isActive:!series.isActive});toast.success(series.isActive?'Повторення призупинено':'Повторення відновлено')}
  catch(error){toast.error('Не вдалося змінити повторення',error)}
  finally{setBusy(null)}
 }
 return <Dialog open onClose={onClose} title="Повторювані операції">
  <p className="mb-4 text-sm text-secondary">Пауза прибирає майбутні повторення з планів і прогнозу. Виконані операції та старі прострочені плани залишаються.</p>
  {!recurring.length?<div className="finance-empty"><Repeat size={24}/><strong>Повторень поки немає</strong><span>Під час додавання плану оберіть періодичність або відкрийте виконану операцію та натисніть «Зробити повторюваною».</span></div>:<div className="recurring-list">{recurring.map(r=>{
   const canEdit=role==='owner'||role==='manager'||role==='member'&&r.createdBy===currentUser?.id
   const template=r.template,foreign=!!template.planExchangeMode&&!!template.originalCurrency
   return <section key={r.id} className="recurring-item">
    <div className="recurring-item-heading"><strong>{template.description}</strong><span className={r.isActive?'money-good':'text-secondary'}>{r.isActive?'Активне':'На паузі'}</span></div>
    <div className="recurring-item-amount">{formatMoney(foreign?template.originalAmount!:template.amount,foreign?template.originalCurrency!:template.currency)}</div>
    <p>{recurrenceLabel(r)}{template.plannedTime?' · '+template.plannedTime+' за Києвом':''}</p><p>{accounts.find(a=>a.id===template.accountId)?.name||'Рахунок недоступний'}</p>
    {r.endDate&&<p>До {new Date(r.endDate+'T12:00:00').toLocaleDateString('uk-UA')}</p>}
    {canEdit&&<div className="recurring-item-actions"><Button variant="secondary" size="sm" disabled={!!busy} onClick={()=>onEdit(r)}>Налаштувати<ChevronRight size={14}/></Button><Button variant="ghost" size="sm" disabled={!!busy} onClick={()=>toggle(r)}>{r.isActive?<Pause size={14}/>:<Play size={14}/>} {busy===r.id?'Зберігаємо…':r.isActive?'Призупинити':'Відновити'}</Button></div>}
   </section>
  })}</div>}
 </Dialog>
}