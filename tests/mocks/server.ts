import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * Mock Service Worker server for testing
 * Following testing.md patterns
 */
export const server = setupServer(...handlers)