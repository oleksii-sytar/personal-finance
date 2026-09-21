import {createClient} from '@/lib/supabase/client'
import {financeError,getFamilyMembership} from './supabase-repository'
export interface ImportBatch {id:string;account_id:string;file_name:string;row_count:number;skipped_count:number;created_at:string;recovered:boolean}
export interface BulkEvent {id:string;action:'move'|'delete'|'restore'|'categorize';account_id:string|null;category_id:string|null;transaction_ids:string[];created_at:string}
export async function listImportRecords<T>(table:'import_batches'|'bulk_history'):Promise<T[]>{
 const member=await getFamilyMembership()
 if(!member)throw new Error('Потрібне членство в сім’ї.')
 const all:T[]=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await createClient().from('finance_'+table).select(table==='bulk_history'?'id,action,account_id,category_id,transaction_ids,created_at':'*').eq('workspace_id',member.workspaceId).order('created_at',{ascending:false}).order('id').range(offset,offset+499)
  if(error)financeError(error)
  all.push(...(data||[]) as T[])
  if(!data||data.length<500)return all
 }
}
export async function bulkTransactions(input:{ids:string[];action:'move'|'delete'|'restore'|'categorize';accountId?:string;categoryId?:string;versions:Record<string,string>}):Promise<number>{
 const {data,error}=await createClient().rpc('finance_bulk_safe',{p_ids:input.ids,p_action:input.action,p_account:input.accountId||null,p_category:input.categoryId||null,p_versions:input.versions})
 if(error)financeError(error)
 return Number(data)
}