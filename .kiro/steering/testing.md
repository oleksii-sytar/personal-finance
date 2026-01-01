# Forma - Testing Standards

## Overview

This document defines the testing approach, patterns, and requirements for the Forma project. All code must meet these standards before merging.

## Testing Philosophy

1. **Test behavior, not implementation** - Tests should verify what the code does, not how it does it
2. **Prefer integration tests** - They provide more confidence than unit tests
3. **Write tests first for bug fixes** - Reproduce the bug in a test before fixing
4. **Keep tests fast** - Slow tests don't get run

## Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration tests |
| **React Testing Library** | Component testing |
| **Playwright** | End-to-end testing |
| **MSW (Mock Service Worker)** | API mocking |
| **Faker.js** | Test data generation |

## Test Categories

### Unit Tests
- Test pure functions and utilities
- Test individual hooks in isolation
- Test Zod schemas and validations
- Location: `tests/unit/` or colocated as `*.test.ts`

### Integration Tests
- Test Server Actions with database
- Test component interactions
- Test hook combinations
- Location: `tests/integration/`

### End-to-End Tests
- Test critical user flows
- Test authentication flows
- Test multi-step workflows
- Location: `tests/e2e/`

## Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Utilities/Helpers | 90% |
| Server Actions | 80% |
| Hooks | 70% |
| Components | 60% |
| Overall | 75% |

## Testing Patterns

### Unit Test Pattern
```typescript
// tests/unit/utils/format-currency.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/utils/format'

describe('formatCurrency', () => {
  it('formats UAH correctly', () => {
    expect(formatCurrency(1000, 'UAH')).toBe('₴1,000.00')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-500, 'UAH')).toBe('-₴500.00')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'UAH')).toBe('₴0.00')
  })

  it('formats USD with conversion', () => {
    // Test currency conversion logic
  })
})
```

### Component Test Pattern
```typescript
// src/components/transactions/transaction-item.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TransactionItem } from './transaction-item'
import { mockTransaction } from '@/tests/fixtures/transactions'

describe('TransactionItem', () => {
  it('displays transaction details', () => {
    render(<TransactionItem transaction={mockTransaction} />)
    
    expect(screen.getByText(mockTransaction.description)).toBeInTheDocument()
    expect(screen.getByText('₴1,000.00')).toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', async () => {
    const onEdit = vi.fn()
    render(<TransactionItem transaction={mockTransaction} onEdit={onEdit} />)
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    
    expect(onEdit).toHaveBeenCalledWith(mockTransaction.id)
  })
})
```

### Server Action Test Pattern
```typescript
// tests/integration/actions/transactions.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTransaction, deleteTransaction } from '@/actions/transactions'
import { createTestUser, createTestWorkspace } from '@/tests/helpers'

describe('Transaction Actions', () => {
  let userId: string
  let workspaceId: string

  beforeEach(async () => {
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    userId = user.id
    workspaceId = workspace.id
  })

  it('creates a transaction successfully', async () => {
    const formData = new FormData()
    formData.set('amount', '1000')
    formData.set('description', 'Test transaction')
    formData.set('category_id', 'uuid-here')
    formData.set('workspace_id', workspaceId)

    const result = await createTransaction(formData)

    expect(result.error).toBeUndefined()
    expect(result.data).toMatchObject({
      amount: 1000,
      description: 'Test transaction',
    })
  })

  it('validates required fields', async () => {
    const formData = new FormData()
    // Missing required fields

    const result = await createTransaction(formData)

    expect(result.error).toBeDefined()
  })
})
```

### E2E Test Pattern
```typescript
// tests/e2e/transactions.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('can create a new transaction', async ({ page }) => {
    await page.goto('/transactions')
    await page.click('button:has-text("Add Transaction")')
    
    await page.fill('[name="amount"]', '500')
    await page.fill('[name="description"]', 'Grocery shopping')
    await page.selectOption('[name="category"]', 'Food')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Grocery shopping')).toBeVisible()
    await expect(page.locator('text=₴500.00')).toBeVisible()
  })

  test('can edit an existing transaction', async ({ page }) => {
    await page.goto('/transactions')
    await page.click('[data-testid="transaction-1"] button:has-text("Edit")')
    
    await page.fill('[name="amount"]', '750')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=₴750.00')).toBeVisible()
  })
})
```

## Test Data Management

### Fixtures
```typescript
// tests/fixtures/transactions.ts
import { faker } from '@faker-js/faker'
import type { Transaction } from '@/types'

export const mockTransaction: Transaction = {
  id: faker.string.uuid(),
  amount: 1000,
  currency: 'UAH',
  description: 'Test transaction',
  category_id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function createMockTransaction(
  overrides?: Partial<Transaction>
): Transaction {
  return {
    id: faker.string.uuid(),
    amount: faker.number.int({ min: 1, max: 10000 }),
    currency: 'UAH',
    description: faker.commerce.productName(),
    category_id: faker.string.uuid(),
    workspace_id: faker.string.uuid(),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}
```

### Database Seeding for Tests
```typescript
// tests/helpers/database.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function createTestUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true,
  })
  if (error) throw error
  return data.user
}

export async function cleanupTestData(userId: string) {
  await supabase.from('transactions').delete().eq('user_id', userId)
  await supabase.from('workspaces').delete().eq('owner_id', userId)
  await supabase.auth.admin.deleteUser(userId)
}
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test path/to/test.ts
```

## CI/CD Integration

Tests run automatically on:
- Every pull request (all tests)
- Before merge to main (all tests)
- Nightly (full E2E suite)

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
```

## Best Practices

1. **Arrange-Act-Assert** pattern in all tests
2. **One assertion per test** when possible
3. **Descriptive test names** that explain the scenario
4. **Clean up after tests** - don't leave test data in database
5. **Mock external services** - use MSW for API mocking
6. **Test edge cases** - empty states, error states, loading states
7. **Avoid testing implementation details** - focus on user-visible behavior
8. **Keep tests independent** - tests should not depend on each other
9. **NEVER LEAVE FAILING TESTS** - All test failures must be fixed immediately
10. **Use creative mocking strategies** - Don't repeat the same mocking patterns, innovate solutions

### Creative Mocking Strategies

When dealing with complex API patterns (like Supabase's chained queries), use targeted mocking approaches:

```typescript
// Pattern-specific mock for .eq().eq().single() chains
mockSupabase.from.mockImplementation((table: string) => ({
  select: vi.fn(() => ({
    eq: vi.fn((col1: string, val1: any) => ({
      eq: vi.fn((col2: string, val2: any) => ({
        single: vi.fn(() => {
          const key = `${table}_select_${col1}_${col2}_single`
          return Promise.resolve(mockResponses[key] || { data: null, error: null })
        })
      }))
    }))
  }))
}))
```

### Handling Validation vs Business Logic Order

When testing server actions, remember that validation typically happens before business logic:

```typescript
// Test should account for validation-first approach
if (userRole === 'member') {
  if (typeof result.error === 'string') {
    // Permission error (validation passed)
    expect(result.error).toBe('Only workspace owners can invite members')
  } else {
    // Validation error (takes precedence)
    expect(result.error).toBeDefined()
  }
}
```
