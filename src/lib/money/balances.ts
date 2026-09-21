/**
 * Balance and net-worth selectors. Pure functions over domain objects.
 *
 * Conventions:
 * - Every account stores a signed `currentBalance` in its own currency:
 *   positive means own funds, negative means debt. Credit limits are not assets.
 * - Net worth = Σ asset balances − Σ liability balances, each converted to a
 *   chosen display currency. Planned transactions never affect balances.
 */

import type {
  Account,
  CurrencyCode,
  GapSeverity,
  NetWorthSummary,
  ReconciliationStatus,
  Transaction,
} from '@/types/domain'
import {pendingForAccount} from '@/lib/reconciliation/model'
import { isLiability } from '@/lib/constants/accounts'
import { convert } from '@/lib/money/fx'

/**
 * Signed effect of a completed transaction on an account's signed balance.
 * Uniform across account classes thanks to the signed convention: income adds,
 * expense subtracts, a transfer leaves the source and arrives at the target.
 * (A credit-card purchase is an expense → balance goes more negative = more
 * debt; a repayment transfers into the card → balance rises toward zero.)
 */
export function transactionEffect(txn: Transaction, account: Account): number {
  if (txn.accountId === account.id) {
    switch (txn.kind) {
      case 'income':
        return txn.amount
      case 'expense':
        return -txn.amount
      case 'transfer':
        return -txn.amount
    }
  }
  // A loan link is descriptive. Debt is confirmed separately from a bank quote.
  if (txn.counterAccountId === account.id && txn.kind === 'transfer') {
    return txn.counterAmount ?? txn.amount
  }
  return 0
}

/** Compare server timestamps without discarding PostgreSQL's sub-millisecond precision. */
const micros=(value:string)=>{
 const extra=(value.match(/\.(\d+)/)?.[1]||'').padEnd(6,'0').slice(3,6)
 return Date.parse(value)*1000+Number(extra)
}
export function isAfterBalanceAnchor(txn:Transaction,account:Account):boolean {
 if(!account.balanceAnchorAt)return true
 const posted=txn.accountId===account.id?txn.balancePostedAt:txn.counterAccountId===account.id?txn.counterBalancePostedAt:txn.loanAccountId===account.id?txn.loanBalancePostedAt:null
 return !!posted&&micros(posted)>micros(account.balanceAnchorAt)
}
/** Current snapshot plus actual movements posted after it; history is report-only. */
export function calculatedBalance(account: Account, transactions: Transaction[]): number {
  if(['bank_loan','microloan','mortgage','personal_debt'].includes(account.type))return account.currentBalance
  return transactions.reduce((sum, txn) => {
    if (txn.deletedAt) return sum
    if (txn.status !== 'completed' || !isAfterBalanceAnchor(txn,account)) return sum
    return sum + transactionEffect(txn, account)
  }, account.balanceAnchorAmount ?? account.openingBalance)
}

export function gapSeverity(gap: number, reference: number): GapSeverity {
  const abs = Math.abs(gap)
  if (abs < 0.01) return 'none'
  const base = Math.max(Math.abs(reference), 1)
  const ratio = abs / base
  if (ratio < 0.02) return 'minor'
  if (ratio < 0.1) return 'moderate'
  return 'major'
}

/** Reconciliation status: stored (real) balance vs ledger-calculated balance. */
export function reconciliationStatus(
  account: Account,
  transactions: Transaction[]
): ReconciliationStatus {
  const calculated = calculatedBalance(account, transactions)
  const gap = account.currentBalance - calculated
  const unclearedCount = transactions.filter(
    (t) => pendingForAccount(t,account.id)
  ).length
  return {
    accountId: account.id,
    currentBalance: account.currentBalance,
    calculatedBalance: calculated,
    gap,
    severity: gapSeverity(gap, account.currentBalance),
    unclearedCount,
    lastReconciledAt: account.lastReconciledAt ?? null,
  }
}

const isActive = (a: Account) => !a.archivedAt

/**
 * Net-worth roll-up across the family, in the chosen display currency.
 * Positive balances count as assets, negative as debt — so a credit card with
 * your own money on it adds to assets, while one in debt adds to liabilities.
 */
export function netWorthSummary(
  accounts: Account[],
  displayCurrency: CurrencyCode
): NetWorthSummary {
  let totalAssets = 0
  let totalLiabilities = 0
  for (const account of accounts.filter(isActive)) {
    const value = convert(account.currentBalance, account.currency, displayCurrency)
    if (value >= 0) totalAssets += value
    else totalLiabilities += -value
  }
  return {
    currency: displayCurrency,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  }
}

export interface CreditCardSummary {
  limit: number
  limitKnown: boolean
  used: number
  ownFunds: number
  /** Unused borrowing capacity only, never negative and never own money. */
  availableCredit: number
  /** Own funds plus unused borrowing capacity, never negative. */
  available: number
  /** Debt above a known limit. Remains debt, not negative spending capacity. */
  overLimit: number
  utilization: number
}

const moneyRound = (value: number) => Math.round(value * 100) / 100

export function creditCardSummary(account: Account): CreditCardSummary {
  const limitKnown = account.creditLimit != null
  const limit = Math.max(0, account.creditLimit ?? 0)
  const used = Math.max(0, -account.currentBalance)
  const ownFunds = Math.max(0, account.currentBalance)
  const availableCredit = moneyRound(Math.max(0, limit - used))
  return {
    limit,
    limitKnown,
    used,
    ownFunds,
    availableCredit,
    available: moneyRound(ownFunds + availableCredit),
    overLimit: limitKnown ? moneyRound(Math.max(0, used - limit)) : 0,
    utilization: limit > 0 ? Math.min(1, used / limit) : used > 0 ? 1 : 0,
  }
}

export interface SpendingPowerSummary {
  currency: CurrencyCode
  ownFunds: number
  availableCredit: number
  totalAvailable: number
  creditLimit: number
  creditDebt: number
  overLimit: number
  unknownLimitCount: number
}

/** Today's spending accounts only. Savings and investments remain separate. */
export function isSpendingAccount(account: Account): boolean {
  return !account.archivedAt && !account.isSavings && ['cash', 'bank_debit', 'credit_card'].includes(account.type)
}

/** Clamp capacity PER CARD before aggregation; debt still belongs in net worth. */
export function spendingPowerSummary(accounts: Account[], currency: CurrencyCode): SpendingPowerSummary {
  let ownFunds = 0, availableCredit = 0, creditLimit = 0, creditDebt = 0, overLimit = 0, unknownLimitCount = 0
  for (const account of accounts) {
    if (!isSpendingAccount(account)) continue
    const fx = (amount: number) => convert(amount, account.currency, currency)
    if (account.type === 'credit_card') {
      const card = creditCardSummary(account)
      ownFunds += fx(card.ownFunds)
      availableCredit += fx(card.availableCredit)
      creditLimit += fx(card.limit)
      creditDebt += fx(card.used)
      overLimit += fx(card.overLimit)
      if (!card.limitKnown) unknownLimitCount++
    } else {
      ownFunds += fx(Math.max(0, account.currentBalance))
    }
  }
  const own = moneyRound(ownFunds), credit = moneyRound(availableCredit)
  return {
    currency,
    ownFunds: own,
    availableCredit: credit,
    totalAvailable: moneyRound(own + credit),
    creditLimit: moneyRound(creditLimit),
    creditDebt: moneyRound(creditDebt),
    overLimit: moneyRound(overLimit),
    unknownLimitCount,
  }
}

/** Ownership is explicit: creator and shared accounts never imply personal ownership. */
export function personalSpendingAccounts(accounts:Account[],userId?:string|null):Account[]{
 return userId?accounts.filter(a=>isSpendingAccount(a)&&a.ownerUserId===userId&&!a.isShared):[]
}

export interface AccountsByClass {
  assets: Account[]
  liabilities: Account[]
}

export function groupAccountsByClass(accounts: Account[]): AccountsByClass {
  return {
    assets: accounts.filter((a) => isActive(a) && !isLiability(a.type)),
    liabilities: accounts.filter((a) => isActive(a) && isLiability(a.type)),
  }
}
