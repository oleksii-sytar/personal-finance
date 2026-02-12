/**
 * Currency Converter Tests
 * 
 * Tests the convertCurrency function for multi-currency support
 * in the real-time balance reconciliation system.
 * 
 * Requirements: 5.2, 8.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the Supabase client using factory function
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

// Import after mocking
import { convertCurrency } from './currency-converter'
import { createClient } from '@/lib/supabase/server'

describe('convertCurrency', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn()
    }
    
    // Mock the createClient function
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })
  
  describe('Same Currency Conversion', () => {
    it('should return the same amount when currencies are identical', async () => {
      const amount = 1000
      const result = await convertCurrency(amount, 'UAH', 'UAH')
      
      expect(result).toBe(amount)
      // Should not query database for same currency
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
    
    it('should handle zero amount for same currency', async () => {
      const result = await convertCurrency(0, 'USD', 'USD')
      
      expect(result).toBe(0)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
    
    it('should handle negative amounts for same currency', async () => {
      const result = await convertCurrency(-500, 'EUR', 'EUR')
      
      expect(result).toBe(-500)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })
  
  describe('Foreign Currency to UAH Conversion', () => {
    it('should convert USD to UAH using exchange rate', async () => {
      // Mock exchange rate: 1 USD = 41.25 UAH
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(100, 'USD', 'UAH')
      
      expect(result).toBe(4125) // 100 * 41.25
      expect(mockSupabase.from).toHaveBeenCalledWith('exchange_rates')
    })
    
    it('should convert EUR to UAH using exchange rate', async () => {
      // Mock exchange rate: 1 EUR = 44.80 UAH
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 44.80 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(50, 'EUR', 'UAH')
      
      expect(result).toBe(2240) // 50 * 44.80
    })
    
    it('should handle decimal amounts', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(123.45, 'USD', 'UAH')
      
      expect(result).toBeCloseTo(5092.3125, 2) // 123.45 * 41.25
    })
  })
  
  describe('UAH to Foreign Currency Conversion', () => {
    it('should convert UAH to USD using exchange rate', async () => {
      // Mock exchange rate: 1 USD = 41.25 UAH
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(4125, 'UAH', 'USD')
      
      expect(result).toBeCloseTo(100, 2) // 4125 / 41.25
    })
    
    it('should convert UAH to EUR using exchange rate', async () => {
      // Mock exchange rate: 1 EUR = 44.80 UAH
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 44.80 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(2240, 'UAH', 'EUR')
      
      expect(result).toBeCloseTo(50, 2) // 2240 / 44.80
    })
  })
  
  describe('Foreign to Foreign Currency Conversion (via UAH)', () => {
    it('should convert USD to EUR via UAH', async () => {
      // Mock exchange rates:
      // 1 USD = 41.25 UAH
      // 1 EUR = 44.80 UAH
      let callCount = 0
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    rate: value === 'USD' ? 41.25 : 44.80 
                  },
                  error: null
                })
              })
            })
          }))
        })
      })
      
      const result = await convertCurrency(100, 'USD', 'EUR')
      
      // 100 USD → 4125 UAH → 92.08 EUR (4125 / 44.80)
      expect(result).toBeCloseTo(92.08, 2)
    })
    
    it('should convert EUR to USD via UAH', async () => {
      // Mock exchange rates:
      // 1 EUR = 44.80 UAH
      // 1 USD = 41.25 UAH
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    rate: value === 'EUR' ? 44.80 : 41.25 
                  },
                  error: null
                })
              })
            })
          }))
        })
      })
      
      const result = await convertCurrency(50, 'EUR', 'USD')
      
      // 50 EUR → 2240 UAH → 54.30 USD (2240 / 41.25)
      expect(result).toBeCloseTo(54.30, 2)
    })
  })
  
  describe('Error Handling', () => {
    it('should throw error when source currency exchange rate not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          })
        })
      })
      
      await expect(
        convertCurrency(100, 'XYZ', 'UAH')
      ).rejects.toThrow('Exchange rate not found for XYZ')
    })
    
    it('should throw error when target currency exchange rate not found', async () => {
      // First call succeeds (source currency), second fails (target currency)
      let callCount = 0
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  callCount++
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: { rate: 41.25 },
                      error: null
                    })
                  }
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Not found' }
                  })
                })
              })
            })
          })
        })
      })
      
      await expect(
        convertCurrency(100, 'USD', 'XYZ')
      ).rejects.toThrow('Exchange rate not found for XYZ')
    })
    
    it('should throw error when database returns null data', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      })
      
      await expect(
        convertCurrency(100, 'USD', 'UAH')
      ).rejects.toThrow('Exchange rate not found for USD')
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle zero amount conversion', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(0, 'USD', 'UAH')
      
      expect(result).toBe(0)
    })
    
    it('should handle negative amounts (for credit accounts)', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(-100, 'USD', 'UAH')
      
      expect(result).toBe(-4125) // -100 * 41.25
    })
    
    it('should handle very small amounts', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(0.01, 'USD', 'UAH')
      
      expect(result).toBeCloseTo(0.4125, 4) // 0.01 * 41.25
    })
    
    it('should handle very large amounts', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const result = await convertCurrency(1000000, 'USD', 'UAH')
      
      expect(result).toBe(41250000) // 1,000,000 * 41.25
    })
  })
  
  describe('Database Query Behavior', () => {
    it('should query most recent exchange rate', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { rate: 41.25 },
                error: null
              })
            })
          })
        })
      })
      
      mockSupabase.from.mockReturnValue({
        select: mockSelect
      })
      
      await convertCurrency(100, 'USD', 'UAH')
      
      // Verify the query chain
      expect(mockSupabase.from).toHaveBeenCalledWith('exchange_rates')
      expect(mockSelect).toHaveBeenCalledWith('rate')
    })
  })
})


describe('calculateTotalDifference', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn()
    }
    
    // Mock the createClient function
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })
  
  describe('Single Currency Accounts', () => {
    it('should sum differences when all accounts use workspace currency', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1100,
          calculated_balance: 1050,
          difference: 50,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 2000,
          current_balance: 1900,
          calculated_balance: 1950,
          difference: -50,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '3',
          opening_balance: 500,
          current_balance: 600,
          calculated_balance: 550,
          difference: 50,
          currency: 'UAH',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      // 50 + (-50) + 50 = 50
      expect(total).toBe(50)
      // Should not query database when all currencies match
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
    
    it('should handle all positive differences', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1100,
          calculated_balance: 1050,
          difference: 50,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 2000,
          current_balance: 2100,
          calculated_balance: 2050,
          difference: 50,
          currency: 'UAH',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      expect(total).toBe(100)
    })
    
    it('should handle all negative differences', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 900,
          calculated_balance: 950,
          difference: -50,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 2000,
          current_balance: 1800,
          calculated_balance: 1900,
          difference: -100,
          currency: 'UAH',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      expect(total).toBe(-150)
    })
  })
  
  describe('Multi-Currency Accounts', () => {
    it('should convert and sum differences from multiple currencies', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      // Mock exchange rates:
      // 1 USD = 41.25 UAH
      // 1 EUR = 44.80 UAH
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    rate: value === 'USD' ? 41.25 : 44.80 
                  },
                  error: null
                })
              })
            })
          }))
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1100,
          calculated_balance: 1050,
          difference: 50, // UAH
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 5, // USD → 206.25 UAH
          currency: 'USD',
          is_reconciled: false
        },
        {
          account_id: '3',
          opening_balance: 100,
          current_balance: 90,
          calculated_balance: 95,
          difference: -5, // EUR → -224 UAH
          currency: 'EUR',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      // 50 + (5 * 41.25) + (-5 * 44.80) = 50 + 206.25 - 224 = 32.25
      expect(total).toBeCloseTo(32.25, 2)
    })
    
    it('should handle conversion to non-UAH workspace currency', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      // Mock exchange rates:
      // 1 UAH needs to be converted to USD: UAH → USD requires USD rate
      // 1 EUR needs to be converted to USD: EUR → UAH → USD
      // For UAH → USD: 1 USD = 41.25 UAH, so 50 UAH = 50/41.25 = 1.212 USD
      // For EUR → USD: 1 EUR = 44.80 UAH, so -5 EUR = -5 * 44.80 = -224 UAH = -224/41.25 = -5.430 USD
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    rate: value === 'UAH' ? 41.25 : value === 'EUR' ? 44.80 : 41.25
                  },
                  error: null
                })
              })
            })
          }))
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1100,
          calculated_balance: 1050,
          difference: 50, // UAH → USD
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 100,
          current_balance: 90,
          calculated_balance: 95,
          difference: -5, // EUR → USD
          currency: 'EUR',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'USD')
      
      // 50 UAH / 41.25 + (-5 EUR * 44.80 / 41.25) = 1.212 + (-5.430) = -4.218
      expect(total).toBeCloseTo(-4.218, 2)
    })
  })
  
  describe('Error Handling - Graceful Degradation', () => {
    it('should skip account and continue when conversion fails', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      // Mock: USD succeeds, XYZ fails
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(
                  value === 'USD' 
                    ? { data: { rate: 41.25 }, error: null }
                    : { data: null, error: { message: 'Not found' } }
                )
              })
            })
          }))
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1100,
          calculated_balance: 1050,
          difference: 50,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 5,
          currency: 'USD',
          is_reconciled: false
        },
        {
          account_id: '3',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 10,
          currency: 'XYZ', // Invalid currency - should be skipped
          is_reconciled: false
        }
      ]
      
      // Mock console.warn to verify warning is logged
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      // Should only sum UAH (50) and USD (5 * 41.25 = 206.25), skip XYZ
      expect(total).toBeCloseTo(256.25, 2)
      
      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to convert XYZ to UAH for account 3'),
        expect.any(Error)
      )
      
      consoleWarnSpy.mockRestore()
    })
    
    it('should return zero when all conversions fail', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      // Mock: all conversions fail
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          })
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 10,
          currency: 'XYZ',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 10,
          currency: 'ABC',
          is_reconciled: false
        }
      ]
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      expect(total).toBe(0)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
      
      consoleWarnSpy.mockRestore()
    })
    
    it('should log warning with account ID when conversion fails', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          })
        })
      })
      
      const accountBalances = [
        {
          account_id: 'account-123',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 10,
          currency: 'XYZ',
          is_reconciled: false
        }
      ]
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await calculateTotalDifference(accountBalances, 'UAH')
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('account-123'),
        expect.any(Error)
      )
      
      consoleWarnSpy.mockRestore()
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle empty account list', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      const total = await calculateTotalDifference([], 'UAH')
      
      expect(total).toBe(0)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
    
    it('should handle accounts with zero differences', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1000,
          calculated_balance: 1000,
          difference: 0,
          currency: 'UAH',
          is_reconciled: true
        },
        {
          account_id: '2',
          opening_balance: 2000,
          current_balance: 2000,
          calculated_balance: 2000,
          difference: 0,
          currency: 'USD',
          is_reconciled: true
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      expect(total).toBe(0)
    })
    
    it('should handle very small differences', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000.01,
          current_balance: 1000.02,
          calculated_balance: 1000.015,
          difference: 0.005,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 100.01,
          current_balance: 100.02,
          calculated_balance: 100.015,
          difference: 0.005,
          currency: 'USD',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      // 0.005 + (0.005 * 41.25) = 0.005 + 0.20625 = 0.21125
      expect(total).toBeCloseTo(0.21125, 5)
    })
    
    it('should handle large differences', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          })
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000000,
          current_balance: 1500000,
          calculated_balance: 1250000,
          difference: 250000,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 10000,
          current_balance: 15000,
          calculated_balance: 12500,
          difference: 2500,
          currency: 'USD',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      // 250000 + (2500 * 41.25) = 250000 + 103125 = 353125
      expect(total).toBe(353125)
    })
    
    it('should handle mixed reconciled and unreconciled accounts', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1000,
          calculated_balance: 1000,
          difference: 0,
          currency: 'UAH',
          is_reconciled: true
        },
        {
          account_id: '2',
          opening_balance: 2000,
          current_balance: 2100,
          calculated_balance: 2050,
          difference: 50,
          currency: 'UAH',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      // Function sums all differences regardless of reconciliation status
      expect(total).toBe(50)
    })
  })
  
  describe('Requirements Validation', () => {
    it('should satisfy Requirement 5.1: aggregate differences across accounts', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { rate: 41.25 },
                  error: null
                })
              })
            })
          }))
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 1000,
          current_balance: 1100,
          calculated_balance: 1050,
          difference: 50,
          currency: 'UAH',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 5,
          currency: 'USD',
          is_reconciled: false
        }
      ]
      
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      // Verifies aggregation across multiple accounts
      expect(total).toBeGreaterThan(0)
      expect(typeof total).toBe('number')
    })
    
    it('should satisfy Requirement 8.2: graceful error handling', async () => {
      const { calculateTotalDifference } = await import('./currency-converter')
      
      // Mock: one account fails conversion
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(
                  value === 'USD' 
                    ? { data: { rate: 41.25 }, error: null }
                    : { data: null, error: { message: 'Not found' } }
                )
              })
            })
          }))
        })
      })
      
      const accountBalances = [
        {
          account_id: '1',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 10,
          currency: 'USD',
          is_reconciled: false
        },
        {
          account_id: '2',
          opening_balance: 100,
          current_balance: 110,
          calculated_balance: 105,
          difference: 10,
          currency: 'XYZ',
          is_reconciled: false
        }
      ]
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Should not throw, should return partial result
      const total = await calculateTotalDifference(accountBalances, 'UAH')
      
      expect(total).toBeCloseTo(412.5, 2) // Only USD account counted
      expect(consoleWarnSpy).toHaveBeenCalled() // Warning logged
      
      consoleWarnSpy.mockRestore()
    })
  })
})
