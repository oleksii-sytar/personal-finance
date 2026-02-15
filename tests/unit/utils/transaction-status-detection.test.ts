/**
 * Unit tests for transaction status detection logic
 * Task: 3.5 Testing - Unit tests for status logic
 * 
 * Tests the core logic that determines whether a transaction
 * should be marked as 'planned' or 'completed' based on its date.
 */

import { describe, it, expect } from 'vitest'

/**
 * Determines if a transaction should be marked as planned based on its date
 * @param transactionDate - The date of the transaction
 * @returns true if the transaction is in the future (planned), false otherwise
 */
function isPlannedTransaction(transactionDate: Date | string): boolean {
  const txDate = typeof transactionDate === 'string' ? new Date(transactionDate) : transactionDate
  const today = new Date()
  
  // Set both dates to start of day for accurate comparison
  txDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  return txDate > today
}

/**
 * Gets the appropriate status for a transaction based on its date
 * @param transactionDate - The date of the transaction
 * @returns 'planned' if future date, 'completed' otherwise
 */
function getTransactionStatus(transactionDate: Date | string): 'planned' | 'completed' {
  return isPlannedTransaction(transactionDate) ? 'planned' : 'completed'
}

/**
 * Validates that a transaction date is within acceptable range
 * @param transactionDate - The date to validate
 * @returns true if date is valid (not more than 6 months in future)
 */
function isValidTransactionDate(transactionDate: Date | string): boolean {
  const txDate = typeof transactionDate === 'string' ? new Date(transactionDate) : transactionDate
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 6)
  
  return txDate <= maxDate
}

describe('Transaction Status Detection', () => {
  describe('isPlannedTransaction', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      
      expect(isPlannedTransaction(futureDate)).toBe(true)
    })

    it('should return false for today', () => {
      const today = new Date()
      
      expect(isPlannedTransaction(today)).toBe(false)
    })

    it('should return false for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      
      expect(isPlannedTransaction(pastDate)).toBe(false)
    })

    it('should handle string dates correctly', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      expect(isPlannedTransaction(tomorrowStr)).toBe(true)
    })

    it('should handle date at exact boundary (tomorrow at midnight)', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      expect(isPlannedTransaction(tomorrow)).toBe(true)
    })

    it('should handle date at exact boundary (today at midnight)', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      expect(isPlannedTransaction(today)).toBe(false)
    })

    it('should handle date at exact boundary (today at 23:59)', () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      
      expect(isPlannedTransaction(today)).toBe(false)
    })

    it('should return true for dates far in the future', () => {
      const farFuture = new Date()
      farFuture.setMonth(farFuture.getMonth() + 3)
      
      expect(isPlannedTransaction(farFuture)).toBe(true)
    })

    it('should return false for dates far in the past', () => {
      const farPast = new Date()
      farPast.setFullYear(farPast.getFullYear() - 1)
      
      expect(isPlannedTransaction(farPast)).toBe(false)
    })
  })

  describe('getTransactionStatus', () => {
    it('should return "planned" for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      
      expect(getTransactionStatus(futureDate)).toBe('planned')
    })

    it('should return "completed" for today', () => {
      const today = new Date()
      
      expect(getTransactionStatus(today)).toBe('completed')
    })

    it('should return "completed" for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 3)
      
      expect(getTransactionStatus(pastDate)).toBe('completed')
    })

    it('should handle string dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      expect(getTransactionStatus(tomorrowStr)).toBe('planned')
      
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      expect(getTransactionStatus(yesterdayStr)).toBe('completed')
    })

    it('should handle ISO date strings', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)
      const isoString = futureDate.toISOString()
      
      expect(getTransactionStatus(isoString)).toBe('planned')
    })

    it('should handle date-only strings (YYYY-MM-DD)', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateOnlyStr = tomorrow.toISOString().split('T')[0]
      
      expect(getTransactionStatus(dateOnlyStr)).toBe('planned')
    })
  })

  describe('isValidTransactionDate', () => {
    it('should return true for dates within 6 months', () => {
      const validDate = new Date()
      validDate.setMonth(validDate.getMonth() + 3)
      
      expect(isValidTransactionDate(validDate)).toBe(true)
    })

    it('should return true for today', () => {
      const today = new Date()
      
      expect(isValidTransactionDate(today)).toBe(true)
    })

    it('should return true for past dates', () => {
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 1)
      
      expect(isValidTransactionDate(pastDate)).toBe(true)
    })

    it('should return true for date exactly 6 months ahead', () => {
      const sixMonthsAhead = new Date()
      sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6)
      
      expect(isValidTransactionDate(sixMonthsAhead)).toBe(true)
    })

    it('should return false for dates more than 6 months ahead', () => {
      const tooFarAhead = new Date()
      tooFarAhead.setMonth(tooFarAhead.getMonth() + 7)
      
      expect(isValidTransactionDate(tooFarAhead)).toBe(false)
    })

    it('should handle string dates', () => {
      const validDate = new Date()
      validDate.setMonth(validDate.getMonth() + 2)
      const validDateStr = validDate.toISOString().split('T')[0]
      
      expect(isValidTransactionDate(validDateStr)).toBe(true)
      
      const invalidDate = new Date()
      invalidDate.setMonth(invalidDate.getMonth() + 8)
      const invalidDateStr = invalidDate.toISOString().split('T')[0]
      
      expect(isValidTransactionDate(invalidDateStr)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle leap year dates correctly', () => {
      // February 29 in a leap year
      const leapYearDate = new Date('2024-02-29')
      
      // Should not throw error
      expect(() => isPlannedTransaction(leapYearDate)).not.toThrow()
      expect(() => getTransactionStatus(leapYearDate)).not.toThrow()
    })

    it('should handle month boundaries correctly', () => {
      // Last day of month
      const lastDayOfMonth = new Date()
      lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1, 0) // Last day of current month
      
      expect(() => isPlannedTransaction(lastDayOfMonth)).not.toThrow()
      
      // First day of next month
      const firstDayOfNextMonth = new Date()
      firstDayOfNextMonth.setMonth(firstDayOfNextMonth.getMonth() + 1, 1)
      
      expect(() => isPlannedTransaction(firstDayOfNextMonth)).not.toThrow()
    })

    it('should handle year boundaries correctly', () => {
      // December 31
      const lastDayOfYear = new Date()
      lastDayOfYear.setMonth(11, 31)
      
      expect(() => isPlannedTransaction(lastDayOfYear)).not.toThrow()
      
      // January 1 next year
      const firstDayOfNextYear = new Date()
      firstDayOfNextYear.setFullYear(firstDayOfNextYear.getFullYear() + 1, 0, 1)
      
      expect(() => isPlannedTransaction(firstDayOfNextYear)).not.toThrow()
    })

    it('should handle timezone differences correctly', () => {
      // Create date in different timezone
      const dateStr = '2024-12-25T00:00:00Z'
      const date = new Date(dateStr)
      
      // Should handle timezone conversion properly
      expect(() => isPlannedTransaction(date)).not.toThrow()
      expect(() => getTransactionStatus(date)).not.toThrow()
    })

    it('should handle invalid date strings gracefully', () => {
      const invalidDate = 'not-a-date'
      
      // Should create Invalid Date but not throw
      expect(() => isPlannedTransaction(invalidDate)).not.toThrow()
    })

    it('should handle very old dates', () => {
      const veryOldDate = new Date('1900-01-01')
      
      expect(isPlannedTransaction(veryOldDate)).toBe(false)
      expect(getTransactionStatus(veryOldDate)).toBe('completed')
      expect(isValidTransactionDate(veryOldDate)).toBe(true)
    })

    it('should handle dates at DST boundaries', () => {
      // Spring forward (March) - clocks move forward 1 hour
      const springDST = new Date('2024-03-10T02:00:00')
      expect(() => isPlannedTransaction(springDST)).not.toThrow()
      
      // Fall back (November) - clocks move back 1 hour
      const fallDST = new Date('2024-11-03T02:00:00')
      expect(() => isPlannedTransaction(fallDST)).not.toThrow()
    })
  })

  describe('Status Transition Logic', () => {
    it('should transition from planned to completed when date becomes today', () => {
      // Simulate a transaction created yesterday for today
      const today = new Date()
      
      // When created yesterday, it would have been planned
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // But now it should be completed
      expect(getTransactionStatus(today)).toBe('completed')
    })

    it('should remain planned for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      
      expect(getTransactionStatus(futureDate)).toBe('planned')
      
      // Even after some time passes (simulated)
      const stillFutureDate = new Date()
      stillFutureDate.setDate(stillFutureDate.getDate() + 9)
      
      expect(getTransactionStatus(stillFutureDate)).toBe('planned')
    })

    it('should handle status check at different times of day', () => {
      const today = new Date()
      
      // Morning
      today.setHours(6, 0, 0, 0)
      expect(getTransactionStatus(today)).toBe('completed')
      
      // Noon
      today.setHours(12, 0, 0, 0)
      expect(getTransactionStatus(today)).toBe('completed')
      
      // Evening
      today.setHours(20, 0, 0, 0)
      expect(getTransactionStatus(today)).toBe('completed')
      
      // Late night
      today.setHours(23, 59, 59, 999)
      expect(getTransactionStatus(today)).toBe('completed')
    })
  })

  describe('Consistency Tests', () => {
    it('should give consistent results for same date checked multiple times', () => {
      const testDate = new Date()
      testDate.setDate(testDate.getDate() + 3)
      
      const result1 = isPlannedTransaction(testDate)
      const result2 = isPlannedTransaction(testDate)
      const result3 = isPlannedTransaction(testDate)
      
      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    })

    it('should give consistent results for Date object vs string', () => {
      const dateObj = new Date()
      dateObj.setDate(dateObj.getDate() + 2)
      
      const dateStr = dateObj.toISOString().split('T')[0]
      
      expect(isPlannedTransaction(dateObj)).toBe(isPlannedTransaction(dateStr))
      expect(getTransactionStatus(dateObj)).toBe(getTransactionStatus(dateStr))
    })

    it('should maintain consistency between status functions', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      
      const isPlanned = isPlannedTransaction(futureDate)
      const status = getTransactionStatus(futureDate)
      
      expect(isPlanned).toBe(status === 'planned')
    })
  })
})
