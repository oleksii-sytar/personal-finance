import { faker } from '@faker-js/faker'
import type { Category } from '@/types'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/categories'

/**
 * Test fixtures for categories following testing.md patterns
 */

export const mockExpenseCategory: Category = {
  id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  name: 'Food & Dining',
  color: '#E6A65D',
  icon: 'utensils',
  type: 'expense',
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

export const mockIncomeCategory: Category = {
  id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  name: 'Salary',
  color: '#4E7A58',
  icon: 'briefcase',
  type: 'income',
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

/**
 * Creates a mock category with optional overrides
 * 
 * @param overrides - Properties to override in the mock category
 * @returns Mock category with overrides applied
 */
export function createMockCategory(
  overrides?: Partial<Category>
): Category {
  const type = overrides?.type || faker.helpers.arrayElement(['income', 'expense'] as const)
  const defaultCategories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES
  const defaultCategory = faker.helpers.arrayElement([...defaultCategories])

  return {
    id: faker.string.uuid(),
    workspace_id: faker.string.uuid(),
    name: defaultCategory.name,
    color: defaultCategory.color,
    icon: defaultCategory.icon,
    type,
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Creates multiple mock categories
 * 
 * @param count - Number of categories to create
 * @param overrides - Properties to override in all categories
 * @returns Array of mock categories
 */
export function createMockCategories(
  count: number,
  overrides?: Partial<Category>
): Category[] {
  return Array.from({ length: count }, () => createMockCategory(overrides))
}