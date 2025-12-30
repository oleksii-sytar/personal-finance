import { Suspense } from 'react'
import { ResetPasswordConfirmForm } from '@/components/forms/reset-password-confirm-form'
import Link from 'next/link'

export const metadata = {
  title: 'Confirm Password Reset | Forma',
  description: 'Set your new Forma account password',
}

function ResetPasswordConfirmContent() {
  return <ResetPasswordConfirmForm />
}

export default function ResetPasswordConfirmPage() {
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
        </div>

        {/* Use Suspense to handle the useSearchParams hook */}
        <Suspense fallback={
          <div className="w-full max-w-md mx-auto p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6A65D] mx-auto"></div>
            <p className="text-white/60 mt-4">Loading...</p>
          </div>
        }>
          <ResetPasswordConfirmContent />
        </Suspense>
      </div>
    </div>
  )
}