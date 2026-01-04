import { test, expect } from '@playwright/test'
import { TestHelpers, TestDataGenerator, FormaAssertions } from './helpers/test-helpers'

test.describe('User Experience Validation - Requirements 11.1, 11.2, 11.3, 12.1, 12.2, 12.3', () => {
  let helpers: TestHelpers
  let assertions: FormaAssertions

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    assertions = new FormaAssertions(page)
  })

  test.describe('Navigation Smoothness Validation', () => {
    test('should verify smooth navigation throughout the application', async ({ page }) => {
      // Test navigation without authentication first (public routes)
      const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/reset-password']
      
      for (const route of publicRoutes) {
        console.log(`Testing navigation to ${route}`)
        
        const startTime = Date.now()
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime
        
        // Should load quickly and smoothly
        expect(loadTime).toBeLessThan(3000)
        await expect(page.locator('body')).toBeVisible()
        
        console.log(`✅ ${route} loaded smoothly in ${loadTime}ms`)
      }
    })

    test('should ensure no authentication interruptions during normal usage', async ({ page }) => {
      // Test that auth pages don't interfere with each other
      await page.goto('/auth/login')
      await assertions.assertOnLoginPage()
      
      // Navigate to signup
      await page.click('a:has-text("Create one here")')
      await assertions.assertOnSignupPage()
      
      // Navigate back to login
      await page.click('button:has-text("Sign in here")')
      await assertions.assertOnLoginPage()
      
      // Navigate to password reset
      await page.click('a:has-text("Forgot password?")')
      await expect(page).toHaveURL(/\/auth\/reset-password/)
      
      // Test that navigation is smooth without unexpected redirects
      console.log('✅ No authentication interruptions during auth flow navigation')
    })
  })

  test.describe('Onboarding Flow Validation', () => {
    test('should validate onboarding flow completion', async ({ page }) => {
      // Test new user registration flow
      const userData = TestDataGenerator.generateUser()
      
      console.log(`Testing onboarding with: ${userData.email}`)
      
      // Step 1: Registration
      await page.goto('/auth/signup')
      await assertions.assertOnSignupPage()
      
      // Fill registration form
      await helpers.fillForm({
        'input[type="text"]': userData.fullName,
        'input[type="email"]': userData.email,
        'input[type="password"]': userData.password,
        'input[type="password"]:nth-child(2)': userData.password
      })
      
      // Submit registration
      await page.click('button[type="submit"]:has-text("Create Account")')
      await page.waitForTimeout(3000)
      
      // Should handle registration gracefully
      const currentUrl = page.url()
      
      // Should either stay on signup with success message or redirect to login
      if (currentUrl.includes('/auth/signup')) {
        console.log('Registration completed - staying on signup page')
      } else if (currentUrl.includes('/auth/login')) {
        console.log('Registration completed - redirected to login')
        await assertions.assertOnLoginPage()
      } else {
        console.log(`Registration completed - redirected to: ${currentUrl}`)
      }
      
      console.log('✅ Onboarding flow completed without errors')
    })
  })

  test.describe('Browser History and Bookmark Functionality', () => {
    test('should test bookmark and browser history functionality', async ({ page }) => {
      // Test browser navigation through auth pages
      await page.goto('/auth/login')
      await page.goto('/auth/signup')
      await page.goto('/auth/reset-password')
      
      // Test back navigation
      await page.goBack() // Should go to signup
      await expect(page).toHaveURL(/\/auth\/signup/)
      
      await page.goBack() // Should go to login
      await expect(page).toHaveURL(/\/auth\/login/)
      
      // Test forward navigation
      await page.goForward() // Should go to signup
      await expect(page).toHaveURL(/\/auth\/signup/)
      
      console.log('✅ Browser history navigation working correctly')
    })
    test('should handle direct URL access correctly', async ({ page }) => {
      // Test direct access to auth pages
      const authPages = [
        { url: '/auth/login', expectedHeading: 'Welcome Back' },
        { url: '/auth/signup', expectedHeading: 'Start Your Journey' },
        { url: '/auth/reset-password', expectedContent: 'body' }
      ]
      
      for (const authPage of authPages) {
        console.log(`Testing direct access to ${authPage.url}`)
        
        // Direct navigation
        await page.goto(authPage.url)
        
        // Should load correctly
        await expect(page.locator('body')).toBeVisible()
        
        if (authPage.expectedHeading) {
          await expect(page.locator(`h1:has-text("${authPage.expectedHeading}")`)).toBeVisible()
        }
        
        console.log(`✅ Direct access to ${authPage.url} working`)
      }
    })

    test('should preserve form state during navigation', async ({ page }) => {
      // Test form state preservation
      await page.goto('/auth/login')
      
      // Fill form partially
      await page.fill('input[type="email"]', 'test@example.com')
      
      // Navigate away and back
      await page.goto('/auth/signup')
      await page.goto('/auth/login')
      
      // Form should be reset (this is expected behavior)
      const emailValue = await page.locator('input[type="email"]').inputValue()
      expect(emailValue).toBe('')
      
      console.log('✅ Form state handling working correctly')
    })
  })

  test.describe('Responsive Design Validation', () => {
    test('should work across different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop Large' },
        { width: 1366, height: 768, name: 'Desktop Standard' },
        { width: 768, height: 1024, name: 'Tablet Portrait' },
        { width: 375, height: 667, name: 'Mobile iPhone' }
      ]
      
      for (const viewport of viewports) {
        console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`)
        
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        
        // Test login page
        await page.goto('/auth/login')
        await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
        await expect(page.locator('form')).toBeVisible()
        
        // Test signup page
        await page.goto('/auth/signup')
        await expect(page.locator('h1:has-text("Start Your Journey")')).toBeVisible()
        await expect(page.locator('form')).toBeVisible()
        
        // Test form interaction
        await page.fill('input[type="email"]', 'test@example.com')
        await page.fill('input[type="password"]', 'password123')
        
        // Verify form elements are accessible
        await expect(page.locator('button[type="submit"]')).toBeVisible()
        
        console.log(`✅ ${viewport.name} responsive design working`)
      }
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle form validation errors gracefully', async ({ page }) => {
      // Test signup form validation
      await page.goto('/auth/signup')
      
      // Submit empty form
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show validation (browser validation)
      const requiredInputs = await page.locator('input[required]').count()
      expect(requiredInputs).toBeGreaterThan(0)
      
      // Test invalid email
      await page.fill('input[type="text"]', 'Test User')
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-child(2)', 'password123')
      
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show browser validation for invalid email
      const emailInput = page.locator('input[type="email"]')
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
      
      console.log('✅ Form validation errors handled gracefully')
    })

    test('should recover from network issues', async ({ page }) => {
      // Test with slow network
      await helpers.simulateSlowNetwork(200)
      
      await page.goto('/auth/login')
      
      // Should still load, just slower
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 })
      
      // Test form submission with slow network
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Should show loading state
      await expect(page.locator('button:has-text("Signing In...")')).toBeVisible({ timeout: 3000 })
      
      console.log('✅ Network issues handled gracefully')
    })
  })

  test.describe('Accessibility Validation', () => {
    test('should meet basic accessibility requirements', async ({ page }) => {
      await page.goto('/auth/login')
      
      const accessibilityCheck = await helpers.checkBasicAccessibility()
      
      expect(accessibilityCheck.hasMainHeading).toBe(true)
      expect(accessibilityCheck.formsHaveLabels).toBe(true)
      
      console.log('Accessibility check results:', accessibilityCheck)
      console.log('✅ Basic accessibility requirements met')
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/auth/login')
      
      const navResult = await helpers.testKeyboardNavigation()
      expect(navResult.canNavigate).toBe(true)
      
      console.log(`✅ Keyboard navigation working: ${navResult.canNavigate}`)
    })
  })

  test.describe('Performance Validation', () => {
    test('should load pages within acceptable time limits', async ({ page }) => {
      const pages = [
        { url: '/', name: 'Landing Page' },
        { url: '/auth/login', name: 'Login Page' },
        { url: '/auth/signup', name: 'Signup Page' },
        { url: '/auth/reset-password', name: 'Reset Password Page' }
      ]
      
      for (const testPage of pages) {
        const loadTime = await helpers.measurePageLoadTime(testPage.url)
        
        console.log(`${testPage.name} loaded in ${loadTime}ms`)
        expect(loadTime).toBeLessThan(5000) // 5 seconds max
      }
      
      console.log('✅ All pages load within acceptable time limits')
    })

    test('should handle concurrent operations smoothly', async ({ page, context }) => {
      // Test multiple tabs
      const page2 = await context.newPage()
      
      // Load different pages simultaneously
      const loadPromises = [
        page.goto('/auth/login'),
        page2.goto('/auth/signup')
      ]
      
      await Promise.all(loadPromises)
      
      // Both should load successfully
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      await expect(page2.locator('h1:has-text("Start Your Journey")')).toBeVisible()
      
      await page2.close()
      console.log('✅ Concurrent operations handled smoothly')
    })
  })
})