import { Metadata } from 'next'
import { FAQSection } from '@/components/shared/faq-section'
import { Card } from '@/components/ui/Card'
import { HELP_TEXT } from '@/lib/constants/help-text'
import { BookOpen, TrendingUp, Calendar, DollarSign, Settings, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Help & Documentation | Forma',
  description: 'Learn how to use Forma to manage your finances effectively'
}

function HelpCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType
  title: string
  description: string 
}) {
  return (
    <Card className="p-6 hover:border-accent-primary/30 transition-colors">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-accent-primary/10 rounded-lg">
          <Icon className="w-6 h-6 text-accent-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-primary mb-2">{title}</h3>
          <p className="text-sm text-secondary">{description}</p>
        </div>
      </div>
    </Card>
  )
}

export default function HelpPage() {
  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">Help & Documentation</h1>
        <p className="text-secondary">
          Learn how to use Forma to take control of your finances and avoid payment surprises
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-accent-primary" />
            <h2 className="text-2xl font-bold text-primary">Quick Start Guide</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">1. Create Your Workspace</h3>
              <p className="text-sm text-secondary">
                Start by creating a workspace - this is your financial environment where all your accounts and transactions live.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-primary">2. Add Your Accounts</h3>
              <p className="text-sm text-secondary">
                Add your bank accounts, credit cards, and cash accounts. Enter the current balance for each account.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-primary">3. Track Transactions</h3>
              <p className="text-sm text-secondary">
                Add your daily transactions - both completed (past) and planned (future). This builds your financial history.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-primary">4. View Your Forecast</h3>
              <p className="text-sm text-secondary">
                After 14 days of transactions, you'll see your daily cash flow forecast showing projected balances and upcoming payment risks.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-primary">5. Stay Safe</h3>
              <p className="text-sm text-secondary">
                Check your forecast regularly to avoid running out of money. Mark planned transactions as paid when they occur.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Features */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary">Key Features</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <HelpCard
            icon={TrendingUp}
            title="Daily Cash Flow Forecast"
            description="See your projected balance for each day of the month. Know exactly when you might run low on funds and plan accordingly."
          />
          
          <HelpCard
            icon={Calendar}
            title="Planned Transactions"
            description="Schedule future expenses and income. They won't affect your current balance but will be included in forecasts."
          />
          
          <HelpCard
            icon={DollarSign}
            title="Upcoming Payment Risks"
            description="Get warned about upcoming payments that might cause cash flow problems. See risk indicators for each payment."
          />
          
          <HelpCard
            icon={Settings}
            title="Account Reconciliation"
            description="Keep your balances accurate by reconciling with your actual bank statements regularly."
          />
          
          <HelpCard
            icon={Users}
            title="Workspace Collaboration"
            description="Invite family members to your workspace to manage finances together."
          />
          
          <HelpCard
            icon={BookOpen}
            title="Spending Insights"
            description="Understand your spending patterns with category breakdowns and trend analysis."
          />
        </div>
      </div>

      {/* Understanding the Forecast */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-primary">Understanding Your Forecast</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-primary mb-2">How It Works</h3>
              <p className="text-sm text-secondary">
                The forecast calculates your projected balance for each day by combining:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-secondary ml-4 mt-2">
                <li>Your current account balances</li>
                <li>Historical spending patterns (last 30 days)</li>
                <li>Scheduled planned transactions</li>
                <li>A 10% safety margin for conservative estimates</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-primary mb-2">Risk Levels</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Safe (Green)</p>
                    <p className="text-xs text-secondary">You have sufficient funds with a comfortable buffer</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Warning (Yellow)</p>
                    <p className="text-xs text-secondary">Balance will be below your 7-day safety buffer</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Risk (Red)</p>
                    <p className="text-xs text-secondary">Projected balance below zero - take action to avoid overdraft</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-primary mb-2">Data Requirements</h3>
              <p className="text-sm text-secondary">
                For accurate forecasts, you need at least 14 days of transaction history. 
                The more data you have, the more accurate your forecast becomes.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tips & Best Practices */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-primary">Tips & Best Practices</h2>
          
          <div className="space-y-3">
            <div className="p-3 bg-glass rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">✓ Add transactions daily</p>
              <p className="text-xs text-secondary">
                The more current your data, the more accurate your forecast. Make it a habit to add transactions each day.
              </p>
            </div>

            <div className="p-3 bg-glass rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">✓ Reconcile weekly</p>
              <p className="text-xs text-secondary">
                Check your Forma balance against your bank statement at least once a week to catch any missed transactions.
              </p>
            </div>

            <div className="p-3 bg-glass rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">✓ Plan ahead</p>
              <p className="text-xs text-secondary">
                Add planned transactions for upcoming bills and expenses. This helps you see potential cash flow problems before they happen.
              </p>
            </div>

            <div className="p-3 bg-glass rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">✓ Check your forecast regularly</p>
              <p className="text-xs text-secondary">
                Review your daily forecast at least 2-3 times per week to stay aware of your financial position.
              </p>
            </div>

            <div className="p-3 bg-glass rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">✓ Act on warnings</p>
              <p className="text-xs text-secondary">
                When you see yellow or red risk indicators, take action - postpone non-essential expenses or add income.
              </p>
            </div>

            <div className="p-3 bg-glass rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">✓ Use categories consistently</p>
              <p className="text-xs text-secondary">
                Categorize your transactions consistently to get meaningful spending insights and trend analysis.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* FAQ Section */}
      <FAQSection />

      {/* Help Icons Info */}
      <Card className="p-6 bg-accent-primary/5 border-accent-primary/20">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💡</div>
          <div className="flex-1">
            <h3 className="font-semibold text-primary mb-2">Look for Help Icons</h3>
            <p className="text-sm text-secondary">
              Throughout Forma, you'll find help icons (ⓘ) next to features and settings. 
              Hover over or click these icons to see detailed explanations and tips.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
