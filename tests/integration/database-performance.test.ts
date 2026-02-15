/**
 * Database query performance tests
 * 
 * Validates database query performance and caching effectiveness:
 * - Query execution time
 * - Index effectiveness
 * - Caching behavior
 * - Connection pool efficiency
 * 
 * These tests verify that database operations meet performance requirements.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@/lib/supabase/server'

// Performance thresholds for database operations
const DB_PERFORMANCE_THRESHOLDS = {
  SIMPLE_QUERY_MS: 100, // Simple SELECT queries
  FILTERED_QUERY_MS: 300, // Queries with WHERE clauses
  AGGREGATION_QUERY_MS: 500, // Queries with GROUP BY/aggregations
  COMPLEX_JOIN_MS: 800, // Queries with multiple JOINs
  ACCEPTABLE_VARIANCE_MS: 100, // Allow variance for network/CI
}

// Helper to measure query execution time
async function measureQueryTime<T>(
  queryFn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now()
  const result = await queryFn()
  const endTime = performance.now()
  const durationMs = endTime - startTime
  
  return { result, durationMs }
}

describe('Database Query Performance', () => {
  let supabase: Awaited<ReturnType<typeof createClient>>
  let testWorkspaceId: string
  let testAccountId: string
  let testUserId: string

  beforeAll(async () => {
    supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user for performance tests')
    }
    testUserId = user.id
    
    // Get or create test workspace
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', testUserId)
      .limit(1)
    
    if (workspaces && workspaces.length > 0) {
      testWorkspaceId = workspaces[0].id
    } else {
      const { data: newWorkspace } = await supabase
        .from('workspaces')
        .insert({ name: 'Performance Test Workspace', owner_id: testUserId })
        .select('id')
        .single()
      
      if (!newWorkspace) {
        throw new Error('Failed to create test workspace')
      }
      testWorkspaceId = newWorkspace.id
    }
    
    // Get or create test account
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', testWorkspaceId)
      .limit(1)
    
    if (accounts && accounts.length > 0) {
      testAccountId = accounts[0].id
    } else {
      const { data: newAccount } = await supabase
        .from('accounts')
        .insert({
          name: 'Performance Test Account',
          workspace_id: testWorkspaceId,
          initial_balance: 10000,
          currency: 'UAH',
        })
        .select('id')
        .single()
      
      if (!newAccount) {
        throw new Error('Failed to create test account')
      }
      testAccountId = newAccount.id
    }
  })

  describe('Transaction Query Performance', () => {
    it('should fetch transactions by account quickly', async () => {
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', testAccountId)
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
          .limit(100)
        
        if (error) throw error
        return data
      })
      
      // Assert: Should be fast with proper indexing
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.FILTERED_QUERY_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Transaction query by account in ${durationMs.toFixed(2)}ms (${result?.length || 0} rows)`)
    })

    it('should filter transactions by status efficiently', async () => {
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', testAccountId)
          .eq('status', 'completed')
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
        
        if (error) throw error
        return data
      })
      
      // Assert: Status filter should use index
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.FILTERED_QUERY_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Status filter query in ${durationMs.toFixed(2)}ms (${result?.length || 0} rows)`)
    })

    it('should filter by date range efficiently', async () => {
      const startDate = '2024-01-01'
      const endDate = '2024-12-31'
      
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', testAccountId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .is('deleted_at', null)
        
        if (error) throw error
        return data
      })
      
      // Assert: Date range queries should be indexed
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.FILTERED_QUERY_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Date range query in ${durationMs.toFixed(2)}ms (${result?.length || 0} rows)`)
    })

    it('should fetch planned transactions efficiently', async () => {
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', testAccountId)
          .eq('status', 'planned')
          .gte('planned_date', new Date().toISOString().split('T')[0])
          .is('deleted_at', null)
          .order('planned_date', { ascending: true })
        
        if (error) throw error
        return data
      })
      
      // Assert: Planned transaction queries should be fast
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.FILTERED_QUERY_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Planned transactions query in ${durationMs.toFixed(2)}ms (${result?.length || 0} rows)`)
    })
  })

  describe('Account Balance Query Performance', () => {
    it('should fetch account with balance quickly', async () => {
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { data, error } = await supabase
          .from('accounts')
          .select(`
            *,
            transactions!inner(
              amount,
              type,
              status
            )
          `)
          .eq('id', testAccountId)
          .eq('transactions.status', 'completed')
          .is('transactions.deleted_at', null)
          .single()
        
        if (error && error.code !== 'PGRST116') throw error // Ignore "not found" errors
        return data
      })
      
      // Assert: Account with transactions should be reasonably fast
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.COMPLEX_JOIN_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Account with balance query in ${durationMs.toFixed(2)}ms`)
    })

    it('should fetch multiple accounts efficiently', async () => {
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('workspace_id', testWorkspaceId)
          .is('deleted_at', null)
        
        if (error) throw error
        return data
      })
      
      // Assert: Simple account list should be very fast
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.SIMPLE_QUERY_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Multiple accounts query in ${durationMs.toFixed(2)}ms (${result?.length || 0} accounts)`)
    })
  })

  describe('Aggregation Query Performance', () => {
    it('should calculate transaction totals efficiently', async () => {
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('account_id', testAccountId)
          .eq('status', 'completed')
          .is('deleted_at', null)
        
        if (error) throw error
        
        // Calculate totals client-side (Supabase doesn't support SUM in select)
        const totals = data?.reduce((acc, tx) => {
          if (tx.type === 'income') {
            acc.income += tx.amount
          } else if (tx.type === 'expense') {
            acc.expense += tx.amount
          }
          return acc
        }, { income: 0, expense: 0 })
        
        return totals
      })
      
      // Assert: Aggregation should be reasonably fast
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.AGGREGATION_QUERY_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Transaction totals in ${durationMs.toFixed(2)}ms`)
    })

    it('should count transactions by status efficiently', async () => {
      // Act & Measure
      const { result, durationMs } = await measureQueryTime(async () => {
        const { count: completedCount, error: error1 } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', testAccountId)
          .eq('status', 'completed')
          .is('deleted_at', null)
        
        const { count: plannedCount, error: error2 } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', testAccountId)
          .eq('status', 'planned')
          .is('deleted_at', null)
        
        if (error1 || error2) throw error1 || error2
        
        return { completed: completedCount || 0, planned: plannedCount || 0 }
      })
      
      // Assert: Count queries should be fast
      expect(durationMs).toBeLessThan(
        DB_PERFORMANCE_THRESHOLDS.AGGREGATION_QUERY_MS + 
        DB_PERFORMANCE_THRESHOLDS.ACCEPTABLE_VARIANCE_MS
      )
      
      console.log(`✓ Transaction counts in ${durationMs.toFixed(2)}ms (completed: ${result.completed}, planned: ${result.planned})`)
    })
  })

  describe('Query Consistency Performance', () => {
    it('should have consistent query performance across multiple runs', async () => {
      const durations: number[] = []
      
      // Run same query 5 times
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureQueryTime(async () => {
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('account_id', testAccountId)
            .is('deleted_at', null)
            .limit(50)
          
          if (error) throw error
          return data
        })
        
        durations.push(durationMs)
      }
      
      // Calculate statistics
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)
      const variance = maxDuration - minDuration
      
      // Assert: Variance should be reasonable
      expect(variance).toBeLessThan(300) // < 300ms variance
      
      console.log(`✓ Query consistency: avg=${avgDuration.toFixed(2)}ms, min=${minDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms, variance=${variance.toFixed(2)}ms`)
    })
  })

  describe('Connection Performance', () => {
    it('should establish connection quickly', async () => {
      // Act & Measure: Create new client and run simple query
      const { durationMs } = await measureQueryTime(async () => {
        const newClient = await createClient()
        const { data, error } = await newClient
          .from('workspaces')
          .select('id')
          .limit(1)
        
        if (error) throw error
        return data
      })
      
      // Assert: Connection + simple query should be fast
      expect(durationMs).toBeLessThan(500) // < 500ms
      
      console.log(`✓ Connection + query in ${durationMs.toFixed(2)}ms`)
    })

    it('should handle concurrent queries efficiently', async () => {
      // Act & Measure: Run 5 queries concurrently
      const startTime = performance.now()
      
      const queries = Array.from({ length: 5 }, () =>
        supabase
          .from('transactions')
          .select('*')
          .eq('account_id', testAccountId)
          .is('deleted_at', null)
          .limit(20)
      )
      
      const results = await Promise.all(queries)
      const durationMs = performance.now() - startTime
      
      // Assert: Concurrent queries should not take 5x longer
      expect(durationMs).toBeLessThan(1500) // < 1.5 seconds for 5 queries
      
      // Verify all queries succeeded
      results.forEach(({ error }) => {
        expect(error).toBeNull()
      })
      
      console.log(`✓ 5 concurrent queries in ${durationMs.toFixed(2)}ms`)
    })
  })

  describe('Performance Summary', () => {
    it('should generate database performance report', async () => {
      console.log('\n=== Database Query Performance Summary ===')
      console.log(`Target: Simple queries < ${DB_PERFORMANCE_THRESHOLDS.SIMPLE_QUERY_MS}ms`)
      console.log(`Target: Filtered queries < ${DB_PERFORMANCE_THRESHOLDS.FILTERED_QUERY_MS}ms`)
      console.log(`Target: Aggregations < ${DB_PERFORMANCE_THRESHOLDS.AGGREGATION_QUERY_MS}ms`)
      console.log(`Target: Complex joins < ${DB_PERFORMANCE_THRESHOLDS.COMPLEX_JOIN_MS}ms`)
      console.log('==========================================\n')
      
      // This test always passes - it's just for reporting
      expect(true).toBe(true)
    })
  })
})
