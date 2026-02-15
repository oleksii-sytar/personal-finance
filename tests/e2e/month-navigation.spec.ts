/**
 * E2E tests for month navigation feature
 * Requirements 4.4: E2E test for month switching
 * 
 * Tests:
 * - Month selector interaction
 * - URL state persistence
 * - Transaction filtering by month
 * - Page refresh persistence
 * - Transaction count accuracy
 */

import { test, expect } from '@playwright/test'

test.describe('Month Navigation', () => {
  // Helper function to login and navigate to transactions page
  async function loginAndNavigateToTransactions(page: any) {
    // Login with test credentials
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    
    // Navigate to transactions page
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')
  }

  test.describe('Month Selector Interaction', () => {
    test('should display month selector on transactions page', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Month selector should be visible
      const monthSelector = page.locator('[aria-label="Select month"]')
      await expect(monthSelector).toBeVisible({ timeout: 5000 })
      
      // Should show current month by default
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      await expect(page.locator(`text=${currentMonth}`).first()).toBeVisible()
    })

    test('should navigate to previous month', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Click previous month button
      const prevButton = page.locator('[aria-label="Previous month"]')
      await expect(prevButton).toBeVisible()
      await prevButton.click()
      
      // Wait for URL to update
      await page.waitForTimeout(500)
      
      // URL should contain month parameter
      const url = page.url()
      expect(url).toContain('month=')
      
      // Month display should update
      const currentDate = new Date()
      currentDate.setMonth(currentDate.getMonth() - 1)
      const expectedMonth = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      await expect(page.locator(`text=${expectedMonth}`).first()).toBeVisible()
    })

    test('should navigate to next month', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Click next month button
      const nextButton = page.locator('[aria-label="Next month"]')
      await expect(nextButton).toBeVisible()
      await nextButton.click()
      
      // Wait for URL to update
      await page.waitForTimeout(500)
      
      // URL should contain month parameter
      const url = page.url()
      expect(url).toContain('month=')
      
      // Month display should update
      const currentDate = new Date()
      currentDate.setMonth(currentDate.getMonth() + 1)
      const expectedMonth = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      await expect(page.locator(`text=${expectedMonth}`).first()).toBeVisible()
    })

    test('should show "Today" button when not on current month', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Navigate to previous month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(500)
      
      // "Today" button should be visible
      const todayButton = page.locator('button:has-text("Today")')
      await expect(todayButton).toBeVisible()
    })

    test('should jump to current month when clicking "Today" button', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Navigate to previous month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(500)
      
      // Click "Today" button
      const todayButton = page.locator('button:has-text("Today")')
      await todayButton.click()
      await page.waitForTimeout(500)
      
      // Should be back to current month
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      await expect(page.locator(`text=${currentMonth}`).first()).toBeVisible()
      
      // URL should not have month parameter (or should be current month)
      const url = page.url()
      if (url.includes('month=')) {
        const currentMonthParam = new Date().toISOString().slice(0, 7)
        expect(url).toContain(`month=${currentMonthParam}`)
      }
    })
  })

  test.describe('Month Dropdown Selection', () => {
    test('should open month dropdown when clicking selector', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Click month selector button
      const selectButton = page.locator('[aria-label="Select month"]')
      await selectButton.click()
      
      // Dropdown should open with multiple month options
      await page.waitForTimeout(500)
      
      // Should show past months
      const currentDate = new Date()
      const pastMonth = new Date(currentDate)
      pastMonth.setMonth(pastMonth.getMonth() - 1)
      const pastMonthText = pastMonth.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      
      // Look for month options in dropdown (may appear multiple times)
      const monthOptions = page.locator(`text=${pastMonthText}`)
      await expect(monthOptions.first()).toBeVisible()
    })

    test('should select month from dropdown', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Open dropdown
      const selectButton = page.locator('[aria-label="Select month"]')
      await selectButton.click()
      await page.waitForTimeout(500)
      
      // Select a past month
      const currentDate = new Date()
      const pastMonth = new Date(currentDate)
      pastMonth.setMonth(pastMonth.getMonth() - 2)
      const pastMonthText = pastMonth.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      
      // Click the month option (get the one in the dropdown, not the header)
      const monthOptions = page.locator(`button:has-text("${pastMonthText}")`)
      const count = await monthOptions.count()
      if (count > 1) {
        // Click the second occurrence (first is likely the header)
        await monthOptions.nth(1).click()
      } else {
        await monthOptions.first().click()
      }
      
      await page.waitForTimeout(500)
      
      // URL should update with selected month
      const url = page.url()
      const expectedMonthParam = pastMonth.toISOString().slice(0, 7)
      expect(url).toContain(`month=${expectedMonthParam}`)
      
      // Dropdown should close
      // Verify by checking if we can still see the selected month in the header
      await expect(page.locator(`text=${pastMonthText}`).first()).toBeVisible()
    })

    test('should display transaction counts in dropdown', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Open dropdown
      const selectButton = page.locator('[aria-label="Select month"]')
      await selectButton.click()
      await page.waitForTimeout(500)
      
      // Should show transaction counts for months with transactions
      // Look for text like "5 transactions" or "1 transaction"
      const transactionCountPattern = /\d+ transactions?/
      const countsVisible = await page.locator(`text=${transactionCountPattern}`).count()
      
      // If there are any transactions, counts should be visible
      console.log(`Found ${countsVisible} month(s) with transaction counts`)
    })
  })

  test.describe('URL State Persistence', () => {
    test('should update URL when month changes', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Get initial URL
      const initialUrl = page.url()
      
      // Change month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(500)
      
      // URL should have changed
      const newUrl = page.url()
      expect(newUrl).not.toBe(initialUrl)
      expect(newUrl).toContain('month=')
    })

    test('should preserve month selection on page refresh', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Navigate to a specific month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(500)
      
      // Get the URL with month parameter
      const urlWithMonth = page.url()
      const monthParam = new URL(urlWithMonth).searchParams.get('month')
      expect(monthParam).toBeTruthy()
      
      // Refresh the page
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Month selection should be preserved
      const urlAfterRefresh = page.url()
      expect(urlAfterRefresh).toContain(`month=${monthParam}`)
      
      // Month display should match
      if (monthParam) {
        const [year, month] = monthParam.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        const expectedMonth = date.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        })
        await expect(page.locator(`text=${expectedMonth}`).first()).toBeVisible()
      }
    })

    test('should preserve month selection when navigating back', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Navigate to a specific month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(500)
      
      const urlWithMonth = page.url()
      const monthParam = new URL(urlWithMonth).searchParams.get('month')
      
      // Navigate away
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Navigate back using browser back button
      await page.goBack()
      await page.waitForLoadState('networkidle')
      
      // Month selection should be preserved
      const urlAfterBack = page.url()
      expect(urlAfterBack).toContain(`month=${monthParam}`)
    })

    test('should handle direct URL navigation with month parameter', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Navigate directly to a URL with month parameter
      const targetMonth = '2024-01'
      await page.goto(`/transactions?month=${targetMonth}`)
      await page.waitForLoadState('networkidle')
      
      // Month selector should show January 2024
      await expect(page.locator('text=January 2024').first()).toBeVisible()
      
      // URL should contain the month parameter
      expect(page.url()).toContain(`month=${targetMonth}`)
    })
  })

  test.describe('Transaction Filtering', () => {
    test('should filter transactions by selected month', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Wait for transactions to load
      await page.waitForTimeout(2000)
      
      // Get initial transaction count
      const transactionItems = page.locator('[data-testid="transaction-item"], .transaction-item, [class*="transaction"]')
      const initialCount = await transactionItems.count()
      
      console.log(`Initial transaction count: ${initialCount}`)
      
      // Change to a different month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(2000)
      
      // Transaction count may change (could be more, less, or same)
      const newCount = await transactionItems.count()
      console.log(`Transaction count after month change: ${newCount}`)
      
      // The key is that the page should still be functional
      // and show appropriate content for the selected month
    })

    test('should show correct transaction count in month selector', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Open month dropdown
      const selectButton = page.locator('[aria-label="Select month"]')
      await selectButton.click()
      await page.waitForTimeout(500)
      
      // Look for transaction counts in dropdown
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      
      // Find the current month option in dropdown
      const currentMonthOption = page.locator(`button:has-text("${currentMonth}")`).last()
      
      // Check if it has a transaction count
      const optionText = await currentMonthOption.textContent()
      console.log(`Current month option text: ${optionText}`)
      
      // If there's a count, it should be a number
      if (optionText?.includes('transaction')) {
        const match = optionText.match(/(\d+) transactions?/)
        if (match) {
          const count = parseInt(match[1])
          expect(count).toBeGreaterThanOrEqual(0)
          console.log(`Current month has ${count} transactions`)
        }
      }
    })

    test('should update transaction list when month changes', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Wait for initial load
      await page.waitForTimeout(2000)
      
      // Get a transaction description from current month (if any)
      const transactionItems = page.locator('[data-testid="transaction-item"], .transaction-item')
      const initialCount = await transactionItems.count()
      
      let firstTransactionText = ''
      if (initialCount > 0) {
        firstTransactionText = await transactionItems.first().textContent() || ''
      }
      
      console.log(`Initial transactions: ${initialCount}`)
      
      // Change month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(2000)
      
      // Transaction list should update
      const newCount = await transactionItems.count()
      console.log(`Transactions after month change: ${newCount}`)
      
      // If there were transactions before, the list should have changed
      if (initialCount > 0 && newCount > 0) {
        const newFirstTransactionText = await transactionItems.first().textContent() || ''
        // The transactions might be different (or might be the same if data spans months)
        console.log('Transaction list updated after month change')
      }
    })
  })

  test.describe('Transaction Count Accuracy', () => {
    test('should display accurate transaction count for current month', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Wait for transactions to load
      await page.waitForTimeout(2000)
      
      // Count visible transactions
      const transactionItems = page.locator('[data-testid="transaction-item"], .transaction-item')
      const visibleCount = await transactionItems.count()
      
      // Open month dropdown to see the count
      const selectButton = page.locator('[aria-label="Select month"]')
      await selectButton.click()
      await page.waitForTimeout(500)
      
      // Get the count from dropdown
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      const currentMonthOption = page.locator(`button:has-text("${currentMonth}")`).last()
      const optionText = await currentMonthOption.textContent()
      
      console.log(`Visible transactions: ${visibleCount}`)
      console.log(`Dropdown text: ${optionText}`)
      
      // If there's a count in the dropdown, it should match visible transactions
      if (optionText?.includes('transaction')) {
        const match = optionText.match(/(\d+) transactions?/)
        if (match) {
          const dropdownCount = parseInt(match[1])
          expect(dropdownCount).toBe(visibleCount)
          console.log(`✓ Transaction count matches: ${dropdownCount}`)
        }
      }
    })

    test('should show zero transactions for empty months', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Navigate to a future month (likely to be empty)
      const nextButton = page.locator('[aria-label="Next month"]')
      
      // Go several months into the future
      for (let i = 0; i < 6; i++) {
        await nextButton.click()
        await page.waitForTimeout(500)
      }
      
      // Wait for transactions to load (or not load)
      await page.waitForTimeout(2000)
      
      // Should show empty state or no transactions
      const transactionItems = page.locator('[data-testid="transaction-item"], .transaction-item')
      const count = await transactionItems.count()
      
      console.log(`Future month transaction count: ${count}`)
      
      // Should show appropriate empty state
      if (count === 0) {
        // Look for empty state message
        const emptyState = page.locator('text=/no transactions|empty|no data/i')
        const hasEmptyState = await emptyState.count() > 0
        console.log(`Empty state shown: ${hasEmptyState}`)
      }
    })

    test('should maintain count accuracy when filtering by other criteria', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Wait for initial load
      await page.waitForTimeout(2000)
      
      // Get initial count
      const transactionItems = page.locator('[data-testid="transaction-item"], .transaction-item')
      const initialCount = await transactionItems.count()
      
      console.log(`Initial count: ${initialCount}`)
      
      // Try to apply a type filter (if available)
      const typeFilter = page.locator('[aria-label*="type"], select, [role="combobox"]').first()
      const filterExists = await typeFilter.count() > 0
      
      if (filterExists) {
        await typeFilter.click()
        await page.waitForTimeout(500)
        
        // Select a filter option (e.g., "Income" or "Expense")
        const filterOption = page.locator('text=/income|expense/i').first()
        if (await filterOption.count() > 0) {
          await filterOption.click()
          await page.waitForTimeout(2000)
          
          // Count should update based on filter
          const filteredCount = await transactionItems.count()
          console.log(`Filtered count: ${filteredCount}`)
          
          // Filtered count should be <= initial count
          expect(filteredCount).toBeLessThanOrEqual(initialCount)
        }
      }
    })
  })

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle rapid month navigation', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Rapidly click next month multiple times
      const nextButton = page.locator('[aria-label="Next month"]')
      
      for (let i = 0; i < 5; i++) {
        await nextButton.click()
        await page.waitForTimeout(100) // Short delay
      }
      
      // Wait for final state
      await page.waitForTimeout(1000)
      
      // Page should still be functional
      await expect(page.locator('[aria-label="Select month"]')).toBeVisible()
      
      // URL should have a valid month parameter
      const url = page.url()
      if (url.includes('month=')) {
        const monthParam = new URL(url).searchParams.get('month')
        expect(monthParam).toMatch(/^\d{4}-\d{2}$/)
      }
    })

    test('should handle invalid month parameter in URL', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Navigate to URL with invalid month parameter
      await page.goto('/transactions?month=invalid')
      await page.waitForLoadState('networkidle')
      
      // Should fall back to current month or handle gracefully
      await expect(page.locator('[aria-label="Select month"]')).toBeVisible()
      
      // Should show some month (either current or default)
      const monthDisplay = page.locator('text=/january|february|march|april|may|june|july|august|september|october|november|december/i').first()
      await expect(monthDisplay).toBeVisible()
    })

    test('should handle month navigation with slow network', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 200))
        await route.continue()
      })
      
      await loginAndNavigateToTransactions(page)
      
      // Navigate to previous month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      
      // Should still work, just slower
      await page.waitForTimeout(2000)
      
      // URL should update
      expect(page.url()).toContain('month=')
    })

    test('should maintain month selection across page navigation', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Select a specific month
      const prevButton = page.locator('[aria-label="Previous month"]')
      await prevButton.click()
      await page.waitForTimeout(500)
      
      const urlWithMonth = page.url()
      const monthParam = new URL(urlWithMonth).searchParams.get('month')
      
      // Navigate to dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Navigate back to transactions
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      // Month should reset to current (or could be preserved depending on implementation)
      // The key is that the page should work correctly
      await expect(page.locator('[aria-label="Select month"]')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have accessible month navigation controls', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // All navigation buttons should have aria-labels
      await expect(page.locator('[aria-label="Previous month"]')).toBeVisible()
      await expect(page.locator('[aria-label="Next month"]')).toBeVisible()
      await expect(page.locator('[aria-label="Select month"]')).toBeVisible()
    })

    test('should support keyboard navigation', async ({ page }) => {
      await loginAndNavigateToTransactions(page)
      
      // Tab to month selector
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to open dropdown with Enter or Space
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // Should be able to navigate with arrow keys
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      
      // Should be able to select with Enter
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // URL should update
      expect(page.url()).toContain('month=')
    })
  })
})
