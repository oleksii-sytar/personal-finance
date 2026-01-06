import { faker } from '@faker-js/faker'
import type { Tables } from '@/types/database'

export type Workspace = Tables<'workspaces'>

/**
 * Test fixtures for workspaces following testing.md patterns
 */

export const mockWorkspace: Workspace = {
  id: faker.string.uuid(),
  name: 'Test Workspace',
  owner_id: faker.string.uuid(),
  currency: 'UAH',
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

/**
 * Creates a mock workspace with optional overrides
 * 
 * @param overrides - Properties to override in the mock workspace
 * @returns Mock workspace with overrides applied
 */
export function createMockWorkspace(
  overrides?: Partial<Workspace>
): Workspace {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    owner_id: faker.string.uuid(),
    currency: faker.helpers.arrayElement(['UAH', 'USD', 'EUR'] as const),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Creates multiple mock workspaces
 * 
 * @param count - Number of workspaces to create
 * @param overrides - Properties to override in all workspaces
 * @returns Array of mock workspaces
 */
export function createMockWorkspaces(
  count: number,
  overrides?: Partial<Workspace>
): Workspace[] {
  return Array.from({ length: count }, () => createMockWorkspace(overrides))
}