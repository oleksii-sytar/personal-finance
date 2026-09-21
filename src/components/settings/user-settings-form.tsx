'use client'
import {useEffect,useState} from 'react'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/select'
import {Button} from '@/components/ui/Button'
import {useToast} from '@/components/ui/toast'
import {useSettings,useUpdateSettings} from '@/hooks/use-finance'
import {SpendingExplanation} from '@/components/dashboard/spending-explanation'
import {automaticSpending,safetyReserve} from '@/lib/calculations/liquidity'
import {reserveTarget} from '@/lib/calculations/spending-model'
import {useModelInputs} from '@/hooks/use-financial-model'
import {formatMoney} from '@/lib/money/format'
import {userSettingsSchema} from '@/lib/validations/finance'
import {SUPPORTED_CURRENCIES} from '@/lib/constants/currencies'
import type {CurrencyCode} from '@/types/domain'
export function UserSettingsForm(){
 const {data:settings}=useSettings()
 const update=useUpdateSettings(),toast=useToast()
 const [currency,setCurrency]=useState<CurrencyCode>('UAH'),[days,setDays]=useState('7'),[error,setError]=useState('')
 const inputs=useModelInputs(currency)
 useEffect(()=>{if(settings){setCurrency(settings.displayCurrency);setDays(String(settings.safetyBufferDays))}},[settings])
 const reserve=reserveTarget(inputs.accounts,inputs.transactions,currency,Number(days)||7,new Date(),inputs.options),trend=reserve.trend
 async function submit(e:React.FormEvent){e.preventDefault();setError('');const parsed=userSettingsSchema.safeParse({displayCurrency:currency,safetyBufferDays:days});if(!parsed.success){setError(parsed.error.issues[0].message);return}try{await update.mutateAsync(parsed.data);toast.success('Налаштування збережено')}catch(e){setError(e instanceof Error?e.message:'Не вдалося зберегти')}}
 return <form onSubmit={submit} className="settings-form space-y-4"><Select label="Валюта відображення" value={currency} onChange={e=>setCurrency(e.target.value as CurrencyCode)} options={SUPPORTED_CURRENCIES.map(c=>({value:c.code,label:c.name+' ('+c.symbol+')'}))}/>
 <Input label="Фінансовий запас (днів)" type="number" min={1} max={365} step={1} value={days} onChange={e=>setDays(e.target.value)} required/>
 {inputs.isLoading?<p role="status">Рахуємо запас…</p>:inputs.isError?<p role="alert">Не вдалося завантажити дані для запасу.</p>:<ReservePreview trend={trend} currency={currency} days={Number(days)} reserve={reserve.amount}/>} 
 {error&&<p role="alert" className="text-sm text-[var(--accent-error)]">{error}</p>}<Button className="settings-save-button" type="submit" disabled={update.isPending||!settings}>{update.isPending?'Зберігаємо…':'Зберегти налаштування'}</Button></form>
}


export function ReservePreview({trend,currency,days,reserve}:{trend:ReturnType<typeof automaticSpending>;currency:CurrencyCode;days:number;reserve?:number|null}){
 const validDays=Number.isInteger(days)&&days>=1&&days<=365,available=trend.canEstimate,amount=reserve===undefined?safetyReserve(trend.essentialDaily??trend.daily,days):reserve
 return <section className="reserve-preview" aria-label="Оцінка фінансового запасу"><span className={'reserve-state '+(available?'reserve-state--ready':'')}>{trend.confidence==='history'?'За підтвердженою історією':available?'Попередня оцінка':'Лише відомі плани'}</span>
 {available?<><dl><div><dt>Оцінка базових потреб / день</dt><dd>{formatMoney(trend.essentialDaily??trend.daily,currency)}</dd></div><div><dt>Орієнтир резерву на {days} дн.</dt><dd>{!validDays?'Вкажіть 1–365 днів':amount===null?'Потребує даних':formatMoney(amount,currency)}</dd></div></dl><p>Це цільова сума запасу, не залишок на рахунках. Враховано вибрані базові категорії; сьогодні лише плани, щоденні потреби відзавтра.</p></>:<p>Оберіть кількість днів зараз. Оцінка з’явиться після внесення історії хоча б за завершені дні.</p>}
 <details><summary>На чому ґрунтується оцінка</summary><SpendingExplanation trend={trend} currency={currency}/></details></section>
}