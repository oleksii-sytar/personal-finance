import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { ReconciliationStatusService } from '@/lib/services/reconciliation-status'

/**
 * Property-based tests for days since checkpoint calculation
 * Feature: checkpoint-reconciliation, Property 17: Days Since Checkpoint Calculation
 * **Validates: Requirements 5.1**
 */
describe('Days Since Checkpoint Calculation Property Tests', () => {
  it('should correctly calculate days between any two dates', () => {
    fc.assert(
      fc.property(
        // Generate two dates where the second is after the first
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: 0, max: 365 * 5 }), // Up to 5 years difference
        (baseDate, daysToAdd) => {
          const checkpointDate = new Date(baseDate)
          const currentDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
          
          const calculatedDays = ReconciliationStatusService.calculateDaysSinceCheckpoint(
            checkpointDate,
            currentDate
          )
          
          // Property: The calculated days should equal the actual days difference
          expect(calculatedDays).toBe(daysToAdd)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when current date is before checkpoint date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: 1, max: 365 }), // Days to subtract
        (baseDate, daysToSubtract) => {
          const checkpointDate = new Date(baseDate)
          const currentDate = new Date(baseDate.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)
          
          const calculatedDays = ReconciliationStatusService.calculateDaysSinceCheckpoint(
            checkpointDate,
            currentDate
          )
          
          // Property: Should never return negative days
          expect(calculatedDays).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle same date correctly', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (date) => {
          const calculatedDays = ReconciliationStatusService.calculateDaysSinceCheckpoint(
            date,
            date
          )
          
          // Property: Same date should return 0 days
          expect(calculatedDays).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle time differences within the same day', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: 0, max: 23 }), // Hours
        fc.integer({ min: 0, max: 59 }), // Minutes
        fc.integer({ min: 0, max: 59 }), // Seconds
        (baseDate, hours, minutes, seconds) => {
          const checkpointDate = new Date(baseDate)
          checkpointDate.setHours(0, 0, 0, 0) // Start of day
          
          const currentDate = new Date(checkpointDate)
          currentDate.setHours(hours, minutes, seconds, 0) // Same day, different time
          
          const calculatedDays = ReconciliationStatusService.calculateDaysSinceCheckpoint(
            checkpointDate,
            currentDate
          )
          
          // Property: Time differences within the same day should return 0
          expect(calculatedDays).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should be consistent with manual calculation for any date pair', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (date1, date2) => {
          // Ensure date2 is after date1
          const checkpointDate = date1 < date2 ? date1 : date2
          const currentDate = date1 < date2 ? date2 : date1
          
          const calculatedDays = ReconciliationStatusService.calculateDaysSinceCheckpoint(
            checkpointDate,
            currentDate
          )
          
          // Manual calculation for verification
          const timeDiff = currentDate.getTime() - checkpointDate.getTime()
          const expectedDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
          
          // Property: Should match manual calculation
          expect(calculatedDays).toBe(Math.max(0, expectedDays))
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle leap years correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(2020, 2024, 2028), // Leap years
        fc.integer({ min: 1, max: 12 }), // Month
        fc.integer({ min: 1, max: 28 }), // Day (safe for all months)
        (year, month, day) => {
          const checkpointDate = new Date(year, month - 1, day) // Feb 29th in leap year
          const currentDate = new Date(year + 1, month - 1, day) // Same date next year
          
          const calculatedDays = ReconciliationStatusService.calculateDaysSinceCheckpoint(
            checkpointDate,
            currentDate
          )
          
          // Property: Should correctly account for leap year (366 days vs 365)
          const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
          const expectedDays = isLeapYear ? 366 : 365
          
          expect(calculatedDays).toBe(expectedDays)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle month boundaries correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }), // Year
        fc.integer({ min: 1, max: 11 }), // Month (1-11 to avoid December->January year change)
        (year, month) => {
          // Last day of month
          const checkpointDate = new Date(year, month, 0) // 0th day = last day of previous month
          // First day of next month
          const currentDate = new Date(year, month, 1)
          
          const calculatedDays = ReconciliationStatusService.calculateDaysSinceCheckpoint(
            checkpointDate,
            currentDate
          )
          
          // Property: Should be exactly 1 day between last day of month and first day of next
          expect(calculatedDays).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})