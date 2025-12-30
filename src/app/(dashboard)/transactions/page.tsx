import { ComingSoon } from '@/components/shared/coming-soon'

export default function TransactionsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
          Transactions
        </h1>
        <p className="text-white/60 text-lg">
          Record and manage your family's income and expenses.
        </p>
      </div>

      <ComingSoon 
        title="Transaction Management Coming Soon"
        description="We're building frictionless transaction entry with hotkeys, inline category management, and multi-currency support."
      />
    </div>
  )
}