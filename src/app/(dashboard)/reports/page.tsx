import { ComingSoon } from '@/components/shared/coming-soon'
import { FeatureGate } from '@/components/shared/feature-gate'

export default function ReportsPage() {
  return (
    <FeatureGate
      featureName="Financial Reports"
      description="Analyze your family's financial patterns with intelligent insights and forecasting."
    >
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
            Reports
          </h1>
          <p className="text-white/60 text-lg">
            Analyze your family's financial patterns with intelligent insights.
          </p>
        </div>

        <ComingSoon 
          title="Financial Reports Coming Soon"
          description="We're building beautiful charts with liquid-style visualizations, spending insights, and forecasting based on your family's patterns."
        />
      </div>
    </FeatureGate>
  )
}