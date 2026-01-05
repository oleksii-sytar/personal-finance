import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AuthPageGuard } from '@/components/shared/auth-page-guard'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn()
}))

const mockUsePathname = vi.mocked(await import('next/navigation')).usePathname

describe('AuthPageGuard', () => {
  it('renders children when on correct path', () => {
    mockUsePathname.mockReturnValue('/auth/login')
    
    render(
      <AuthPageGuard requiredPath="/auth/login">
        <div>Login Form</div>
      </AuthPageGuard>
    )
    
    expect(screen.getByText('Login Form')).toBeInTheDocument()
  })

  it('renders fallback when on incorrect path', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    
    render(
      <AuthPageGuard requiredPath="/auth/login" fallback={<div>Not Login Page</div>}>
        <div>Login Form</div>
      </AuthPageGuard>
    )
    
    expect(screen.getByText('Not Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument()
  })

  it('renders null when on incorrect path and no fallback provided', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    
    const { container } = render(
      <AuthPageGuard requiredPath="/auth/login">
        <div>Login Form</div>
      </AuthPageGuard>
    )
    
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument()
  })

  it('handles path matching exactly', () => {
    mockUsePathname.mockReturnValue('/auth/login/extra')
    
    render(
      <AuthPageGuard requiredPath="/auth/login">
        <div>Login Form</div>
      </AuthPageGuard>
    )
    
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument()
  })

  it('works with different required paths', () => {
    mockUsePathname.mockReturnValue('/auth/signup')
    
    render(
      <AuthPageGuard requiredPath="/auth/signup">
        <div>Signup Form</div>
      </AuthPageGuard>
    )
    
    expect(screen.getByText('Signup Form')).toBeInTheDocument()
  })
})