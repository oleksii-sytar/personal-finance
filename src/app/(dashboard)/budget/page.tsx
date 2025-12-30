import { ComingSoon } from '@/components/shared/coming-soon'

export default function BudgetPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
          Categories
        </h1>
        <p className="text-white/60 text-lg">
          Organize your transactions with flexible category management.
        </p>
      </div>

      <ComingSoon 
        title="Category Management Coming Soon"
        description="We're building inline category creation, custom icons, and smart categorization suggestions for your family's spending patterns."
      />
    </div>
  )
}