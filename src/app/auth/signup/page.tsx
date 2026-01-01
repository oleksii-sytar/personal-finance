import { Suspense } from 'react'
import { RegisterForm } from '@/components/forms/register-form'
import Link from 'next/link'

export const metadata = {
  title: 'Sign Up | Forma',
  description: 'Create your Forma account to start managing your family finances',
}

export default function SignUpPage() {
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
            Start Your Journey
          </h1>
          <p className="text-white/60">
            Create your family finance account
          </p>
        </div>

        {/* Use the RegisterForm component with validation */}
        <Suspense fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}