import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@/lib/supabase/client'

/**
 * Integration tests for Supabase cloud connection
 * These are the most critical tests - they verify our cloud database connectivity
 */
describe('Supabase Cloud Connection Integration', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    // Ensure we have environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables - cannot run integration tests')
    }
    
    supabase = createClient()
  })

  it('should connect to Supabase cloud database', async () => {
    // Test basic connection by checking auth status
    const { data, error } = await supabase.auth.getSession()
    
    // We expect no error (even if no session exists)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should be able to query database tables', async () => {
    // Test that we can query the database structure with proper RLS
    // This should return empty array (not error) when no auth or no access
    const { data, error } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
    
    // With RLS enabled, unauthenticated queries should return empty data, not error
    // This confirms RLS is working properly
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0) // Should be empty due to RLS
  })

  it('should have proper RLS policies in place', async () => {
    // Test that RLS is working by trying to access data without auth
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
    
    // Should return empty array due to RLS, not an error
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should be able to check database health', async () => {
    // Test a simple query that should always work
    const { data, error } = await supabase
      .rpc('get_user_workspace_context')
    
    // Function should exist and be callable (even if returns empty)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should handle network timeouts gracefully', async () => {
    // Test connection with a reasonable timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 10000) // 10 second timeout
    })

    const queryPromise = supabase
      .from('workspaces')
      .select('count')
      .limit(1)

    try {
      const result = await Promise.race([queryPromise, timeoutPromise])
      expect(result).toBeDefined()
    } catch (error) {
      // If timeout occurs, fail the test - this indicates connection issues
      expect(error).toBeNull() // This will fail and show the timeout error
    }
  })
})