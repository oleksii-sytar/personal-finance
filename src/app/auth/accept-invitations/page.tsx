import { Suspense } from 'react'
import { AcceptInvitationsContent } from '@/components/invitations/accept-invitations-content'

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
    <div className="min-h-screen bg-gradient-to-br from-[#1C1917] to-[#2A1D15] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Suspense fallback={<AcceptInvitationsLoading />}>
          <AcceptInvitationsContent />
        </Suspense>
      </div>
    </div>
  )
}

function AcceptInvitationsLoading() {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E6A65D] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-white/60">Loading your invitations...</p>
      </div>
    </div>
  )
}