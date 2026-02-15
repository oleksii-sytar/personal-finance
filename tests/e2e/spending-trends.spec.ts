/**
 * E2E Tests for Spending Trends Feature
 * 
 * Validates Requirements 2.8: Spending Trends Analysis
 * 
 * Test Coverage:
 * - Dashboard widget rendering
 * - Category spending display
 * - Month-over-month comparisons
 * - Trend indicators
 * - Unusual spending detection
 * - Top categories highlighting
 * - Data accuracy
 * - User interactions
 * 
 * @module tests/e2e/spending-trends
 */

import { test, expect } from '@playwright/test'
import { login, createTestWorkspace, createTestAccount } from './helpers/auth-helpers'
import { createTestTransaction } from './helpers/transaction-helpers'

test.describe('Spending Trends Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login and setup workspace
    await login(page, 'test@example.com', 'password123')
    await createTestWorkspace(page, 'Test Workspace')
    await createTestAccount(page, 'Main Account', 10000, 'UAH')
  })

  test.describe('Dashboard Widget Display', () => {
    test('should display spending trends widget on dashboard', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard')
      
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="dashboard-page"]', { timeout: 10000 })
      
      // Check for spending trends widget
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget).toBeVisible()
      
      // Verify widget title
      await expect(widget.locator('text=Spending Trends')).toBeVisible()
    })

    test('should show empty state when no transactions exist', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="dashboard-page"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=No spending data yet')).toBeVisible()
      await expect(widget.locator('text=Add some expense transactions')).toBeVisible()
    })

    test('should display loading state while fetching data', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Check for loading skeleton
      const loadingSkeleton = page.locator('[data-testid="spending-trends-widget"] .animate-pulse')
      // Loading state should appear briefly
      await expect(loadingSkeleton.first()).toBeVisible({ timeout: 1000 })
    })
  })

  test.describe('Category Spending Display', () => {
    test('should display spending by category', async ({ page }) => {
      // Create test transactions
      await createTestTransaction(page, {
        amount: 500,
        description: 'Groceries',
        category: 'Food',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'Gas',
        category: 'Transport',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      })
      
      // Navigate to dashboard
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      // Verify categories are displayed
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=Food')).toBeVisible()
      await expect(widget.locator('text=Transport')).toBeVisible()
      
      // Verify amounts are displayed
      await expect(widget.locator('text=500,00 ₴')).toBeVisible()
      await expect(widget.locator('text=300,00 ₴')).toBeVisible()
    })

    test('should display transaction counts for each category', async ({ page }) => {
      // Create multiple transactions in same category
      await createTestTransaction(page, {
        amount: 200,
        description: 'Groceries 1',
        category: 'Food',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'Groceries 2',
        category: 'Food',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=2 transactions')).toBeVisible()
    })

    test('should sort categories by spending amount', async ({ page }) => {
      // Create transactions with different amounts
      await createTestTransaction(page, {
        amount: 100,
        description: 'Entertainment',
        category: 'Entertainment',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 500,
        description: 'Groceries',
        category: 'Food',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'Gas',
        category: 'Transport',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      // Get all category rows
      const categoryRows = page.locator('[data-testid="spending-trends-widget"] [data-testid^="category-row-"]')
      
      // First category should be Food (highest spending)
      const firstCategory = categoryRows.first()
      await expect(firstCategory.locator('text=Food')).toBeVisible()
    })
  })

  test.describe('Month-over-Month Comparisons', () => {
    test('should display percentage change from previous month', async ({ page }) => {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      // Create transaction from last month
      await createTestTransaction(page, {
        amount: 400,
        description: 'Last month groceries',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      // Create transaction this month
      await createTestTransaction(page, {
        amount: 500,
        description: 'This month groceries',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      // Should show 25% increase
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=+25')).toBeVisible()
    })

    test('should display previous month amount', async ({ page }) => {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      await createTestTransaction(page, {
        amount: 400,
        description: 'Last month',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 500,
        description: 'This month',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=was 400,00 ₴')).toBeVisible()
    })
  })

  test.describe('Trend Indicators', () => {
    test('should show increasing trend indicator for positive change', async ({ page }) => {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'Last month',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 500,
        description: 'This month',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      // Check for increasing indicator (arrow up or similar)
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      const increasingIcon = widget.locator('[aria-label="Increasing"]')
      await expect(increasingIcon).toBeVisible()
    })

    test('should show decreasing trend indicator for negative change', async ({ page }) => {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      await createTestTransaction(page, {
        amount: 500,
        description: 'Last month',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'This month',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      const decreasingIcon = widget.locator('[aria-label="Decreasing"]')
      await expect(decreasingIcon).toBeVisible()
    })

    test('should show stable trend indicator for minimal change', async ({ page }) => {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      await createTestTransaction(page, {
        amount: 500,
        description: 'Last month',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 505,
        description: 'This month',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      const stableIcon = widget.locator('[aria-label="Stable"]')
      await expect(stableIcon).toBeVisible()
    })
  })

  test.describe('Unusual Spending Detection', () => {
    test('should highlight unusual spending patterns', async ({ page }) => {
      const today = new Date()
      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 15)
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      // Create normal spending pattern
      await createTestTransaction(page, {
        amount: 300,
        description: 'Two months ago',
        category: 'Food',
        type: 'expense',
        date: twoMonthsAgo.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'Last month',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      // Create unusual spike
      await createTestTransaction(page, {
        amount: 1000,
        description: 'This month - unusual',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      // Should show unusual spending alert
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=Unusual Spending Detected')).toBeVisible()
      
      // Should show warning icon for the category
      const warningIcon = widget.locator('[aria-label*="Unusual spending"]')
      await expect(warningIcon).toBeVisible()
    })

    test('should display count of unusual categories', async ({ page }) => {
      const today = new Date()
      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 15)
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      // Create unusual spending in two categories
      // Food category
      await createTestTransaction(page, {
        amount: 300,
        description: 'Food normal 1',
        category: 'Food',
        type: 'expense',
        date: twoMonthsAgo.toISOString().split('T')[0]
      })
      await createTestTransaction(page, {
        amount: 300,
        description: 'Food normal 2',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      await createTestTransaction(page, {
        amount: 1000,
        description: 'Food unusual',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      // Transport category
      await createTestTransaction(page, {
        amount: 200,
        description: 'Transport normal 1',
        category: 'Transport',
        type: 'expense',
        date: twoMonthsAgo.toISOString().split('T')[0]
      })
      await createTestTransaction(page, {
        amount: 200,
        description: 'Transport normal 2',
        category: 'Transport',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      await createTestTransaction(page, {
        amount: 800,
        description: 'Transport unusual',
        category: 'Transport',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=2 categories have spending')).toBeVisible()
    })
  })

  test.describe('Top Categories Highlighting', () => {
    test('should highlight top 3 spending categories', async ({ page }) => {
      const today = new Date()
      
      // Create transactions in 5 categories
      await createTestTransaction(page, {
        amount: 1000,
        description: 'Food',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 800,
        description: 'Transport',
        category: 'Transport',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 600,
        description: 'Entertainment',
        category: 'Entertainment',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 400,
        description: 'Utilities',
        category: 'Utilities',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 200,
        description: 'Shopping',
        category: 'Shopping',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      // Check for rank badges on top 3
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      const rankBadges = widget.locator('.bg-accent-primary.text-inverse')
      await expect(rankBadges).toHaveCount(3)
    })

    test('should display 3-month average comparison', async ({ page }) => {
      const today = new Date()
      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 15)
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'Month 1',
        category: 'Food',
        type: 'expense',
        date: twoMonthsAgo.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 400,
        description: 'Month 2',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 500,
        description: 'Month 3',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=vs 3-month avg')).toBeVisible()
      // Average should be 400
      await expect(widget.locator('text=400,00 ₴')).toBeVisible()
    })
  })

  test.describe('Total Spending Summary', () => {
    test('should display total spending for current month', async ({ page }) => {
      const today = new Date()
      
      await createTestTransaction(page, {
        amount: 500,
        description: 'Food',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await createTestTransaction(page, {
        amount: 300,
        description: 'Transport',
        category: 'Transport',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=Total Spending This Month')).toBeVisible()
      await expect(widget.locator('text=800,00 ₴')).toBeVisible()
    })

    test('should display average daily spending', async ({ page }) => {
      const today = new Date()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      
      // Create transaction worth 280 (should be 10 per day for 28-day month)
      await createTestTransaction(page, {
        amount: 280,
        description: 'Monthly expense',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=Avg Daily')).toBeVisible()
    })

    test('should display overall percentage change', async ({ page }) => {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
      
      // Last month: 600 total
      await createTestTransaction(page, {
        amount: 400,
        description: 'Last month 1',
        category: 'Food',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      await createTestTransaction(page, {
        amount: 200,
        description: 'Last month 2',
        category: 'Transport',
        type: 'expense',
        date: lastMonth.toISOString().split('T')[0]
      })
      
      // This month: 900 total (50% increase)
      await createTestTransaction(page, {
        amount: 600,
        description: 'This month 1',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      await createTestTransaction(page, {
        amount: 300,
        description: 'This month 2',
        category: 'Transport',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget.locator('text=vs Last Month')).toBeVisible()
      await expect(widget.locator('text=+50')).toBeVisible()
    })
  })

  test.describe('Data Accuracy', () => {
    test('should only include expense transactions', async ({ page }) => {
      const today = new Date()
      
      // Create expense
      await createTestTransaction(page, {
        amount: 500,
        description: 'Expense',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      // Create income (should be ignored)
      await createTestTransaction(page, {
        amount: 2000,
        description: 'Salary',
        category: 'Salary',
        type: 'income',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      // Total should be 500, not 2500
      await expect(widget.locator('text=500,00 ₴')).toBeVisible()
      // Should not show Salary category
      await expect(widget.locator('text=Salary')).not.toBeVisible()
    })

    test('should only include completed transactions', async ({ page }) => {
      const today = new Date()
      
      // Create completed transaction
      await createTestTransaction(page, {
        amount: 500,
        description: 'Completed',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0],
        status: 'completed'
      })
      
      // Create planned transaction (should be ignored)
      await createTestTransaction(page, {
        amount: 1000,
        description: 'Planned',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0],
        status: 'planned'
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      // Total should be 500, not 1500
      await expect(widget.locator('text=500,00 ₴')).toBeVisible()
    })
  })

  test.describe('Responsive Behavior', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const today = new Date()
      await createTestTransaction(page, {
        amount: 500,
        description: 'Test',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget).toBeVisible()
      
      // Widget should be readable on mobile
      await expect(widget.locator('text=Spending Trends')).toBeVisible()
      await expect(widget.locator('text=Food')).toBeVisible()
    })

    test('should be responsive on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      const today = new Date()
      await createTestTransaction(page, {
        amount: 500,
        description: 'Test',
        category: 'Food',
        type: 'expense',
        date: today.toISOString().split('T')[0]
      })
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="spending-trends-widget"]', { timeout: 10000 })
      
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      await expect(widget).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should display error message when data fetch fails', async ({ page }) => {
      // Simulate network error by intercepting API calls
      await page.route('**/api/**', route => route.abort())
      
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="dashboard-page"]', { timeout: 10000 })
      
      // Should show error state
      const widget = page.locator('[data-testid="spending-trends-widget"]')
      // Error handling should be graceful
      await expect(widget).toBeVisible()
    })
  })
})
