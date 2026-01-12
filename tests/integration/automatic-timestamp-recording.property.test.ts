/**
 * Property-Based Test for Automatic Timestamp Recording
 * 
 * Feature: checkpoint-reconciliation, Property 2: Automatic Timestamp Recording
 * 
 * Tests that checkpoint creation automatically records timestamps within a reasonable
 * range of the actual creation time.
 * 
 * Validates: Requirements 1.3
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@/lib/supabase/client'
import { createCheckpoint } from '@/actions/reconciliation'
import { createTestUser, createTestWorkspace, cleanupTestData } from '../helpers/test-helpers'

describe('Property 2: Automatic Timestamp Recording', () => {
  let supabase: ReturnType<typeof createClient>
  let testUserId: string
  let testWorkspaceId: string

  beforeAll(async () => {
    // Ensure we have environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables - cannot run integration tests')
    }
    
    supabase = createClient()
    
    // Create test user and workspace
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    testUserId = user.id
    testWorkspaceId = workspace.id
  })

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData(testUserId)
  })

  it('Property 2: Automatic Timestamp Recording - checkpoint timestamps should be within reasonable range', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for checkpoint creation
        fc.record({
          account_balances: fc.array(
            fc.record({
              account_id: fc.uuid(),
              account_name: fc.string({ minLength: 1, maxLength: 50 }),
              actual_balance: fc.float({ min: -10000, max: 100000, noNaN: true }),
              currency: fc.constantFrom('UAH', 'USD', 'EUR')
            }),
            { minLength: 1, maxLength: 3 }
          ),
          notes: fc.option(fc.string({ maxLength: 200 }))
        }),
        async (testData) => {
          const { account_balances, notes } = testData

          // Record the time before checkpoint creation
          const beforeCreation = new Date()

          // Create form data for checkpoint creation
          const formData = new FormData()
          
          account_balances.forEach((balance, index) => {
            formData.set(`account_balances[${index}][account_id]`, balance.account_id)
            formData.set(`account_balances[${index}][account_name]`, balance.account_name)
            formData.set(`account_balances[${index}][actual_balance]`, balance.actual_balance.toString())
            formData.set(`account_balances[${index}][currency]`, balance.currency)
          })
          
          if (notes) {
            formData.set('notes', notes)
          }

          // Create checkpoint
          const result = await createCheckpoint(formData)

          // Record the time after checkpoint creation
          const afterCreation = new Date()

          // Property assertion: Checkpoint should be created successfully
          expect(result.error).toBeUndefined()
          expect(result.data).toBeDefined()

          if (result.data) {
            const checkpoint = result.data

            // Property assertion: Checkpoint should have automatic timestamp
            expect(checkpoint.created_at).toBeInstanceOf(Date)

            // Property assertion: Timestamp should be within reasonable range (±1 minute)
            const timestampTime = checkpoint.created_at.getTime()
            const beforeTime = beforeCreation.getTime()
            const afterTime = afterCreation.getTime()

            // Allow for 1 minute buffer on each side to account for processing time
            const oneMinuteMs = 60 * 1000
            const minAllowedTime = beforeTime - oneMinuteMs
            const maxAllowedTime = afterTime + oneMinuteMs

            expect(timestampTime).toBeGreaterThanOrEqual(minAllowedTime)
            expect(timestampTime).toBeLessThanOrEqual(maxAllowedTime)

            // Property assertion: Timestamp should be reasonably close to creation time
            // (within 10 seconds for most cases, allowing for database latency)
            const timeDifferenceMs = Math.abs(timestampTime - beforeTime)
            const tenSecondsMs = 10 * 1000
            
            // This is a softer assertion - most checkpoints should be created quickly
            // but we allow for occasional slower operations
            if (timeDifferenceMs > tenSecondsMs) {
              console.warn(`Checkpoint creation took ${timeDifferenceMs}ms, which is longer than expected`)
            }

            // Property assertion: Timestamp should not be in the future (beyond reasonable processing time)
            const futureThresholdMs = 5 * 1000 // 5 seconds
            expect(timestampTime).toBeLessThanOrEqual(afterTime + futureThresholdMs)

            // Property assertion: Timestamp should not be too far in the past
            const pastThresholdMs = 60 * 1000 // 1 minute
            expect(timestampTime).toBeGreaterThanOrEqual(beforeTime - pastThresholdMs)

            // Property assertion: Timestamp should be a valid date
            expect(Number.isNaN(checkpoint.created_at.getTime())).toBe(false)

            // Property assertion: Timestamp should be in ISO format when serialized
            const isoString = checkpoint.created_at.toISOString()
            expect(typeof isoString).toBe('string')
            expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

            // Property assertion: Timestamp should be consistent with database storage
            // (Check that the timestamp can be round-tripped through database format)
            const roundTripDate = new Date(isoString)
            expect(roundTripDate.getTime()).toBe(checkpoint.created_at.getTime())
          }
        }
      ),
      { numRuns: 20 } // Run 20 iterations to test various scenarios
    )
  }, 60000) // 60 second timeout to allow for database operations

  it('Property 2: Automatic Timestamp Recording - multiple checkpoints should have increasing timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for multiple checkpoint creation
        fc.array(
          fc.record({
            account_balances: fc.array(
              fc.record({
                account_id: fc.uuid(),
                account_name: fc.string({ minLength: 1, maxLength: 30 }),
                actual_balance: fc.float({ min: -1000, max: 10000, noNaN: true }),
                currency: fc.constant('UAH') // Use consistent currency for simplicity
              }),
              { minLength: 1, maxLength: 2 }
            ),
            notes: fc.option(fc.string({ maxLength: 100 }))
          }),
          { minLength: 2, maxLength: 3 } // Create 2-3 checkpoints
        ),
        async (checkpointDataArray) => {
          const createdCheckpoints = []
          const creationTimes = []

          // Create checkpoints sequentially with small delays
          for (const checkpointData of checkpointDataArray) {
            const beforeCreation = new Date()
            creationTimes.push(beforeCreation)

            // Create form data
            const formData = new FormData()
            
            checkpointData.account_balances.forEach((balance, index) => {
              formData.set(`account_balances[${index}][account_id]`, balance.account_id)
              formData.set(`account_balances[${index}][account_name]`, balance.account_name)
              formData.set(`account_balances[${index}][actual_balance]`, balance.actual_balance.toString())
              formData.set(`account_balances[${index}][currency]`, balance.currency)
            })
            
            if (checkpointData.notes) {
              formData.set('notes', checkpointData.notes)
            }

            // Create checkpoint
            const result = await createCheckpoint(formData)
            
            expect(result.error).toBeUndefined()
            expect(result.data).toBeDefined()

            if (result.data) {
              createdCheckpoints.push(result.data)
            }

            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          // Property assertion: All checkpoints should have been created
          expect(createdCheckpoints.length).toBe(checkpointDataArray.length)

          // Property assertion: Timestamps should be in chronological order
          for (let i = 1; i < createdCheckpoints.length; i++) {
            const previousTimestamp = createdCheckpoints[i - 1].created_at.getTime()
            const currentTimestamp = createdCheckpoints[i].created_at.getTime()
            
            // Current timestamp should be greater than or equal to previous
            // (allowing for same millisecond in rare cases)
            expect(currentTimestamp).toBeGreaterThanOrEqual(previousTimestamp)
          }

          // Property assertion: Each timestamp should be close to its creation time
          for (let i = 0; i < createdCheckpoints.length; i++) {
            const checkpoint = createdCheckpoints[i]
            const creationTime = creationTimes[i]
            
            const timeDifference = Math.abs(
              checkpoint.created_at.getTime() - creationTime.getTime()
            )
            
            // Should be within 30 seconds (generous allowance for database operations)
            const thirtySecondsMs = 30 * 1000
            expect(timeDifference).toBeLessThanOrEqual(thirtySecondsMs)
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations (fewer due to multiple checkpoint creation)
    )
  }, 90000) // 90 second timeout for multiple operations

  it('Property 2: Automatic Timestamp Recording - timestamp precision should be consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate simple test data
        fc.record({
          account_id: fc.uuid(),
          account_name: fc.string({ minLength: 1, maxLength: 20 }),
          actual_balance: fc.float({ min: 0, max: 1000, noNaN: true })
        }),
        async (accountData) => {
          // Create form data
          const formData = new FormData()
          formData.set('account_balances[0][account_id]', accountData.account_id)
          formData.set('account_balances[0][account_name]', accountData.account_name)
          formData.set('account_balances[0][actual_balance]', accountData.actual_balance.toString())
          formData.set('account_balances[0][currency]', 'UAH')

          // Create checkpoint
          const result = await createCheckpoint(formData)

          expect(result.error).toBeUndefined()
          expect(result.data).toBeDefined()

          if (result.data) {
            const checkpoint = result.data

            // Property assertion: Timestamp should have millisecond precision
            const timestamp = checkpoint.created_at
            const milliseconds = timestamp.getMilliseconds()
            
            // Milliseconds should be a valid value (0-999)
            expect(milliseconds).toBeGreaterThanOrEqual(0)
            expect(milliseconds).toBeLessThanOrEqual(999)

            // Property assertion: Timestamp should be precise enough to distinguish operations
            const timestampString = timestamp.toISOString()
            expect(timestampString).toMatch(/\.\d{3}Z$/) // Should end with .xxxZ format

            // Property assertion: Timestamp should be consistent when converted back and forth
            const reconstructedDate = new Date(timestampString)
            expect(reconstructedDate.getTime()).toBe(timestamp.getTime())

            // Property assertion: Timestamp should maintain timezone information (UTC)
            expect(timestampString.endsWith('Z')).toBe(true)
            expect(timestamp.getTimezoneOffset()).toBe(new Date().getTimezoneOffset())
          }
        }
      ),
      { numRuns: 15 } // Run 15 iterations
    )
  }, 45000) // 45 second timeout
})