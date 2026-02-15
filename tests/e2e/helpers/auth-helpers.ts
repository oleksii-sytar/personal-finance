import { Page } from '@playwright/test'

/**
 * Authentication helper functions for E2E tests
 */

export async function login(page: Page, email = 'test@example.com', password = 'password123') {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]:has-text("Sign In")')
  
  // Wait for redirect
  await page.waitForTimeout(3000)
  
  return page.url()
}

export async function createTestWorkspace(page: Page, name = 'Test Workspace') {
  // Check if workspace creation is needed
  const createButton = page.locator('button:has-text("Create Workspace")')
  
  if (await createButton.count() > 0) {
    await createButton.click()
    await page.waitForTimeout(500)
    
    await page.fill('input[name="name"]', name)
    await page.click('button[type="submit"]:has-text("Create")')
    await page.waitForTimeout(2000)
  }
}

export async function createTestAccount(page: Page, name = 'Test Account', balance = '1000') {
  // Navigate to accounts or look for create account button
  const createButton = page.locator('button:has-text("Create Account"), button:has-text("Add Account")')
  
  if (await createButton.count() > 0) {
    await createButton.click()
    await page.waitForTimeout(500)
    
    await page.fill('input[name="name"]', name)
    await page.fill('input[name="initial_balance"]', balance)
    await page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")')
    await page.waitForTimeout(2000)
  }
}
