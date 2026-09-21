'use client'
import {useState} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {createClient} from '@/lib/supabase/client'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {Button} from '@/components/ui/Button'
import {Dialog} from '@/components/ui/dialog'
import {PREVIEW_NO_AUTH} from '@/lib/auth/preview'
export function PeriodControl({month}:{month:string}){
  const {workspace,can}=useWorkspaceContext()
  const qc=useQueryClient()
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [confirmation,setConfirmation]=useState<{month:string;closed:boolean}|null>(null)
  const query=useQuery({queryKey:['periods',workspace?.id],enabled:!!workspace&&!PREVIEW_NO_AUTH,queryFn:async()=>{const {data,error}=await createClient().from('finance_periods').select('month').eq('workspace_id',workspace!.id);if(error)throw error;return data || []}})
  const closed=!!query.data?.some(p=>p.month===month+'-01')
  async function change(){
    if(!confirmation||busy)return
    setBusy(true);setError('')
    try{const {error}=await createClient().rpc('finance_set_period',{p_month:confirmation.month+'-01',p_closed:!confirmation.closed});if(error)throw error;await qc.invalidateQueries({queryKey:['periods']});setConfirmation(null)}
    catch(e){setError(e instanceof Error?e.message:(e as {message?:string})?.message || 'Не вдалося змінити стан місяця.')}finally{setBusy(false)}
  }
  if(PREVIEW_NO_AUTH)return null
  return <div className="mb-5"><div className="flex flex-wrap items-center gap-3"><span className="text-sm text-secondary">{query.isLoading?'Перевіряємо місяць…':query.isError?'Стан місяця невідомий':closed?'Місяць закрито':'Місяць відкрито'}</span>{can('reconcile')&&<Button variant="secondary" size="sm" onClick={()=>{setError('');setConfirmation({month,closed})}} disabled={busy||query.isLoading||query.isError}>{closed?'Відкрити для змін':'Закрити місяць'}</Button>}</div>{(error||query.error)&&<p role="alert" className="mt-2 text-sm text-[var(--accent-error)]">{error||'Не вдалося перевірити стан місяця.'}</p>}
    <Dialog open={!!confirmation} onClose={()=>{if(!busy)setConfirmation(null)}} title={confirmation?.closed?'Відкрити місяць для змін?':'Підтвердити закриття місяця'} footer={<><Button variant="secondary" disabled={busy} onClick={()=>setConfirmation(null)}>Скасувати</Button><Button variant="primary" disabled={busy} onClick={change}>{busy?'Зберігаємо…':'Підтвердити'}</Button></>}><p className="text-sm text-secondary">Місяць: {confirmation?.month}. {confirmation?.closed?'Ви знову зможете редагувати його операції.':'Операції будуть захищені від змін. За потреби місяць можна буде відкрити повторно.'}</p>{error&&<p role="alert" className="mt-3 text-sm text-[var(--accent-error)]">{error}</p>}</Dialog>
  </div>
}