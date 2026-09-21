'use client'
import {useUpdateTransaction,useCurrentUser} from '@/hooks/use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {useToast} from '@/components/ui/toast'
import {Button} from '@/components/ui/Button'
import {localDay} from '@/lib/calculations/dates'
import {plannedAmount} from '@/lib/planning/model'
import {FX_STATUS} from '@/lib/money/fx'
import type {Transaction} from '@/types/domain'

export function CompletePlanButton({transaction:t,onCompleted}:{transaction:Transaction;onCompleted?:()=>void}){
 const update=useUpdateTransaction(),toast=useToast(),{role,can}=useWorkspaceContext(),{data:user}=useCurrentUser()
 if(t.status!=='planned'||t.deletedAt||role==='viewer'||role==='member'&&t.createdBy!==user?.id)return null
 const missingRate=t.planExchangeMode==='nbu'&&t.originalCurrency!==t.currency&&FX_STATUS.source!=='nbu'
 async function complete(){
  try{
   await update.mutateAsync({id:t.id,patch:{status:'completed',amount:plannedAmount(t),transactionDate:localDay(),plannedDate:t.plannedDate||t.transactionDate,planExchangeMode:null,plannedTime:null,
    ...(can('reconcile')&&(t.kind==='transfer'||t.categoryId)?{reviewRequired:false}:{}),expectedUpdatedAt:t.updatedAt}})
   toast.success(t.kind==='income'?'Надходження підтверджено':'Оплату підтверджено');onCompleted?.()
  }catch(e){toast.error('Не вдалося підтвердити оплату',e)}
 }
 return <Button type="button" size="sm" variant="secondary" onClick={complete} disabled={update.isPending||missingRate} title={missingRate?'Дочекайтеся курсу або уточніть фактичну суму у транзакції':undefined}>
  {update.isPending?'Зберігаємо…':t.kind==='income'?'Отримано':'Оплачено'}
 </Button>
}
