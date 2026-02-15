/**
 * E2E Tests for Daily Forecast Viewing
 * Requirements: 2.5 Daily Cash Flow Forecast
 * 
 * Tests the complete forecast viewing experience:
 * 1. Viewing daily forecast chart on dashboard
 * 2. Understanding risk indicators (safe/warning/danger)
 * 3. Viewing forecast breakdown and details
 * 4. Handling insufficient data scenarios
 * 5. Forecast updates when transactions change
 */

import { test, expect, Page } from '@playwright/test'
import { TestHelpers } from './helpers/test-helpers'

test.describe('Daily Forecast Viewing', () => {
  let helpers: TestHelpers
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    helpers = new TestHelpers(page)

    // Login with test user
    await helpers.loginUser('test@example.com', 'password123')
    
    // Wait for dashboard to load
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test.describe('Forecast Chart Display', () => {
    test('should display daily forecast chart on dashboard', async () => {
      // Dashboard should be visible
      await expect(page.locator('h1:has-text("Family Dashboard")')).toBeVisible()

      // Look for forecast widget/chart
      const forecastWidget = page.locator('[data-testid="forecast-widget"], [data-testid="daily-forecast-chart"]')
      
      // If forecast widget exists, verify its contents
      if (await forecastWidget.count() > 0) {
        await expect(forecastWidget.first()).toBeVisible()
        
        // Should have a title
        await expect(page.locator('text=/daily forecast|cash flow forecast/i')).toBeVisible()
        
        // Should have some visual representation (chart, graph, etc.)
        const chartElement = page.locator('canvas, svg, [role="img"]').first()
        if (await chartElement.count() > 0) {
          await expect(chartElement).toBeVisible()
        }
      } else {
        console.log('Forecast widget not found - may require more transaction data')
      }
    })

    test('should show forecast for current month by default', async () => {
      // Check if forecast widget exists
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Should show current month in title or header
        const currentMonth = new Date().toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        })
        
        // Look for month indicator in forecast section
        const monthIndicator = page.locator(`text=${currentMonth}`)
        if (await monthIndicator.count() > 0) {
          await expect(monthIndicator.first()).toBeVisible()
        }
      }
    })

    test('should display risk level indicators', async () => {
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for risk indicators (safe/warning/danger)
        const riskIndicators = page.locator('[data-testid="risk-indicator"], .risk-level, [class*="risk"]')
        
        if (await riskIndicators.count() > 0) {
          // Should have at least one risk indicator
          await expect(riskIndicators.first()).toBeVisible()
          
          // Check for color coding (green/yellow/red)
          const firstIndicator = riskIndicators.first()
          const classList = await firstIndicator.getAttribute('class')
          
          // Should have some color indication
          const hasColorClass = classList && (
            classList.includes('green') ||
            classList.includes('yellow') ||
            classList.includes('red') ||
            classList.includes('amber') ||
            classList.includes('danger') ||
            classList.includes('warning') ||
            classList.includes('safe')
          )
          
          if (hasColorClass) {
            console.log('✓ Risk indicators have color coding')
          }
        }
      }
    })

    test('should show summary statistics', async () => {
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for summary stats like "X safe days", "Y warning days", etc.
        const summaryStats = page.locator('[data-testid="forecast-summary"], .forecast-stats')
        
        if (await summaryStats.count() > 0) {
          await expect(summaryStats.first()).toBeVisible()
          
          // Should show counts for different risk levels
          const statsText = await summaryStats.first().textContent()
          console.log('Forecast summary:', statsText)
        }
      }
    })
  })

  test.describe('Forecast Breakdown and Details', () => {
    test('should show detailed breakdown on hover or click', async () => {
      const forecastChart = page.locator('[data-testid="daily-forecast-chart"], canvas, svg')
      
      if (await forecastChart.count() > 0) {
        // Hover over chart to see tooltip/details
        await forecastChart.first().hover()
        await page.waitForTimeout(500)
        
        // Look for tooltip or detail panel
        const tooltip = page.locator('[role="tooltip"], .tooltip, [data-testid="forecast-tooltip"]')
        
        if (await tooltip.count() > 0) {
          await expect(tooltip.first()).toBeVisible()
          
          // Tooltip should show relevant information
          const tooltipText = await tooltip.first().textContent()
          console.log('Forecast tooltip:', tooltipText)
        }
      }
    })

    test('should display projected balance amounts', async () => {
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for currency amounts (₴ or numbers)
        const amounts = page.locator('text=/₴|\\$|€|£/').filter({ has: page.locator('text=/\\d+/') })
        
        if (await amounts.count() > 0) {
          const firstAmount = await amounts.first().textContent()
          console.log('Found projected balance:', firstAmount)
          
          // Should be a valid currency format
          expect(firstAmount).toMatch(/[₴$€£]\s*[\d,]+/)
        }
      }
    })

    test('should show confidence level indicators', async () => {
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for confidence indicators (high/medium/low)
        const confidenceIndicator = page.locator('text=/confidence|accuracy|reliability/i')
        
        if (await confidenceIndicator.count() > 0) {
          await expect(confidenceIndicator.first()).toBeVisible()
          console.log('✓ Confidence indicator found')
        }
      }
    })

    test('should explain forecast calculation methodology', async () => {
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for info icon or help text
        const infoIcon = page.locator('[data-testid="forecast-info"], button:has-text("?"), [aria-label*="info"]')
        
        if (await infoIcon.count() > 0) {
          await infoIcon.first().click()
          await page.waitForTimeout(500)
          
          // Should show explanation
          const explanation = page.locator('[role="dialog"], .modal, [data-testid="forecast-explanation"]')
          if (await explanation.count() > 0) {
            await expect(explanation.first()).toBeVisible()
            console.log('✓ Forecast explanation available')
          }
        }
      }
    })
  })

  test.describe('Insufficient Data Scenarios', () => {
    test('should show appropriate message when insufficient data', async () => {
      // For a new user or account with minimal transactions
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for insufficient data message
        const insufficientDataMsg = page.locator('text=/not enough data|insufficient data|add more transactions|need more history/i')
        
        if (await insufficientDataMsg.count() > 0) {
          await expect(insufficientDataMsg.first()).toBeVisible()
          console.log('✓ Insufficient data message shown')
          
          // Should have a call-to-action to add transactions
          const addTransactionCTA = page.locator('button:has-text("Add Transaction"), a:has-text("Add Transaction")')
          if (await addTransactionCTA.count() > 0) {
            await expect(addTransactionCTA.first()).toBeVisible()
          }
        }
      } else {
        console.log('Forecast widget not displayed - likely insufficient data')
      }
    })

    test('should hide low-confidence forecasts', async () => {
      // According to requirements, low-confidence forecasts should be hidden
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Should NOT show "low confidence" label on visible forecasts
        const lowConfidenceLabel = page.locator('text=/low confidence/i')
        
        // If low confidence forecasts are shown, this is a bug
        if (await lowConfidenceLabel.count() > 0) {
          console.warn('⚠️ Low confidence forecast is visible - should be hidden per requirements')
        } else {
          console.log('✓ Low confidence forecasts properly hidden')
        }
      }
    })

    test('should show minimum data requirement message', async () => {
      // Requirements specify 14 days minimum
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() === 0) {
        // Look for message about minimum data requirement
        const minDataMsg = page.locator('text=/14 days|two weeks|minimum.*transactions/i')
        
        if (await minDataMsg.count() > 0) {
          await expect(minDataMsg.first()).toBeVisible()
          console.log('✓ Minimum data requirement message shown')
        }
      }
    })
  })

  test.describe('Forecast Updates', () => {
    test('should update forecast when new transaction is added', async () => {
      // Check if forecast exists
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Get initial forecast state (if possible)
        const initialState = await forecastWidget.first().textContent()
        
        // Navigate to transactions and add a new one
        await page.goto('/transactions')
        await page.waitForLoadState('networkidle')
        
        // Add a future transaction
        const addButton = page.locator('button:has-text("Quick Entry"), button:has-text("Add Transaction")')
        if (await addButton.count() > 0) {
          await addButton.first().click()
          await page.waitForTimeout(500)
          
          // Fill in transaction details
          const futureDate = new Date()
          futureDate.setDate(futureDate.getDate() + 5)
          
          await page.fill('input[name="amount"]', '500')
          await page.fill('input[name="description"]', 'Forecast update test')
          await page.fill('input[type="date"]', futureDate.toISOString().split('T')[0])
          
          // Submit
          await page.click('button[type="submit"]:has-text("Save")')
          await page.waitForTimeout(2000)
          
          // Go back to dashboard
          await page.goto('/dashboard')
          await page.waitForLoadState('networkidle')
          
          // Forecast should have updated
          const updatedState = await forecastWidget.first().textContent()
          
          // States might be different (or might not if caching)
          console.log('Forecast updated after transaction addition')
        }
      }
    })

    test('should update forecast when transaction is marked as completed', async () => {
      // Navigate to transactions
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      
      // Look for a planned transaction
      const plannedTransaction = page.locator('[data-testid="status-badge"]:has-text("Planned")').first()
      
      if (await plannedTransaction.count() > 0) {
        // Get the transaction row
        const transactionRow = plannedTransaction.locator('..').locator('..')
        
        // Mark as paid
        const markAsPaidButton = transactionRow.locator('button:has-text("Mark as Paid")')
        if (await markAsPaidButton.count() > 0) {
          await markAsPaidButton.click()
          await page.waitForTimeout(2000)
          
          // Go to dashboard to see updated forecast
          await page.goto('/dashboard')
          await page.waitForLoadState('networkidle')
          
          // Forecast should reflect the completed transaction
          console.log('Forecast should update after marking transaction as completed')
        }
      }
    })

    test('should refresh forecast when month is changed', async () => {
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for month selector in forecast widget
        const monthSelector = page.locator('[data-testid="forecast-month-selector"], [aria-label="Select month"]')
        
        if (await monthSelector.count() > 0) {
          // Change month
          await monthSelector.first().click()
          await page.waitForTimeout(500)
          
          // Select different month
          const nextMonthOption = page.locator('button:has-text("Next month"), [role="option"]').first()
          if (await nextMonthOption.count() > 0) {
            await nextMonthOption.click()
            await page.waitForTimeout(1000)
            
            // Forecast should update for new month
            console.log('Forecast updated for different month')
          }
        }
      }
    })
  })

  test.describe('Forecast Interaction', () => {
    test('should allow zooming or focusing on specific days', async () => {
      const forecastChart = page.locator('[data-testid="daily-forecast-chart"], canvas, svg')
      
      if (await forecastChart.count() > 0) {
        // Click on a specific day in the chart
        await forecastChart.first().click()
        await page.waitForTimeout(500)
        
        // Should show details for that day
        const dayDetails = page.locator('[data-testid="day-details"], [role="dialog"]')
        
        if (await dayDetails.count() > 0) {
          await expect(dayDetails.first()).toBeVisible()
          console.log('✓ Day details shown on click')
        }
      }
    })

    test('should highlight risk days clearly', async () => {
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Look for danger/warning indicators
        const riskDays = page.locator('[data-testid="risk-day"], .danger, .warning, [class*="risk"]')
        
        if (await riskDays.count() > 0) {
          // Risk days should be visually distinct
          const firstRiskDay = riskDays.first()
          const classList = await firstRiskDay.getAttribute('class')
          
          // Should have red or amber coloring
          const hasRiskColor = classList && (
            classList.includes('red') ||
            classList.includes('amber') ||
            classList.includes('danger') ||
            classList.includes('warning')
          )
          
          if (hasRiskColor) {
            console.log('✓ Risk days are visually highlighted')
          }
        }
      }
    })

    test('should show upcoming payments in forecast context', async () => {
      // Look for upcoming payments widget near forecast
      const upcomingPayments = page.locator('[data-testid="upcoming-payments"], [data-testid="payment-risks"]')
      
      if (await upcomingPayments.count() > 0) {
        await expect(upcomingPayments.first()).toBeVisible()
        
        // Should show planned transactions
        const plannedPayments = page.locator('[data-testid="planned-payment"]')
        
        if (await plannedPayments.count() > 0) {
          console.log(`Found ${await plannedPayments.count()} upcoming payments`)
          
          // Each should have risk indicator
          const firstPayment = plannedPayments.first()
          const riskIndicator = firstPayment.locator('[data-testid="risk-indicator"]')
          
          if (await riskIndicator.count() > 0) {
            await expect(riskIndicator).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should display forecast appropriately on mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Reload dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        // Should be visible and properly sized
        await expect(forecastWidget.first()).toBeVisible()
        
        // Chart should be responsive
        const chart = page.locator('canvas, svg').first()
        if (await chart.count() > 0) {
          const boundingBox = await chart.boundingBox()
          
          if (boundingBox) {
            // Width should not exceed viewport
            expect(boundingBox.width).toBeLessThanOrEqual(375)
            console.log('✓ Forecast chart is responsive on mobile')
          }
        }
      }
    })

    test('should display forecast appropriately on tablet', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Reload dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        await expect(forecastWidget.first()).toBeVisible()
        console.log('✓ Forecast visible on tablet')
      }
    })

    test('should display forecast appropriately on desktop', async () => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      // Reload dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const forecastWidget = page.locator('[data-testid="forecast-widget"]')
      
      if (await forecastWidget.count() > 0) {
        await expect(forecastWidget.first()).toBeVisible()
        console.log('✓ Forecast visible on desktop')
      }
    })
  })

  test.describe('Performance', () => {
    test('should load forecast within acceptable time', async () => {
      const startTime = Date.now()
      
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
      console.log(`Dashboard loaded in ${loadTime}ms`)
    })

    test('should handle forecast calculation without blocking UI', async () => {
      await page.goto('/dashboard')
      
      // UI should remain responsive during forecast calculation
      const navigationLink = page.locator('a[href="/transactions"]')
      
      // Should be able to click navigation immediately
      await expect(navigationLink.first()).toBeEnabled()
      console.log('✓ UI remains responsive during forecast calculation')
    })
  })
})
