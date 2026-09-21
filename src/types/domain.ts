/**
 * Forma domain model.
 *
 * The family (workspace) is the core unit. Members hold accounts that are
 * either assets or liabilities; transactions move money; reconciliation keeps
 * the books matching reality. See docs/01-architecture/data-model.md.
 */

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/** Transactional currencies. UAH is the primary/base currency for Ukraine. */
export type CurrencyCode = 'UAH' | 'USD' | 'EUR' | 'GBP' | 'PLN'

// ---------------------------------------------------------------------------
// Identity & tenancy
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string
  fullName: string
  email: string
  avatarUrl?: string | null
}

export interface Workspace {
  id: string
  name: string
  /** Base currency for family roll-ups. */
  currency: CurrencyCode
  ownerId: string
  createdAt: string
}

/**
 * Roles, from most to least privileged.
 * - `owner`   — creator; full control incl. members/billing.
 * - `manager` — the "Financial Manager": accounts, import, reconciliation.
 * - `member`  — Contributor: logs their own spending, reads dashboards.
 * - `viewer`  — read-only.
 */
export type WorkspaceRole = 'owner' | 'manager' | 'member' | 'viewer'

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  /** Denormalised for display convenience in the mock layer. */
  displayName: string
  email: string
  avatarUrl?: string | null
  joinedAt: string
}

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  invitedBy: string
  token: string
  expiresAt: string
  acceptedAt?: string | null
  createdAt: string
}

export interface UserSettings {
  userId: string
  workspaceId: string
  /** Currency each member prefers to *read* totals in. Display-only. */
  displayCurrency: CurrencyCode
  /** Legacy stored value; UI uses an automatically calculated reserve instead. */
  minimumSafeBalance: number
  /** Days of buffer to keep ahead of planned outflows (1–365). */
  safetyBufferDays: number
  defaultAccountId?: string | null
  favoriteAccountIds?: string[]
  importReminderEnabled?: boolean
  importReminderWeekday?: number
  importReminderDismissed?: boolean
}

// ---------------------------------------------------------------------------
// Accounts (expanded Ukrainian taxonomy)
// ---------------------------------------------------------------------------

export type AccountClass = 'asset' | 'liability'

export type AssetAccountType =
  | 'cash'
  | 'bank_debit'
  | 'savings'
  | 'crypto'
  | 'investment'
  | 'receivable'

export type LiabilityAccountType =
  | 'credit_card'
  | 'bank_loan'
  | 'microloan'
  | 'personal_debt'
  | 'mortgage'

export type AccountType = AssetAccountType | LiabilityAccountType

export interface Account {
  /** Explicitly earmarked savings, excluded from everyday spending capacity. */
  isSavings?: boolean
  ledgerVersion?: number
  lastReconciledAt?: string | null
  lastReconciliationId?: string | null
  ownerUserId?: string | null
  isShared?: boolean
  createdBy?: string

  id: string
  workspaceId: string
  name: string
  type: AccountType
  currency: CurrencyCode
  /**
   * Signed balance in the account's currency. Assets are positive; liabilities
   * are negative (what you owe). A credit card is negative when in debt and
   * positive when you've parked your own money on top of the limit.
   */
  balanceAnchorAmount?: number
  balanceAnchorAt?: string | null
  balanceAnchorDate?: string | null
  openingBalance: number
  /** User-managed "real" balance, reconciled against the calculated one. */
  currentBalance: number
  currentBalanceUpdatedAt?: string | null
  isDefault: boolean
  institution?: string | null
  /** For personal debts / receivables: who the money is owed to / by. */
  counterparty?: string | null
  /** For loans: original principal. */
  principal?: number | null
  interestRate?: number | null
  dueDate?: string | null
  /** Credit limit for credit cards (and other revolving credit). */
  creditLimit?: number | null
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Categories & transaction types
// ---------------------------------------------------------------------------

export type CategoryKind = 'income' | 'expense'

export interface Category {
  /** Basic needs included in the reserve target, editable without renaming categories. */
  isEssential?: boolean
  includeInDailyForecast?: boolean
  id: string
  workspaceId: string
  name: string
  color: string
  icon: string
  type: CategoryKind
  isDefault: boolean
}

export interface CategoryRule {
  id: string
  workspaceId: string
  name: string
  /** Semicolon/comma separated keywords and vendor aliases to match in transaction description. */
  descriptionContains: string
  categoryId: string
  isActive: boolean
  /** Limit the rule to one side of transactions (income/expense). */
  kind?: 'income' | 'expense'
  /** Optional minimum amount in transaction currency after converting manually if needed. */
  minAmount?: number | null
  /** Optional maximum amount in transaction currency after converting manually if needed. */
  maxAmount?: number | null
  /** Optional account scope. If set, the rule only applies to this source account. */
  accountId?: string | null
  /** Smaller = higher priority when multiple rules match. */
  priority: number
  createdAt: string
  updatedAt: string
}

export type TransactionFamily = 'income' | 'expense'

export interface TransactionType {
  id: string
  workspaceId: string
  name: string
  family: TransactionFamily
  isSystem: boolean
  isDefault: boolean
}

// ---------------------------------------------------------------------------
// Transactions & planning
// ---------------------------------------------------------------------------

export type TransactionKind = 'income' | 'expense' | 'transfer'
export type TransactionStatus = 'completed' | 'planned'
/** Reconciliation lifecycle, distinct from completed/planned. */
export type ClearedStatus = 'uncleared' | 'cleared' | 'reconciled'

export interface Transaction {
  accountingClass?: 'ordinary' | 'principal'
  forecastBehavior?: 'auto' | 'scheduled' | 'one_off'
  /** User-defined flow identity; never used to merge or delete ledger entries. */
  flowKey?: string | null
  planExchangeMode?: 'nbu' | 'manual' | null
  planExchangeRate?: number | null
  planExchangeDate?: string | null
  plannedTime?: string | null
  recurrenceDate?: string | null
  recurrenceOverride?: boolean
  recurrenceSuspended?: boolean
  reviewRequired?: boolean | null
  accountVerifiedAt?: string | null
  counterVerifiedAt?: string | null
  loanVerifiedAt?: string | null
  counterImportKey?: string | null
  counterImportBatchId?: string | null
  occurredAt?: string | null
  loanAccountId?: string | null
  loanBasis?: 'confirmed' | 'estimated' | 'obligation' | 'unknown' | null
  loanPrincipal?: number
  loanComponents?: { interest?: number | null; fees?: number | null; insurance?: number | null; other?: number | null } | null
  loanInstallmentId?: string | null
  loanBalancePostedAt?: string | null

  id: string
  workspaceId: string
  accountId: string
  /** Destination account for `transfer` (e.g. cash → debt repayment). */
  counterAccountId?: string | null
  /** Actual received amount in the destination account currency. */
  counterAmount?: number | null
  categoryId?: string | null
  transactionTypeId?: string | null
  kind: TransactionKind
  /** Amount in the account currency, always positive. Foreign plans also keep their original amount. */
  amount: number
  currency: CurrencyCode
  /** As originally entered, before conversion. */
  originalAmount?: number | null
  originalCurrency?: CurrencyCode | null
  description: string
  notes?: string | null
  importBatchId?: string | null
  importKey?: string | null
  balancePostedAt?: string | null
  counterBalancePostedAt?: string | null
  balanceTreatment?: 'auto' | 'new_activity'
  transactionDate: string
  status: TransactionStatus
  plannedDate?: string | null
  completedAt?: string | null
  clearedStatus: ClearedStatus
  isExpected?: boolean
  recurringTransactionId?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  createdBy?: string | null
  createdAt?: string
  updatedAt?: string
  sourceTransactionId?: string | null
  generatedThrough?: string | null
  id: string
  workspaceId: string
  /** Partial transaction used to materialise expectations. */
  template: Pick<
    Transaction,
    'accountId' | 'categoryId' | 'transactionTypeId' | 'kind' | 'amount' | 'currency' | 'description'
  > & Partial<Pick<Transaction, 'notes' | 'originalAmount' | 'originalCurrency' | 'planExchangeMode' | 'planExchangeRate' | 'planExchangeDate' | 'plannedTime' | 'accountingClass' | 'forecastBehavior' | 'flowKey' | 'loanAccountId'>>
  frequency: RecurringFrequency
  intervalCount: number
  startDate: string
  endDate?: string | null
  nextDueDate: string
  isActive: boolean
}

export type ExpectedStatus = 'pending' | 'confirmed' | 'skipped'

export interface ExpectedTransaction {
  id: string
  workspaceId: string
  recurringTransactionId: string
  expectedDate: string
  expectedAmount: number
  currency: CurrencyCode
  status: ExpectedStatus
  actualTransactionId?: string | null
}

// ---------------------------------------------------------------------------
// Reconciliation & balance history
// ---------------------------------------------------------------------------

export interface BalanceUpdate {
  undoneAt?: string | null
  afterVersion?: number | null
  id: string
  accountId: string
  workspaceId: string
  oldBalance: number
  newBalance: number
  difference: number
  note?: string | null
  updatedBy: string
  createdAt: string
}

export type GapSeverity = 'none' | 'minor' | 'moderate' | 'major'

/** Derived, not stored: how a stored balance compares to the calculated one. */
export interface ReconciliationStatus {
  accountId: string
  currentBalance: number
  calculatedBalance: number
  gap: number
  severity: GapSeverity
  unclearedCount: number
  lastReconciledAt?: string | null
}

// ---------------------------------------------------------------------------
// Exchange rates (FX cache; rate is value of 1 unit in UAH)
// ---------------------------------------------------------------------------

export interface ExchangeRate {
  currency: CurrencyCode
  date: string
  /** Value of one unit of `currency` expressed in UAH. */
  rate: number
}

// ---------------------------------------------------------------------------
// Derived roll-ups (computed via selectors, never stored)
// ---------------------------------------------------------------------------

export interface NetWorthSummary {
  /** All amounts expressed in the requested display currency. */
  currency: CurrencyCode
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

export interface HistoryCoverage {
 id:string;workspaceId:string;accountId:string;fromDate:string;toDate:string;
 kind:'complete'|'no_activity'|'not_open';confirmedAt:string;confirmedBy:string;invalidatedAt?:string|null
}
export interface PositionSnapshot {id:string;workspaceId:string;date:string;recordedAt:string;accounts:Account[]}
export interface ForecastSnapshot {
 id:string;workspaceId:string;asOf:string;through:string;currency:CurrencyCode;createdAt:string;
 model:Record<string,unknown>;points:Array<{date:string;balance:number;lower?:number;upper?:number}>;
}
export interface FinancialModelData {coverage:HistoryCoverage[];positions:PositionSnapshot[];forecasts:ForecastSnapshot[]}
