import { Suspense } from 'react'
import { VerifyEmailForm } from '@/components/forms/verify-email-form'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export const metadata = {
  title: 'Verify Email | Forma',
  description: 'Verify your email address to complete your Forma account setup',
}

/**
 * Email verification page
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1917] px-6 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed top-[-50%] right-[-50%] w-full h-full bg-gradient-radial from-[#E6A65D]/15 via-transparent to-transparent pointer-events-none z-0" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#E6A65D] to-[#F4B76D] rounded-xl flex items-center justify-center">
              <span className="text-[#1C1917] font-bold text-lg font-space-grotesk">F</span>
            </div>
            <span className="text-white/90 font-space-grotesk font-semibold text-xl">Forma</span>
          </Link>
          <h1 className="text-3xl font-space-grotesk font-bold text-white/90 mb-2">
            Verify Your Email
          </h1>
          <p className="text-white/60">
            Complete your account setup
          </p>
        </div>

        {/* Suspense wrapper for search params */}
        <Suspense fallback={
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        }>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  )
}