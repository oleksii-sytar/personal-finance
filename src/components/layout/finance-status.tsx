'use client'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {useEffect} from 'react'
import {usePathname} from 'next/navigation'
import {UAH_RATES,setExchangeRates} from '@/lib/money/fx'
import {PREVIEW_NO_AUTH} from '@/lib/auth/preview'
import {Button} from '@/components/ui/Button'
export function FinanceStatus({children}:{children:React.ReactNode}){
  const qc=useQueryClient(),pathname=usePathname()
  const fx=useQuery({queryKey:['exchange-rates'],queryFn:async()=>{const r=await fetch('/api/exchange-rates');if(!r.ok)throw new Error('Курси НБУ недоступні');return r.json() as Promise<{rates:typeof UAH_RATES;date:string}>},staleTime:3600000,retry:1,enabled:!PREVIEW_NO_AUTH})
  useEffect(()=>{
    if(fx.data){setExchangeRates(fx.data.rates,fx.data.date);qc.invalidateQueries({predicate:q=>q.queryKey[0]!=='exchange-rates'})}
  },[fx.data,qc])
  useEffect(()=>{
    if(PREVIEW_NO_AUTH)return
    const interval=setInterval(()=>qc.invalidateQueries({predicate:q=>q.queryKey[0]!=='exchange-rates'}),30000)
    return()=>clearInterval(interval)
  },[qc])
  if(PREVIEW_NO_AUTH)return <><aside className="mb-6 rounded-xl border border-[var(--border-accent)] p-4 text-sm">Локальна демонстрація. Ці дані не зберігаються у сімейній базі.</aside>{children}</>
  if(pathname!=='/settings')return <>{fx.isError&&<p role="alert" className="mb-3 text-xs text-[var(--accent-warning)]">Курси НБУ недоступні. Валютні підсумки орієнтовні.</p>}{children}</>
  return <><div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>Особиста сімейна база · синхронізація між пристроями</span><span>{fx.data?'Курси НБУ на '+fx.data.date:fx.isLoading?'Завантажуємо курси НБУ…':'Курси НБУ недоступні: валютні підсумки орієнтовні'}</span><Button variant="ghost" size="sm" onClick={()=>qc.invalidateQueries()}>Оновити дані</Button></div>{children}</>
}