/**
 * Application-wide constants following structure.md organization
 */

export const APP_NAME = 'Forma'
export const APP_DESCRIPTION = 'Premium personal finance management with executive-grade insights'

/**
 * Pagination constants
 */
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/**
 * Transaction limits
 */
export const MAX_TRANSACTION_AMOUNT = 1000000000 // 1 billion
export const MIN_TRANSACTION_AMOUNT = 0.01

/**
 * Date ranges for filtering
 */
export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_YEAR: 'this_year',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom',
} as const

export type DateRange = typeof DATE_RANGES[keyof typeof DATE_RANGES]

/**
 * Theme constants
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const

export type Theme = typeof THEMES[keyof typeof THEMES]

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'forma-theme',
  SIDEBAR_COLLAPSED: 'forma-sidebar-collapsed',
  TRANSACTION_FILTERS: 'forma-transaction-filters',
} as const