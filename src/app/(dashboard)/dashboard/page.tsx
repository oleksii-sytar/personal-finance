import { ComingSoon } from '@/components/shared/coming-soon'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
          Family Dashboard
        </h1>
        <p className="text-white/60 text-lg">
          Your family's financial overview and recent activity.
        </p>
      </div>

      {/* Coming Soon Placeholder */}
      <ComingSoon 
        title="Dashboard Coming Soon"
        description="We're building your family finance dashboard with balance tracking, recent transactions, and intelligent forecasting."
      />
    </div>
  )
}