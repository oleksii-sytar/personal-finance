'use client'
import {notifyManager,useQueryClient} from '@tanstack/react-query'
import {useCallback,useSyncExternalStore} from 'react'
export function FinanceQueryErrors(){
 const qc=useQueryClient()
 const subscribe=useCallback((listener:()=>void)=>qc.getQueryCache().subscribe(notifyManager.batchCalls(listener)),[qc])
 const snapshot=useCallback(()=>qc.getQueryCache().findAll().some(q=>q.isActive()&&q.state.status==='error'&&q.queryKey[0]!=='exchange-rates'),[qc])
 const failed=useSyncExternalStore(subscribe,snapshot,()=>false)
 if(!failed)return null
 return <div role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">Не вдалося завантажити частину фінансових даних. Підсумки можуть бути неповними. <button onClick={()=>qc.invalidateQueries()} className="font-medium underline">Повторити завантаження</button></div>
}