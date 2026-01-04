import { Suspense } from 'react'
import { LoginForm } from '@/components/forms/login-form'
import Link from 'next/link'

export const metadata = {
  title: 'Sign In | Forma',
  description: 'Sign in to your Forma account to manage your family finances',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-6 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed top-[-50%] right-[-50%] w-full h-full bg-gradient-radial from-[var(--accent-primary)]/15 via-transparent to-transparent pointer-events-none z-0" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-xl flex items-center justify-center">
              <span className="text-[var(--text-inverse)] font-bold text-lg font-space-grotesk">F</span>
            </div>
            <span className="text-primary font-space-grotesk font-semibold text-xl">Forma</span>
          </Link>
        </div>

        {/* Use the LoginForm component with validation */}
        <Suspense fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-glass rounded-xl" />
            <div className="h-12 bg-glass rounded-xl" />
            <div className="h-4 bg-glass/50 rounded" />
            <div className="h-12 bg-glass rounded-xl" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}