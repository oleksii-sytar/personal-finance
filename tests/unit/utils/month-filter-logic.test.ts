/**
 * Unit tests for month filtering logic
 * Requirements 4.2: Month filtering accuracy
 */

import { describe, it, expect } from 'vitest'

/**
 * Helper function to calculate month date range
 * This is the core logic used in useTransactions hook
 */
function getMonthDateRange(monthString: string): { start: string; end: string } {
  const [year, month] = monthString.split('-').map(Number)
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const endOfMonth = new Date(Date.UTC(year, month, 0)) // Last day of month
  
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0],
  }
}

describe('Month Filtering Logic', () => {
  describe('getMonthDateRange', () => {
    it('should calculate correct date range for January', () => {
      const result = getMonthDateRange('2024-01')
      
      expect(result.start).toBe('2024-01-01')
      expect(result.end).toBe('2024-01-31')
    })

    it('should calculate correct date range for February (non-leap year)', () => {
      const result = getMonthDateRange('2023-02')
      
      expect(result.start).toBe('2023-02-01')
      expect(result.end).toBe('2023-02-28')
    })

    it('should calculate correct date range for February (leap year)', () => {
      const result = getMonthDateRange('2024-02')
      
      expect(result.start).toBe('2024-02-01')
      expect(result.end).toBe('2024-02-29')
    })

    it('should calculate correct date range for April (30 days)', () => {
      const result = getMonthDateRange('2024-04')
      
      expect(result.start).toBe('2024-04-01')
      expect(result.end).toBe('2024-04-30')
    })

    it('should calculate correct date range for December', () => {
      const result = getMonthDateRange('2024-12')
      
      expect(result.start).toBe('2024-12-01')
      expect(result.end).toBe('2024-12-31')
    })

    it('should handle different years correctly', () => {
      const result2023 = getMonthDateRange('2023-06')
      const result2024 = getMonthDateRange('2024-06')
      
      expect(result2023.start).toBe('2023-06-01')
      expect(result2023.end).toBe('2023-06-30')
      expect(result2024.start).toBe('2024-06-01')
      expect(result2024.end).toBe('2024-06-30')
    })

    it('should handle all months with 31 days', () => {
      const months31Days = ['01', '03', '05', '07', '08', '10', '12']
      
      months31Days.forEach((month) => {
        const result = getMonthDateRange(`2024-${month}`)
        expect(result.end).toBe(`2024-${month}-31`)
      })
    })

    it('should handle all months with 30 days', () => {
      const months30Days = ['04', '06', '09', '11']
      
      months30Days.forEach((month) => {
        const result = getMonthDateRange(`2024-${month}`)
        expect(result.end).toBe(`2024-${month}-30`)
      })
    })
  })

  describe('Month boundary validation', () => {
    it('should include first day of month', () => {
      const { start } = getMonthDateRange('2024-01')
      const firstDay = new Date('2024-01-01')
      const startDate = new Date(start)
      
      expect(startDate.getTime()).toBe(firstDay.getTime())
    })

    it('should include last day of month', () => {
      const { end } = getMonthDateRange('2024-01')
      const lastDay = new Date('2024-01-31')
      const endDate = new Date(end)
      
      expect(endDate.getTime()).toBe(lastDay.getTime())
    })

    it('should not include previous month', () => {
      const { start } = getMonthDateRange('2024-02')
      const previousMonthLastDay = new Date('2024-01-31')
      const startDate = new Date(start)
      
      expect(startDate.getTime()).toBeGreaterThan(previousMonthLastDay.getTime())
    })

    it('should not include next month', () => {
      const { end } = getMonthDateRange('2024-01')
      const nextMonthFirstDay = new Date('2024-02-01')
      const endDate = new Date(end)
      
      expect(endDate.getTime()).toBeLessThan(nextMonthFirstDay.getTime())
    })
  })

  describe('Leap year handling', () => {
    it('should correctly identify leap year', () => {
      // 2024 is a leap year
      const result2024 = getMonthDateRange('2024-02')
      expect(result2024.end).toBe('2024-02-29')
    })

    it('should correctly identify non-leap year', () => {
      // 2023 is not a leap year
      const result2023 = getMonthDateRange('2023-02')
      expect(result2023.end).toBe('2023-02-28')
    })

    it('should handle century years correctly', () => {
      // 2000 was a leap year (divisible by 400)
      const result2000 = getMonthDateRange('2000-02')
      expect(result2000.end).toBe('2000-02-29')
      
      // 1900 was not a leap year (divisible by 100 but not 400)
      const result1900 = getMonthDateRange('1900-02')
      expect(result1900.end).toBe('1900-02-28')
    })
  })

  describe('Edge cases', () => {
    it('should handle year 2000', () => {
      const result = getMonthDateRange('2000-01')
      expect(result.start).toBe('2000-01-01')
      expect(result.end).toBe('2000-01-31')
    })

    it('should handle year 2099', () => {
      const result = getMonthDateRange('2099-12')
      expect(result.start).toBe('2099-12-01')
      expect(result.end).toBe('2099-12-31')
    })

    it('should handle single-digit months with leading zero', () => {
      const result = getMonthDateRange('2024-09')
      expect(result.start).toBe('2024-09-01')
      expect(result.end).toBe('2024-09-30')
    })
  })
})
