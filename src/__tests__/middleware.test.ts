// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getUser, createServerClient } = vi.hoisted(() => ({ getUser: vi.fn(), createServerClient: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient }))
vi.mock('@/lib/auth/preview', () => ({ PREVIEW_NO_AUTH: false }))
import { middleware } from '../middleware'

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null })
  createServerClient.mockReset().mockReturnValue({ auth: { getUser } })
})

describe('server authentication boundary', () => {
  it.each(['/dashboard', '/accounts', '/accounts/test/edit', '/transactions', '/transactions/import', '/reconcile', '/reports', '/categories', '/settings'])(
    'requires login for %s', async (pathname) => {
      const response = await middleware(new NextRequest(`https://forma.test${pathname}?month=2026-09`))
      expect(response.status).toBe(307)
      const destination = new URL(response.headers.get('location')!)
      expect(destination.pathname).toBe('/auth/login')
      expect(destination.searchParams.get('returnUrl')).toBe(`${pathname}?month=2026-09`)
    }
  )

  it('allows authenticated users through', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
    const response = await middleware(new NextRequest('https://forma.test/accounts'))
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it.each(['/manifest.webmanifest', '/sw.js', '/offline.html'])(
    'serves the public PWA asset %s without authentication', async (pathname) => {
      const response = await middleware(new NextRequest(`https://forma.test${pathname}`))
      expect(response.status).toBe(200)
      expect(createServerClient).not.toHaveBeenCalled()
    }
  )

  it('leaves the login page accessible', async () => {
    const response = await middleware(new NextRequest('https://forma.test/auth/login'))
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
})