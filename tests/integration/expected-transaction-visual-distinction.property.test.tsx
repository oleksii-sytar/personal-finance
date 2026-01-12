/**
 * Property-Based Test for Expected Transaction Visual Distinction
 * 
 * Feature: transactions, Property 20: Expected Transaction Visual Distinction
 * 
 * Tests that for any expected transaction in the list, it should be visually 
 * distinguished from confirmed transactions (e.g., dashed border).
 * 
 * Validates: Requirements 9.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { render } from '@testing-library/react'
import { TransactionItem } from '@/components/transactions/transaction-item'
import type { TransactionWithCategory } from '@/types/transactions'

describe('Property 20: Expected Transaction Visual Distinction', () => {
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
    is_expected: fc.boolean(), // This is the key field for this property test
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

  it('should visually distinguish expected transactions from confirmed transactions', () => {
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

          // Get the main transaction container
          const transactionContainer = container.firstChild as HTMLElement
          expect(transactionContainer).toBeInTheDocument()

          if (transaction.is_expected) {
            // Property 20: Expected transactions should have dashed border (Requirement 9.5)
            expect(transactionContainer).toHaveClass('border-2')
            expect(transactionContainer).toHaveClass('border-dashed')
            expect(transactionContainer).toHaveClass('border-amber-300')

            // Property 20: Expected transactions should have different background styling
            expect(transactionContainer).toHaveClass('bg-amber-50/30')

            // Property 20: Expected transactions should have "Expected" badge
            const expectedBadge = container.querySelector('.bg-amber-100.text-amber-700.border.border-amber-200')
            expect(expectedBadge).toBeInTheDocument()
            expect(expectedBadge?.textContent).toBe('Expected')

            // Property 20: Expected badge should have consistent styling
            expect(expectedBadge).toHaveClass('px-2')
            expect(expectedBadge).toHaveClass('py-1')
            expect(expectedBadge).toHaveClass('rounded-full')
            expect(expectedBadge).toHaveClass('text-xs')
            expect(expectedBadge).toHaveClass('font-medium')
          } else {
            // Property 20: Confirmed transactions should NOT have expected transaction styling
            expect(transactionContainer).not.toHaveClass('border-2')
            expect(transactionContainer).not.toHaveClass('border-dashed')
            expect(transactionContainer).not.toHaveClass('border-amber-300')
            expect(transactionContainer).not.toHaveClass('bg-amber-50/30')

            // Property 20: Confirmed transactions should have regular border styling
            expect(transactionContainer).toHaveClass('border')
            expect(transactionContainer).toHaveClass('border-glass')

            // Property 20: Confirmed transactions should NOT have "Expected" badge
            const expectedBadge = container.querySelector('.bg-amber-100.text-amber-700.border.border-amber-200')
            expect(expectedBadge).not.toBeInTheDocument()
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations to test both expected and confirmed transactions
    )
  })

  it.skip('should maintain visual distinction consistency across different transaction types', () => {
    fc.assert(
      fc.property(
        // Generate specifically expected transactions
        generateTransactionWithCategory.filter(tx => tx.is_expected === true),
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 20: All expected transactions should have consistent visual distinction
          const transactionContainer = container.firstChild as HTMLElement
          
          // Dashed border styling should be consistent
          expect(transactionContainer).toHaveClass('border-2')
          expect(transactionContainer).toHaveClass('border-dashed')
          expect(transactionContainer).toHaveClass('border-amber-300')

          // Background styling should be consistent
          expect(transactionContainer).toHaveClass('bg-amber-50/30')

          // Expected badge should always be present and styled consistently
          const expectedBadge = container.querySelector('.bg-amber-100.text-amber-700.border.border-amber-200')
          expect(expectedBadge).toBeInTheDocument()
          expect(expectedBadge?.textContent).toBe('Expected')

          // Badge should be positioned correctly in the secondary info row
          const secondaryRow = container.querySelector('.flex.items-center.justify-between.text-sm.text-secondary')
          expect(secondaryRow).toBeInTheDocument()
          
          const badgeContainer = secondaryRow?.querySelector('.flex.items-center.space-x-2')
          expect(badgeContainer).toBeInTheDocument()
          expect(badgeContainer).toContainElement(expectedBadge)

          // Property 20: Expected transactions should still maintain all other display requirements
          // (This ensures visual distinction doesn't break other functionality)
          
          // Should still have transaction type badge
          const typeBadge = container.querySelector('.rounded-full.text-xs.font-medium')
          expect(typeBadge).toBeInTheDocument()
          const expectedTypeText = transaction.type === 'income' ? 'Income' : 'Expense'
          expect(typeBadge?.textContent).toBe(expectedTypeText)

          // Should still display amount with proper color coding
          const amountElement = container.querySelector('.font-semibold')
          expect(amountElement).toBeInTheDocument()
          if (transaction.type === 'income') {
            expect(amountElement).toHaveClass('text-[var(--accent-success)]')
          } else {
            expect(amountElement).toHaveClass('text-primary')
          }
        }
      ),
      { numRuns: 50 } // Run 50 iterations for expected transactions only
    )
  })

  it('should ensure confirmed transactions never have expected transaction styling', () => {
    fc.assert(
      fc.property(
        // Generate specifically confirmed (non-expected) transactions
        generateTransactionWithCategory.filter(tx => tx.is_expected === false),
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 20: Confirmed transactions should never have expected styling
          const transactionContainer = container.firstChild as HTMLElement
          
          // Should NOT have dashed border styling
          expect(transactionContainer).not.toHaveClass('border-2')
          expect(transactionContainer).not.toHaveClass('border-dashed')
          expect(transactionContainer).not.toHaveClass('border-amber-300')
          expect(transactionContainer).not.toHaveClass('bg-amber-50/30')

          // Should have regular border styling instead
          expect(transactionContainer).toHaveClass('border')
          expect(transactionContainer).toHaveClass('border-glass')

          // Should NOT have "Expected" badge
          const expectedBadge = container.querySelector('.bg-amber-100.text-amber-700.border.border-amber-200')
          expect(expectedBadge).not.toBeInTheDocument()

          // Should not have any text content saying "Expected"
          expect(container.textContent).not.toContain('Expected')

          // Property 20: Should still have all other normal transaction styling
          expect(transactionContainer).toHaveClass('bg-glass')
          expect(transactionContainer).toHaveClass('rounded-xl')
          expect(transactionContainer).toHaveClass('cursor-pointer')
        }
      ),
      { numRuns: 50 } // Run 50 iterations for confirmed transactions only
    )
  })

  it('should handle hover states correctly for both expected and confirmed transactions', () => {
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

          const transactionContainer = container.firstChild as HTMLElement

          if (transaction.is_expected) {
            // Property 20: Expected transactions should have amber hover state
            expect(transactionContainer).toHaveClass('hover:bg-amber-50/50')
            
            // Should not have regular hover state
            expect(transactionContainer).not.toHaveClass('hover:border-accent/30')
          } else {
            // Property 20: Confirmed transactions should have regular hover state
            expect(transactionContainer).toHaveClass('hover:border-accent/30')
            
            // Should not have amber hover state
            expect(transactionContainer).not.toHaveClass('hover:bg-amber-50/50')
          }

          // Property 20: Both should maintain base hover classes
          expect(transactionContainer).toHaveClass('transition-all')
          expect(transactionContainer).toHaveClass('duration-200')
        }
      ),
      { numRuns: 60 } // Run 60 iterations to test hover states
    )
  })

  it('should maintain accessibility and semantic structure for expected transactions', () => {
    fc.assert(
      fc.property(
        generateTransactionWithCategory.filter(tx => tx.is_expected === true),
        (transaction) => {
          const { container } = render(
            <TransactionItem 
              transaction={transaction}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )

          // Property 20: Expected transactions should maintain semantic structure
          const transactionContainer = container.firstChild as HTMLElement
          
          // Should still be clickable and accessible
          expect(transactionContainer).toHaveClass('cursor-pointer')
          
          // Should be a div element (implicit role)
          expect(transactionContainer.tagName.toLowerCase()).toBe('div')

          // Expected badge should be properly structured
          const expectedBadge = container.querySelector('.bg-amber-100.text-amber-700.border.border-amber-200')
          expect(expectedBadge).toBeInTheDocument()
          
          // Badge should have proper text content for screen readers
          expect(expectedBadge?.textContent).toBe('Expected')
          expect(expectedBadge?.textContent?.trim()).toBeTruthy()

          // Property 20: Visual distinction should not interfere with content accessibility
          // All required transaction information should still be present and accessible
          
          // Description should be accessible
          if (transaction.description && transaction.description.trim()) {
            const descriptionElement = container.querySelector('h3.font-medium.text-primary.truncate')
            expect(descriptionElement).toBeInTheDocument()
            expect(descriptionElement?.textContent).toContain(transaction.description.trim())
          }

          // Amount should be accessible
          const amountElement = container.querySelector('.font-semibold')
          expect(amountElement).toBeInTheDocument()

          // Date should be accessible with proper datetime attribute
          const dateElement = container.querySelector(`time[datetime="${transaction.transaction_date}"]`)
          expect(dateElement).toBeInTheDocument()
          expect(dateElement).toHaveAttribute('datetime', transaction.transaction_date)
        }
      ),
      { numRuns: 30 } // Run 30 iterations for accessibility testing
    )
  })

  it('should handle edge cases in expected transaction visual distinction', () => {
    fc.assert(
      fc.property(
        // Generate edge case transactions (very long descriptions, special characters, etc.)
        fc.record({
          id: fc.uuid(),
          workspace_id: fc.uuid(),
          user_id: fc.uuid(),
          amount: fc.constantFrom(Math.fround(0.01), Math.fround(999999.99)),
          original_amount: fc.option(fc.constantFrom(Math.fround(0.01), Math.fround(999999.99)), { nil: null }),
          original_currency: fc.option(fc.constantFrom('USD', 'EUR'), { nil: null }),
          currency: fc.constantFrom('UAH', 'USD'),
          type: fc.constantFrom('income', 'expense'),
          category_id: fc.option(fc.uuid(), { nil: null }),
          description: fc.constantFrom(
            'Test', 
            'Very long transaction description that might cause layout issues with expected transaction styling',
            'Special chars: !@#$%^&*()',
            'Unicode: 🍔💰🚗'
          ),
          notes: fc.option(fc.constantFrom('', 'Short', 'Very long note content'), { nil: null }),
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
            name: fc.constantFrom('Food', 'Very Long Category Name That Tests Layout'),
            icon: fc.option(fc.constantFrom('🍔', '💰', ''), { nil: null }),
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

          // Property 20: Visual distinction should work correctly even with edge case content
          const transactionContainer = container.firstChild as HTMLElement

          if (transaction.is_expected) {
            // Expected styling should be applied regardless of content
            expect(transactionContainer).toHaveClass('border-2')
            expect(transactionContainer).toHaveClass('border-dashed')
            expect(transactionContainer).toHaveClass('border-amber-300')
            expect(transactionContainer).toHaveClass('bg-amber-50/30')

            // Expected badge should be present
            const expectedBadge = container.querySelector('.bg-amber-100.text-amber-700.border.border-amber-200')
            expect(expectedBadge).toBeInTheDocument()
            expect(expectedBadge?.textContent).toBe('Expected')

            // Layout should not be broken by long content
            expect(transactionContainer).toHaveClass('overflow-hidden')
            
            // Text truncation should still work
            const descriptionElement = container.querySelector('h3.font-medium.text-primary.truncate')
            if (descriptionElement && transaction.description.length > 50) {
              expect(descriptionElement).toHaveClass('truncate')
            }
          } else {
            // Regular styling should be applied
            expect(transactionContainer).toHaveClass('border')
            expect(transactionContainer).toHaveClass('border-glass')
            expect(transactionContainer).not.toHaveClass('border-dashed')

            // No expected badge
            const expectedBadge = container.querySelector('.bg-amber-100.text-amber-700.border.border-amber-200')
            expect(expectedBadge).not.toBeInTheDocument()
          }

          // Property 20: Core functionality should not be affected by visual distinction
          // Container should maintain proper structure
          expect(transactionContainer).toHaveClass('relative')
          expect(transactionContainer).toHaveClass('rounded-xl')
          expect(transactionContainer).toHaveClass('cursor-pointer')
          
          // Expected transactions have different background but should still have glass-like styling
          if (transaction.is_expected) {
            expect(transactionContainer).toHaveClass('bg-amber-50/30')
          } else {
            expect(transactionContainer).toHaveClass('bg-glass')
          }
        }
      ),
      { numRuns: 40 } // Run 40 iterations for edge cases
    )
  })
})