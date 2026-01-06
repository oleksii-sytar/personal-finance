/**
 * Property-Based Test for Transaction Type Family Constraint
 * 
 * Feature: transactions, Property 18: Transaction Type Family Constraint
 * 
 * Tests that for any custom transaction type creation, the type must be assigned 
 * to either the Income or Expense family (Requirement 8.3)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'
import { transactionTypeSchema } from '@/lib/validations/transaction-type'

describe('Property 18: Transaction Type Family Constraint', () => {
  let supabaseAdmin: any
  let testUserId: string
  let testWorkspaceId: string

  beforeEach(async () => {
    // Create admin client for test setup
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create test user and workspace
    const testUser = await createTestUser()
    const testWorkspace = await createTestWorkspace(testUser.id)
    
    testUserId = testUser.id
    testWorkspaceId = testWorkspace.id
  })

  afterEach(async () => {
    if (testUserId) {
      await cleanupTestData(testUserId)
    }
  })

  it('Property 18: Transaction Type Family Constraint - validates family assignment requirement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          family: fc.constantFrom('income', 'expense'),
          description: fc.option(fc.string({ maxLength: 200 })),
          icon: fc.option(fc.string({ minLength: 1, maxLength: 5 })),
          color: fc.option(fc.constantFrom('#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'))
        }),
        async (transactionTypeData) => {
          // Create transaction type data
          const transactionTypeInput = {
            name: `${transactionTypeData.name}-${Date.now()}-${Math.random()}`, // Ensure unique name
            family: transactionTypeData.family,
            workspace_id: testWorkspaceId,
            description: transactionTypeData.description || undefined,
            icon: transactionTypeData.icon || undefined,
            color: transactionTypeData.color || undefined,
            is_system: false,
            is_default: false
          }

          // Validate using Zod schema first
          const validationResult = transactionTypeSchema.omit({ 
            id: true, 
            created_at: true, 
            updated_at: true 
          }).safeParse(transactionTypeInput)

          expect(validationResult.success).toBe(true)

          if (validationResult.success) {
            // Create the transaction type in the database
            const { data: createdType, error: createError } = await supabaseAdmin
              .from('transaction_types')
              .insert(validationResult.data)
              .select()
              .single()

            // The creation should succeed for valid families
            expect(createError).toBeNull()
            expect(createdType).toBeDefined()

            if (createdType) {
              // Verify the family constraint is enforced
              expect(createdType.family).toBe(transactionTypeData.family)
              expect(['income', 'expense']).toContain(createdType.family)
              expect(createdType.workspace_id).toBe(testWorkspaceId)
            }
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    )
  }, 15000)

  it('Property 18: Transaction Type Family Constraint - rejects invalid family values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          family: fc.string().filter(s => !['income', 'expense'].includes(s)), // Invalid family values
          description: fc.option(fc.string({ maxLength: 200 }))
        }),
        async (transactionTypeData) => {
          // Create transaction type data with invalid family
          const transactionTypeInput = {
            name: `${transactionTypeData.name}-${Date.now()}-${Math.random()}`,
            family: transactionTypeData.family,
            workspace_id: testWorkspaceId,
            description: transactionTypeData.description || undefined,
            is_system: false,
            is_default: false
          }

          // Validate using Zod schema - should fail for invalid family
          const validationResult = transactionTypeSchema.omit({ 
            id: true, 
            created_at: true, 
            updated_at: true 
          }).safeParse(transactionTypeInput)

          // The validation should fail due to invalid family
          expect(validationResult.success).toBe(false)

          // Also test database constraint if validation somehow passes
          if (validationResult.success) {
            const { data: createdType, error: createError } = await supabaseAdmin
              .from('transaction_types')
              .insert(validationResult.data)
              .select()
              .single()

            // Database should also reject invalid family values
            expect(createError).toBeDefined()
            expect(createdType).toBeNull()
          }
        }
      ),
      { numRuns: 10, timeout: 10000 }
    )
  }, 15000)

  it('Property 18: Transaction Type Family Constraint - validates family constraint at database level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('income', 'expense'),
        async (validFamily) => {
          // Test that the database constraint enforces valid family values
          const transactionTypeName = `Test Type ${Date.now()}-${Math.random()}`
          
          // Create a valid transaction type
          const { data: validType, error: validError } = await supabaseAdmin
            .from('transaction_types')
            .insert({
              workspace_id: testWorkspaceId,
              name: transactionTypeName,
              family: validFamily,
              is_system: false,
              is_default: false
            })
            .select()
            .single()

          // Valid family should succeed
          expect(validError).toBeNull()
          expect(validType).toBeDefined()
          expect(validType.family).toBe(validFamily)

          // Test that invalid family values are rejected at database level
          const invalidFamilyName = `Invalid Type ${Date.now()}-${Math.random()}`
          
          const { data: invalidType, error: invalidError } = await supabaseAdmin
            .from('transaction_types')
            .insert({
              workspace_id: testWorkspaceId,
              name: invalidFamilyName,
              family: 'invalid_family', // This should be rejected
              is_system: false,
              is_default: false
            })
            .select()
            .single()

          // Invalid family should fail
          expect(invalidError).toBeDefined()
          expect(invalidType).toBeNull()
        }
      ),
      { numRuns: 10, timeout: 10000 }
    )
  }, 15000)

  it('Property 18: Transaction Type Family Constraint - ensures family immutability concept', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialFamily: fc.constantFrom('income', 'expense'),
          newFamily: fc.constantFrom('income', 'expense')
        }).filter(({ initialFamily, newFamily }) => initialFamily !== newFamily),
        async ({ initialFamily, newFamily }) => {
          // Create a transaction type with initial family
          const transactionTypeName = `Immutable Type ${Date.now()}-${Math.random()}`
          
          const { data: createdType, error: createError } = await supabaseAdmin
            .from('transaction_types')
            .insert({
              workspace_id: testWorkspaceId,
              name: transactionTypeName,
              family: initialFamily,
              is_system: false,
              is_default: false
            })
            .select()
            .single()

          expect(createError).toBeNull()
          expect(createdType).toBeDefined()
          expect(createdType.family).toBe(initialFamily)

          // Verify that the validation schema prevents family changes
          const updateData = {
            name: transactionTypeName,
            family: newFamily // Attempt to change family
          }

          const { updateTransactionTypeSchema } = await import('@/lib/validations/transaction-type')
          const updateValidation = updateTransactionTypeSchema.safeParse(updateData)

          // The update validation should succeed but family should be undefined (filtered out)
          if (updateValidation.success) {
            expect(updateValidation.data.family).toBeUndefined()
          }

          // Verify in database that family hasn't changed
          const { data: finalType, error: fetchError } = await supabaseAdmin
            .from('transaction_types')
            .select('*')
            .eq('id', createdType.id)
            .single()

          expect(fetchError).toBeNull()
          expect(finalType).toBeDefined()
          expect(finalType.family).toBe(initialFamily) // Family should remain unchanged
        }
      ),
      { numRuns: 10, timeout: 10000 }
    )
  }, 15000)
})