import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// @ts-ignore - Vitest config type issue
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // Autonomous test configuration - no interactive prompts
    watch: false,
    reporter: ['verbose'],
    bail: 1, // Stop on first failure for faster feedback
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})