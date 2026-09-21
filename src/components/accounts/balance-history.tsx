'use client'
import {useState} from 'react'
import {useBalanceHistory} from '@/hooks/use-finance'
import {useFinanceAction} from '@/hooks/use-loans'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {Button} from '@/components/ui/Button'
import {useToast} from '@/components/ui/toast'
import {formatMoney} from '@/lib/money/format'
import type {Account} from '@/types/domain'
export function BalanceHistory({account}:{account:Account}){
 const {data:rows=[]}=useBalanceHistory(account.id),action=useFinanceAction(),toast=useToast(),{can}=useWorkspaceContext(),[confirm,setConfirm]=useState('')
 return <div className="space-y-3">{!rows.length&&<p className="text-sm text-muted">Залишок ще не підтверджували.</p>}{rows.map(h=><div key={h.id} className="space-y-2 border-b border-primary pb-3 text-sm"><p>{new Date(h.createdAt).toLocaleString('uk-UA')}</p><p>{formatMoney(h.oldBalance,account.currency)} → <strong>{formatMoney(h.newBalance,account.currency)}</strong></p>{h.note&&<p className="break-words text-xs text-muted">{h.note}</p>}{h.undoneAt?<p className="text-muted">Скасовано</p>:h.id===account.lastReconciliationId&&h.afterVersion===account.ledgerVersion&&can('reconcile')&&<Button variant="secondary" disabled={action.isPending} onClick={async()=>{if(confirm!==h.id){setConfirm(h.id);return}try{await action.mutateAsync({name:'finance_undo_balance',args:{p_id:h.id}});setConfirm('');toast.success('Помилкове підтвердження скасовано')}catch(e){toast.error('Не вдалося скасувати',e)}}}>{confirm===h.id?'Підтвердити скасування звірки':'Скасувати цю звірку'}</Button>}</div>)}</div>
}