import { Suspense } from 'react'
// import { InviteAcceptanceForm } from '@/components/forms/invite-acceptance-form'
// import { Card } from '@/components/ui/Card'

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
        <div className="glass-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">
            Accept Invitation
          </h1>
          <p className="text-[var(--text-secondary)]">
            This page is under construction. Please check back later.
          </p>
        </div>
      </div>
    </div>
  )
}