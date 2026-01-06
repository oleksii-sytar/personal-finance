import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Category Actions Integration Tests
 * Tests the category management system functionality
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

describe('Category Management Integration', () => {
  it('should verify categories table exists with correct schema', async () => {
    // Test basic table access
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should verify categories table has required columns', async () => {
    // Test that all required columns exist by selecting them
    const { error } = await supabase
      .from('categories')
      .select(`
        id,
        workspace_id,
        name,
        color,
        icon,
        type,
        is_default,
        created_at,
        updated_at
      `)
      .limit(1)

    expect(error).toBeNull()
  })

  it('should verify category type constraints', async () => {
    // Test that type field has proper constraints
    const { data, error } = await supabase
      .from('categories')
      .select('type')
      .limit(10)

    expect(error).toBeNull()
    
    // If there are categories, verify types are valid
    if (data && data.length > 0) {
      data.forEach(category => {
        expect(['income', 'expense']).toContain(category.type)
      })
    }
  })

  it('should verify workspace relationship exists', async () => {
    // Test that workspace_id foreign key constraint exists
    const { data, error } = await supabase
      .from('categories')
      .select(`
        id,
        workspace_id,
        workspaces!inner(id, name)
      `)
      .limit(1)

    // This should not error even if no data exists
    expect(error).toBeNull()
  })

  it('should handle database connection gracefully', async () => {
    // Test connection resilience
    const { error } = await supabase
      .from('categories')
      .select('count')
      .limit(1)

    // Should not throw connection errors
    expect(error).toBeNull()
  })
})