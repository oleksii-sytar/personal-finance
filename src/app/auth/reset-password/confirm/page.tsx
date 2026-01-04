import { Suspense } from 'react'
import { LazyResetPasswordConfirmForm } from '@/components/forms/lazy'
import { FormLoadingSkeleton } from '@/components/shared/form-loading-skeleton'
import Link from 'next/link'

export const metadata = {
  title: 'Confirm Password Reset | Forma',
  description: 'Set your new Forma account password',
}

function ResetPasswordConfirmContent() {
  return (
    <Suspense fallback={<FormLoadingSkeleton variant="reset" />}>
      <LazyResetPasswordConfirmForm />
    </Suspense>
  )
}

export default function ResetPasswordConfirmPage() {
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

        {/* Use Suspense to handle the useSearchParams hook */}
        <Suspense fallback={
          <div className="w-full max-w-md mx-auto p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto"></div>
            <p className="text-secondary mt-4">Loading...</p>
          </div>
        }>
          <ResetPasswordConfirmContent />
        </Suspense>
      </div>
    </div>
  )
}