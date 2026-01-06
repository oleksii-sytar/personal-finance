/**
 * Debug test for default category assignment
 */

import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

describe('Debug Default Category Assignment', () => {
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  it('should create a simple test case', async () => {
    let testUser: any
    let testWorkspace: any

    try {
      // Create test user
      const email = `test-${Date.now()}@example.com`
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
      })
      
      console.log('User creation result:', { userData, userError })
      expect(userError).toBeNull()
      expect(userData.user).toBeDefined()
      testUser = userData.user

      // Create test workspace
      const { data: workspaceData, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name: `Test Workspace ${Date.now()}`,
          owner_id: testUser.id,
        })
        .select()
        .single()
      
      console.log('Workspace creation result:', { workspaceData, workspaceError })
      expect(workspaceError).toBeNull()
      expect(workspaceData).toBeDefined()
      testWorkspace = workspaceData

      // Create a default category
      const { data: categoryData, error: categoryError } = await supabaseAdmin
        .from('categories')
        .insert({
          workspace_id: testWorkspace.id,
          name: 'Other Income',
          type: 'income',
          is_default: true,
          color: '#4E7A58',
          icon: '💰',
        })
        .select()
        .single()

      console.log('Category creation result:', { categoryData, categoryError })
      expect(categoryError).toBeNull()
      expect(categoryData).toBeDefined()

      if (categoryData) {
        expect(categoryData.is_default).toBe(true)
        expect(categoryData.type).toBe('income')
        expect(categoryData.workspace_id).toBe(testWorkspace.id)

        // Create a transaction using the default category
        const { data: transactionData, error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert({
            workspace_id: testWorkspace.id,
            user_id: testUser.id,
            amount: 100,
            currency: 'UAH',
            description: 'Test transaction',
            type: 'income',
            category_id: categoryData.id,
            transaction_date: new Date().toISOString().split('T')[0],
            created_by: testUser.id,
          })
          .select()
          .single()

        console.log('Transaction creation result:', { transactionData, transactionError })
        expect(transactionError).toBeNull()
        expect(transactionData).toBeDefined()

        if (transactionData) {
          expect(transactionData.category_id).toBe(categoryData.id)
          expect(transactionData.type).toBe('income')
        }
      }

    } catch (error) {
      console.error('Test error:', error)
      throw error
    } finally {
      // Cleanup
      if (testWorkspace?.id) {
        await supabaseAdmin.from('workspaces').delete().eq('id', testWorkspace.id)
      }
      if (testUser?.id) {
        await supabaseAdmin.auth.admin.deleteUser(testUser.id)
      }
    }
  }, 15000)
})