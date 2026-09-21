import {errorMessage} from '@/lib/errors'
import type {LedgerFilter,TransactionCursor,TransactionPage,TransactionSelection} from './repository'
import { createClient } from '@/lib/supabase/client'
import type { Repository, CreateAccountInput, UpdateAccountInput, CreateCategoryInput, CreateCategoryRuleInput, UpdateCategoryRuleInput, CreateTransactionInput, UpdateTransactionInput, TransactionFilter, SaveRecurringInput } from './repository'
import type { Account, BalanceUpdate, Category, CategoryRule, Transaction, TransactionType, Workspace, WorkspaceMember, UserProfile, UserSettings, RecurringTransaction, ExpectedTransaction } from '@/types/domain'

const camel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
const snake = (key: string) => key.replace(/[A-Z]/g, c => '_' + c.toLowerCase())
function fromRow<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map(v => fromRow(v)) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[camel(k),v])) as T
  return value as T
}
function toRow(value: object) {
  return Object.fromEntries(Object.entries(value).filter(([,v])=>v !== undefined).map(([k,v])=>[snake(k),v === '' && /(?:Date|Id)$/.test(k) ? null : v]))
}
export function financeError(error: { message?: string; code?: string } | null): never {
  throw Object.assign(new Error(errorMessage(error)), {cause:error})
}
export async function getFamilyMembership() {
  const db = createClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) throw new Error('Увійдіть, щоб відкрити свої фінанси.')
  const { data, error } = await db.from('finance_members').select('*').eq('user_id',user.id).maybeSingle()
  if (error) financeError(error)
  return data ? fromRow<WorkspaceMember>(data) : null
}
export class SupabaseRepository implements Repository {
  private db = createClient()
  private refreshJob: Promise<void> | null = null
  private async refreshPlans():Promise<void>{
    if(!this.refreshJob)this.refreshJob=(async()=>{const {error}=await this.db.rpc('finance_refresh_recurring');if(error)financeError(error)})().finally(()=>{this.refreshJob=null})
    return this.refreshJob
  }
  private async workspaceId() {
    const member = await getFamilyMembership()
    if (!member) throw new Error('Спочатку створіть сім’ю.')
    return member.workspaceId
  }
  private async list<T>(table: string, column?: string, value?: string): Promise<T[]> {
    const w = await this.workspaceId()
    const all: T[] = []
    for (let offset=0; ; offset+=500) {
      let query = this.db.from('finance_'+table).select('*').eq('workspace_id',w).order('id').range(offset,offset+499)
      if (column && value) query=query.eq(column,value)
      const { data,error }=await query
      if (error) financeError(error)
      all.push(...fromRow<T[]>(data || []))
      if (!data || data.length<500) return all
    }
  }
  private async one<T>(table: string,id: string): Promise<T | undefined> {
    const {data,error}=await this.db.from('finance_'+table).select('*').eq('workspace_id',await this.workspaceId()).eq('id',id).maybeSingle()
    if(error) financeError(error)
    return data ? fromRow<T>(data) : undefined
  }
  private async insert<T>(table:string,input:object):Promise<T> {
    const {data,error}=await this.db.from('finance_'+table).insert({...toRow(input),workspace_id:await this.workspaceId()}).select().single()
    if(error) financeError(error)
    return fromRow<T>(data)
  }
  private async update<T>(table:string,id:string,patch:object):Promise<T> {
    const {data,error}=await this.db.from('finance_'+table).update(toRow(patch)).eq('workspace_id',await this.workspaceId()).eq('id',id).select().single()
    if(error) financeError(error)
    return fromRow<T>(data)
  }
  private async remove(table:string,id:string):Promise<void> {
    const {error}=await this.db.from('finance_'+table).delete().eq('workspace_id',await this.workspaceId()).eq('id',id)
    if(error) financeError(error)
  }
  async getWorkspace():Promise<Workspace> {
    const {data,error}=await this.db.from('finance_workspaces').select('*').eq('id',await this.workspaceId()).single()
    if(error) financeError(error)
    return fromRow<Workspace>(data)
  }
  async getCurrentUser():Promise<UserProfile> {
    const {data:{user},error}=await this.db.auth.getUser()
    if(error || !user) throw new Error('Потрібно увійти.')
    return {id:user.id,email:user.email || '',fullName:user.user_metadata.full_name || 'Учасник сім’ї'}
  }
  async listMembers(){return this.list<WorkspaceMember>('members')}
  async getSettings():Promise<UserSettings> {
    const user=await this.getCurrentUser()
    const {data,error}=await this.db.from('finance_settings').select('*').eq('user_id',user.id).single()
    if(error) financeError(error)
    return fromRow<UserSettings>(data)
  }
  async updateSettings(patch:Partial<Omit<UserSettings,'userId'|'workspaceId'>>):Promise<UserSettings> {
    const user=await this.getCurrentUser()
    const {data,error}=await this.db.from('finance_settings').update(toRow(patch)).eq('user_id',user.id).select().single()
    if(error) financeError(error)
    return fromRow<UserSettings>(data)
  }
  async listAccounts(){const rows=(await this.list<Account>('accounts')).filter(a=>!a.archivedAt);const settings=await this.getSettings();return rows.map(a=>({...a,isDefault:a.id===settings.defaultAccountId}))}
  async getAccount(id:string){const a=await this.one<Account>('accounts',id);if(!a)return undefined;const settings=await this.getSettings();return {...a,isDefault:a.id===settings.defaultAccountId}}

  async createAccount(input:CreateAccountInput){
    const { currentBalance: _unused,isDefault, ...values }=input
    const account=await this.insert<Account>('accounts',values)
    if(isDefault)await this.updateSettings({defaultAccountId:account.id})
    return {...account,isDefault:!!isDefault}
  }
  async updateAccount(id:string,patch:UpdateAccountInput){
    const {currentBalance:_a,currentBalanceUpdatedAt:_b,balanceAnchorAmount:_c,balanceAnchorAt:_d,balanceAnchorDate:_e,openingBalance:_f,isDefault,...values}=patch
    const account=await this.update<Account>('accounts',id,values)
    const settings=await this.getSettings()
    if(isDefault===true)await this.updateSettings({defaultAccountId:id})
    if(isDefault===false&&settings.defaultAccountId===id)await this.updateSettings({defaultAccountId:null})
    return {...account,isDefault:isDefault??settings.defaultAccountId===id}
  }
  async archiveAccount(id:string){await this.update<Account>('accounts',id,{archivedAt:new Date().toISOString(),isDefault:false})}
  async reconcileAccount(id:string,newBalance:number,note?:string):Promise<Account>{
    const {data,error}=await this.db.rpc('finance_reconcile',{p_account:id,p_balance:newBalance,p_note:note || null})
    if(error) financeError(error)
    return fromRow<Account>(data)
  }
  async listBalanceContext(){
    const accounts=await this.list<Account>('accounts')
    const workspaceId=await this.workspaceId()
    const snapshots:Array<{accountId:string;amount:number;date:string;at:string}>=[]
    // Read only the old anchor, not notes, transaction checks or entire audit payloads.
    for(let offset=0;;offset+=500){
      const {data,error}=await this.db.from('finance_balance_history')
        .select('account_id,before_state').eq('workspace_id',workspaceId).is('undone_at',null).order('id').range(offset,offset+499)
      if(error)financeError(error)
      for(const row of data||[]){
        const before=row.before_state as {balance_anchor_at?:string;balance_anchor_date?:string;balance_anchor_amount?:number}|null
        if(before?.balance_anchor_at&&before.balance_anchor_date&&before.balance_anchor_amount!=null)
          snapshots.push({accountId:row.account_id,at:before.balance_anchor_at,date:before.balance_anchor_date,amount:Number(before.balance_anchor_amount)})
      }
      if(!data||data.length<500)break
    }
    return {accounts,snapshots}
  }
  async listBalanceHistory(id:string){return (await this.list<BalanceUpdate>('balance_history','account_id',id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
  async listCategories(){return this.list<Category>('categories')}
  async createCategory(input:CreateCategoryInput){return this.insert<Category>('categories',input)}
  async updateCategory(id:string,patch:Partial<CreateCategoryInput>){return this.update<Category>('categories',id,patch)}
  async deleteCategory(id:string){await this.remove('categories',id)}
  async listTransactionTypes(){return this.list<TransactionType>('transaction_types')}
  async listCategoryRules(){return this.list<CategoryRule>('category_rules')}
  async createCategoryRule(input:CreateCategoryRuleInput){return this.insert<CategoryRule>('category_rules',input)}
  async updateCategoryRule(id:string,patch:UpdateCategoryRuleInput){return this.update<CategoryRule>('category_rules',id,patch)}
  async deleteCategoryRule(id:string){await this.remove('category_rules',id)}
  async listTransactions(filter:TransactionFilter={}):Promise<Transaction[]>{
    await this.refreshPlans()
    return (await this.list<Transaction>('transactions')).filter(t=>
      (t.status!=='planned'||!t.recurrenceSuspended) &&
      (filter.includeDeleted || !t.deletedAt) &&
      (!filter.accountId || t.accountId===filter.accountId || t.counterAccountId===filter.accountId || t.loanAccountId===filter.accountId) &&
      (!filter.categoryId || t.categoryId===filter.categoryId) && (!filter.kind || t.kind===filter.kind) &&
      (!filter.status || t.status===filter.status) && (!filter.from || t.transactionDate>=filter.from) &&
      (!filter.to || t.transactionDate<=filter.to) &&
      (!filter.search || (t.description+' '+(t.notes || '')).toLocaleLowerCase().includes(filter.search.toLocaleLowerCase()))
    ).sort((a,b)=>b.transactionDate.localeCompare(a.transactionDate)||b.createdAt.localeCompare(a.createdAt))
  }
  async listTransactionPage(filter:LedgerFilter,cursor?:TransactionCursor,snapshot?:string):Promise<TransactionPage>{
    if(!cursor)await this.refreshPlans()
    const {data,error}=await this.db.rpc('finance_transaction_page',{p_filter:filter,p_cursor:cursor||null,p_snapshot:snapshot||null,p_limit:50})
    if(error)financeError(error)
    return {...data,items:fromRow<Transaction[]>(data.items)} as TransactionPage
  }
  async selectTransactions(filter:LedgerFilter,snapshot:string):Promise<TransactionSelection[]>{
    const {data,error}=await this.db.rpc('finance_transaction_selection',{p_filter:filter,p_snapshot:snapshot})
    if(error)financeError(error)
    return fromRow<TransactionSelection[]>(data)
  }
  async getTransaction(id:string){return this.one<Transaction>('transactions',id)}
  async createTransaction(input:CreateTransactionInput){return this.insert<Transaction>('transactions',input)}
  async bulkCreateTransactions(inputs:CreateTransactionInput[],options?:{fileName?:string;requestId?:string}):Promise<Transaction[]>{
    if(inputs.length>5000) throw new Error('Одна виписка може містити до 5000 операцій.')
    if(!inputs.length)return []
    if(inputs.some(t=>t.accountId!==inputs[0].accountId))throw new Error('Одна виписка для одного рахунку.')
    const rows=inputs.map(input=>({...toRow(input),import_key:input.importKeyOverride||JSON.stringify([input.transactionDate,input.kind,Number(input.amount).toFixed(2),input.description.trim().toLocaleLowerCase(),input.occurredAt||''])}))
    const {data,error}=await this.db.rpc('finance_import_statement',{p_account:inputs[0].accountId,p_rows:rows,p_filename:options?.fileName||'Вставлений CSV',p_request_id:options?.requestId||crypto.randomUUID()})
    if(error)financeError(error)
    return fromRow<Transaction[]>(data||[])
  }
  async updateTransaction(id:string,patch:UpdateTransactionInput){
    const {expectedUpdatedAt,confirmedFinancialEdit,...values}=patch
    const expected=expectedUpdatedAt||(await this.getTransaction(id))?.updatedAt
    const {data,error}=await this.db.rpc('finance_edit_transaction',{p_id:id,p_patch:toRow(values),p_expected:expected,p_confirm:!!confirmedFinancialEdit})
    if(error)financeError(error)
    return fromRow<Transaction>(data)
  }
  async softDeleteTransaction(id:string){await this.updateTransaction(id,{deletedAt:new Date().toISOString(),confirmedFinancialEdit:true})}
  async restoreTransaction(id:string){await this.updateTransaction(id,{deletedAt:null,confirmedFinancialEdit:true})}
  async completeTransaction(id:string){return this.updateTransaction(id,{status:'completed'})}
  async listRecurring(){return (await this.list<RecurringTransaction>('recurring')).map(r=>({...r,template:fromRow<RecurringTransaction['template']>(r.template)}))}
  async saveRecurring(input:SaveRecurringInput):Promise<RecurringTransaction>{
    const {id,expectedUpdatedAt,requestId,...values}=input
    const row=toRow(values)
    if(values.template)row.template=toRow(values.template)
    const {data,error}=await this.db.rpc('finance_save_recurring',{p_values:row,p_request_id:requestId,p_id:id||null,p_expected:expectedUpdatedAt||null})
    if(error)financeError(error)
    const result=fromRow<RecurringTransaction>(data)
    return {...result,template:fromRow<RecurringTransaction['template']>(result.template)}
  }
  async listExpected(){return this.list<ExpectedTransaction>('expected')}
  async reset():Promise<void>{throw new Error('Скидання реальних фінансів у production заборонене.')}
}
