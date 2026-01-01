import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'
import { config } from 'dotenv'

// Load environment variables from .env.local for tests
config({ path: '.env.local' })

// Start server before all tests
beforeAll(() => server.listen({ 
  onUnhandledRequest: 'bypass' // Allow real Supabase requests for integration tests
}))

// Clean up after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Close server after all tests
afterAll(() => server.close())