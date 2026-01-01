import { WorkspaceSettings } from '@/components/shared/workspace-settings'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
          Settings
        </h1>
        <p className="text-white/60 text-lg">
          Manage your workspace and customize your family finance experience.
        </p>
      </div>

      <WorkspaceSettings />
    </div>
  )
}