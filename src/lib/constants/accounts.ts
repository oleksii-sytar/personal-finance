/**
 * Account taxonomy metadata for the Ukrainian family-finance model.
 * Assets add to net worth; liabilities subtract. See data-model.md §B.1.
 */

import {
  Wallet,
  Landmark,
  PiggyBank,
  Bitcoin,
  LineChart,
  Coins,
  CreditCard,
  Building2,
  Banknote,
  Users,
  Home,
  type LucideIcon,
} from 'lucide-react'
import type { AccountClass, AccountType } from '@/types/domain'

export interface AccountTypeMeta {
  type: AccountType
  label: string
  class: AccountClass
  icon: LucideIcon
  /** Short helper text shown in pickers. */
  description: string
  /** Tailwind-ish accent used for chips/badges (maps to CSS vars where possible). */
  accent: string
}

export const ACCOUNT_TYPE_META: Record<AccountType, AccountTypeMeta> = {
  // Assets
  cash: {
    type: 'cash',
    label: "Готівка",
    class: 'asset',
    icon: Wallet,
    description: "Готівкові кошти",
    accent: 'var(--accent-success)',
  },
  bank_debit: {
    type: 'bank_debit',
    label: "Дебетова картка",
    class: 'asset',
    icon: Landmark,
    description: "Поточний рахунок або дебетова картка",
    accent: 'var(--accent-primary)',
  },
  savings: {
    type: 'savings',
    label: "Заощадження",
    class: 'asset',
    icon: PiggyBank,
    description: "Накопичувальний або депозитний рахунок",
    accent: 'var(--accent-success)',
  },
  crypto: {
    type: 'crypto',
    label: "Криптовалюта",
    class: 'asset',
    icon: Bitcoin,
    description: "Криптогаманець або криптокартка",
    accent: 'var(--accent-warning)',
  },
  investment: {
    type: 'investment',
    label: "Інвестиції",
    class: 'asset',
    icon: LineChart,
    description: "Брокерський рахунок або інвестиції",
    accent: 'var(--accent-info)',
  },
  receivable: {
    type: 'receivable',
    label: "Борги перед вами",
    class: 'asset',
    icon: Coins,
    description: "Кошти, які винні вашій сім’ї",
    accent: 'var(--accent-info)',
  },
  // Liabilities
  credit_card: {
    type: 'credit_card',
    label: "Кредитна картка",
    class: 'liability',
    icon: CreditCard,
    description: "Картка з відновлюваним кредитним лімітом",
    accent: 'var(--accent-error)',
  },
  bank_loan: {
    type: 'bank_loan',
    label: "Банківський кредит",
    class: 'liability',
    icon: Building2,
    description: "Кредит у банку",
    accent: 'var(--accent-error)',
  },
  microloan: {
    type: 'microloan',
    label: "Мікрокредит",
    class: 'liability',
    icon: Banknote,
    description: "Короткостроковий мікрокредит",
    accent: 'var(--accent-error)',
  },
  personal_debt: {
    type: 'personal_debt',
    label: "Особистий борг",
    class: 'liability',
    icon: Users,
    description: "Борг родичам або друзям",
    accent: 'var(--accent-error)',
  },
  mortgage: {
    type: 'mortgage',
    label: "Іпотека",
    class: 'liability',
    icon: Home,
    description: "Кредит на житло",
    accent: 'var(--accent-error)',
  },
}

export const ASSET_TYPES: AccountType[] = (Object.values(ACCOUNT_TYPE_META) as AccountTypeMeta[])
  .filter((m) => m.class === 'asset')
  .map((m) => m.type)

export const LIABILITY_TYPES: AccountType[] = (Object.values(ACCOUNT_TYPE_META) as AccountTypeMeta[])
  .filter((m) => m.class === 'liability')
  .map((m) => m.type)

export function accountClassOf(type: AccountType): AccountClass {
  return ACCOUNT_TYPE_META[type].class
}

export function isLiability(type: AccountType): boolean {
  return ACCOUNT_TYPE_META[type].class === 'liability'
}