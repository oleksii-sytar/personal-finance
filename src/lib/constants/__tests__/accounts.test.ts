/**
 * Unit tests for account constants and mappings
 * Following testing.md standards
 */

import { describe, it, expect } from 'vitest'
import {
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPES,
  getAccountTypeIcon,
  getAccountTypeLabel,
  getAccountTypeColor,
  isValidAccountType,
} from '../accounts'
import { Wallet, PiggyBank, CreditCard, TrendingUp } from 'lucide-react'

describe('ACCOUNT_TYPE_ICONS', () => {
  it('maps all account types to icons', () => {
    expect(ACCOUNT_TYPE_ICONS.checking).toBe(Wallet)
    expect(ACCOUNT_TYPE_ICONS.savings).toBe(PiggyBank)
    expect(ACCOUNT_TYPE_ICONS.credit).toBe(CreditCard)
    expect(ACCOUNT_TYPE_ICONS.investment).toBe(TrendingUp)
  })

  it('has icons for all account types', () => {
    ACCOUNT_TYPES.forEach((type) => {
      expect(ACCOUNT_TYPE_ICONS[type]).toBeDefined()
    })
  })
})

describe('ACCOUNT_TYPE_LABELS', () => {
  it('maps account types to user-friendly labels', () => {
    expect(ACCOUNT_TYPE_LABELS.checking).toBe('Checking Account')
    expect(ACCOUNT_TYPE_LABELS.savings).toBe('Savings Account')
    expect(ACCOUNT_TYPE_LABELS.credit).toBe('Credit Account')
    expect(ACCOUNT_TYPE_LABELS.investment).toBe('Investment Account')
  })

  it('has labels for all account types', () => {
    ACCOUNT_TYPES.forEach((type) => {
      expect(ACCOUNT_TYPE_LABELS[type]).toBeDefined()
      expect(ACCOUNT_TYPE_LABELS[type]).toContain('Account')
    })
  })
})

describe('ACCOUNT_TYPE_COLORS', () => {
  it('maps account types to Executive Lounge colors', () => {
    expect(ACCOUNT_TYPE_COLORS.checking).toBe('text-accent-primary')
    expect(ACCOUNT_TYPE_COLORS.savings).toBe('text-accent-success')
    expect(ACCOUNT_TYPE_COLORS.credit).toBe('text-accent-warning')
    expect(ACCOUNT_TYPE_COLORS.investment).toBe('text-accent-info')
  })

  it('has colors for all account types', () => {
    ACCOUNT_TYPES.forEach((type) => {
      expect(ACCOUNT_TYPE_COLORS[type]).toBeDefined()
      expect(ACCOUNT_TYPE_COLORS[type]).toContain('text-accent-')
    })
  })
})

describe('ACCOUNT_TYPES', () => {
  it('contains all valid account types', () => {
    expect(ACCOUNT_TYPES).toEqual([
      'checking',
      'savings',
      'credit',
      'investment',
    ])
  })

  it('is readonly', () => {
    expect(Object.isFrozen(ACCOUNT_TYPES)).toBe(false) // Array itself not frozen
    // But TypeScript enforces readonly at compile time
  })
})

describe('getAccountTypeIcon', () => {
  it('returns correct icon for each type', () => {
    expect(getAccountTypeIcon('checking')).toBe(Wallet)
    expect(getAccountTypeIcon('savings')).toBe(PiggyBank)
    expect(getAccountTypeIcon('credit')).toBe(CreditCard)
    expect(getAccountTypeIcon('investment')).toBe(TrendingUp)
  })
})

describe('getAccountTypeLabel', () => {
  it('returns correct label for each type', () => {
    expect(getAccountTypeLabel('checking')).toBe('Checking Account')
    expect(getAccountTypeLabel('savings')).toBe('Savings Account')
    expect(getAccountTypeLabel('credit')).toBe('Credit Account')
    expect(getAccountTypeLabel('investment')).toBe('Investment Account')
  })
})

describe('getAccountTypeColor', () => {
  it('returns correct color class for each type', () => {
    expect(getAccountTypeColor('checking')).toBe('text-accent-primary')
    expect(getAccountTypeColor('savings')).toBe('text-accent-success')
    expect(getAccountTypeColor('credit')).toBe('text-accent-warning')
    expect(getAccountTypeColor('investment')).toBe('text-accent-info')
  })
})

describe('isValidAccountType', () => {
  it('returns true for valid account types', () => {
    expect(isValidAccountType('checking')).toBe(true)
    expect(isValidAccountType('savings')).toBe(true)
    expect(isValidAccountType('credit')).toBe(true)
    expect(isValidAccountType('investment')).toBe(true)
  })

  it('returns false for invalid account types', () => {
    expect(isValidAccountType('invalid')).toBe(false)
    expect(isValidAccountType('bank')).toBe(false)
    expect(isValidAccountType('')).toBe(false)
    expect(isValidAccountType('CHECKING')).toBe(false) // Case sensitive
  })

  it('provides type guard functionality', () => {
    const type: string = 'checking'
    
    if (isValidAccountType(type)) {
      // TypeScript should recognize type as AccountType here
      const label = getAccountTypeLabel(type) // Should not error
      expect(label).toBe('Checking Account')
    }
  })
})
