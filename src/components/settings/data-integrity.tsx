'use client'
import Link from 'next/link'
import {useQuery} from '@tanstack/react-query'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {createClient} from '@/lib/supabase/client'
import {PREVIEW_NO_AUTH} from '@/lib/auth/preview'
import {errorMessage} from '@/lib/errors'
import {Card,CardTitle} from '@/components/ui/Card'
import {Button} from '@/components/ui/Button'
interface Issue {entity:string;id:string;reason:string}
export function DataIntegrity(){
 const {workspace}=useWorkspaceContext()
 const audit=useQuery({queryKey:['finance-integrity',workspace?.id],enabled:!!workspace&&!PREVIEW_NO_AUTH,staleTime:60000,queryFn:async()=>{
  const {data,error}=await createClient().rpc('finance_integrity_audit')
  if(error)throw new Error(errorMessage(error))
  return (data||[]) as Issue[]
 }})
 if(PREVIEW_NO_AUTH)return null
 return <Card><CardTitle>Цілісність збережених даних</CardTitle>
 <p className="my-3 text-sm text-secondary">Перевіряємо залишки за обліком, зв’язки операцій, категорій і кредитних графіків. Фактичні залишки звіряйте в рахунках за даними банку.</p>
 {audit.isFetching?<p role="status">Перевіряємо дані…</p>:audit.isError?<p role="alert">Не вдалося перевірити цілісність. {audit.error.message}</p>:audit.isSuccess&&audit.data.length===0?<p role="status">Перевірені залишки та зв’язки узгоджені.</p>:audit.data&&<><p role="alert">Потребують перевірки: {audit.data.length}</p><ul className="my-3 space-y-2">{audit.data.map((issue,i)=><li key={issue.entity+issue.id+i} className="text-sm">{issue.reason} {issue.entity==='accounts'?<Link className="underline" href={'/accounts/'+issue.id}>Відкрити рахунок</Link>:issue.entity==='transactions'?<Link className="underline" href={'/transactions?ids='+issue.id}>Відкрити операцію</Link>:null}</li>)}</ul></>}
 {audit.isSuccess&&<p className="mt-2 text-sm text-muted">Перевірено: <time dateTime={new Date(audit.dataUpdatedAt).toISOString()}>{new Date(audit.dataUpdatedAt).toLocaleString('uk-UA')}</time></p>}
 <Button className="mt-3" variant="secondary" disabled={audit.isFetching||!workspace} onClick={()=>audit.refetch()}>Перевірити ще раз</Button>
 </Card>
}
