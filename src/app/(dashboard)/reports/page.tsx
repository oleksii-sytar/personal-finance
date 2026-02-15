import { ComingSoon } from '@/components/shared/coming-soon'
import { WorkspaceGate } from '@/components/shared/workspace-gate'
import { BarChart3, TrendingUp, PieChart, Calendar } from 'lucide-react'

export default function ReportsPage() {
  return (
    <WorkspaceGate
      featureName="Financial Reports"
      description="Analyze your family's financial patterns with intelligent insights and forecasting."
      benefits={[
        {
          icon: <BarChart3 className="w-5 h-5" />,
          text: 'Visualize spending patterns with beautiful charts'
        },
        {
          icon: <TrendingUp className="w-5 h-5" />,
          text: 'Track income vs expenses over time'
        },
        {
          icon: <PieChart className="w-5 h-5" />,
          text: 'Identify unusual spending with smart insights'
        },
        {
          icon: <Calendar className="w-5 h-5" />,
          text: 'Forecast future balances based on your patterns'
        }
      ]}
    >
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-4xl font-space-grotesk font-bold text-primary mb-2">
            Reports
          </h1>
          <p className="text-secondary text-lg">
            Analyze your family's financial patterns with intelligent insights.
          </p>
        </div>

        <ComingSoon 
          title="Financial Reports Coming Soon"
          description="We're building beautiful charts with liquid-style visualizations, spending insights, and forecasting based on your family's patterns."
        />
      </div>
    </WorkspaceGate>
  )
}