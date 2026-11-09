'use client'
import {useEffect,useState} from 'react'
import {Button} from '@/components/ui/Button'
export function DraftStatus({draft}:{draft:{hasDraft:boolean;restored:boolean;storageError:boolean;discard:()=>void}}){
 const [confirm,setConfirm]=useState(false)
 useEffect(()=>{if(!draft.hasDraft)setConfirm(false)},[draft.hasDraft])
 if(!draft.hasDraft)return null
 return <div className="space-y-2 rounded-xl border border-glass p-3 text-sm">
 <p role={draft.storageError?'alert':'status'}>{draft.storageError?'Чернетка доступна до перезавантаження. Не закривайте вкладку, доки не збережете дані.':draft.restored?'Чернетку відновлено. Вона зберігається у цій вкладці.':'Чернетка зберігається у цій вкладці. Можна закрити форму та повернутися пізніше.'}</p>
 {confirm?<div><p>Введені дані цієї чернетки буде очищено.</p><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={()=>setConfirm(false)}>Продовжити редагування</Button><Button type="button" onClick={()=>{draft.discard();setConfirm(false)}}>Підтвердити очищення</Button></div></div>:<Button type="button" variant="ghost" onClick={()=>setConfirm(true)}>Очистити чернетку</Button>}
 </div>
}
