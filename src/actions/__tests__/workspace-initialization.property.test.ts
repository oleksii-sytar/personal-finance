/**
 * Property-based tests for workspace initialization
 * Feature: authentication-workspace, Property 11: Workspace Initialization Consistency
 * Validates: Requirements 4.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@/lib/supabase/server'
import { createWorkspaceAction } from '@/actions/workspaces'

// Mock Supabase client
vi.mock('@/lib/supabase/server')

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

const mockWorkspacesTable = {
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  eq: vi.fn(),
}

const mockCategoriesTable = {
  insert: vi.fn(),
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  vi.clearAllMocks()
  
  // Setup default mock chain
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'workspaces') {
      return mockWorkspacesTable
    }
    if (table === 'categories') {
      return mockCategoriesTable
    }
    return {}
  })
  
  // Setup method chaining
  mockWorkspacesTable.insert.mockReturnValue(mockWorkspacesTable)
  mockWorkspacesTable.select.mockReturnValue(mockWorkspacesTable)
  mockWorkspacesTable.eq.mockReturnValue(mockWorkspacesTable)
  mockCategoriesTable.insert.mockReturnValue(mockCategoriesTable)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Workspace Initialization Property Tests', () => {
  /**
   * Property 11: Workspace Initialization Consistency
   * For any new workspace creation, the system should initialize the workspace 
   * with default categories and proper ownership structure
   */
  
  it('Property 11.1: Workspace creation initializes default categories (Requirement 4.4)', async () => {
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
          
          // Setup mocks
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: userId } },
            error: null
          })
          
          mockWorkspacesTable.single.mockResolvedValue({
            data: {
              id: workspaceId,
              name: workspaceName.trim(),
              owner_id: userId,
              currency,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            error: null
          })
          
          mockCategoriesTable.insert.mockResolvedValue({
            data: [],
            error: null
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
          
          // Verify workspace was created with correct data
          expect(mockWorkspacesTable.insert).toHaveBeenCalledWith({
            name: workspaceName.trim(),
            owner_id: userId,
            currency
          })
          
          // Verify default categories were initialized
          expect(mockCategoriesTable.insert).toHaveBeenCalledTimes(1)
          
          const categoriesCall = mockCategoriesTable.insert.mock.calls[0][0]
          expect(Array.isArray(categoriesCall)).toBe(true)
          
          // Verify all categories have workspace_id
          categoriesCall.forEach((category: any) => {
            expect(category.workspace_id).toBe(workspaceId)
            expect(category.name).toBeDefined()
            expect(category.type).toMatch(/^(income|expense|transfer)$/)
            expect(category.icon).toBeDefined()
            expect(category.color).toBeDefined()
          })
          
          // Verify we have the expected category types
          const incomeCategories = categoriesCall.filter((c: any) => c.type === 'income')
          const expenseCategories = categoriesCall.filter((c: any) => c.type === 'expense')
          const transferCategories = categoriesCall.filter((c: any) => c.type === 'transfer')
          
          expect(incomeCategories.length).toBeGreaterThan(0)
          expect(expenseCategories.length).toBeGreaterThan(0)
          expect(transferCategories.length).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
  
  it('Property 11.2: Workspace creation with invalid data fails gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          workspaceName: fc.oneof(
            fc.constant(''), // Empty string
            fc.string({ maxLength: 0 }), // Empty
            fc.string({ minLength: 101, maxLength: 200 }), // Too long
            fc.constant('   '), // Only whitespace
          ),
          currency: fc.oneof(
            fc.constant('INVALID'), // Invalid currency
            fc.string({ minLength: 1, maxLength: 2 }), // Too short
            fc.string({ minLength: 4, maxLength: 10 }), // Too long
          ),
          userId: fc.uuid(),
        }),
        async ({ workspaceName, currency, userId }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: userId } },
            error: null
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('name', workspaceName)
          formData.set('currency', currency)
          
          // Execute action
          const result = await createWorkspaceAction(formData)
          
          // Should fail validation
          expect(result.error).toBeDefined()
          expect(result.data).toBeUndefined()
          
          // Should not attempt to create workspace or categories
          expect(mockWorkspacesTable.insert).not.toHaveBeenCalled()
          expect(mockCategoriesTable.insert).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 11.3: Workspace creation requires authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          workspaceName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          currency: fc.constantFrom('UAH', 'USD', 'EUR', 'GBP', 'PLN'),
        }),
        async ({ workspaceName, currency }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Setup mocks - no authenticated user
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated')
          })
          
          // Create FormData
          const formData = new FormData()
          formData.set('name', workspaceName)
          formData.set('currency', currency)
          
          // Execute action
          const result = await createWorkspaceAction(formData)
          
          // Should fail authentication
          expect(result.error).toBe('Authentication required')
          expect(result.data).toBeUndefined()
          
          // Should not attempt to create workspace or categories
          expect(mockWorkspacesTable.insert).not.toHaveBeenCalled()
          expect(mockCategoriesTable.insert).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
  
  it('Property 11.4: Default categories are consistent across workspace creations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            workspaceName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            currency: fc.constantFrom('UAH', 'USD', 'EUR', 'GBP', 'PLN'),
            userId: fc.uuid(),
            workspaceId: fc.uuid(),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (workspaces) => {
          const allCategoryCalls: any[] = []
          
          for (const { workspaceName, currency, userId, workspaceId } of workspaces) {
            // Reset mocks for each workspace
            vi.clearAllMocks()
            
            // Setup mocks
            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null
            })
            
            mockWorkspacesTable.single.mockResolvedValue({
              data: {
                id: workspaceId,
                name: workspaceName.trim(),
                owner_id: userId,
                currency,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
            
            mockCategoriesTable.insert.mockResolvedValue({
              data: [],
              error: null
            })
            
            // Create FormData
            const formData = new FormData()
            formData.set('name', workspaceName)
            formData.set('currency', currency)
            
            // Execute action
            await createWorkspaceAction(formData)
            
            // Collect category data
            if (mockCategoriesTable.insert.mock.calls.length > 0) {
              allCategoryCalls.push(mockCategoriesTable.insert.mock.calls[0][0])
            }
          }
          
          // Verify all workspaces got the same category structure
          if (allCategoryCalls.length > 1) {
            const firstCategories = allCategoryCalls[0]
            
            for (let i = 1; i < allCategoryCalls.length; i++) {
              const currentCategories = allCategoryCalls[i]
              
              // Same number of categories
              expect(currentCategories.length).toBe(firstCategories.length)
              
              // Same category names and types (ignoring workspace_id)
              const firstCategorySignatures = firstCategories.map((c: any) => `${c.name}:${c.type}:${c.icon}:${c.color}`)
              const currentCategorySignatures = currentCategories.map((c: any) => `${c.name}:${c.type}:${c.icon}:${c.color}`)
              
              expect(currentCategorySignatures.sort()).toEqual(firstCategorySignatures.sort())
            }
          }
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)
})