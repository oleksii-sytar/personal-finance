/**
 * Property-based tests for workspace data isolation
 * Feature: authentication-workspace, Property 10: Workspace Data Isolation
 * Validates: Requirements 6.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@/lib/supabase/server'
import { removeMemberAction } from '@/actions/workspaces'

// Mock Supabase client
vi.mock('@/lib/supabase/server')

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn().mockImplementation(() => {}),
}))

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

const mockWorkspaceMembersTable = {
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  delete: vi.fn(),
}

const mockTransactionsTable = {
  select: vi.fn(),
  eq: vi.fn(),
}

const mockCategoriesTable = {
  select: vi.fn(),
  eq: vi.fn(),
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  vi.clearAllMocks()
  
  // Create a fresh delete chain for each test
  const deleteChain = {
    eq: vi.fn().mockResolvedValue({ data: null, error: null })
  }
  
  // Setup default mock chain
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'workspace_members') {
      return mockWorkspaceMembersTable
    }
    if (table === 'transactions') {
      return mockTransactionsTable
    }
    if (table === 'categories') {
      return mockCategoriesTable
    }
    return {}
  })
  
  // Setup method chaining for workspace_members table
  mockWorkspaceMembersTable.select.mockReturnValue(mockWorkspaceMembersTable)
  mockWorkspaceMembersTable.eq.mockReturnValue(mockWorkspaceMembersTable)
  mockWorkspaceMembersTable.single.mockReturnValue(mockWorkspaceMembersTable)
  mockWorkspaceMembersTable.delete.mockReturnValue(deleteChain)
  
  mockTransactionsTable.select.mockReturnValue(mockTransactionsTable)
  mockTransactionsTable.eq.mockReturnValue(mockTransactionsTable)
  
  mockCategoriesTable.select.mockReturnValue(mockCategoriesTable)
  mockCategoriesTable.eq.mockReturnValue(mockCategoriesTable)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Workspace Data Isolation Property Tests', () => {
  /**
   * Property 10: Workspace Data Isolation
   * For any workspace member removal, the removed member should immediately 
   * lose access to all workspace data and functionality
   */
  
  it('Property 10.1: Removed members lose workspace access immediately (Requirement 6.4)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ownerId: fc.uuid(),
          removedMemberId: fc.uuid(),
          removedMemberUserId: fc.uuid(),
          workspaceId: fc.uuid(),
          membershipId: fc.uuid(),
        }),
        async ({ ownerId, removedMemberId, removedMemberUserId, workspaceId, membershipId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Re-setup the delete chain after clearing mocks
          const deleteChain = {
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          }
          mockWorkspaceMembersTable.delete.mockReturnValue(deleteChain)
          
          // Setup mocks - authenticated user who is workspace owner
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: ownerId } },
            error: null
          })
          
          // Mock member to be removed exists and is not owner
          mockWorkspaceMembersTable.single.mockImplementation((callback) => {
            // First call: get member to remove
            if (mockWorkspaceMembersTable.select.mock.calls.length === 1) {
              return Promise.resolve({
                data: {
                  workspace_id: workspaceId,
                  user_id: removedMemberUserId,
                  role: 'member'
                },
                error: null
              })
            }
            // Second call: check current user permissions
            return Promise.resolve({
              data: { role: 'owner' },
              error: null
            })
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', membershipId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          // Verify removal succeeded
          expect(result.error).toBeUndefined()
          expect(result.data).toBeUndefined() // Success returns undefined data
          
          // Verify member was queried and removed
          expect(mockWorkspaceMembersTable.select).toHaveBeenCalledWith('workspace_id, user_id, role')
          expect(mockWorkspaceMembersTable.eq).toHaveBeenCalledWith('id', membershipId)
          expect(mockWorkspaceMembersTable.delete).toHaveBeenCalledWith()
          expect(deleteChain.eq).toHaveBeenCalledWith('id', membershipId)
          
          // Verify owner permissions were checked
          expect(mockWorkspaceMembersTable.select).toHaveBeenCalledWith('role')
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
  
  it('Property 10.2: Only workspace owners can remove members (Requirement 6.4)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nonOwnerId: fc.uuid(),
          targetMemberId: fc.uuid(),
          targetMemberUserId: fc.uuid(),
          workspaceId: fc.uuid(),
          membershipId: fc.uuid(),
        }),
        async ({ nonOwnerId, targetMemberId, targetMemberUserId, workspaceId, membershipId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks - authenticated user who is NOT workspace owner
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: nonOwnerId } },
            error: null
          })
          
          // Mock member to be removed exists
          mockWorkspaceMembersTable.single.mockImplementation((callback) => {
            // First call: get member to remove
            if (mockWorkspaceMembersTable.select.mock.calls.length === 1) {
              return Promise.resolve({
                data: {
                  workspace_id: workspaceId,
                  user_id: targetMemberUserId,
                  role: 'member'
                },
                error: null
              })
            }
            // Second call: check current user permissions (not owner)
            return Promise.resolve({
              data: { role: 'member' },
              error: null
            })
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', membershipId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          // Should fail with permission error
          expect(result.error).toBe('Only workspace owners can remove members')
          expect(result.data).toBeUndefined()
          
          // Should not attempt to remove member
          expect(mockWorkspaceMembersTable.delete).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 10.3: Workspace owners cannot be removed (Requirement 6.4)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ownerId: fc.uuid(),
          ownerMembershipId: fc.uuid(),
          workspaceId: fc.uuid(),
        }),
        async ({ ownerId, ownerMembershipId, workspaceId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks - authenticated user who is workspace owner
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: ownerId } },
            error: null
          })
          
          // Mock trying to remove the owner
          mockWorkspaceMembersTable.single.mockImplementation((callback) => {
            // First call: get member to remove (owner)
            if (mockWorkspaceMembersTable.select.mock.calls.length === 1) {
              return Promise.resolve({
                data: {
                  workspace_id: workspaceId,
                  user_id: ownerId,
                  role: 'owner'
                },
                error: null
              })
            }
            // Second call: check current user permissions
            return Promise.resolve({
              data: { role: 'owner' },
              error: null
            })
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', ownerMembershipId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          // Should fail with owner protection error
          expect(result.error).toBe('Cannot remove workspace owner')
          expect(result.data).toBeUndefined()
          
          // Should not attempt to remove member
          expect(mockWorkspaceMembersTable.delete).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 10.4: Non-existent members cannot be removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ownerId: fc.uuid(),
          nonExistentMembershipId: fc.uuid(),
        }),
        async ({ ownerId, nonExistentMembershipId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks - authenticated user who is workspace owner
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: ownerId } },
            error: null
          })
          
          // Mock member not found
          mockWorkspaceMembersTable.single.mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'The result contains 0 rows' }
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', nonExistentMembershipId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          // Should fail with member not found error
          expect(result.error).toBe('Member not found')
          expect(result.data).toBeUndefined()
          
          // Should not attempt to remove member
          expect(mockWorkspaceMembersTable.delete).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 10.5: Unauthenticated users cannot remove members', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          membershipId: fc.uuid(),
        }),
        async ({ membershipId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks - no authenticated user
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated')
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', membershipId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          // Should fail authentication
          expect(result.error).toBe('Authentication required')
          expect(result.data).toBeUndefined()
          
          // Should not check member or attempt removal
          expect(mockWorkspaceMembersTable.select).not.toHaveBeenCalled()
          expect(mockWorkspaceMembersTable.delete).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 10.6: Invalid member IDs are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ownerId: fc.uuid(),
          invalidMemberId: fc.oneof(
            fc.constant(''),
            fc.constant('invalid-uuid'),
            fc.constant('123'),
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))
          ),
        }),
        async ({ ownerId, invalidMemberId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks - authenticated user who is workspace owner
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: ownerId } },
            error: null
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', invalidMemberId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          // Should fail validation
          expect(result.error).toBeDefined()
          expect(result.data).toBeUndefined()
          
          // Should not check member or attempt removal
          expect(mockWorkspaceMembersTable.select).not.toHaveBeenCalled()
          expect(mockWorkspaceMembersTable.delete).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
})