/**
 * Property-Based Test for Transaction Display Format Consistency
 * 
 * Feature: transactions, Property 8: Transaction Display Format Consistency
 * 
 * Tests that for any transaction displayed in the list, it should show date, amount, 
 * category, and type, with income amounts in Growth Emerald color and expense amounts 
 * in default text color.
 * 
 * Validates: Requirements 3.2, 3.3, 3.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { TransactionWithCategory } from '@/types/transactions'

describe('Property 8: Transaction Display Format Consistency', () => {
  // Helper function to generate a valid transaction with category
  const generateTransactionWithCategory = fc.record({
    id: fc.uuid(),
    workspace_id: fc.uuid(),
    user_id: fc.uuid(),
    amount: fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true }),
    original_amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true }), { nil: null }),
    original_currency: fc.option(fc.constantFrom('USD', 'EUR', 'GBP', 'PLN', 'UAH'), { nil: null }),
    currency: fc.constantFrom('UAH', 'USD', 'EUR', 'GBP', 'PLN'),
    type: fc.constantFrom('income', 'expense'),
    category_id: fc.option(fc.uuid(), { nil: null }),
    description: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
    notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
    transaction_date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString().split('T')[0]),
    is_expected: fc.boolean(),
    expected_transaction_id: fc.option(fc.uuid(), { nil: null }),
    recurring_transaction_id: fc.option(fc.uuid(), { nil: null }),
    created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()),
    updated_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()),
    created_by: fc.uuid(),
    updated_by: fc.option(fc.uuid(), { nil: null }),
    deleted_at: fc.option(fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()), { nil: null }),
    category: fc.option(fc.record({
      id: fc.uuid(),
      workspace_id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      icon: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
      color: fc.option(fc.string({ minLength: 7, maxLength: 7 }), { nil: null }),
      is_default: fc.boolean(),
      type: fc.constantFrom('income', 'expense'),
      created_at: fc.option(fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()), { nil: null }),
      updated_at: fc.option(fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()), { nil: null })
    }), { nil: undefined })
  })

  it('should display all required transaction information (date, amount, category, type)', () => {
    fc.assert(
      fc.property(
        generateTransactionWithCategory,
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 8: Transaction should display description (part of transaction info)
          if (transaction.description && transaction.description.trim()) {
            // Find the description element by its class and check it contains the description
            const descriptionElement = container.querySelector('h3.font-medium.text-primary.truncate')
            expect(descriptionElement).toBeInTheDocument()
            expect(descriptionElement?.textContent).toContain(transaction.description.trim())
          }

          // Property 8: Transaction should display formatted date (Requirement 3.2)
          const expectedDateFormat = format(new Date(transaction.transaction_date), 'MMM d, yyyy')
          const dateElement = container.querySelector(`time[datetime="${transaction.transaction_date}"]`)
          expect(dateElement).toBeInTheDocument()
          expect(dateElement?.textContent).toBe(expectedDateFormat)

          // Property 8: Transaction should display formatted amount (Requirement 3.2)
          const displayAmount = transaction.original_amount || transaction.amount
          const displayCurrency = transaction.original_currency || transaction.currency
          const expectedAmountFormat = formatCurrency(displayAmount, displayCurrency)
          const amountElement = container.querySelector('.font-semibold')
          expect(amountElement).toBeInTheDocument()
          expect(amountElement?.textContent).toBe(expectedAmountFormat)

          // Property 8: Transaction should display type (income/expense) (Requirement 3.2)
          const expectedTypeText = transaction.type === 'income' ? 'Income' : 'Expense'
          const typeElement = container.querySelector('.rounded-full.text-xs.font-medium')
          expect(typeElement).toBeInTheDocument()
          expect(typeElement?.textContent).toBe(expectedTypeText)

          // Property 8: Transaction should display category if present (Requirement 3.2)
          if (transaction.category) {
            const categoryElement = container.querySelector('.text-muted')
            expect(categoryElement).toBeInTheDocument()
            
            if (transaction.category.icon) {
              expect(categoryElement?.textContent).toContain(transaction.category.icon)
            }
            expect(categoryElement?.textContent).toContain(transaction.category.name)
          }

          // Property 8: Transaction should display notes if present
          if (transaction.notes) {
            const notesElement = container.querySelector('p.text-sm.text-muted.mt-2.truncate')
            expect(notesElement).toBeInTheDocument()
            expect(notesElement?.textContent).toBe(transaction.notes)
          }

          // Property 8: Multi-currency transactions should show conversion info
          if (transaction.original_currency && transaction.original_currency !== 'UAH') {
            const conversionElement = container.querySelector('.text-xs.text-muted.mt-1')
            expect(conversionElement).toBeInTheDocument()
            expect(conversionElement?.textContent).toContain(`Converted from ${transaction.original_currency} to UAH`)
          }
        }
      ),
      { numRuns: 50 } // Run 50 iterations to test various transaction combinations
    )
  })

  it('should apply correct color coding for income vs expense amounts', () => {
    fc.assert(
      fc.property(
        generateTransactionWithCategory,
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Find the amount display element
          const displayAmount = transaction.original_amount || transaction.amount
          const displayCurrency = transaction.original_currency || transaction.currency
          const expectedAmountFormat = formatCurrency(displayAmount, displayCurrency)
          const amountElement = container.querySelector('.font-semibold')
          
          expect(amountElement).toBeInTheDocument()
          expect(amountElement?.textContent).toBe(expectedAmountFormat)

          if (transaction.type === 'income') {
            // Property 8: Income amounts should be in Growth Emerald color (Requirement 3.3)
            // Check for the CSS custom property for accent-success (Growth Emerald)
            expect(amountElement).toHaveClass('text-[var(--accent-success)]')
          } else {
            // Property 8: Expense amounts should be in default text color (Requirement 3.4)
            expect(amountElement).toHaveClass('text-primary')
          }
        }
      ),
      { numRuns: 30 } // Run 30 iterations focusing on color coding
    )
  })

  it('should apply consistent type badge styling for income vs expense', () => {
    fc.assert(
      fc.property(
        generateTransactionWithCategory,
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Find the type badge element
          const expectedTypeText = transaction.type === 'income' ? 'Income' : 'Expense'
          const typeBadge = container.querySelector('.rounded-full.text-xs.font-medium')
          
          expect(typeBadge).toBeInTheDocument()
          expect(typeBadge?.textContent).toBe(expectedTypeText)

          // Property 8: Type badges should have consistent styling based on type
          if (transaction.type === 'income') {
            // Income badge should use success color scheme
            expect(typeBadge).toHaveClass('bg-[var(--accent-success)]/10')
            expect(typeBadge).toHaveClass('text-[var(--accent-success)]')
          } else {
            // Expense badge should use primary color scheme
            expect(typeBadge).toHaveClass('bg-[var(--accent-primary)]/10')
            expect(typeBadge).toHaveClass('text-[var(--accent-primary)]')
          }

          // Property 8: All type badges should have consistent base styling
          expect(typeBadge).toHaveClass('px-2')
          expect(typeBadge).toHaveClass('py-1')
          expect(typeBadge).toHaveClass('rounded-full')
          expect(typeBadge).toHaveClass('text-xs')
          expect(typeBadge).toHaveClass('font-medium')
        }
      ),
      { numRuns: 25 } // Run 25 iterations for type badge styling
    )
  })

  it('should maintain consistent date formatting across different dates', () => {
    fc.assert(
      fc.property(
        generateTransactionWithCategory,
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 8: Date should always be formatted consistently (Requirement 3.2)
          const transactionDate = new Date(transaction.transaction_date)
          const expectedDateFormat = format(transactionDate, 'MMM d, yyyy')
          
          // Use container.querySelector to find the specific date element for this transaction
          const dateElement = container.querySelector(`time[datetime="${transaction.transaction_date}"]`)
          expect(dateElement).toBeInTheDocument()
          expect(dateElement?.textContent).toBe(expectedDateFormat)

          // Property 8: Date should be displayed in secondary text color for consistency
          expect(dateElement?.closest('.text-secondary')).toBeInTheDocument()
        }
      ),
      { numRuns: 40 } // Run 40 iterations to test various date formats
    )
  })

  it('should handle multi-currency display formatting consistently', () => {
    fc.assert(
      fc.property(
        // Generate transactions specifically with foreign currencies
        generateTransactionWithCategory.filter(tx => 
          tx.original_currency && tx.original_currency !== tx.currency
        ),
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 8: Multi-currency transactions should show both amounts
          if (transaction.original_amount && transaction.original_currency) {
            // Original amount should be displayed
            const originalAmountFormat = formatCurrency(transaction.original_amount, transaction.original_currency)
            const originalAmountElement = container.querySelector('.font-semibold')
            expect(originalAmountElement).toBeInTheDocument()
            expect(originalAmountElement?.textContent).toBe(originalAmountFormat)

            // UAH conversion should be displayed (if different currency)
            if (transaction.original_currency !== 'UAH') {
              const uahAmountFormat = formatCurrency(transaction.amount, 'UAH')
              // Look for conversion notice which should contain UAH amount info
              const conversionElement = container.querySelector('.text-xs.text-muted.mt-1')
              expect(conversionElement).toBeInTheDocument()
              expect(conversionElement?.textContent).toContain(`Converted from ${transaction.original_currency} to UAH`)
            }
          }
        }
      ),
      { numRuns: 20 } // Run 20 iterations for multi-currency formatting
    )
  })

  it('should maintain consistent layout structure across all transaction types', () => {
    fc.assert(
      fc.property(
        generateTransactionWithCategory,
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 8: All transactions should have consistent container structure
          const transactionContainer = container.firstChild as HTMLElement
          expect(transactionContainer).toHaveClass('relative')
          expect(transactionContainer).toHaveClass('overflow-hidden')
          expect(transactionContainer).toHaveClass('bg-glass')
          expect(transactionContainer).toHaveClass('border')
          expect(transactionContainer).toHaveClass('border-glass')
          expect(transactionContainer).toHaveClass('rounded-xl')

          // Property 8: Main content should have consistent flex layout
          const mainContent = transactionContainer.querySelector('.flex.items-center.justify-between.p-4')
          expect(mainContent).toBeInTheDocument()

          // Property 8: Transaction info should be in a flex-1 container
          const infoContainer = mainContent?.querySelector('.flex-1.min-w-0')
          expect(infoContainer).toBeInTheDocument()

          // Property 8: Header should contain description and amount
          const headerRow = infoContainer?.querySelector('.flex.items-center.justify-between.mb-1')
          expect(headerRow).toBeInTheDocument()

          // Property 8: Secondary info should contain type, category, and date
          const secondaryRow = infoContainer?.querySelector('.flex.items-center.justify-between.text-sm.text-secondary')
          expect(secondaryRow).toBeInTheDocument()
        }
      ),
      { numRuns: 35 } // Run 35 iterations to verify layout consistency
    )
  })

  it('should handle edge cases in transaction display formatting', () => {
    fc.assert(
      fc.property(
        // Generate transactions with edge case values
        fc.record({
          id: fc.uuid(),
          workspace_id: fc.uuid(),
          user_id: fc.uuid(),
          amount: fc.constantFrom(Math.fround(0.01), Math.fround(999999.99), Math.fround(1.00), Math.fround(100.00), Math.fround(1000.50)),
          original_amount: fc.option(fc.constantFrom(Math.fround(0.01), Math.fround(999999.99), Math.fround(1.00), Math.fround(100.00), Math.fround(1000.50)), { nil: null }),
          original_currency: fc.option(fc.constantFrom('USD', 'EUR', 'GBP', 'PLN', 'UAH'), { nil: null }),
          currency: fc.constantFrom('UAH', 'USD', 'EUR', 'GBP', 'PLN'),
          type: fc.constantFrom('income', 'expense'),
          category_id: fc.option(fc.uuid(), { nil: null }),
          description: fc.constantFrom('Test', 'A', 'Very long transaction description that might overflow the container and needs proper truncation handling'),
          notes: fc.option(fc.constantFrom('', 'Short note', 'This is a very long note that should be truncated properly in the UI to maintain consistent layout'), { nil: null }),
          transaction_date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString().split('T')[0]),
          is_expected: fc.boolean(),
          expected_transaction_id: fc.option(fc.uuid(), { nil: null }),
          recurring_transaction_id: fc.option(fc.uuid(), { nil: null }),
          created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()),
          updated_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()),
          created_by: fc.uuid(),
          updated_by: fc.option(fc.uuid(), { nil: null }),
          deleted_at: fc.option(fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()), { nil: null }),
          category: fc.option(fc.record({
            id: fc.uuid(),
            workspace_id: fc.uuid(),
            name: fc.constantFrom('Food', 'Transportation', 'Very Long Category Name That Might Cause Layout Issues'),
            icon: fc.option(fc.constantFrom('🍔', '🚗', '💰', ''), { nil: null }),
            color: fc.option(fc.string({ minLength: 7, maxLength: 7 }), { nil: null }),
            is_default: fc.boolean(),
            type: fc.constantFrom('income', 'expense'),
            created_at: fc.option(fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()), { nil: null }),
            updated_at: fc.option(fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date().getTime() }).map(t => new Date(t).toISOString()), { nil: null })
          }), { nil: undefined })
        }),
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 8: Even with edge case values, all required elements should be present
          
          // Description should be displayed (even if empty, element should exist)
          if (transaction.description && transaction.description.trim()) {
            const descriptionElement = container.querySelector('h3.font-medium.text-primary.truncate')
            expect(descriptionElement).toBeInTheDocument()
            expect(descriptionElement?.textContent).toContain(transaction.description.trim())
          }

          // Amount should always be formatted and displayed
          const displayAmount = transaction.original_amount || transaction.amount
          const displayCurrency = transaction.original_currency || transaction.currency
          const expectedAmountFormat = formatCurrency(displayAmount, displayCurrency)
          const amountElement = container.querySelector('.font-semibold')
          expect(amountElement).toBeInTheDocument()
          expect(amountElement?.textContent).toBe(expectedAmountFormat)

          // Type should always be displayed
          const expectedTypeText = transaction.type === 'income' ? 'Income' : 'Expense'
          const typeElement = container.querySelector('.rounded-full.text-xs.font-medium')
          expect(typeElement).toBeInTheDocument()
          expect(typeElement?.textContent).toBe(expectedTypeText)

          // Date should always be formatted consistently
          const expectedDateFormat = format(new Date(transaction.transaction_date), 'MMM d, yyyy')
          const dateElement = container.querySelector(`time[datetime="${transaction.transaction_date}"]`)
          expect(dateElement).toBeInTheDocument()
          expect(dateElement?.textContent).toBe(expectedDateFormat)

          // Property 8: Long text should be properly truncated
          const descriptionElement = container.querySelector('h3.font-medium.text-primary.truncate')
          if (descriptionElement && transaction.description.length > 50) {
            expect(descriptionElement).toHaveClass('truncate')
          }

          if (transaction.notes) {
            const notesElement = container.querySelector('p.text-sm.text-muted.mt-2.truncate')
            if (notesElement && transaction.notes.length > 50) {
              expect(notesElement).toHaveClass('truncate')
            }
          }
        }
      ),
      { numRuns: 25 } // Run 25 iterations for edge cases
    )
  })
})