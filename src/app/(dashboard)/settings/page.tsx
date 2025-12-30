import { ComingSoon } from '@/components/shared/coming-soon'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
          Settings
        </h1>
        <p className="text-white/60 text-lg">
          Customize your family finance experience and manage preferences.
        </p>
      </div>

      <ComingSoon 
        title="Settings Coming Soon"
        description="We're building comprehensive settings for currency preferences, notification controls, and family member management."
      />
    </div>
  )
}