/**
 * Seeded demo dataset: the Kovalenko family. Realistic Ukrainian household
 * money — cash, a mono debit card, USD savings, crypto, investments, a
 * receivable, plus a credit card, microloan and a personal debt to a relative.
 *
 * Account `currentBalance` is derived from the ledger so the reconciliation
 * view is honest; one account (cash) is nudged to leave a small gap to
 * demonstrate the reconcile flow.
 */

import type {
  Account,
  Category,
  CategoryRule,
  ExpectedTransaction,
  RecurringTransaction,
  Transaction,
  TransactionType,
  UserProfile,
  UserSettings,
  Workspace,
  WorkspaceMember,
} from '@/types/domain'
import { calculatedBalance } from '@/lib/money/balances'
import type { Dataset } from '@/lib/data/repository'

const WS = 'ws_kovalenko'
const U_OWNER = 'u_oleksandr'
const U_MEMBER = 'u_maria'
const U_VIEWER = 'u_sofia'

function isoDate(offsetDays: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
function isoStamp(offsetDays: number): string {
  const d = new Date()
  d.setHours(10, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

export function buildSeed(): Dataset {
  const workspace: Workspace = {
    id: WS,
    name: 'Родина Коваленко',
    currency: 'UAH',
    ownerId: U_OWNER,
    createdAt: isoStamp(-120),
  }

  const profiles: UserProfile[] = [
    { id: U_OWNER, fullName: 'Олександр Коваленко', email: 'oleksandr@kovalenko.family' },
    { id: U_MEMBER, fullName: 'Марія Коваленко', email: 'maria@kovalenko.family' },
    { id: U_VIEWER, fullName: 'Софія Коваленко', email: 'sofia@kovalenko.family' },
  ]

  const members: WorkspaceMember[] = [
    { id: 'm_owner', workspaceId: WS, userId: U_OWNER, role: 'owner', displayName: 'Олександр', email: profiles[0].email, joinedAt: isoStamp(-120) },
    { id: 'm_maria', workspaceId: WS, userId: U_MEMBER, role: 'member', displayName: 'Марія', email: profiles[1].email, joinedAt: isoStamp(-95) },
    { id: 'm_sofia', workspaceId: WS, userId: U_VIEWER, role: 'viewer', displayName: 'Софія', email: profiles[2].email, joinedAt: isoStamp(-40) },
  ]

  const baseAccount = (over: Partial<Account> & Pick<Account, 'id' | 'name' | 'type' | 'currency' | 'openingBalance'>): Account => ({
    workspaceId: WS,
    currentBalance: over.openingBalance,
    currentBalanceUpdatedAt: isoStamp(-3),
    isDefault: false,
    institution: null,
    counterparty: null,
    principal: null,
    interestRate: null,
    dueDate: null,
    archivedAt: null,
    createdAt: isoStamp(-120),
    updatedAt: isoStamp(-3),
    ...over,
  })

  const accounts: Account[] = [
    baseAccount({ id: 'acc_cash', name: 'Готівка', type: 'cash', currency: 'UAH', openingBalance: 5000, isDefault: true }),
    baseAccount({ id: 'acc_mono', name: 'monobank', type: 'bank_debit', currency: 'UAH', openingBalance: 20000, institution: 'Universal Bank' }),
    baseAccount({ id: 'acc_savings', name: 'USD заощадження', type: 'savings', currency: 'USD', openingBalance: 1200, institution: 'PrivatBank' }),
    baseAccount({ id: 'acc_crypto', name: 'Crypto-картка', type: 'crypto', currency: 'UAH', openingBalance: 15000 }),
    baseAccount({ id: 'acc_invest', name: 'Інвестиції', type: 'investment', currency: 'UAH', openingBalance: 40000 }),
    baseAccount({ id: 'acc_recv', name: 'Борг від Андрія', type: 'receivable', currency: 'UAH', openingBalance: 5000, counterparty: 'Андрій (друг)' }),
    baseAccount({ id: 'acc_credit', name: 'Кредитна картка', type: 'credit_card', currency: 'UAH', openingBalance: -8000, institution: 'monobank', interestRate: 3.2, creditLimit: 50000 }),
    baseAccount({ id: 'acc_micro', name: 'Мікрокредит', type: 'microloan', currency: 'UAH', openingBalance: -5000, interestRate: 12, dueDate: isoDate(40) }),
    baseAccount({ id: 'acc_debt', name: 'Борг братові', type: 'personal_debt', currency: 'UAH', openingBalance: -20000, counterparty: 'Брат Ігор', principal: 25000 }),
  ]

  const cat = (id: string, name: string, type: Category['type'], color: string, icon: string, isDefault = false): Category => ({ id, workspaceId: WS, name, type, color, icon, isDefault })
  const categories: Category[] = [
    cat('cat_salary', 'Зарплата', 'income', '#4E7A58', 'briefcase', true),
    cat('cat_freelance', 'Фриланс', 'income', '#8B7355', 'laptop'),
    cat('cat_gift', 'Подарунки', 'income', '#E6A65D', 'gift'),
    cat('cat_groceries', 'Продукти', 'expense', '#E6A65D', 'shopping-cart', true),
    cat('cat_dining', 'Кафе та ресторани', 'expense', '#D97706', 'utensils'),
    cat('cat_transport', 'Транспорт', 'expense', '#8B7355', 'car'),
    cat('cat_utilities', 'Комуналка', 'expense', '#5C3A21', 'plug'),
    cat('cat_kids', 'Діти', 'expense', '#4E7A58', 'baby'),
    cat('cat_health', "Здоров'я", 'expense', '#EF4444', 'heart-pulse'),
    cat('cat_fun', 'Розваги', 'expense', '#B45309', 'party-popper'),
    cat('cat_loan', 'Кредити', 'expense', '#EF4444', 'banknote'),
    cat('cat_rent', 'Оренда', 'expense', '#5C3A21', 'home'),
  ]

  const categoryRules: CategoryRule[] = [
    {
      id: 'rule_salary_income',
      workspaceId: WS,
      name: 'Salary recognition',
      descriptionContains: 'зарплата,salary',
      categoryId: 'cat_salary',
      isActive: true,
      kind: 'income',
      minAmount: 1000,
      maxAmount: null,
      accountId: null,
      priority: 1,
      createdAt: isoStamp(-60),
      updatedAt: isoStamp(-60),
    },
    {
      id: 'rule_groceries_basics',
      workspaceId: WS,
      name: 'Groceries matching',
      descriptionContains: 'сільпо,atb,атб,супермаркет',
      categoryId: 'cat_groceries',
      isActive: true,
      kind: 'expense',
      minAmount: 1,
      maxAmount: null,
      accountId: null,
      priority: 10,
      createdAt: isoStamp(-60),
      updatedAt: isoStamp(-60),
    },
  ]

  const transactionTypes: TransactionType[] = [
    { id: 'tt_income', workspaceId: WS, name: 'Дохід', family: 'income', isSystem: true, isDefault: true },
    { id: 'tt_expense', workspaceId: WS, name: 'Витрата', family: 'expense', isSystem: true, isDefault: true },
    { id: 'tt_other', workspaceId: WS, name: 'Інше', family: 'expense', isSystem: true, isDefault: false },
  ]

  let n = 0
  const tx = (
    daysAgo: number,
    accountId: string,
    kind: Transaction['kind'],
    amount: number,
    description: string,
    opts: Partial<Transaction> = {}
  ): Transaction => {
    n += 1
    const typeId = kind === 'income' ? 'tt_income' : kind === 'expense' ? 'tt_expense' : 'tt_other'
    return {
      id: `tx_${String(n).padStart(3, '0')}`,
      workspaceId: WS,
      accountId,
      counterAccountId: null,
      categoryId: null,
      transactionTypeId: typeId,
      kind,
      amount,
      currency: 'UAH',
      originalAmount: null,
      originalCurrency: null,
      description,
      notes: null,
      transactionDate: isoDate(-daysAgo),
      status: 'completed',
      plannedDate: null,
      completedAt: isoStamp(-daysAgo),
      clearedStatus: 'reconciled',
      isExpected: false,
      recurringTransactionId: null,
      createdBy: U_OWNER,
      createdAt: isoStamp(-daysAgo),
      updatedAt: isoStamp(-daysAgo),
      deletedAt: null,
      ...opts,
    }
  }

  const transactions: Transaction[] = [
    // Income
    tx(45, 'acc_mono', 'income', 38000, 'Зарплата', { categoryId: 'cat_salary' }),
    tx(15, 'acc_mono', 'income', 38000, 'Зарплата', { categoryId: 'cat_salary' }),
    tx(30, 'acc_mono', 'income', 12000, 'Фриланс-проєкт', { categoryId: 'cat_freelance', createdBy: U_MEMBER }),
    tx(28, 'acc_savings', 'income', 300, 'Фриланс (USD)', { categoryId: 'cat_freelance', currency: 'USD', createdBy: U_MEMBER }),
    tx(20, 'acc_cash', 'income', 2000, 'Подарунок на день народження', { categoryId: 'cat_gift' }),

    // Groceries (weekly)
    tx(42, 'acc_mono', 'expense', 1480, 'Сільпо', { categoryId: 'cat_groceries' }),
    tx(35, 'acc_mono', 'expense', 1620, 'АТБ', { categoryId: 'cat_groceries' }),
    tx(28, 'acc_mono', 'expense', 1390, 'Сільпо', { categoryId: 'cat_groceries' }),
    tx(21, 'acc_mono', 'expense', 1750, 'Новус', { categoryId: 'cat_groceries' }),
    tx(14, 'acc_mono', 'expense', 1510, 'АТБ', { categoryId: 'cat_groceries' }),
    tx(7, 'acc_mono', 'expense', 1680, 'Сільпо', { categoryId: 'cat_groceries' }),
    tx(2, 'acc_mono', 'expense', 1240, 'АТБ', { categoryId: 'cat_groceries' }),

    // Other living costs
    tx(40, 'acc_mono', 'expense', 3200, 'Комунальні послуги', { categoryId: 'cat_utilities' }),
    tx(33, 'acc_mono', 'expense', 850, "Вечеря в кафе", { categoryId: 'cat_dining' }),
    tx(25, 'acc_mono', 'expense', 600, 'Паливо', { categoryId: 'cat_transport' }),
    tx(18, 'acc_mono', 'expense', 1200, 'Гурток для Софії', { categoryId: 'cat_kids', createdBy: U_MEMBER }),
    tx(10, 'acc_mono', 'expense', 900, 'Аптека', { categoryId: 'cat_health' }),
    tx(5, 'acc_mono', 'expense', 700, 'Кіно', { categoryId: 'cat_fun', createdBy: U_MEMBER }),

    // Cash spending — one uncleared, plus a gap (see post-processing)
    tx(8, 'acc_cash', 'expense', 200, 'Маршрутка', { categoryId: 'cat_transport' }),
    tx(3, 'acc_cash', 'expense', 450, 'Ринок', { categoryId: 'cat_groceries', clearedStatus: 'uncleared' }),

    // Credit card usage
    tx(22, 'acc_credit', 'expense', 3500, 'Побутова техніка', { categoryId: 'cat_fun' }),
    tx(12, 'acc_credit', 'expense', 1100, 'Ресторан', { categoryId: 'cat_dining' }),

    // Transfers: debt repayments and receivable settlement
    tx(16, 'acc_mono', 'transfer', 4000, 'Погашення кредитки', { counterAccountId: 'acc_credit', categoryId: 'cat_loan' }),
    tx(20, 'acc_mono', 'transfer', 2000, 'Платіж по мікрокредиту', { counterAccountId: 'acc_micro', categoryId: 'cat_loan' }),
    tx(24, 'acc_mono', 'transfer', 5000, 'Повернув частину боргу братові', { counterAccountId: 'acc_debt', categoryId: 'cat_loan' }),
    tx(19, 'acc_recv', 'transfer', 1000, 'Андрій повернув частину', { counterAccountId: 'acc_cash' }),

    // Planned (upcoming) — never affect current balance
    tx(-2, 'acc_mono', 'income', 38000, 'Зарплата (заплановано)', { categoryId: 'cat_salary', status: 'planned', plannedDate: isoDate(2), completedAt: null, clearedStatus: 'uncleared' }),
    tx(-5, 'acc_mono', 'expense', 8000, 'Оренда квартири', { categoryId: 'cat_rent', status: 'planned', plannedDate: isoDate(5), completedAt: null, clearedStatus: 'uncleared' }),
    tx(-7, 'acc_mono', 'transfer', 2000, 'Платіж по мікрокредиту', { counterAccountId: 'acc_micro', categoryId: 'cat_loan', status: 'planned', plannedDate: isoDate(7), completedAt: null, clearedStatus: 'uncleared' }),
  ]

  // Derive each account's current balance from the ledger, then leave a small,
  // believable gap on cash to demonstrate reconciliation.
  for (const account of accounts) {
    account.currentBalance = Math.round(calculatedBalance(account, transactions) * 100) / 100
  }
  const cash = accounts.find((a) => a.id === 'acc_cash')!
  cash.currentBalance -= 350

  const recurring: RecurringTransaction[] = [
    {
      id: 'rec_salary', workspaceId: WS, frequency: 'monthly', intervalCount: 1,
      startDate: isoDate(-75), endDate: null, nextDueDate: isoDate(2), isActive: true,
      template: { accountId: 'acc_mono', categoryId: 'cat_salary', transactionTypeId: 'tt_income', kind: 'income', amount: 38000, currency: 'UAH', description: 'Зарплата' },
    },
    {
      id: 'rec_rent', workspaceId: WS, frequency: 'monthly', intervalCount: 1,
      startDate: isoDate(-65), endDate: null, nextDueDate: isoDate(5), isActive: true,
      template: { accountId: 'acc_mono', categoryId: 'cat_rent', transactionTypeId: 'tt_expense', kind: 'expense', amount: 8000, currency: 'UAH', description: 'Оренда квартири' },
    },
    {
      id: 'rec_utilities', workspaceId: WS, frequency: 'monthly', intervalCount: 1,
      startDate: isoDate(-70), endDate: null, nextDueDate: isoDate(11), isActive: true,
      template: { accountId: 'acc_mono', categoryId: 'cat_utilities', transactionTypeId: 'tt_expense', kind: 'expense', amount: 3200, currency: 'UAH', description: 'Комунальні послуги' },
    },
  ]

  const expected: ExpectedTransaction[] = [
    { id: 'exp_salary', workspaceId: WS, recurringTransactionId: 'rec_salary', expectedDate: isoDate(2), expectedAmount: 38000, currency: 'UAH', status: 'pending' },
    { id: 'exp_rent', workspaceId: WS, recurringTransactionId: 'rec_rent', expectedDate: isoDate(5), expectedAmount: 8000, currency: 'UAH', status: 'pending' },
    { id: 'exp_utilities', workspaceId: WS, recurringTransactionId: 'rec_utilities', expectedDate: isoDate(11), expectedAmount: 3200, currency: 'UAH', status: 'pending' },
  ]

  const settings: UserSettings = {
    userId: U_OWNER,
    workspaceId: WS,
    displayCurrency: 'UAH',
    minimumSafeBalance: 8000,
    safetyBufferDays: 7,
  }

  return {
    workspace,
    profiles,
    members,
    accounts,
    categories,
    categoryRules,
    transactionTypes,
    transactions,
    recurring,
    expected,
    balanceHistory: [],
    settings,
    currentUserId: U_OWNER,
  }
}