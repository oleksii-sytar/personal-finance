/**
 * Tests for workspace access control utilities
 * Validates Requirements 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  verifyWorkspaceMembership,
  getUserWorkspaceMemberships,
  verifyTransactionAccess,
  validateWorkspaceAccess
} from '../workspace-access'

// Mock Supabase clients
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))

describe('Workspace Access Control', () => {
  const mockUserId = 'user-123'
  const mockWorkspaceId = 'workspace-456'
  const mockTransactionId = 'transaction-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyWorkspaceMembership', () => {
    it('should return access granted for valid membership', async () => {
      // Mock successful membership query
      const mockSupabaseAdmin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    workspace_id: mockWorkspaceId,
                    role: 'member',
                    user_id: mockUserId
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      }

      // Mock createClient to return our mock
      const { createClient } = await import('@supabase/supabase-js')
      vi.mocked(createClient).mockReturnValue(mockSupabaseAdmin as any)

      const result = await verifyWorkspaceMembership(mockUserId, mockWorkspaceId)

      expect(result.hasAccess).toBe(true)
      expect(result.membership).toEqual({
        workspace_id: mockWorkspaceId,
        role: 'member',
        user_id: mockUserId
      })
      expect(result.error).toBeUndefined()
    })

    it('should return access denied for non-member', async () => {
      // Mock failed membership query
      const mockSupabaseAdmin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'No rows returned' }
                }))
              }))
            }))
          }))
        }))
      }

      const { createClient } = await import('@supabase/supabase-js')
      vi.mocked(createClient).mockReturnValue(mockSupabaseAdmin as any)

      const result = await verifyWorkspaceMembership(mockUserId, mockWorkspaceId)

      expect(result.hasAccess).toBe(false)
      expect(result.error).toBe('User is not a member of this workspace')
    })
  })

  describe('getUserWorkspaceMemberships', () => {
    it('should return user workspace memberships', async () => {
      const mockMemberships = [
        { workspace_id: 'workspace-1', role: 'owner', user_id: mockUserId },
        { workspace_id: 'workspace-2', role: 'member', user_id: mockUserId }
      ]

      const mockSupabaseAdmin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: mockMemberships,
              error: null
            }))
          }))
        }))
      }

      const { createClient } = await import('@supabase/supabase-js')
      vi.mocked(createClient).mockReturnValue(mockSupabaseAdmin as any)

      const result = await getUserWorkspaceMemberships(mockUserId)

      expect(result).toEqual(mockMemberships)
    })

    it('should return empty array on error', async () => {
      const mockSupabaseAdmin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      }

      const { createClient } = await import('@supabase/supabase-js')
      vi.mocked(createClient).mockReturnValue(mockSupabaseAdmin as any)

      const result = await getUserWorkspaceMemberships(mockUserId)

      expect(result).toEqual([])
    })
  })

  describe('verifyTransactionAccess', () => {
    it('should return access granted for transaction in user workspace', async () => {
      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'transactions') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: { workspace_id: mockWorkspaceId },
                    error: null
                  }))
                }))
              }))
            }
          } else if (table === 'workspace_members') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: {
                        workspace_id: mockWorkspaceId,
                        role: 'member',
                        user_id: mockUserId
                      },
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
        })
      }

      const { createClient } = await import('@supabase/supabase-js')
      vi.mocked(createClient).mockReturnValue(mockSupabaseAdmin as any)

      const result = await verifyTransactionAccess(mockUserId, mockTransactionId)

      expect(result.hasAccess).toBe(true)
      expect(result.membership?.workspace_id).toBe(mockWorkspaceId)
    })

    it('should return access denied for non-existent transaction', async () => {
      const mockSupabaseAdmin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Transaction not found' }
              }))
            }))
          }))
        }))
      }

      const { createClient } = await import('@supabase/supabase-js')
      vi.mocked(createClient).mockReturnValue(mockSupabaseAdmin as any)

      const result = await verifyTransactionAccess(mockUserId, mockTransactionId)

      expect(result.hasAccess).toBe(false)
      expect(result.error).toBe('Transaction not found')
    })
  })
})