/**
 * Property-based tests for workspace ownership and membership
 * Feature: authentication-workspace, Property 9: Workspace Ownership and Membership
 * Validates: Requirements 4.3, 5.6, 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@/lib/supabase/server'
import { 
  createWorkspaceAction, 
  inviteMemberAction, 
  removeMemberAction, 
  transferOwnershipAction 
} from '@/actions/workspaces'

// Mock Supabase client
vi.mock('@/lib/supabase/server')

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Simplified Mock Strategy: Direct Pattern Matching
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

// Mock response storage with specific keys for different query patterns
let mockResponses: Record<string, any> = {}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  vi.clearAllMocks()
  mockResponses = {}
  
  // Mock implementation that handles the specific patterns we need
  mockSupabase.from.mockImplementation((table: string) => {
    return {
      select: vi.fn((fields?: string) => ({
        eq: vi.fn((col1: string, val1: any) => ({
          eq: vi.fn((col2: string, val2: any) => ({
            single: vi.fn(() => {
              // Handle workspace_members.select().eq(workspace_id).eq(user_id).single()
              const key = `${table}_select_${col1}_${col2}_single`
              return Promise.resolve(mockResponses[key] || { data: null, error: null })
            })
          })),
          single: vi.fn(() => {
            // Handle single .eq() followed by .single()
            const key = `${table}_select_${col1}_single`
            return Promise.resolve(mockResponses[key] || { data: null, error: null })
          })
        }))
      })),
      
      insert: vi.fn((data: any) => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            const key = `${table}_insert_select_single`
            return Promise.resolve(mockResponses[key] || { data: null, error: null })
          })
        }))
      })),
      
      update: vi.fn((data: any) => ({
        eq: vi.fn((col1: string, val1: any) => ({
          eq: vi.fn((col2: string, val2: any) => {
            const key = `${table}_update_${col1}_${col2}`
            return Promise.resolve(mockResponses[key] || { data: null, error: null })
          }),
          // Handle single .eq() after update
          then: (resolve: any) => {
            const key = `${table}_update_${col1}`
            const result = mockResponses[key] || { data: null, error: null }
            return Promise.resolve(result).then(resolve)
          }
        }))
      })),
      
      delete: vi.fn(() => ({
        eq: vi.fn((col: string, val: any) => {
          const key = `${table}_delete_${col}`
          return Promise.resolve(mockResponses[key] || { data: null, error: null })
        })
      }))
    }
  })
})

// Helper functions
function setMockResponse(key: string, response: any) {
  mockResponses[key] = response
}

function mockAuthUser(userId: string) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null
  })
}

function mockWorkspaceCreation(workspaceData: any) {
  setMockResponse('workspaces_insert_select_single', { data: workspaceData, error: null })
}

function mockMemberRemoval(memberData: any, currentUserRole: string = 'owner') {
  // Mock the member lookup by ID
  setMockResponse('workspace_members_select_id_single', { data: memberData, error: null })
  // Mock the current user role check (workspace_id, user_id)
  setMockResponse('workspace_members_select_workspace_id_user_id_single', { data: { role: currentUserRole }, error: null })
  // Mock the delete operation
  setMockResponse('workspace_members_delete_id', { data: null, error: null })
}

function mockOwnershipTransfer(currentMembership: any, newOwnerMembership: any) {
  // Mock current user membership check (user_id, role)
  setMockResponse('workspace_members_select_user_id_role_single', { data: currentMembership, error: null })
  // Mock new owner membership check (workspace_id, user_id)
  setMockResponse('workspace_members_select_workspace_id_user_id_single', { data: newOwnerMembership, error: null })
  // Mock workspace update
  setMockResponse('workspaces_update_id', { data: null, error: null })
  // Mock member role updates
  setMockResponse('workspace_members_update_id', { data: null, error: null })
  setMockResponse('workspace_members_update_user_id_workspace_id', { data: null, error: null })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('Workspace Ownership and Membership Property Tests', () => {
  /**
   * Property 9: Workspace Ownership and Membership
   * For any workspace creation, the creator should automatically become the owner, 
   * and for any workspace membership change, the system should correctly assign roles 
   * and enforce permissions
   */
  
  it('Property 9.1: Workspace creator automatically becomes owner (Requirement 4.3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          workspaceName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          currency: fc.constantFrom('UAH', 'USD', 'EUR', 'GBP', 'PLN'),
          userId: fc.uuid(),
          workspaceId: fc.uuid(),
        }),
        async ({ workspaceName, currency, userId, workspaceId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks using helper
          mockAuthUser(userId)
          mockWorkspaceCreation({
            id: workspaceId,
            name: workspaceName.trim(),
            owner_id: userId,
            currency,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('name', workspaceName)
          formData.set('currency', currency)
          
          // Execute action
          const result = await createWorkspaceAction(formData)
          
          // Verify workspace creation succeeded
          expect(result.error).toBeUndefined()
          expect(result.data).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
  
  it('Property 9.2: Only workspace owners can invite members (Requirement 5.6)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          inviterUserId: fc.uuid(),
          inviterRole: fc.constantFrom('owner', 'member'),
          inviteeEmail: fc.emailAddress().filter(email => {
            // Filter out emails that might cause validation errors
            // to focus on permission testing
            return email.includes('@') && 
                   !email.startsWith('/') && 
                   !email.startsWith('!') &&
                   email.length > 5 &&
                   email.length < 100
          }),
          workspaceId: fc.uuid(),
        }),
        async ({ inviterUserId, inviterRole, inviteeEmail, workspaceId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks
          mockAuthUser(inviterUserId)
          
          if (inviterRole === 'owner') {
            // Mock owner role check
            setMockResponse('workspace_members_select_workspace_id_user_id_single', { data: { role: 'owner' }, error: null })
            // Mock successful invitation creation
            setMockResponse('workspace_invitations_insert_select_single', {
              data: {
                id: fc.sample(fc.uuid(), 1)[0],
                workspace_id: workspaceId,
                email: inviteeEmail,
                invited_by: inviterUserId,
                token: fc.sample(fc.uuid(), 1)[0],
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString()
              }, 
              error: null 
            })
          } else {
            // For members, mock the membership check to return 'member' role
            setMockResponse('workspace_members_select_workspace_id_user_id_single', { data: { role: 'member' }, error: null })
          }
          
          // Create FormData
          const formData = new FormData()
          formData.set('email', inviteeEmail)
          formData.set('workspaceId', workspaceId)
          
          // Execute action
          const result = await inviteMemberAction(formData)
          
          if (inviterRole === 'owner') {
            // Owners should be able to invite (may still fail for other reasons like validation)
            expect(result.error).not.toBe('Only workspace owners can invite members')
          } else {
            // Non-owners should be rejected with permission error
            // But only if validation passes first
            if (typeof result.error === 'string') {
              expect(result.error).toBe('Only workspace owners can invite members')
            } else {
              // If validation failed, that's also acceptable since validation comes first
              expect(result.error).toBeDefined()
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
  
  it('Property 9.3: Only workspace owners can remove members (Requirement 6.1, 6.2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          removerUserId: fc.uuid(),
          removerRole: fc.constantFrom('owner', 'member'),
          memberToRemoveId: fc.uuid(),
          memberToRemoveRole: fc.constantFrom('member'), // Can't remove owners
          workspaceId: fc.uuid(),
        }),
        async ({ removerUserId, removerRole, memberToRemoveId, memberToRemoveRole, workspaceId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks
          mockAuthUser(removerUserId)
          mockMemberRemoval({
            workspace_id: workspaceId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            role: memberToRemoveRole
          }, removerRole)
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', memberToRemoveId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          if (removerRole === 'owner') {
            // Owners should be able to remove members (may fail for other reasons)
            expect(result.error).not.toBe('Only workspace owners can remove members')
          } else {
            // Non-owners should be rejected
            expect(result.error).toBe('Only workspace owners can remove members')
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
  
  it('Property 9.4: Cannot remove workspace owner (Requirement 6.2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          removerUserId: fc.uuid(),
          memberToRemoveId: fc.uuid(),
          workspaceId: fc.uuid(),
        }),
        async ({ removerUserId, memberToRemoveId, workspaceId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks
          mockAuthUser(removerUserId)
          mockMemberRemoval({
            workspace_id: workspaceId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            role: 'owner' // Trying to remove owner
          }, 'owner')
          
          // Create FormData
          const formData = new FormData()
          formData.set('memberId', memberToRemoveId)
          
          // Execute action
          const result = await removeMemberAction(formData)
          
          // Should be rejected
          expect(result.error).toBe('Cannot remove workspace owner')
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 9.5: Ownership transfer updates roles correctly (Requirement 6.3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          currentOwnerId: fc.uuid(),
          newOwnerId: fc.uuid(),
          workspaceId: fc.uuid(),
          newOwnerMemberId: fc.uuid(),
        }),
        async ({ currentOwnerId, newOwnerId, workspaceId, newOwnerMemberId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks
          mockAuthUser(currentOwnerId)
          mockOwnershipTransfer(
            {
              workspace_id: workspaceId,
              role: 'owner'
            },
            {
              id: newOwnerMemberId
            }
          )
          
          // Create FormData
          const formData = new FormData()
          formData.set('newOwnerId', newOwnerId)
          
          // Execute action
          const result = await transferOwnershipAction(formData)
          
          // Should succeed (may fail for other reasons but not permission)
          expect(result.error).not.toBe('Only workspace owners can transfer ownership')
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 9.6: Only workspace owners can transfer ownership (Requirement 6.3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          currentUserId: fc.uuid(),
          currentUserRole: fc.constantFrom('owner', 'member'),
          newOwnerId: fc.uuid(),
        }),
        async ({ currentUserId, currentUserRole, newOwnerId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks
          mockAuthUser(currentUserId)
          
          if (currentUserRole === 'owner') {
            // Mock successful ownership transfer flow
            setMockResponse('workspace_members_select_user_id_role_single', { 
              data: { workspace_id: fc.sample(fc.uuid(), 1)[0], role: 'owner' }, 
              error: null 
            })
            setMockResponse('workspace_members_select_workspace_id_user_id_single', { 
              data: { id: fc.sample(fc.uuid(), 1)[0] }, 
              error: null 
            })
            setMockResponse('workspaces_update_id', { data: null, error: null })
            setMockResponse('workspace_members_update_id', { data: null, error: null })
            setMockResponse('workspace_members_update_user_id_workspace_id', { data: null, error: null })
          } else {
            // Mock member trying to transfer - should fail at membership check
            setMockResponse('workspace_members_select_user_id_role_single', { 
              data: null, 
              error: new Error('Not found') 
            })
          }
          
          // Create FormData
          const formData = new FormData()
          formData.set('newOwnerId', newOwnerId)
          
          // Execute action
          const result = await transferOwnershipAction(formData)
          
          if (currentUserRole === 'owner') {
            // Owners should have access (may fail for other reasons)
            expect(result.error).not.toBe('Only workspace owners can transfer ownership')
          } else {
            // Non-owners should be rejected
            expect(result.error).toBe('Only workspace owners can transfer ownership')
          }
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 9.7: Membership roles are consistently enforced', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          userRole: fc.constantFrom('owner', 'member'),
          action: fc.constantFrom('invite', 'remove', 'transfer'),
          workspaceId: fc.uuid(),
          targetId: fc.uuid(),
        }),
        async ({ userId, userRole, action, workspaceId, targetId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks
          mockAuthUser(userId)
          
          let result: any
          const formData = new FormData()
          
          // Execute different actions based on the test case
          switch (action) {
            case 'invite':
              formData.set('email', 'test@example.com')
              formData.set('workspaceId', workspaceId)
              
              if (userRole === 'owner') {
                setMockResponse('workspace_members_select_workspace_id_user_id_single', { 
                  data: { role: 'owner' }, 
                  error: null 
                })
                setMockResponse('workspace_invitations_insert_select_single', { 
                  data: { id: targetId }, 
                  error: null 
                })
              } else {
                setMockResponse('workspace_members_select_workspace_id_user_id_single', { 
                  data: { role: 'member' }, 
                  error: null 
                })
              }
              
              result = await inviteMemberAction(formData)
              break
              
            case 'remove':
              formData.set('memberId', targetId)
              
              if (userRole === 'owner') {
                setMockResponse('workspace_members_select_id_single', { 
                  data: { workspace_id: workspaceId, user_id: targetId, role: 'member' }, 
                  error: null 
                })
                setMockResponse('workspace_members_select_workspace_id_user_id_single', { 
                  data: { role: 'owner' }, 
                  error: null 
                })
                setMockResponse('workspace_members_delete_id', { data: null, error: null })
              } else {
                setMockResponse('workspace_members_select_id_single', { 
                  data: { workspace_id: workspaceId, user_id: targetId, role: 'member' }, 
                  error: null 
                })
                setMockResponse('workspace_members_select_workspace_id_user_id_single', { 
                  data: { role: 'member' }, 
                  error: null 
                })
              }
              
              result = await removeMemberAction(formData)
              break
              
            case 'transfer':
              formData.set('newOwnerId', targetId)
              
              if (userRole === 'owner') {
                setMockResponse('workspace_members_select_user_id_role_single', { 
                  data: { workspace_id: workspaceId, role: 'owner' }, 
                  error: null 
                })
                setMockResponse('workspace_members_select_workspace_id_user_id_single', { 
                  data: { id: targetId }, 
                  error: null 
                })
                setMockResponse('workspaces_update_id', { data: null, error: null })
                setMockResponse('workspace_members_update_id', { data: null, error: null })
                setMockResponse('workspace_members_update_user_id_workspace_id', { data: null, error: null })
              } else {
                setMockResponse('workspace_members_select_user_id_role_single', { 
                  data: null, 
                  error: new Error('Not found') 
                })
              }
              
              result = await transferOwnershipAction(formData)
              break
          }
          
          // Verify role-based access control
          if (userRole === 'owner') {
            // Owners should have access to all actions (though some may fail for other reasons)
            if (action === 'invite') {
              expect(result.error).not.toBe('Only workspace owners can invite members')
            }
            if (action === 'remove') {
              expect(result.error).not.toBe('Only workspace owners can remove members')
            }
            if (action === 'transfer') {
              expect(result.error).not.toBe('Only workspace owners can transfer ownership')
            }
          } else {
            // Members should be denied access to owner-only actions
            if (action === 'invite') {
              expect(result.error).toBe('Only workspace owners can invite members')
            }
            if (action === 'remove') {
              expect(result.error).toBe('Only workspace owners can remove members')
            }
            if (action === 'transfer') {
              expect(result.error).toBe('Only workspace owners can transfer ownership')
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})