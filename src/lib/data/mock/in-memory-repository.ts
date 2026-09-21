/**
 * Seeded in-memory repository with localStorage persistence.
 *
 * This is the default backend so the whole app is interactive via `next dev`
 * with no Supabase. Mutations persist to localStorage, so a session's edits
 * survive reloads; `reset()` restores the demo seed.
 */

import type {
  Account,
  BalanceUpdate,
  Category,
  CategoryRule,
  Transaction,
  TransactionType,
  UserProfile,
  UserSettings,
  Workspace,
  WorkspaceMember,
  RecurringTransaction,
} from '@/types/domain'
import {recurrenceDates,recurrenceDate,isVisiblePlan} from '@/lib/planning/model'
import {pageTransactions,matchesLedger,hasLedgerFilters,transactionSelection,BULK_SELECTION_LIMIT} from '@/lib/data/ledger-filter'
import type {LedgerFilter,TransactionCursor,TransactionPage,TransactionSelection} from '@/lib/data/repository'
import { buildSeed } from '@/lib/data/mock/seed'
import { calculatedBalance } from '@/lib/money/balances'
import { findMatchingCategoryRule } from '@/lib/rules/category-rules'
import type {
  SaveRecurringInput,
  CreateAccountInput,
  CreateCategoryInput,
  CreateCategoryRuleInput,
  CreateTransactionInput,
  Dataset,
  Repository,
  UpdateCategoryRuleInput,
  TransactionFilter,
  UpdateAccountInput,
  UpdateTransactionInput,
} from '@/lib/data/repository'

const STORAGE_KEY = 'forma:dataset:v2'

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const clone = <T,>(value: T): T =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))

export class InMemoryRepository implements Repository {
  private data: Dataset
  private recurringRequests=new Map<string,{hash:string;result:RecurringTransaction}>()

  constructor() {
    this.data = this.load()
  }

  private load(): Dataset {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Dataset & { categoryRules?: unknown[] }
          parsed.categoryRules = Array.isArray(parsed.categoryRules) ? parsed.categoryRules : []
          return parsed
        }
      } catch {
        /* ignore corrupt storage */
      }
    }
    return buildSeed()
  }

  private persist(): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
      } catch {
        /* storage full / unavailable — keep working in memory */
      }
    }
  }

  async reset(): Promise<void> {
    this.data = buildSeed()
    this.persist()
  }

  // --- identity & tenancy -------------------------------------------------
  async getWorkspace(): Promise<Workspace> {
    return clone(this.data.workspace)
  }
  async getCurrentUser(): Promise<UserProfile> {
    const me = this.data.profiles.find((p) => p.id === this.data.currentUserId)
    return clone(me ?? this.data.profiles[0])
  }
  async listMembers(): Promise<WorkspaceMember[]> {
    return clone(this.data.members)
  }
  async getSettings(): Promise<UserSettings> {
    return clone(this.data.settings)
  }
  async updateSettings(patch: Partial<Omit<UserSettings, 'userId' | 'workspaceId'>>): Promise<UserSettings> {
    this.data.settings = { ...this.data.settings, ...patch }
    this.persist()
    return clone(this.data.settings)
  }

  // --- accounts -----------------------------------------------------------
  async listAccounts(): Promise<Account[]> {
    return clone(this.data.accounts.filter((a) => !a.archivedAt))
  }
  async getAccount(id: string): Promise<Account | undefined> {
    const a = this.data.accounts.find((x) => x.id === id)
    return a ? clone(a) : undefined
  }
  async createAccount(input: CreateAccountInput): Promise<Account> {
    const hasDefault = this.data.accounts.some((a) => a.isDefault && !a.archivedAt)
    const account: Account = {
      id: uid('acc'),
      workspaceId: this.data.workspace.id,
      name: input.name,
      ownerUserId: input.ownerUserId??null,
      isShared: input.isShared??false,
      isSavings: input.isSavings??false,
      type: input.type,
      currency: input.currency,
      openingBalance: input.openingBalance,
      currentBalance: input.currentBalance ?? input.openingBalance,
      currentBalanceUpdatedAt: now(),
      isDefault: input.isDefault ?? !hasDefault,
      institution: input.institution ?? null,
      counterparty: input.counterparty ?? null,
      principal: input.principal ?? null,
      interestRate: input.interestRate ?? null,
      dueDate: input.dueDate ?? null,
      creditLimit: input.creditLimit ?? null,
      archivedAt: null,
      createdAt: now(),
      updatedAt: now(),
    }
    this.data.accounts.push(account)
    this.persist()
    return clone(account)
  }
  async updateAccount(id: string, patch: UpdateAccountInput): Promise<Account> {
    const account = this.data.accounts.find((a) => a.id === id)
    if (!account) throw new Error("Рахунок не знайдено")
    Object.assign(account, patch, { updatedAt: now() })
    this.persist()
    return clone(account)
  }
  async archiveAccount(id: string): Promise<void> {
    const account = this.data.accounts.find((a) => a.id === id)
    if (!account) return
    account.archivedAt = now()
    account.isDefault = false
    this.persist()
  }
  async reconcileAccount(id: string, newBalance: number, note?: string): Promise<Account> {
    const account = this.data.accounts.find((a) => a.id === id)
    if (!account) throw new Error("Рахунок не знайдено")
    const old = account.currentBalance
    const entry: BalanceUpdate = {
      id: uid('bh'),
      accountId: id,
      workspaceId: this.data.workspace.id,
      oldBalance: old,
      newBalance,
      difference: newBalance - old,
      note: note ?? null,
      updatedBy: this.data.currentUserId,
      createdAt: now(),
    }
    this.data.balanceHistory.push(entry)
    account.currentBalance = newBalance
    account.currentBalanceUpdatedAt = now()
    // Clearing reconciles the account's uncleared transactions.
    for (const t of this.data.transactions) {
      if (t.accountId === id && !t.deletedAt && t.clearedStatus === 'uncleared' && t.status === 'completed') {
        t.clearedStatus = 'reconciled'
      }
    }
    this.persist()
    return clone(account)
  }
  async listBalanceContext(){
    return {accounts:clone(this.data.accounts),snapshots:this.data.balanceHistory.filter(h=>!h.undoneAt).map(h=>({accountId:h.accountId,amount:h.newBalance,date:h.createdAt.slice(0,10),at:h.createdAt}))}
  }
  async listBalanceHistory(accountId: string): Promise<BalanceUpdate[]> {
    return clone(
      this.data.balanceHistory
        .filter((b) => b.accountId === accountId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  }

  // --- categories & types -------------------------------------------------
  async listCategories(): Promise<Category[]> {
    return clone(this.data.categories)
  }
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const category: Category = {
      id: uid('cat'),
      workspaceId: this.data.workspace.id,
      isDefault: false,
      ...input,
    }
    this.data.categories.push(category)
    this.persist()
    return clone(category)
  }
  async updateCategory(id: string, patch: Partial<CreateCategoryInput>): Promise<Category> {
    const category = this.data.categories.find((c) => c.id === id)
    if (!category) throw new Error('Категорію не знайдено')
    Object.assign(category, patch)
    this.persist()
    return clone(category)
  }
  async deleteCategory(id: string): Promise<void> {
    this.data.categories = this.data.categories.filter((c) => c.id !== id)
    for (const t of this.data.transactions) if (t.categoryId === id) t.categoryId = null
    this.persist()
  }
  async listTransactionTypes(): Promise<TransactionType[]> {
    return clone(this.data.transactionTypes)
  }
  async listCategoryRules(): Promise<CategoryRule[]> {
    return clone(this.data.categoryRules.slice().sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return b.updatedAt.localeCompare(a.updatedAt)
    }))
  }
  async createCategoryRule(input: CreateCategoryRuleInput): Promise<CategoryRule> {
    if (!this.data.categories.some((c) => c.id === input.categoryId)) {
      throw new Error('Категорію не знайдено')
    }
    const nowTs = now()
    const rule: CategoryRule = {
      id: uid('rule'),
      workspaceId: this.data.workspace.id,
      name: input.name.trim(),
      descriptionContains: input.descriptionContains.trim(),
      categoryId: input.categoryId,
      isActive: input.isActive ?? true,
      kind: input.kind,
      minAmount: input.minAmount ?? null,
      maxAmount: input.maxAmount ?? null,
      accountId: input.accountId ?? null,
      priority: input.priority ?? 100,
      createdAt: nowTs,
      updatedAt: nowTs,
    }
    this.data.categoryRules.push(rule)
    this.persist()
    return clone(rule)
  }
  async updateCategoryRule(id: string, patch: UpdateCategoryRuleInput): Promise<CategoryRule> {
    const rule = this.data.categoryRules.find((r) => r.id === id)
    if (!rule) throw new Error('Правило категоризації не знайдено')
    const nextCategoryId = patch.categoryId ?? rule.categoryId
    if (!this.data.categories.some((c) => c.id === nextCategoryId)) {
      throw new Error('Категорію не знайдено')
    }
    Object.assign(rule, patch)
    if (patch.descriptionContains !== undefined) rule.descriptionContains = patch.descriptionContains.trim()
    rule.updatedAt = now()
    this.persist()
    return clone(rule)
  }
  async deleteCategoryRule(id: string): Promise<void> {
    this.data.categoryRules = this.data.categoryRules.filter((r) => r.id !== id)
    this.persist()
  }

  // --- transactions -------------------------------------------------------
  async listTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
    this.materializeRecurring()
    let rows = this.data.transactions.filter((t) => (filter.includeDeleted || !t.deletedAt)&&isVisiblePlan(t))
    if (filter.accountId) rows = rows.filter((t) => t.accountId === filter.accountId || t.counterAccountId === filter.accountId)
    if (filter.categoryId) rows = rows.filter((t) => t.categoryId === filter.categoryId)
    if (filter.kind) rows = rows.filter((t) => t.kind === filter.kind)
    if (filter.status) rows = rows.filter((t) => t.status === filter.status)
    if (filter.from) rows = rows.filter((t) => t.transactionDate >= filter.from!)
    if (filter.to) rows = rows.filter((t) => t.transactionDate <= filter.to!)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter(
        (t) => t.description.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => (b.transactionDate + b.createdAt).localeCompare(a.transactionDate + a.createdAt))
    return clone(rows)
  }
  async listTransactionPage(filter:LedgerFilter,cursor?:TransactionCursor,snapshot?:string):Promise<TransactionPage>{
    this.materializeRecurring()
    return clone(pageTransactions(this.data.transactions,filter,cursor,snapshot))
  }
  async selectTransactions(filter:LedgerFilter,snapshot:string):Promise<TransactionSelection[]>{
    if(!hasLedgerFilters(filter))throw Error('Спочатку застосуйте фільтри.')
    const rows=this.data.transactions.filter(t=>Date.parse(t.createdAt)<=Date.parse(snapshot)&&matchesLedger(t,filter))
    if(rows.length>BULK_SELECTION_LIMIT)throw Error('Уточніть фільтри: одна дія може охопити до 5000 транзакцій. Нічого не обрано.')
    return clone(rows.map(transactionSelection))
  }
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const t = this.data.transactions.find((x) => x.id === id)
    return t ? clone(t) : undefined
  }
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const status = input.status ?? (input.plannedDate && input.plannedDate > today() ? 'planned' : 'completed')
    const txn: Transaction = {
      accountingClass:input.accountingClass??'ordinary',forecastBehavior:input.forecastBehavior??'auto',flowKey:input.flowKey??null,
      id: uid('tx'),
      workspaceId: this.data.workspace.id,
      accountId: input.accountId,
      counterAccountId: input.counterAccountId ?? null,
      categoryId: input.categoryId ?? null,
      transactionTypeId: input.transactionTypeId ?? this.defaultTypeId(input.kind),
      kind: input.kind,
      amount: input.amount,
      currency: input.currency,
      planExchangeMode: input.planExchangeMode ?? null,
      planExchangeRate: input.planExchangeRate ?? null,
      planExchangeDate: input.planExchangeDate ?? null,
      plannedTime: input.plannedTime ?? null,
      originalAmount: input.originalAmount ?? null,
      originalCurrency: input.originalCurrency ?? null,
      description: input.description,
      notes: input.notes ?? null,
      transactionDate: input.transactionDate,
      status,
      plannedDate: status === 'planned' ? input.plannedDate ?? input.transactionDate : null,
      completedAt: status === 'completed' ? now() : null,
      clearedStatus: 'uncleared',
      isExpected: false,
      recurringTransactionId: null,
      createdBy: this.data.currentUserId,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    }
    this.applyCategoryRule(txn)
    this.data.transactions.push(txn)
    this.persist()
    return clone(txn)
  }
  async bulkCreateTransactions(inputs: CreateTransactionInput[]): Promise<Transaction[]> {
    const created: Transaction[] = []
    for (const input of inputs) created.push(await this.createTransaction(input))
    return created
  }
  async updateTransaction(id: string, patch: UpdateTransactionInput): Promise<Transaction> {
    const txn = this.data.transactions.find((t) => t.id === id)
    if (!txn) throw new Error('Операцію не знайдено')
    const explicitCategory = Object.prototype.hasOwnProperty.call(patch, 'categoryId')
    if(txn.recurringTransactionId)txn.recurrenceOverride=true
    Object.assign(txn, patch, { updatedAt: now() })
    if (!explicitCategory) this.applyCategoryRule(txn)
    this.persist()
    return clone(txn)
  }
  async softDeleteTransaction(id: string): Promise<void> {
    const txn = this.data.transactions.find((t) => t.id === id)
    if (!txn) return
    txn.deletedAt = now()
    this.persist()
  }
  async restoreTransaction(id: string): Promise<void> {
    const txn = this.data.transactions.find((t) => t.id === id)
    if (!txn) return
    txn.deletedAt = null
    this.persist()
  }
  async completeTransaction(id: string): Promise<Transaction> {
    const txn = this.data.transactions.find((t) => t.id === id)
    if (!txn) throw new Error('Операцію не знайдено')
    txn.status = 'completed'
    txn.completedAt = now()
    txn.plannedDate = null
    txn.updatedAt = now()
    this.persist()
    return clone(txn)
  }

  // --- planning -----------------------------------------------------------
  async saveRecurring(input:SaveRecurringInput):Promise<RecurringTransaction>{
    const hash=JSON.stringify(input),previous=this.recurringRequests.get(input.requestId)
    if(previous){if(previous.hash!==hash)throw Error('Ключ запиту вже використано');return clone(previous.result)}
    const old=input.id?this.data.recurring.find(r=>r.id===input.id):undefined
    if(input.id&&!old)throw Error('Повторення не знайдено')
    if(old&&old.updatedAt!==input.expectedUpdatedAt)throw Error('Повторення вже змінено')
    const source=input.sourceTransactionId?this.data.transactions.find(t=>t.id===input.sourceTransactionId):undefined
    if(input.sourceTransactionId&&(!source||source.updatedAt!==input.sourceExpectedUpdatedAt))throw Error('Початкова операція змінилася')
    if(!old&&input.sourceTransactionId&&this.data.recurring.some(r=>r.sourceTransactionId===input.sourceTransactionId))throw Error('Повторення для цієї операції вже існує')
    const series={...old,id:old?.id||uid('rec'),workspaceId:this.data.workspace.id,template:input.template||old?.template,frequency:input.frequency||old?.frequency,intervalCount:input.intervalCount??old?.intervalCount??1,startDate:input.startDate||old?.startDate,endDate:input.endDate===undefined?old?.endDate:input.endDate,isActive:input.isActive??old?.isActive??true,createdBy:old?.createdBy||this.data.currentUserId,createdAt:old?.createdAt||now(),updatedAt:now(),sourceTransactionId:old?.sourceTransactionId||input.sourceTransactionId||null,nextDueDate:input.startDate||old?.nextDueDate} as RecurringTransaction
    if(!series.template||!series.startDate||!series.frequency||series.template.kind==='transfer')throw Error('Заповніть повторення')
    recurrenceDate(series.startDate,series.frequency,series.intervalCount,0)
    if(!old)this.data.recurring.push(series);else Object.assign(old,series)
    if(source?.status==='planned'&&source.transactionDate===series.startDate){source.recurringTransactionId=series.id;source.recurrenceDate=series.startDate}
    this.materializeRecurring(series.id)
    this.recurringRequests.set(input.requestId,{hash,result:clone(series)})
    this.persist()
    return clone(series)
  }
  private materializeRecurring(forceId?:string):void{
    const from=today(),through=recurrenceDate(from,'yearly',1,1)
    for(const series of this.data.recurring.filter(r=>!!r.createdBy)){
      if(series.id===forceId)for(const t of this.data.transactions)if(t.recurringTransactionId===series.id&&t.status==='planned'&&t.transactionDate>=from&&!t.deletedAt)t.recurrenceSuspended=true
      if(!series.isActive)continue
      for(const date of recurrenceDates(series,from,through)){
        const existing=this.data.transactions.find(t=>t.recurringTransactionId===series.id&&t.recurrenceDate===date)
        if(existing){
          if(forceId===series.id&&existing.status==='planned'&&!existing.deletedAt){if(!existing.recurrenceOverride)Object.assign(existing,series.template,{transactionDate:date,plannedDate:date});existing.recurrenceSuspended=false}
          continue
        }
        this.data.transactions.push({...series.template,id:uid('tx'),workspaceId:series.workspaceId,transactionDate:date,plannedDate:date,status:'planned',clearedStatus:'uncleared',isExpected:true,recurringTransactionId:series.id,recurrenceDate:date,recurrenceOverride:false,recurrenceSuspended:false,createdBy:series.createdBy!,createdAt:now(),updatedAt:now(),deletedAt:null})
      }
      series.generatedThrough=through
    }
    this.persist()
  }
  async listRecurring() {
    return clone(this.data.recurring)
  }
  async listExpected() {
    return clone(this.data.expected)
  }

  private defaultTypeId(kind: Transaction['kind']): string {
    const family = kind === 'income' ? 'income' : 'expense'
    const t = this.data.transactionTypes.find((x) => x.family === family && x.isDefault)
    return t?.id ?? this.data.transactionTypes[0]?.id ?? ''
  }

  private applyCategoryRule(transaction: Transaction): void {
    if (transaction.kind === 'transfer' || transaction.categoryId) return
    const match = findMatchingCategoryRule(this.data.categoryRules, {
      description: transaction.description,
      notes: transaction.notes,
      accountId: transaction.accountId,
      kind: transaction.kind,
      amount: transaction.amount,
    })
    if (!match) return
    const exists = this.data.categories.find((c) => c.id === match.categoryId)
    if (exists) transaction.categoryId = match.categoryId
  }

  /** Exposed for tests / debugging. */
  recalculateBalances(): void {
    for (const a of this.data.accounts) {
      a.currentBalance = calculatedBalance(a, this.data.transactions)
    }
    this.persist()
  }
}