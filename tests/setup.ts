import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local for tests
config({ path: '.env.local' })

// Track test users created during test runs for cleanup
const testUsersCreated = new Set<string>()

// Export function to register test users for cleanup
export function registerTestUser(userId: string) {
  testUsersCreated.add(userId)
}

// Start server before all tests
beforeAll(() => server.listen({ 
  onUnhandledRequest: 'bypass' // Allow real Supabase requests for integration tests
}))

// Clean up after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Close server and clean up test users after all tests
afterAll(async () => {
  server.close()
  
  // Clean up test users created during tests
  if (testUsersCreated.size > 0) {
    console.log(`\n🧹 Cleaning up ${testUsersCreated.size} test users...`)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      let cleanedCount = 0
      for (const userId of testUsersCreated) {
        try {
          // Delete all related data first
          await supabase.from('transactions').delete().eq('user_id', userId)
          await supabase.from('recurring_transactions').delete().eq('workspace_id', userId)
          await supabase.from('workspace_members').delete().eq('user_id', userId)
          await supabase.from('accounts').delete().eq('workspace_id', userId)
          await supabase.from('workspaces').delete().eq('owner_id', userId)
          await supabase.from('user_profiles').delete().eq('id', userId)
          
          // Delete the auth user
          await supabase.auth.admin.deleteUser(userId)
          cleanedCount++
        } catch (error) {
          console.error(`Failed to cleanup test user ${userId}:`, error)
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount}/${testUsersCreated.size} test users`)
      testUsersCreated.clear()
    }
  }
})