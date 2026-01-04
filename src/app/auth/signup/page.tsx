import { Suspense } from 'react'
import { RegisterForm } from '@/components/forms/register-form'
import Link from 'next/link'

export const metadata = {
  title: 'Sign Up | Forma',
  description: 'Create your Forma account to start managing your family finances',
}

export default function SignUpPage() {
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
          <h1 className="text-3xl font-space-grotesk font-bold text-primary mb-2">
            Start Your Journey
          </h1>
          <p className="text-secondary">
            Create your family finance account
          </p>
        </div>

        {/* Use the RegisterForm component with validation */}
        <Suspense fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-glass rounded-xl" />
            <div className="h-12 bg-glass rounded-xl" />
            <div className="h-12 bg-glass rounded-xl" />
            <div className="h-12 bg-glass rounded-xl" />
            <div className="h-12 bg-glass rounded-xl" />
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}