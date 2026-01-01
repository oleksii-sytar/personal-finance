import { Suspense } from 'react'
import { InviteAcceptanceForm } from '@/components/forms/invite-acceptance-form'
import { Card } from '@/components/ui/Card'

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
    <div className="min-h-screen bg-gradient-to-br from-[#1C1917] to-[#2A1D15] flex items-center justify-center p-4">
      {/* Ambient glow effect */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-radial from-[#E6A65D]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md">
        <Suspense fallback={
          <Card className="animate-pulse">
            <div className="space-y-4">
              <div className="h-6 bg-white/10 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
              <div className="h-12 bg-white/10 rounded" />
            </div>
          </Card>
        }>
          <InviteAcceptanceForm />
        </Suspense>
      </div>
    </div>
  )
}