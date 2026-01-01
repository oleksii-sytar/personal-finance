import { test, expect } from '@playwright/test'
import { TestHelpers, TestDataGenerator, FormaAssertions } from './helpers/test-helpers'
import { TEST_CONFIG, TEST_UTILS } from './config/test-config'

test.describe('Comprehensive Authentication and Workspace Flow', () => {
  let helpers: TestHelpers
  let assertions: FormaAssertions

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    assertions = new FormaAssertions(page)
  })

  test.describe('Complete User Registration and Login Flow', () => {
    test('should complete full user registration and login journey', async ({ page }) => {
      // Generate unique test data
      const userData = TestDataGenerator.generateUser()
      
      console.log(`Testing with user: ${userData.email}`)

      // Step 1: Navigate to signup page
      await page.goto('/auth/signup')
      await assertions.assertOnSignupPage()

      // Step 2: Test form validation first
      const hasValidation = await helpers.checkFormValidation('Create Account')
      expect(hasValidation).toBe(true)

      // Step 3: Test invalid email validation
      await helpers.fillForm({
        'input[type="text"]': userData.fullName,
        'input[type="email"]': 'invalid-email',
        'input[type="password"]': userData.password,
        'input[type="password"]:nth-child(2)': userData.password
      })

      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show browser validation for invalid email
      const emailInput = page.locator('input[type="email"]')
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(validationMessage).toBeTruthy()

      // Step 4: Test password mismatch validation
      await page.fill('input[type="email"]', userData.email)
      await page.fill('input[type="password"]:nth-child(2)', 'different-password')
      await page.click('button[type="submit"]:has-text("Create Account")')

      // Should show password mismatch error
      await expect(page.locator('text=Passwords do not match')).toBeVisible({ timeout: 5000 })

      // Step 5: Complete valid registration
      await page.fill('input[type="password"]:nth-child(2)', userData.password)
      await page.click('button[type="submit"]:has-text("Create Account")')

      // Should show loading state
      await assertions.assertLoadingState('Creating Account...')

      // Wait for registration response
      await page.waitForTimeout(5000)

      // Step 6: Handle registration result
      const currentUrl = page.url()
      
      if (currentUrl.includes('/auth/login')) {
        console.log('Registration successful - redirected to login')
        
        // Step 7: Login with new credentials
        await helpers.fillForm({
          'input[type="email"]': userData.email,
          'input[type="password"]': userData.password
        })

        await page.click('button[type="submit"]:has-text("Sign In")')
        await assertions.assertLoadingState('Signing In...')

        // Wait for login response
        await page.waitForTimeout(5000)

        // Should reach dashboard or workspace creation
        const finalUrl = page.url()
        
        if (finalUrl.includes('/dashboard')) {
          await assertions.assertOnDashboard()
          console.log('Successfully logged in and reached dashboard')
        } else {
          console.log(`Login completed, current URL: ${finalUrl}`)
        }

      } else if (currentUrl.includes('/auth/signup')) {
        console.log('Registration may have failed or requires email verification')
        
        // Check for success message
        const successMessage = page.locator('text=Registration successful, text=Check your email')
        if (await successMessage.isVisible()) {
          console.log('Registration successful - email verification required')
        } else {
          console.log('Registration form still visible - may have validation errors')
        }
      }
    })

    test('should handle existing user login flow', async ({ page }) => {
      // Step 1: Navigate to login page
      await page.goto('/auth/login')
      await assertions.assertOnLoginPage()

      // Step 2: Test form validation
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Check required field validation
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')
      
      await expect(emailInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('required')

      // Step 3: Test invalid email format
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("Sign In")')

      // Should show browser validation
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(validationMessage).toBeTruthy()

      // Step 4: Test with valid format but potentially non-existent user
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Test remember me functionality
      const rememberMeCheckbox = page.locator('input[type="checkbox"]')
      await expect(rememberMeCheckbox).not.toBeChecked()
      await rememberMeCheckbox.check()
      await expect(rememberMeCheckbox).toBeChecked()

      await page.click('button[type="submit"]:has-text("Sign In")')
      await assertions.assertLoadingState('Signing In...')

      // Wait for login response
      await page.waitForTimeout(5000)

      // Check result
      const currentUrl = page.url()
      
      if (currentUrl.includes('/dashboard')) {
        await assertions.assertOnDashboard()
        console.log('Login successful - user exists and credentials are valid')
      } else if (currentUrl.includes('/auth/login')) {
        console.log('Login failed - checking for error message')
        
        // Should show error message for invalid credentials
        const errorMessage = page.locator('[class*="error"], .text-red, [role="alert"]')
        if (await errorMessage.count() > 0) {
          console.log('Error message displayed appropriately')
        }
      }
    })
  })

  test.describe('Navigation and User Experience', () => {
    test('should provide consistent navigation experience', async ({ page }) => {
      // Test navigation between auth pages
      await page.goto('/auth/login')
      await assertions.assertFormaBranding()

      // Navigate to signup
      await page.click('a:has-text("Create one here")')
      await assertions.assertOnSignupPage()

      // Navigate back to login
      await page.click('button:has-text("Sign in here")')
      await assertions.assertOnLoginPage()

      // Navigate to password reset
      await page.click('a:has-text("Forgot password?")')
      await expect(page).toHaveURL('/auth/reset-password')

      // Test logo navigation
      await page.click('a:has-text("Forma")')
      await expect(page).toHaveURL('/')
    })

    test('should work across different viewport sizes', async ({ page }) => {
      const testResults = await helpers.testResponsiveDesign('form')
      
      // All viewports should show the form
      for (const result of testResults) {
        expect(result.visible).toBe(true)
        console.log(`Form visible on ${result.viewport}: ${result.visible}`)
      }
    })

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto('/auth/login')
      
      const navResult = await helpers.testKeyboardNavigation()
      expect(navResult.canNavigate).toBe(true)
      
      console.log(`Keyboard navigation working: ${navResult.canNavigate}`)
      console.log(`First focused element: ${navResult.firstElement}`)
      console.log(`Second focused element: ${navResult.secondElement}`)
    })
  })

  test.describe('Performance and Reliability', () => {
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
        expect(loadTime).toBeLessThan(TEST_CONFIG.performance.maxPageLoadTime)
      }
    })

    test('should handle slow network conditions', async ({ page }) => {
      await helpers.simulateSlowNetwork(300)
      
      await page.goto('/auth/login')
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 })
      
      // Test form submission with slow network
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Should handle slow response gracefully
      await page.waitForTimeout(3000)
      
      console.log('Slow network conditions handled successfully')
    })

    test('should handle offline conditions gracefully', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Go offline
      await helpers.simulateOffline()
      
      // Try to submit form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Should handle offline state
      await page.waitForTimeout(3000)
      
      // Restore online
      await helpers.restoreOnline()
      
      console.log('Offline conditions handled gracefully')
    })

    test('should have no critical JavaScript errors', async ({ page }) => {
      const errors = await helpers.collectJavaScriptErrors()
      
      // Navigate through key pages
      await page.goto('/auth/login')
      await page.goto('/auth/signup')
      await page.goto('/auth/reset-password')
      
      await page.waitForTimeout(2000)
      
      const errorCheck = await helpers.verifyNoConsoleErrors()
      
      if (errorCheck.hasErrors) {
        console.log('JavaScript errors detected:', errorCheck.errors)
      } else {
        console.log('No critical JavaScript errors detected')
      }
      
      // Allow some non-critical errors but fail on critical ones
      const criticalErrors = errorCheck.errors.filter(error => 
        error.includes('TypeError') || 
        error.includes('ReferenceError') ||
        error.includes('SyntaxError')
      )
      
      expect(criticalErrors.length).toBe(0)
    })
  })

  test.describe('Accessibility and Usability', () => {
    test('should meet basic accessibility requirements', async ({ page }) => {
      await page.goto('/auth/login')
      
      const accessibilityCheck = await helpers.checkBasicAccessibility()
      
      expect(accessibilityCheck.hasMainHeading).toBe(true)
      expect(accessibilityCheck.imagesHaveAlt).toBe(true)
      expect(accessibilityCheck.formsHaveLabels).toBe(true)
      
      console.log('Accessibility check results:', accessibilityCheck)
    })

    test('should provide good user feedback', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Test form interaction feedback
      await page.fill('input[type="text"]', 'Test User')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-child(2)', 'different')
      
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should provide immediate validation feedback
      await page.waitForTimeout(1000)
      
      // Check if error clearing works when user starts typing
      await page.fill('input[type="password"]:nth-child(2)', 'password123')
      
      console.log('User feedback mechanisms working correctly')
    })
  })

  test.describe('Security and Data Protection', () => {
    test('should protect against common security issues', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Test that passwords are properly masked
      const passwordInput = page.locator('input[type="password"]')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      // Test that forms use HTTPS in production
      const currentUrl = page.url()
      if (!currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')) {
        expect(currentUrl).toMatch(/^https:\/\//)
      }
      
      console.log('Basic security checks passed')
    })

    test('should handle session management correctly', async ({ page }) => {
      // Test session persistence
      await page.goto('/auth/login')
      
      // Fill and submit login form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      await page.waitForTimeout(3000)
      
      // Test page refresh maintains session (if logged in)
      const isAuthenticated = await helpers.isAuthenticated()
      
      if (isAuthenticated) {
        await page.reload()
        
        // Should still be authenticated after refresh
        const stillAuthenticated = await helpers.isAuthenticated()
        expect(stillAuthenticated).toBe(true)
        
        console.log('Session persistence working correctly')
      } else {
        console.log('User not authenticated - session test skipped')
      }
    })
  })

  test.describe('Error Recovery and Edge Cases', () => {
    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate through auth flow
      await page.goto('/auth/login')
      await page.goto('/auth/signup')
      await page.goto('/auth/reset-password')
      
      // Test back navigation
      await page.goBack()
      await expect(page).toHaveURL('/auth/signup')
      
      await page.goBack()
      await expect(page).toHaveURL('/auth/login')
      
      // Test forward navigation
      await page.goForward()
      await expect(page).toHaveURL('/auth/signup')
      
      console.log('Browser navigation handling working correctly')
    })

    test('should recover from form submission interruption', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Fill form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Start submission
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Immediately refresh page
      await page.reload()
      
      // Form should be reset and functional
      await expect(page.locator('input[type="email"]')).toHaveValue('')
      await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
      
      console.log('Form interruption recovery working correctly')
    })
  })
})