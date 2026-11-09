'use client'
import {useMemo} from 'react'
import {useModelInputs} from './use-financial-model'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {automaticSpending} from '@/lib/calculations/spending-model'
import {spendingMembership} from '@/lib/calculations/spending-membership'
import {localDay} from '@/lib/calculations/dates'

export function useDailySpending(purpose:'forecast'|'reserve'='forecast'){
 const inputs=useModelInputs(),{displayCurrency,fxVersion}=useWorkspaceContext(),day=localDay()
 const trend=useMemo(()=>{/* Selectors read the shared FX store; its revision invalidates this calculation. */void fxVersion;return automaticSpending(inputs.accounts,inputs.transactions,displayCurrency,day,new Date(),{...inputs.options,purpose})},
 [inputs.accounts,inputs.transactions,inputs.options,displayCurrency,fxVersion,day,purpose])
 const statuses=useMemo(()=>spendingMembership(inputs.transactions,inputs.accounts,trend),[inputs.transactions,inputs.accounts,trend])
 return {...inputs,trend,statuses,currency:displayCurrency}
}
