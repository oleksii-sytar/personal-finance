'use client'
import {useEffect,useRef} from 'react'
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query'
import {createClient} from '@/lib/supabase/client'
import {PREVIEW_NO_AUTH} from '@/lib/auth/preview'
import {decodeFinancialModel,EMPTY_FINANCIAL_MODEL} from '@/lib/data/financial-model'
import {useAccounts,useTransactions,useCategories} from './use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import type {Account,CurrencyCode,ExchangeRate,Transaction,HistoryCoverage,FinancialModelData} from '@/types/domain'
import {localDay,addDays} from '@/lib/calculations/dates'
import {SPENDING_HISTORY_DAYS} from '@/lib/calculations/history'
import {FX_STATUS,exchangeRateVersion} from '@/lib/money/fx'
import {errorMessage} from '@/lib/errors'
import type {buildForecast} from '@/lib/calculations/forecast'
const db=()=>createClient()
export function useFinancialModel(){return useQuery({queryKey:['financial-model'],queryFn:async()=>{
 if(PREVIEW_NO_AUTH){const raw=localStorage.getItem('forma-model-preview');return raw?JSON.parse(raw) as FinancialModelData:EMPTY_FINANCIAL_MODEL}
 const {data,error}=await db().rpc('finance_model_read');if(error)throw new Error(errorMessage(error));return decodeFinancialModel(data)
}})}
export function useConfirmHistory(){const qc=useQueryClient();return useMutation({mutationFn:async(input:{accountIds:string[];from:string;to:string;kind:HistoryCoverage['kind'];requestId:string})=>{
 if(PREVIEW_NO_AUTH){const current=JSON.parse(localStorage.getItem('forma-model-preview')||JSON.stringify(EMPTY_FINANCIAL_MODEL)) as FinancialModelData;for(const id of input.accountIds)if(!current.coverage.some(c=>c.id===input.requestId+id))current.coverage.push({id:input.requestId+id,workspaceId:'preview',accountId:id,fromDate:input.from,toDate:input.to,kind:input.kind,confirmedAt:new Date().toISOString(),confirmedBy:'preview'});localStorage.setItem('forma-model-preview',JSON.stringify(current));return}
 const {error}=await db().rpc('finance_confirm_history',{p_accounts:input.accountIds,p_from:input.from,p_to:input.to,p_kind:input.kind,p_request:input.requestId});if(error)throw new Error(errorMessage(error))
},onSuccess:()=>{qc.invalidateQueries({queryKey:['financial-model']});qc.invalidateQueries({queryKey:['transactions']})}})}
export function useHistoricalRates(transactions:Transaction[],currency:CurrencyCode,extraDates:string[]=[]){
 const dates=[...transactions.filter(t=>!t.deletedAt&&t.status==='completed'&&t.transactionDate<=localDay()).map(t=>t.transactionDate),...extraDates].sort(),from=dates[0],to=dates.at(-1)
 const codes=[...new Set([...transactions.filter(t=>!t.deletedAt&&t.status==='completed').map(t=>t.currency),currency])].filter(c=>c!=='UAH').sort()
 return useQuery({queryKey:['historical-rates',from,to,codes.join(',')],queryFn:async():Promise<ExchangeRate[]>=>{
  if(!from||!to||!codes.length)return []
  const r=await fetch('/api/exchange-rates/history?'+new URLSearchParams({from,to,codes:codes.join(',')}));if(!r.ok)throw new Error('Історичні курси НБУ недоступні. Статистика позначена як неповна.');return (await r.json()).rates
 },staleTime:86400000,retry:1})
}
export function useModelInputs(currencyOverride?:CurrencyCode){
 const accounts=useAccounts(),transactions=useTransactions(),categories=useCategories(),model=useFinancialModel(),{displayCurrency}=useWorkspaceContext()
 const history=(transactions.data||[]).filter(t=>t.transactionDate>=addDays(localDay(),-SPENDING_HISTORY_DAYS)&&t.transactionDate<localDay())
 const fx=useHistoricalRates(history,currencyOverride||displayCurrency)
 return {accounts:accounts.data||[],transactions:transactions.data||[],categories:categories.data||[],model:model.data||EMPTY_FINANCIAL_MODEL,options:{coverage:model.data?.coverage||[],categories:categories.data||[],rates:fx.data||[]},isLoading:accounts.isLoading||transactions.isLoading||categories.isLoading||model.isLoading||fx.isLoading,isError:accounts.isError||transactions.isError||categories.isError||model.isError,fxError:fx.isError}
}
export function useRecordForecast(result:ReturnType<typeof buildForecast>,accounts:Account[],transactions:Transaction[],currency:CurrencyCode,through:string,ready:boolean){
 const {can}=useWorkspaceContext(),qc=useQueryClient(),sent=useRef('')
 const fingerprint=JSON.stringify({fx:exchangeRateVersion(),a:accounts.map(a=>[a.id,a.ledgerVersion,a.currentBalance]),t:transactions.map(t=>[t.id,t.updatedAt]),currency,through,day:localDay(),method:result.trend.method,revision:result.trend.version,excludedCategories:result.trend.excludedCategoryIds,daily:result.trend.daily})
 useEffect(()=>{
  if(!ready||PREVIEW_NO_AUTH||FX_STATUS.source!=='nbu'||!can('transaction.create')||sent.current===fingerprint)return
  sent.current=fingerprint
  const accountVersions=Object.fromEntries(accounts.filter(a=>!a.archivedAt).map(a=>[a.id,a.ledgerVersion??0]))
  void db().rpc('finance_record_forecast',{p_currency:currency,p_through:through,p_versions:accountVersions,p_model:{version:'household-v2',revision:result.trend.version,lookback_days:SPENDING_HISTORY_DAYS,excluded_category_ids:result.trend.excludedCategoryIds,review_required:result.trend.reviewRows.map(r=>r.id),method:result.trend.method,confidence:result.trend.confidence,daily:result.trend.daily,from:result.trend.from,to:result.trend.to,transactions:Object.fromEntries(transactions.filter(t=>!t.deletedAt&&!t.recurrenceSuspended).map(t=>[t.id,t.updatedAt])),comparison:result.trend.comparison},p_points:result.forecast.points.map(p=>({date:p.date,balance:p.balance,lower:p.lower,upper:p.upper}))}).then(({error})=>{if(error){sent.current='';return}qc.invalidateQueries({queryKey:['financial-model']})})
 },[fingerprint,ready,can,qc,accounts,currency,through,result])
}
