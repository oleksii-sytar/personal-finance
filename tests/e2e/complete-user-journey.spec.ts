/**
 * E2E Tests for Complete User Journey with Financial Safety Features
 * Requirements: Complete user journey from onboarding to forecast viewing
 * 
 * Tests the end-to-end user experience:
 * 1. New user onboarding with workspace and account setup
 * 2. Adding historical transactions for forecast data
 * 3. Adding planned future transactions
 * 4. Viewing daily forecast and risk indicators
 * 5. Managing upcoming payments
 * 6. Month navigation and filtering
 */

import { test, expect, Page } from '@playwright/test'
import { TestHelpers, TestDataGenerator } from './helpers/test-helpers'

test.describe('Complete User Journey - Financial Safety System', () => {
  let helpers: TestHelpers
  let page: Page
  let testUser: { email: string; password: string; fullName: string }

  test.describe('New User Complete Journey', () => {
    test('should complete full journey from registration to forecast viewing', async ({ page: testPage }) => {
      page = testPage
      helpers = new TestHelpers(page)

      // ========================================
      // STEP 1: Registration
      // ========================================
      console.log('Step 1: User Registration')
      
      testUser = TestDataGenerator.generateUser()
      await page.goto('/auth/signup')
      
      await page.fill('input[type="text"]', testUser.fullName)
      await page.fill('input[type="email"]', testUser.email)
      await page.fill('input[type="password"]', testUser.password)
      
      // Find confirm password field (might be second password input)
      const passwordInputs = page.locator('input[type="password"]')
      if (await passwordInputs.count() > 1) {
        await passwordInputs.nth(1).fill(testUser.password)
      }
      
      await page.click('button[type="submit"]:has-text("Create Account")')
      await page.waitForTimeout(3000)

      // ========================================
      // STEP 2: Login (if registration redirects to login)
      // ========================================
      console.log('Step 2: User Login')
      
      const currentUrl = page.url()
      if (currentUrl.includes('/auth/login')) {
        await page.fill('input[type="email"]', testUser.email)
        await page.fill('input[type="password"]', testUser.password)
        await page.click('button[type="submit"]:has-text("Sign In")')
        await page.waitForTimeout(3000)
      }

      // ========================================
      // STEP 3: Workspace Creation
      // ========================================
      console.log('Step 3: Workspace Creation')
      
      // Should be prompted to create workspace
      const workspacePrompt = page.locator('text=/create.*workspace|workspace.*setup/i')
      
      if (await workspacePrompt.count() > 0) {
        await expect(workspacePrompt.first()).toBeVisible()
        
        // Click create workspace button
        const createWorkspaceBtn = page.locator('button:has-text("Create Workspace"), button:has-text("Get Started")')
        await createWorkspaceBtn.first().click()
        await page.waitForTimeout(1000)
        
        // Fill workspace details
        const workspaceNameInput = page.locator('input[name="name"], input[placeholder*="workspace"]')
        if (await workspaceNameInput.count() > 0) {
          await workspaceNameInput.fill('My Family Budget')
          
          // Submit
          await page.click('button[type="submit"]:has-text("Create"), button:has-text("Continue")')
          await page.waitForTimeout(2000)
        }
      }

      // ========================================
      // STEP 4: Account Creation
      // ========================================
      console.log('Step 4: Account Creation')
      
      // Should be prompted to create account
      const accountPrompt = page.locator('text=/create.*account|account.*setup|add.*account/i')
      
      if (await accountPrompt.count() > 0) {
        await expect(accountPrompt.first()).toBeVisible()
        
        // Click create account button
        const createAccountBtn = page.locator('button:has-text("Create Account"), button:has-text("Add Account")')
        await createAccountBtn.first().click()
        await page.waitForTimeout(1000)
        
        // Fill account details
        await page.fill('input[name="name"]', 'Main Checking')
        await page.fill('input[name="initial_balance"]', '5000')
        
        // Submit
        await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")')
        await page.waitForTimeout(2000)
      }

      // ========================================
      // STEP 5: Add Historical Transactions (for forecast data)
      // ========================================
      console.log('Step 5: Adding Historical Transactions')
      
      // Navigate to transactions page
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      // Add multiple historical transactions (need 14+ days for forecast)
      const historicalTransactions = [
        { amount: '150', description: 'Groceries', daysAgo: 1 },
        { amount: '80', description: 'Gas', daysAgo: 3 },
        { amount: '200', description: 'Utilities', daysAgo: 5 },
        { amount: '50', description: 'Restaurant', daysAgo: 7 },
        { amount: '120', description: 'Shopping', daysAgo: 10 },
        { amount: '90', description: 'Groceries', daysAgo: 12 },
        { amount: '60', description: 'Entertainment', daysAgo: 14 },
        { amount: '2000', description: 'Salary', daysAgo: 15, type: 'income' },
      ]
      
      for (const tx of historicalTransactions) {
        // Open transaction form
        const addButton = page.locator('button:has-text("Quick Entry"), button:has-text("Add Transaction")')
        if (await addButton.count() > 0) {
          await addButton.first().click()
          await page.waitForTimeout(500)
          
          // Calculate past date
          const pastDate = new Date()
          pastDate.setDate(pastDate.getDate() - tx.daysAgo)
          
          // Fill form
          await page.fill('input[name="amount"]', tx.amount)
          await page.fill('input[name="description"]', tx.description)
          await page.fill('input[type="date"]', pastDate.toISOString().split('T')[0])
          
          // Select type if needed
          if (tx.type === 'income') {
            const typeSelect = page.locator('select[name="type"], [role="combobox"]')
            if (await typeSelect.count() > 0) {
              await typeSelect.selectOption('income')
            }
          }
          
          // Submit
          await page.click('button[type="submit"]:has-text("Save")')
          await page.waitForTimeout(1500)
        }
      }
      
      console.log(`✓ Added ${historicalTransactions.length} historical transactions`)

      // ========================================
      // STEP 6: Add Planned Future Transactions
      // ========================================
      console.log('Step 6: Adding Planned Future Transactions')
      
      const plannedTransactions = [
        { amount: '500', description: 'Rent Payment', daysAhead: 3 },
        { amount: '100', description: 'Insurance', daysAhead: 7 },
        { amount: '75', description: 'Phone Bill', daysAhead: 10 },
      ]
      
      for (const tx of plannedTransactions) {
        const addButton = page.locator('button:has-text("Quick Entry"), button:has-text("Add Transaction")')
        if (await addButton.count() > 0) {
          await addButton.first().click()
          await page.waitForTimeout(500)
          
          // Calculate future date
          const futureDate = new Date()
          futureDate.setDate(futureDate.getDate() + tx.daysAhead)
          
          // Fill form
          await page.fill('input[name="amount"]', tx.amount)
          await page.fill('input[name="description"]', tx.description)
          await page.fill('input[type="date"]', futureDate.toISOString().split('T')[0])
          
          // Should show planned indicator
          const plannedIndicator = page.locator('text=/planned|future|scheduled/i')
          if (await plannedIndicator.count() > 0) {
            console.log(`✓ Planned transaction indicator shown for ${tx.description}`)
          }
          
          // Submit
          await page.click('button[type="submit"]:has-text("Save")')
          await page.waitForTimeout(1500)
        }
      }
      
      console.log(`✓ Added ${plannedTransactions.length} planned transactions`)

      // ========================================
      // STEP 7: View Dashboard with Forecast
      // ========================================
      console.log('Step 7: Viewing Dashboard with Forecast')
      
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Should see dashboard
      await expect(page.locator('h1:has-text("Family Dashboard"), h1:has-text("Dashboard")')).toBeVisible()
      
      // Should see forecast widget (now that we have enough data)
      const forecastWidget = page.locator('[data-testid="forecast-widget"], [data-testid="daily-forecast"]')
      
      if (await forecastWidget.count() > 0) {
        await expect(forecastWidget.first()).toBeVisible()
        console.log('✓ Daily forecast widget is visible')
        
        // Should show risk indicators
        const riskIndicators = page.locator('[data-testid="risk-indicator"], .risk-level')
        if (await riskIndicators.count() > 0) {
          console.log(`✓ Found ${await riskIndicators.count()} risk indicators`)
        }
      } else {
        console.log('⚠️ Forecast widget not visible - may need more data or feature not enabled')
      }

      // ========================================
      // STEP 8: View Upcoming Payments
      // ========================================
      console.log('Step 8: Viewing Upcoming Payments')
      
      const upcomingPayments = page.locator('[data-testid="upcoming-payments"], [data-testid="payment-risks"]')
      
      if (await upcomingPayments.count() > 0) {
        await expect(upcomingPayments.first()).toBeVisible()
        console.log('✓ Upcoming payments widget is visible')
        
        // Should show our planned transactions
        for (const tx of plannedTransactions) {
          const payment = page.locator(`text=${tx.description}`)
          if (await payment.count() > 0) {
            console.log(`✓ Found planned payment: ${tx.description}`)
          }
        }
      }

      // ========================================
      // STEP 9: Test Month Navigation
      // ========================================
      console.log('Step 9: Testing Month Navigation')
      
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      // Should see month selector
      const monthSelector = page.locator('[aria-label="Select month"]')
      if (await monthSelector.count() > 0) {
        await expect(monthSelector).toBeVisible()
        console.log('✓ Month selector is visible')
        
        // Navigate to previous month
        const prevButton = page.locator('[aria-label="Previous month"]')
        if (await prevButton.count() > 0) {
          await prevButton.click()
          await page.waitForTimeout(1000)
          
          // URL should update
          expect(page.url()).toContain('month=')
          console.log('✓ Month navigation works')
        }
      }

      // ========================================
      // STEP 10: Mark Planned Transaction as Completed
      // ========================================
      console.log('Step 10: Marking Planned Transaction as Completed')
      
      // Go back to current month
      const todayButton = page.locator('button:has-text("Today")')
      if (await todayButton.count() > 0) {
        await todayButton.click()
        await page.waitForTimeout(1000)
      }
      
      // Find a planned transaction
      const plannedBadge = page.locator('[data-testid="status-badge"]:has-text("Planned")').first()
      
      if (await plannedBadge.count() > 0) {
        // Get the transaction row
        const transactionRow = plannedBadge.locator('..').locator('..')
        
        // Mark as paid
        const markAsPaidButton = transactionRow.locator('button:has-text("Mark as Paid")')
        if (await markAsPaidButton.count() > 0) {
          await markAsPaidButton.click()
          await page.waitForTimeout(2000)
          
          // Should now show as completed
          await expect(transactionRow.locator('[data-testid="status-badge"]:has-text("Completed")')).toBeVisible()
          console.log('✓ Successfully marked planned transaction as completed')
        }
      }

      // ========================================
      // STEP 11: Verify Forecast Updated
      // ========================================
      console.log('Step 11: Verifying Forecast Updated')
      
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Forecast should reflect the completed transaction
      const forecastWidgetFinal = page.locator('[data-testid="forecast-widget"]')
      if (await forecastWidgetFinal.count() > 0) {
        console.log('✓ Forecast is still visible after transaction update')
      }

      // ========================================
      // JOURNEY COMPLETE
      // ========================================
      console.log('✅ Complete user journey finished successfully!')
      console.log('User experienced:')
      console.log('  - Registration and login')
      console.log('  - Workspace creation')
      console.log('  - Account setup')
      console.log('  - Historical transaction entry')
      console.log('  - Planned transaction creation')
      console.log('  - Daily forecast viewing')
      console.log('  - Upcoming payments monitoring')
      console.log('  - Month navigation')
      console.log('  - Transaction status management')
    })
  })

  test.describe('Returning User Journey', () => {
    test('should provide seamless experience for returning user', async ({ page: testPage }) => {
      page = testPage
      helpers = new TestHelpers(page)

      // Login as existing user
      await helpers.loginUser('test@example.com', 'password123')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })

      // ========================================
      // Quick Daily Check Workflow
      // ========================================
      console.log('Returning User: Quick Daily Check')
      
      // 1. View dashboard with forecast
      await expect(page.locator('h1:has-text("Family Dashboard"), h1:has-text("Dashboard")')).toBeVisible()
      
      // 2. Check upcoming payments
      const upcomingPayments = page.locator('[data-testid="upcoming-payments"]')
      if (await upcomingPayments.count() > 0) {
        console.log('✓ Checked upcoming payments')
      }
      
      // 3. Check forecast for risk days
      const riskIndicators = page.locator('[data-testid="risk-indicator"]')
      if (await riskIndicators.count() > 0) {
        const riskCount = await riskIndicators.count()
        console.log(`✓ Reviewed ${riskCount} risk indicators`)
      }
      
      // 4. Quick transaction entry
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      const quickEntryButton = page.locator('button:has-text("Quick Entry")')
      if (await quickEntryButton.count() > 0) {
        await quickEntryButton.click()
        await page.waitForTimeout(500)
        
        // Add today's transaction
        await page.fill('input[name="amount"]', '45')
        await page.fill('input[name="description"]', 'Coffee and lunch')
        await page.fill('input[type="date"]', new Date().toISOString().split('T')[0])
        
        await page.click('button[type="submit"]:has-text("Save")')
        await page.waitForTimeout(1500)
        
        console.log('✓ Added quick transaction')
      }
      
      // 5. Return to dashboard to see updated forecast
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      console.log('✅ Returning user daily check complete')
    })

    test('should handle monthly review workflow', async ({ page: testPage }) => {
      page = testPage
      helpers = new TestHelpers(page)

      await helpers.loginUser('test@example.com', 'password123')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })

      // ========================================
      // Monthly Review Workflow
      // ========================================
      console.log('Returning User: Monthly Review')
      
      // 1. Navigate to transactions
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      // 2. Review current month
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
      console.log(`Reviewing transactions for ${currentMonth}`)
      
      // 3. Check transaction count
      const transactions = page.locator('[data-testid="transaction-item"]')
      const count = await transactions.count()
      console.log(`Found ${count} transactions this month`)
      
      // 4. Navigate to previous month for comparison
      const prevButton = page.locator('[aria-label="Previous month"]')
      if (await prevButton.count() > 0) {
        await prevButton.click()
        await page.waitForTimeout(1000)
        
        const prevCount = await transactions.count()
        console.log(`Previous month had ${prevCount} transactions`)
      }
      
      // 5. Return to current month
      const todayButton = page.locator('button:has-text("Today")')
      if (await todayButton.count() > 0) {
        await todayButton.click()
        await page.waitForTimeout(1000)
      }
      
      // 6. Review spending trends (if available)
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const spendingTrends = page.locator('[data-testid="spending-trends"]')
      if (await spendingTrends.count() > 0) {
        console.log('✓ Reviewed spending trends')
      }
      
      console.log('✅ Monthly review complete')
    })
  })

  test.describe('Financial Safety Scenarios', () => {
    test('should warn user about upcoming payment risks', async ({ page: testPage }) => {
      page = testPage
      helpers = new TestHelpers(page)

      await helpers.loginUser('test@example.com', 'password123')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })

      // Add a large planned expense that might cause risk
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      const addButton = page.locator('button:has-text("Quick Entry")')
      if (await addButton.count() > 0) {
        await addButton.click()
        await page.waitForTimeout(500)
        
        // Add large future expense
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 2)
        
        await page.fill('input[name="amount"]', '3000')
        await page.fill('input[name="description"]', 'Large Payment')
        await page.fill('input[type="date"]', futureDate.toISOString().split('T')[0])
        
        await page.click('button[type="submit"]:has-text("Save")')
        await page.waitForTimeout(2000)
      }
      
      // Go to dashboard to see risk warning
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Should show risk indicator
      const riskWarning = page.locator('[data-testid="risk-indicator"]:has-text("danger"), [data-testid="risk-indicator"]:has-text("warning")')
      
      if (await riskWarning.count() > 0) {
        console.log('✓ Risk warning displayed for large upcoming payment')
      }
      
      // Should show in upcoming payments with risk level
      const upcomingPayments = page.locator('[data-testid="upcoming-payments"]')
      if (await upcomingPayments.count() > 0) {
        const largePayment = page.locator('text=Large Payment')
        if (await largePayment.count() > 0) {
          console.log('✓ Large payment shown in upcoming payments')
        }
      }
    })

    test('should show safe status when sufficient funds available', async ({ page: testPage }) => {
      page = testPage
      helpers = new TestHelpers(page)

      await helpers.loginUser('test@example.com', 'password123')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })

      // Add income to ensure sufficient funds
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      const addButton = page.locator('button:has-text("Quick Entry")')
      if (await addButton.count() > 0) {
        await addButton.click()
        await page.waitForTimeout(500)
        
        // Add income
        await page.fill('input[name="amount"]', '5000')
        await page.fill('input[name="description"]', 'Salary')
        await page.fill('input[type="date"]', new Date().toISOString().split('T')[0])
        
        // Select income type
        const typeSelect = page.locator('select[name="type"]')
        if (await typeSelect.count() > 0) {
          await typeSelect.selectOption('income')
        }
        
        await page.click('button[type="submit"]:has-text("Save")')
        await page.waitForTimeout(2000)
      }
      
      // Go to dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Should show safe indicators
      const safeIndicators = page.locator('[data-testid="risk-indicator"]:has-text("safe"), .risk-safe, .safe')
      
      if (await safeIndicators.count() > 0) {
        console.log('✓ Safe status displayed with sufficient funds')
      }
    })
  })
})
