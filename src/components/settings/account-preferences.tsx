'use client'
import {useEffect,useState} from 'react'
import {useAccounts,useMembers,useSettings,useUpdateSettings} from '@/hooks/use-finance'
import {Select} from '@/components/ui/select'
import {Checkbox} from '@/components/ui/checkbox'
import {Button} from '@/components/ui/Button'
import {useToast} from '@/components/ui/toast'
import {accountOwner} from '@/lib/money/entry'
export function AccountPreferences(){
 const {data:accounts=[]}=useAccounts(),{data:members=[]}=useMembers(),{data:settings}=useSettings(),save=useUpdateSettings(),toast=useToast()
 const [main,setMain]=useState(''),[favorites,setFavorites]=useState<string[]>([])
 useEffect(()=>{if(settings){setMain(settings.defaultAccountId||'');setFavorites(settings.favoriteAccountIds||[])}},[settings])
 return <form className="space-y-4" onSubmit={async e=>{e.preventDefault();try{await save.mutateAsync({defaultAccountId:main||null,favoriteAccountIds:favorites.filter(id=>accounts.some(a=>a.id===id))});toast.success('Ваші рахунки налаштовано')}catch(e){toast.error('Не вдалося зберегти',e)}}}>
 <p className="text-sm text-secondary">Ці налаштування діють лише для вас, на всіх ваших пристроях.</p><Select label="Мій основний рахунок" value={main} onChange={e=>setMain(e.target.value)} options={[{value:'',label:'Без основного рахунку'},...accounts.map(a=>({value:a.id,label:a.name+' · '+accountOwner(a,members)}))]}/><fieldset className="space-y-1"><legend className="mb-2 text-sm font-medium">Обрані для швидкого доступу</legend>{accounts.map(a=><Checkbox className="flex w-full" key={a.id} checked={favorites.includes(a.id)} onChange={e=>setFavorites(v=>e.target.checked?[...v,a.id]:v.filter(id=>id!==a.id))}>{a.name}<span className="block text-xs text-muted">{accountOwner(a,members)}</span></Checkbox>)}</fieldset><p className="text-xs text-muted">Основний підставляється автоматично. Обрані показуються окремими кнопками. Усі інші рахунки залишаються в загальному списку.</p><Button type="submit" disabled={!settings||save.isPending}>Зберегти мої рахунки</Button></form>
}