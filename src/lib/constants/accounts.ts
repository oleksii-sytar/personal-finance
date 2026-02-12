/**
 * Account-related constants and mappings
 * Following Executive Lounge design system
 */

import type { AccountType } from '@/types'
import { 
  Wallet, 
  PiggyBank, 
  CreditCard, 
  TrendingUp,
  type LucideIcon 
} from 'lucide-react'

/**
 * Maps account types to their corresponding Lucide icons
 * Icons follow Executive Lounge aesthetic with warm accent colors
 */
export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
} as const

/**
 * Maps account types to user-friendly display labels
 * Requirements: 2.6, 7.6
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  credit: 'Credit Account',
  investment: 'Investment Account',
} as const

/**
 * Maps account types to accent colors from Executive Lounge palette
 * Used for icons, badges, and visual indicators
 */
export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  checking: 'text-accent-primary',      // Single Malt Gold
  savings: 'text-accent-success',       // Growth Emerald
  credit: 'text-accent-warning',        // Amber
  investment: 'text-accent-info',       // Warm Bronze
} as const

/**
 * All valid account types as an array
 * Useful for validation and iteration
 */
export const ACCOUNT_TYPES: readonly AccountType[] = [
  'checking',
  'savings',
  'credit',
  'investment',
] as const

/**
 * Gets the icon component for a given account type
 * 
 * @param type - The account type
 * @returns The corresponding Lucide icon component
 * 
 * @example
 * const Icon = getAccountTypeIcon('checking')
 * return <Icon className="w-5 h-5" />
 */
export function getAccountTypeIcon(type: AccountType): LucideIcon {
  return ACCOUNT_TYPE_ICONS[type]
}

/**
 * Gets the user-friendly label for a given account type
 * 
 * @param type - The account type
 * @returns The display label
 * 
 * @example
 * getAccountTypeLabel('checking') // "Checking Account"
 */
export function getAccountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type]
}

/**
 * Gets the accent color class for a given account type
 * 
 * @param type - The account type
 * @returns Tailwind CSS color class
 * 
 * @example
 * getAccountTypeColor('savings') // "text-accent-success"
 */
export function getAccountTypeColor(type: AccountType): string {
  return ACCOUNT_TYPE_COLORS[type]
}

/**
 * Validates if a string is a valid account type
 * 
 * @param type - The string to validate
 * @returns True if valid account type
 * 
 * @example
 * isValidAccountType('checking') // true
 * isValidAccountType('invalid') // false
 */
export function isValidAccountType(type: string): type is AccountType {
  return ACCOUNT_TYPES.includes(type as AccountType)
}
