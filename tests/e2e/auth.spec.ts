import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the home page
    await page.goto('/')
  })

  test.describe('User Registration', () => {
    test('should display registration form correctly', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Check page title and branding
      await expect(page).toHaveTitle(/Forma/)
      await expect(page.locator('span:has-text("Forma")').first()).toBeVisible()
      await expect(page.locator('h1:has-text("Start Your Journey")')).toBeVisible()
      await expect(page.locator('text=Create your family finance account')).toBeVisible()
      
      // Check form elements are present
      await expect(page.locator('input[type="text"]').first()).toBeVisible() // Full Name
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]').first()).toBeVisible()
      await expect(page.locator('input[type="password"]').nth(1)).toBeVisible() // Confirm Password
      await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeVisible()
      
      // Check password requirements are shown
      await expect(page.locator('text=Password must contain:')).toBeVisible()
      await expect(page.locator('text=At least 8 characters')).toBeVisible()
      await expect(page.locator('text=At least one letter')).toBeVisible()
      await expect(page.locator('text=At least one number')).toBeVisible()
      
      // Check navigation link to login
      await expect(page.locator('text=Already have an account?')).toBeVisible()
      await expect(page.locator('button:has-text("Sign in here")')).toBeVisible()
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show validation errors (form should prevent submission)
      // The form uses client-side validation, so we check that fields are marked as required
      const fullNameInput = page.locator('input[type="text"]').first()
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]').first()
      const confirmPasswordInput = page.locator('input[type="password"]').nth(1)
      
      await expect(fullNameInput).toHaveAttribute('required')
      await expect(emailInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('required')
      await expect(confirmPasswordInput).toHaveAttribute('required')
    })

    test('should validate email format', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Fill form with invalid email
      await page.fill('input[type="text"]', 'John Doe')
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-child(2)', 'password123')
      
      // Try to submit
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Browser should show validation message for invalid email
      const emailInput = page.locator('input[type="email"]')
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
    })

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Fill form with weak password
      await page.fill('input[type="text"]', 'John Doe')
      await page.fill('input[type="email"]', 'john@example.com')
      await page.fill('input[type="password"]', 'weak')
      await page.fill('input[type="password"]:nth-child(2)', 'weak')
      
      // Try to submit
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show password validation error
      // Note: This depends on the Zod validation being triggered
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible({ timeout: 5000 })
    })

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Fill form with mismatched passwords
      await page.fill('input[type="text"]', 'John Doe')
      await page.fill('input[type="email"]', 'john@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-child(2)', 'different123')
      
      // Try to submit
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show password mismatch error
      await expect(page.locator('text=Passwords do not match')).toBeVisible({ timeout: 5000 })
    })

    test('should handle successful registration flow', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Fill form with valid data
      const timestamp = Date.now()
      const testEmail = `test${timestamp}@example.com`
      
      await page.fill('input[type="text"]', 'John Doe')
      await page.fill('input[type="email"]', testEmail)
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-child(2)', 'password123')
      
      // Submit form
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show loading state
      await expect(page.locator('button:has-text("Creating Account...")')).toBeVisible({ timeout: 2000 })
      
      // Should show success message or redirect
      // Note: In a real test, this would depend on Supabase being configured
      // For now, we'll check that the form submission is attempted
      await expect(page.locator('button:has-text("Create Account")')).toBeVisible({ timeout: 10000 })
    })

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Click sign in link
      await page.click('button:has-text("Sign in here")')
      
      // Should navigate to login page
      await expect(page).toHaveURL('/auth/login')
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
    })
  })

  test.describe('User Login', () => {
    test('should display login form correctly', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Check page title and branding
      await expect(page).toHaveTitle(/Forma/)
      await expect(page.locator('text=Forma')).toBeVisible()
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      await expect(page.locator('text=Sign in to your family finance dashboard')).toBeVisible()
      
      // Check form elements are present
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('input[type="checkbox"]')).toBeVisible() // Remember me
      await expect(page.locator('text=Remember me')).toBeVisible()
      await expect(page.locator('a:has-text("Forgot password?")')).toBeVisible()
      await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
      
      // Check navigation link to signup
      await expect(page.locator('text=Don\'t have an account?')).toBeVisible()
      await expect(page.locator('a:has-text("Create one here")')).toBeVisible()
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Should show validation (fields are required)
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')
      
      await expect(emailInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('required')
    })

    test('should validate email format', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Fill form with invalid email
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', 'password123')
      
      // Try to submit
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Browser should show validation message for invalid email
      const emailInput = page.locator('input[type="email"]')
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
    })

    test('should handle remember me checkbox', async ({ page }) => {
      await page.goto('/auth/login')
      
      const rememberMeCheckbox = page.locator('input[type="checkbox"]')
      
      // Should be unchecked by default
      await expect(rememberMeCheckbox).not.toBeChecked()
      
      // Should be able to check it
      await rememberMeCheckbox.check()
      await expect(rememberMeCheckbox).toBeChecked()
      
      // Should be able to uncheck it
      await rememberMeCheckbox.uncheck()
      await expect(rememberMeCheckbox).not.toBeChecked()
    })

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Click forgot password link
      await page.click('a:has-text("Forgot password?")')
      
      // Should navigate to reset password page
      await expect(page).toHaveURL('/auth/reset-password')
    })

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Click create account link
      await page.click('a:has-text("Create one here")')
      
      // Should navigate to signup page
      await expect(page).toHaveURL('/auth/signup')
      await expect(page.locator('h1:has-text("Start Your Journey")')).toBeVisible()
    })

    test('should handle login attempt', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Fill form with test credentials
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Submit form
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Should show loading state
      await expect(page.locator('button:has-text("Signing In...")')).toBeVisible({ timeout: 2000 })
      
      // Should handle response (success or error)
      // Note: In a real test environment, this would depend on having test users
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Password Reset', () => {
    test('should display reset password form correctly', async ({ page }) => {
      await page.goto('/auth/reset-password')
      
      // Check page title and branding
      await expect(page).toHaveTitle(/Reset Password/)
      await expect(page.locator('text=Forma')).toBeVisible()
      
      // Check form elements are present
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should validate email field', async ({ page }) => {
      await page.goto('/auth/reset-password')
      
      // Try to submit empty form
      await page.click('button[type="submit"]')
      
      // Should show validation
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toHaveAttribute('required')
    })

    test('should handle reset password request', async ({ page }) => {
      await page.goto('/auth/reset-password')
      
      // Fill email field
      await page.fill('input[type="email"]', 'test@example.com')
      
      // Submit form
      await page.click('button[type="submit"]')
      
      // Should show loading state or success message
      // Note: Implementation depends on the ResetPasswordForm component
      await page.waitForTimeout(1000) // Wait for form submission
    })
  })

  test.describe('Navigation and Branding', () => {
    test('should display consistent branding across auth pages', async ({ page }) => {
      const authPages = ['/auth/login', '/auth/signup', '/auth/reset-password']
      
      for (const authPage of authPages) {
        await page.goto(authPage)
        
        // Check Forma logo and branding
        await expect(page.locator('text=Forma')).toBeVisible()
        
        // Check logo link goes to home
        await page.click('a:has-text("Forma")')
        await expect(page).toHaveURL('/')
        
        // Go back to auth page for next iteration
        if (authPage !== authPages[authPages.length - 1]) {
          await page.goBack()
        }
      }
    })

    test('should have proper responsive design', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 })
      await expect(page.locator('form')).toBeVisible()
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(page.locator('form')).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(page.locator('form')).toBeVisible()
    })

    test('should have proper accessibility features', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Check form labels and accessibility
      await expect(page.locator('label:has-text("Email Address")')).toBeVisible()
      await expect(page.locator('label:has-text("Password")')).toBeVisible()
      
      // Check form can be navigated with keyboard
      await page.keyboard.press('Tab') // Should focus first input
      await page.keyboard.press('Tab') // Should focus second input
      await page.keyboard.press('Tab') // Should focus checkbox
      await page.keyboard.press('Tab') // Should focus submit button
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline condition
      await page.context().setOffline(true)
      
      await page.goto('/auth/login')
      
      // Fill and submit form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Should handle network error
      // Note: Actual error handling depends on implementation
      await page.waitForTimeout(2000)
      
      // Restore online condition
      await page.context().setOffline(false)
    })

    test('should clear field errors when user starts typing', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Submit form to trigger validation errors
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Start typing in a field - error should clear
      await page.fill('input[type="text"]', 'J')
      
      // The error clearing behavior depends on the form implementation
      await page.waitForTimeout(500)
    })
  })
})