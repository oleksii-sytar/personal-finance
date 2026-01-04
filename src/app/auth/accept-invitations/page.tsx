import { Suspense } from 'react'
import { AcceptInvitationsContent } from '@/components/invitations/accept-invitations-content'
import { AuthComponentErrorBoundary } from '@/components/shared/auth-component-error-boundary'

export const metadata = {
  title: 'Accept Invitations | Forma',
  description: 'Review and accept your pending workspace invitations'
}

/**
 * Page for accepting multiple pending invitations
 * This is where users land after login if they have pending invitations
 */
export default function AcceptInvitationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <AuthComponentErrorBoundary>
          <Suspense fallback={<AcceptInvitationsLoading />}>
            <AcceptInvitationsContent />
          </Suspense>
        </AuthComponentErrorBoundary>
      </div>
    </div>
  )
}

function AcceptInvitationsLoading() {
  return (
    <div className="bg-glass backdrop-blur-md border border-glass rounded-2xl p-8">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-secondary">Loading your invitations...</p>
      </div>
    </div>
  )
}