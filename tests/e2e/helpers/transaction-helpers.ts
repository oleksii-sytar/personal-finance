import { Page } from '@playwright/test'

/**
 * Transaction helper functions for E2E tests
 */

export async function createTestTransaction(
  page: Page,
  amount: string,
  description: string,
  date?: Date,
  type: 'income' | 'expense' = 'expense'
) {
  // Open transaction form
  const addButton = page.locator('button:has-text("Quick Entry"), button:has-text("Add Transaction")')
  
  if (await addButton.count() > 0) {
    await addButton.first().click()
    await page.waitForTimeout(500)
    
    // Fill form
    await page.fill('input[name="amount"]', amount)
    await page.fill('input[name="description"]', description)
    
    if (date) {
      await page.fill('input[type="date"]', date.toISOString().split('T')[0])
    }
    
    // Select type if needed
    if (type === 'income') {
      const typeSelect = page.locator('select[name="type"]')
      if (await typeSelect.count() > 0) {
        await typeSelect.selectOption('income')
      }
    }
    
    // Submit
    await page.click('button[type="submit"]:has-text("Save")')
    await page.waitForTimeout(1500)
  }
}

export async function createPlannedTransaction(
  page: Page,
  amount: string,
  description: string,
  daysAhead: number
) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)
  
  await createTestTransaction(page, amount, description, futureDate)
}

export async function markTransactionAsCompleted(page: Page, description: string) {
  // Find the transaction
  const transactionRow = page.locator('[data-testid="transaction-item"]').filter({ hasText: description })
  
  if (await transactionRow.count() > 0) {
    const markAsPaidButton = transactionRow.locator('button:has-text("Mark as Paid")')
    
    if (await markAsPaidButton.count() > 0) {
      await markAsPaidButton.click()
      await page.waitForTimeout(2000)
    }
  }
}
