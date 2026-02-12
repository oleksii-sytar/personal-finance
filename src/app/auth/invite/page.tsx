import { Suspense } from 'react'
import { AuthComponentErrorBoundary } from '@/components/shared/auth-component-error-boundary'
import { InviteAcceptanceForm } from '@/components/forms/invite-acceptance-form'

export const metadata = {
  title: 'Accept Invitation | Forma',
  description: 'Accept your workspace invitation',
}

/**
 * Invitation acceptance page
 * Requirements: 5.3, 5.5
 */
export default function InvitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] flex items-center justify-center p-4">
      {/* Ambient glow effect */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-radial from-[var(--accent-primary)]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md">
        <AuthComponentErrorBoundary>
          <Suspense fallback={
            <div className="glass-card p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">Loading invitation...</p>
            </div>
          }>
            <InviteAcceptanceForm />
          </Suspense>
        </AuthComponentErrorBoundary>
      </div>
    </div>
  )
}