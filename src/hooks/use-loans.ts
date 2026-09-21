'use client'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {createClient} from '@/lib/supabase/client'
import {getFamilyMembership,financeError} from '@/lib/data/supabase-repository'
import type {LoanProfile,LoanInstallment} from '@/lib/loans/model'
async function load(){const member=await getFamilyMembership();if(!member)throw new Error('Увійдіть у сімейний простір');const db=createClient();const profiles=await db.from('finance_loans').select('*').eq('workspace_id',member.workspaceId);if(profiles.error)financeError(profiles.error);const rows:LoanInstallment[]=[];for(let offset=0;;offset+=500){const result=await db.from('finance_loan_installments').select('*').eq('workspace_id',member.workspaceId).order('id').range(offset,offset+499);if(result.error)financeError(result.error);rows.push(...result.data as LoanInstallment[]);if(result.data.length<500)break}return {profiles:profiles.data as LoanProfile[],rows}}
export const useLoanData=()=>useQuery({queryKey:['loans'],queryFn:load})
export function useFinanceAction(){const qc=useQueryClient();return useMutation({mutationFn:async({name,args}:{name:string;args:Record<string,unknown>})=>{const {data,error}=await createClient().rpc(name,args);if(error)financeError(error);return data},onSuccess:()=>{for(const key of ['loans','transactions','accounts','settings','importBatches','resolutionHistory','categories','categoryRules','balanceHistory','bulkHistory'])qc.invalidateQueries({queryKey:[key]})}})}

