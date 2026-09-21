/**
 * Data-access contract for the app.
 *
 * The UI depends only on this interface, never on a concrete backend. The
 * default implementation is an in-memory + localStorage mock (so the app runs
 * with no Supabase), and a Supabase-backed implementation can be dropped in
 * later behind the same contract. This is the repository / adapter pattern.
 */

import type {
  Account,
  CategoryRule,
  AccountType,
  BalanceUpdate,
  Category,
  CategoryKind,
  CurrencyCode,
  ExpectedTransaction,
  RecurringTransaction,
  Transaction,
  TransactionKind,
  TransactionStatus,
  TransactionType,
  UserProfile,
  UserSettings,
  Workspace,
  WorkspaceMember,
} from '@/types/domain'

/** Full snapshot the mock layer persists and the Supabase layer would mirror. */
export interface Dataset {
  workspace: Workspace
  profiles: UserProfile[]
  members: WorkspaceMember[]
  accounts: Account[]
  categories: Category[]
  categoryRules: CategoryRule[]
  transactionTypes: TransactionType[]
  transactions: Transaction[]
  recurring: RecurringTransaction[]
  expected: ExpectedTransaction[]
  balanceHistory: BalanceUpdate[]
  settings: UserSettings
  currentUserId: string
}

export interface CreateAccountInput {
  isSavings?:boolean
  ownerUserId?: string | null
  isShared?: boolean

  name: string
  type: AccountType
  currency: CurrencyCode
  openingBalance: number
  currentBalance?: number
  isDefault?: boolean
  institution?: string | null
  counterparty?: string | null
  principal?: number | null
  interestRate?: number | null
  dueDate?: string | null
  creditLimit?: number | null
}

export type UpdateAccountInput = Partial<
  Omit<Account, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
>

export interface CreateTransactionInput {
  loanAccountId?:string|null
  loanInstallmentId?:string|null
  accountingClass?:'ordinary'|'principal'
  forecastBehavior?:'auto'|'scheduled'|'one_off'
  flowKey?:string|null
  planExchangeMode?: 'nbu' | 'manual' | null
  planExchangeRate?: number | null
  planExchangeDate?: string | null
  plannedTime?: string | null
  occurredAt?: string | null
  matchedTransactionId?: string | null
  matchUpdatedAt?: string | null
  importKeyOverride?: string

  accountId: string
  counterAccountId?: string | null
  counterAmount?: number | null
  categoryId?: string | null
  transactionTypeId?: string | null
  kind: TransactionKind
  amount: number
  currency: CurrencyCode
  originalAmount?: number | null
  originalCurrency?: CurrencyCode | null
  description: string
  notes?: string | null
  balanceTreatment?: 'auto' | 'new_activity'
  importAnchorAt?: string | null
  transactionDate: string
  status?: TransactionStatus
  plannedDate?: string | null
}

export type UpdateTransactionInput = Partial<
  Omit<Transaction, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>
> & { expectedUpdatedAt?: string; confirmedFinancialEdit?: boolean; forecastPlanId?:string; forecastPlanExpected?:string }

export interface TransactionFilter {
  accountId?: string
  categoryId?: string
  kind?: TransactionKind
  status?: TransactionStatus
  search?: string
  from?: string
  to?: string
  includeDeleted?: boolean
}


export interface LedgerFilter extends TransactionFilter {
  deletedOnly?: boolean
  needsReview?: boolean
  pendingAccountId?: string
  importBatchId?: string
  ids?: string[]
}
export interface TransactionCursor { date: string; created: string; id: string; order?: 'asc' | 'desc' }
export interface TransactionPage {
  items: Transaction[]
  total: number
  reviewCount: number
  snapshot: string
  nextCursor: TransactionCursor | null
}
export type TransactionSelection = Pick<Transaction, 'id' | 'updatedAt' | 'currency' | 'kind' | 'counterAccountId' | 'deletedAt'>

export interface CreateCategoryInput {
  isEssential?:boolean
  includeInDailyForecast?:boolean
  name: string
  type: CategoryKind
  color: string
  icon: string
}

export interface CreateCategoryRuleInput {
  name: string
  categoryId: string
  descriptionContains: string
  isActive?: boolean
  kind?: 'income' | 'expense' | null
  minAmount?: number | null
  maxAmount?: number | null
  accountId?: string | null
  priority?: number
}

export type UpdateCategoryRuleInput = Partial<
  Omit<CategoryRule, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
>

export interface SaveRecurringInput {
  id?: string
  expectedUpdatedAt?: string
  requestId: string
  template?: RecurringTransaction['template']
  frequency?: RecurringTransaction['frequency']
  intervalCount?: number
  startDate?: string
  endDate?: string | null
  isActive?: boolean
  sourceTransactionId?: string | null
  sourceExpectedUpdatedAt?: string | null
}

export interface BalanceSnapshot {accountId:string;amount:number;date:string;at:string}
export interface BalanceContext {accounts:Account[];snapshots:BalanceSnapshot[]}

/** The contract every backend must satisfy. */
export interface Repository {
  // Identity & tenancy
  getWorkspace(): Promise<Workspace>
  getCurrentUser(): Promise<UserProfile>
  listMembers(): Promise<WorkspaceMember[]>
  getSettings(): Promise<UserSettings>
  updateSettings(patch: Partial<Omit<UserSettings, 'userId' | 'workspaceId'>>): Promise<UserSettings>

  // Accounts
  listAccounts(): Promise<Account[]>
  listBalanceContext(): Promise<BalanceContext>
  getAccount(id: string): Promise<Account | undefined>
  createAccount(input: CreateAccountInput): Promise<Account>
  updateAccount(id: string, patch: UpdateAccountInput): Promise<Account>
  archiveAccount(id: string): Promise<void>
  /** Reconcile: set the real balance, record history. */
  reconcileAccount(id: string, newBalance: number, note?: string): Promise<Account>
  listBalanceHistory(accountId: string): Promise<BalanceUpdate[]>

  // Categories & types
  listCategories(): Promise<Category[]>
  createCategory(input: CreateCategoryInput): Promise<Category>
  updateCategory(id: string, patch: Partial<CreateCategoryInput>): Promise<Category>
  deleteCategory(id: string): Promise<void>
  listTransactionTypes(): Promise<TransactionType[]>
  listCategoryRules(): Promise<CategoryRule[]>
  createCategoryRule(input: CreateCategoryRuleInput): Promise<CategoryRule>
  updateCategoryRule(id: string, patch: UpdateCategoryRuleInput): Promise<CategoryRule>
  deleteCategoryRule(id: string): Promise<void>

  // Transactions
  listTransactions(filter?: TransactionFilter): Promise<Transaction[]>
  listTransactionPage(filter: LedgerFilter, cursor?: TransactionCursor, snapshot?: string): Promise<TransactionPage>
  selectTransactions(filter: LedgerFilter, snapshot: string): Promise<TransactionSelection[]>
  getTransaction(id: string): Promise<Transaction | undefined>
  createTransaction(input: CreateTransactionInput): Promise<Transaction>
  /** Import many transactions at once (e.g. from a bank statement). */
  bulkCreateTransactions(inputs: CreateTransactionInput[], options?: { fileName?: string; requestId?: string }): Promise<Transaction[]>
  updateTransaction(id: string, patch: UpdateTransactionInput): Promise<Transaction>
  softDeleteTransaction(id: string): Promise<void>
  restoreTransaction(id: string): Promise<void>
  completeTransaction(id: string): Promise<Transaction>

  // Planning
  listRecurring(): Promise<RecurringTransaction[]>
  saveRecurring(input: SaveRecurringInput): Promise<RecurringTransaction>
  listExpected(): Promise<ExpectedTransaction[]>

  /** Reset persisted state back to the seeded demo dataset. */
  reset(): Promise<void>
}
