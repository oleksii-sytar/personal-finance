import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@/lib/supabase/client'

/**
 * Integration tests for workspace operations with cloud database
 * These tests verify workspace operations work with the cloud database
 */
describe('Workspace Integration', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient()
  })

  it('should be able to query workspaces table', async () => {
    // Test that we can query the workspaces table with RLS enabled
    const { data, error } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
    
    // With RLS enabled, unauthenticated queries should return empty data, not error
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0) // Should be empty due to RLS
  })

  it('should enforce RLS on workspaces table', async () => {
    // Test that RLS is properly enforced
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
    
    // Should return empty data due to RLS (no authentication)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0) // Should be empty due to RLS
  })

  it('should be able to query workspace_members table', async () => {
    // Test that we can query the workspace_members table with RLS
    const { data, error } = await supabase
      .from('workspace_members')
      .select('id')
      .limit(1)
    
    // With RLS enabled, unauthenticated queries should return empty data
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0) // Should be empty due to RLS
  })

  it('should be able to query categories table', async () => {
    // Test that we can query the categories table
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1)
    
    // Should not error (even if no data due to RLS)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should handle database connection timeouts gracefully', async () => {
    // Test connection with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    })

    const queryPromise = supabase
      .from('workspaces')
      .select('count')
      .limit(1)

    try {
      const result = await Promise.race([queryPromise, timeoutPromise])
      expect(result).toBeDefined()
    } catch (error) {
      // If timeout occurs, fail the test - indicates connection issues
      expect(error).toBeNull() // This will fail and show the timeout error
    }
  })
})