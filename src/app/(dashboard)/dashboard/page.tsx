'use client'

import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'

export default function DashboardPage() {
  const { user } = useAuth()
  const displayName = user?.user_metadata?.full_name || user?.email || 'there'

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent-primary)] mb-3">
          Fresh Start
        </p>
        <h1 className="text-4xl font-space-grotesk font-bold text-[var(--text-primary)] mb-3">
          Welcome, {displayName}
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
          The internal finance workspace has been cleared. Authentication, styling, and the public landing page are still in place, ready for the next product direction.
        </p>
      </div>

      <Card className="p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-space-grotesk font-semibold text-[var(--text-primary)]">
              Clean authenticated shell
            </h2>
            <p className="text-[var(--text-secondary)]">
              You can register, log in, log out, and build the next app from this blank signed-in surface.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
