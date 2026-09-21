import { describe, it, expect } from 'vitest'
import { can } from '@/lib/auth/permissions'

describe('can', () => {
  it('grants the owner everything', () => {
    expect(can('owner', 'members.manage')).toBe(true)
    expect(can('owner', 'reconcile')).toBe(true)
    expect(can('owner', 'settings.workspace')).toBe(true)
  })

  it('lets the financial manager manage money but not members', () => {
    expect(can('manager', 'reconcile')).toBe(true)
    expect(can('manager', 'account.manage')).toBe(true)
    expect(can('manager', 'members.manage')).toBe(false)
  })

  it('limits contributors to creating their own transactions', () => {
    expect(can('member', 'transaction.create')).toBe(true)
    expect(can('member', 'reconcile')).toBe(false)
    expect(can('member', 'account.manage')).toBe(false)
  })

  it('gives viewers no write permissions', () => {
    expect(can('viewer', 'transaction.create')).toBe(false)
    expect(can('viewer', 'reconcile')).toBe(false)
  })

  it('returns false for an unknown role', () => {
    expect(can(undefined, 'transaction.create')).toBe(false)
  })
})