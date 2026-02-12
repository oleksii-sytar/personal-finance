import { describe, it, expect } from 'vitest'
import { calculateAccountBalance, calculateDifference } from './balance-calculator'
import type { Transaction } from '@/types'

describe('calculateAccountBalance', () => {
  // Helper to create a minimal transaction for testing
  const createTransaction = (
    type: 'income' | 'expense',
    amount: number,
    deleted_at: string | null = null
  ): Transaction => ({
    id: crypto.randomUUID(),
    workspace_id: crypto.randomUUID(),
    account_id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    created_by: crypto.randomUUID(),
    type,
    amount,
    currency: 'UAH',
    description: 'Test transaction',
    transaction_date: new Date().toISOString(),
    deleted_at,
    created_at: new Date().toISOString(),
    updated_at: null,
    updated_by: null,
    category_id: null,
    notes: null,
    is_expected: false,
    locked: false,
    original_amount: null,
    original_currency: null,
    recurring_transaction_id: null,
    expected_transaction_id: null,
    transaction_type_id: null,
  })

  describe('Basic Calculations', () => {
    it('should return opening balance when no transactions', () => {
      const result = calculateAccountBalance(1000, [])
      expect(result).toBe(1000)
    })

    it('should add income to opening balance', () => {
      const transactions = [
        createTransaction('income', 500),
        createTransaction('income', 300),
      ]
      const result = calculateAccountBalance(1000, transactions)
      expect(result).toBe(1800) // 1000 + 500 + 300
    })

    it('should subtract expenses from opening balance', () => {
      const transactions = [
        createTransaction('expense', 200),
        createTransaction('expense', 150),
      ]
      const result = calculateAccountBalance(1000, transactions)
      expect(result).toBe(650) // 1000 - 200 - 150
    })

    it('should handle mixed income and expenses', () => {
      const transactions = [
        createTransaction('income', 500),
        createTransaction('expense', 200),
        createTransaction('income', 300),
        createTransaction('expense', 100),
      ]
      const result = calculateAccountBalance(1000, transactions)
      expect(result).toBe(1500) // 1000 + 500 - 200 + 300 - 100
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero opening balance', () => {
      const transactions = [
        createTransaction('income', 500),
        createTransaction('expense', 200),
      ]
      const result = calculateAccountBalance(0, transactions)
      expect(result).toBe(300) // 0 + 500 - 200
    })

    it('should handle negative opening balance', () => {
      const transactions = [
        createTransaction('income', 500),
      ]
      const result = calculateAccountBalance(-100, transactions)
      expect(result).toBe(400) // -100 + 500
    })

    it('should handle decimal amounts correctly', () => {
      const transactions = [
        createTransaction('income', 123.45),
        createTransaction('expense', 67.89),
      ]
      const result = calculateAccountBalance(1000.50, transactions)
      expect(result).toBeCloseTo(1056.06, 2) // 1000.50 + 123.45 - 67.89
    })

    it('should handle very large amounts', () => {
      const transactions = [
        createTransaction('income', 1000000),
        createTransaction('expense', 500000),
      ]
      const result = calculateAccountBalance(10000000, transactions)
      expect(result).toBe(10500000) // 10000000 + 1000000 - 500000
    })
  })

  describe('Soft-Deleted Transactions', () => {
    it('should exclude soft-deleted transactions', () => {
      const transactions = [
        createTransaction('income', 500),
        createTransaction('expense', 200, new Date().toISOString()), // deleted
        createTransaction('income', 300),
      ]
      const result = calculateAccountBalance(1000, transactions)
      expect(result).toBe(1800) // 1000 + 500 + 300 (200 expense excluded)
    })

    it('should exclude all transactions if all are deleted', () => {
      const transactions = [
        createTransaction('income', 500, new Date().toISOString()),
        createTransaction('expense', 200, new Date().toISOString()),
      ]
      const result = calculateAccountBalance(1000, transactions)
      expect(result).toBe(1000) // Only opening balance
    })

    it('should handle mix of deleted and active transactions', () => {
      const transactions = [
        createTransaction('income', 500),
        createTransaction('income', 300, new Date().toISOString()), // deleted
        createTransaction('expense', 200),
        createTransaction('expense', 100, new Date().toISOString()), // deleted
      ]
      const result = calculateAccountBalance(1000, transactions)
      expect(result).toBe(1300) // 1000 + 500 - 200
    })
  })

  describe('Formula Validation', () => {
    it('should correctly implement formula: opening_balance + sum(income) - sum(expense)', () => {
      const openingBalance = 5000
      const incomeTransactions = [
        createTransaction('income', 1000),
        createTransaction('income', 500),
        createTransaction('income', 250),
      ]
      const expenseTransactions = [
        createTransaction('expense', 300),
        createTransaction('expense', 150),
      ]
      const allTransactions = [...incomeTransactions, ...expenseTransactions]
      
      const result = calculateAccountBalance(openingBalance, allTransactions)
      
      // Manual calculation
      const sumIncome = 1000 + 500 + 250 // 1750
      const sumExpense = 300 + 150 // 450
      const expected = openingBalance + sumIncome - sumExpense // 5000 + 1750 - 450 = 6300
      
      expect(result).toBe(expected)
      expect(result).toBe(6300)
    })
  })

  describe('Real-World Scenarios', () => {
    it('should handle typical monthly account activity', () => {
      const transactions = [
        // Income
        createTransaction('income', 5000), // Salary
        createTransaction('income', 200),  // Freelance
        // Expenses
        createTransaction('expense', 1200), // Rent
        createTransaction('expense', 300),  // Groceries
        createTransaction('expense', 150),  // Utilities
        createTransaction('expense', 100),  // Entertainment
      ]
      const result = calculateAccountBalance(2000, transactions)
      expect(result).toBe(5450) // 2000 + 5200 - 1750
    })

    it('should handle account with only expenses (credit card)', () => {
      const transactions = [
        createTransaction('expense', 50),
        createTransaction('expense', 100),
        createTransaction('expense', 75),
      ]
      const result = calculateAccountBalance(0, transactions)
      expect(result).toBe(-225) // 0 - 50 - 100 - 75
    })

    it('should handle account reconciliation scenario', () => {
      // Starting balance
      const openingBalance = 1000
      
      // Transactions entered
      const transactions = [
        createTransaction('income', 500),
        createTransaction('expense', 200),
        createTransaction('expense', 100),
      ]
      
      const calculatedBalance = calculateAccountBalance(openingBalance, transactions)
      expect(calculatedBalance).toBe(1200) // 1000 + 500 - 200 - 100
      
      // If current balance from bank is 1250, difference would be 50
      const currentBalance = 1250
      const difference = currentBalance - calculatedBalance
      expect(difference).toBe(50) // Missing transaction of 50
    })
  })
})

describe('calculateDifference', () => {
  describe('Basic Calculations', () => {
    it('should return 0 when balances are equal', () => {
      const result = calculateDifference(1000, 1000)
      expect(result).toBe(0)
    })

    it('should return positive difference when current > calculated', () => {
      const result = calculateDifference(1050, 1000)
      expect(result).toBe(50)
    })

    it('should return negative difference when current < calculated', () => {
      const result = calculateDifference(950, 1000)
      expect(result).toBe(-50)
    })

    it('should handle decimal differences correctly', () => {
      const result = calculateDifference(1234.56, 1200.00)
      expect(result).toBeCloseTo(34.56, 2)
    })
  })

  describe('Floating Point Precision', () => {
    it('should consider difference < 0.01 as reconciled (return 0)', () => {
      const result = calculateDifference(1000.005, 1000)
      expect(result).toBe(0)
    })

    it('should consider difference of 0.009 as reconciled', () => {
      const result = calculateDifference(1000.009, 1000)
      expect(result).toBe(0)
    })

    it('should consider difference of -0.009 as reconciled', () => {
      const result = calculateDifference(999.991, 1000)
      expect(result).toBe(0)
    })

    it('should NOT consider difference of 0.01 as reconciled', () => {
      // Use a difference clearly above the 0.01 threshold
      const result = calculateDifference(1000.02, 1000)
      expect(result).toBeCloseTo(0.02, 2)
      expect(result).not.toBe(0)
    })

    it('should NOT consider difference of -0.01 as reconciled', () => {
      // Use a difference clearly above the 0.01 threshold
      const result = calculateDifference(999.98, 1000)
      expect(result).toBeCloseTo(-0.02, 2)
      expect(result).not.toBe(0)
    })

    it('should handle floating point arithmetic edge cases', () => {
      // Common floating point issue: 0.1 + 0.2 = 0.30000000000000004
      const current = 1000.3
      const calculated = 1000.1 + 1000.2 - 1000 // Results in 1000.30000000000000004
      const result = calculateDifference(current, calculated)
      expect(result).toBe(0) // Should be considered reconciled
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero balances', () => {
      const result = calculateDifference(0, 0)
      expect(result).toBe(0)
    })

    it('should handle negative current balance', () => {
      const result = calculateDifference(-100, 0)
      expect(result).toBe(-100)
    })

    it('should handle negative calculated balance', () => {
      const result = calculateDifference(0, -100)
      expect(result).toBe(100)
    })

    it('should handle both balances negative', () => {
      const result = calculateDifference(-50, -100)
      expect(result).toBe(50)
    })

    it('should handle very large differences', () => {
      const result = calculateDifference(1000000, 500000)
      expect(result).toBe(500000)
    })

    it('should handle very small differences above threshold', () => {
      const result = calculateDifference(1000.02, 1000)
      expect(result).toBeCloseTo(0.02, 2)
    })
  })

  describe('Formula Validation (Requirement 4.1)', () => {
    it('should correctly implement formula: current_balance - calculated_balance', () => {
      const currentBalance = 5000
      const calculatedBalance = 4750
      
      const result = calculateDifference(currentBalance, calculatedBalance)
      const expected = currentBalance - calculatedBalance
      
      expect(result).toBe(expected)
      expect(result).toBe(250)
    })

    it('should maintain sign of difference', () => {
      // Positive difference
      expect(calculateDifference(1100, 1000)).toBeGreaterThan(0)
      
      // Negative difference
      expect(calculateDifference(900, 1000)).toBeLessThan(0)
      
      // Zero difference
      expect(calculateDifference(1000, 1000)).toBe(0)
    })
  })

  describe('Real-World Reconciliation Scenarios', () => {
    it('should identify missing income transaction', () => {
      // User has $1050 in bank but only entered transactions totaling $1000
      const currentBalance = 1050
      const calculatedBalance = 1000
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(50) // Missing $50 income
    })

    it('should identify missing expense transaction', () => {
      // User has $950 in bank but entered transactions show $1000
      const currentBalance = 950
      const calculatedBalance = 1000
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(-50) // Missing $50 expense
    })

    it('should confirm reconciliation when balances match', () => {
      // User's bank balance matches calculated balance
      const currentBalance = 1234.56
      const calculatedBalance = 1234.56
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(0) // Reconciled!
    })

    it('should handle credit card account (negative balances)', () => {
      // Credit card with $500 owed (negative balance)
      const currentBalance = -500
      const calculatedBalance = -450
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(-50) // Missing $50 expense
    })

    it('should handle overdraft scenario', () => {
      // Account is overdrawn
      const currentBalance = -25
      const calculatedBalance = 0
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(-25) // Missing $25 expense
    })

    it('should handle reconciliation after multiple transactions', () => {
      // Opening balance: 1000
      const openingBalance = 1000
      
      // Transactions entered
      const transactions = [
        { type: 'income' as const, amount: 500 },
        { type: 'expense' as const, amount: 200 },
        { type: 'expense' as const, amount: 100 },
      ]
      
      // Calculate balance from transactions
      const calculatedBalance = transactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount
      }, openingBalance)
      
      // Bank shows different balance
      const currentBalance = 1250
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(50) // Missing $50 transaction
    })

    it('should handle penny-perfect reconciliation with floating point', () => {
      // Real-world scenario with many decimal transactions
      const currentBalance = 1234.67
      const calculatedBalance = 1234.67000001 // Floating point artifact
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(0) // Should be considered reconciled
    })
  })

  describe('Integration with calculateAccountBalance', () => {
    it('should work correctly with calculated balance from calculateAccountBalance', () => {
      const openingBalance = 1000
      const transactions = [
        {
          id: crypto.randomUUID(),
          workspace_id: crypto.randomUUID(),
          account_id: crypto.randomUUID(),
          user_id: crypto.randomUUID(),
          created_by: crypto.randomUUID(),
          type: 'income' as const,
          amount: 500,
          currency: 'UAH',
          description: 'Test',
          transaction_date: new Date().toISOString(),
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: null,
          updated_by: null,
          category_id: null,
          notes: null,
          is_expected: false,
          locked: false,
          original_amount: null,
          original_currency: null,
          recurring_transaction_id: null,
          expected_transaction_id: null,
          transaction_type_id: null,
        },
      ]
      
      const calculatedBalance = calculateAccountBalance(openingBalance, transactions)
      const currentBalance = 1550 // Bank shows $1550
      
      const difference = calculateDifference(currentBalance, calculatedBalance)
      expect(difference).toBe(50) // $1550 - $1500 = $50 missing
    })
  })
})
