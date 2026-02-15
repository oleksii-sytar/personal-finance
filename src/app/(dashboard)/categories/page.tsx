import { Suspense } from 'react'
import { CategoryManager } from '@/components/categories'
import { WorkspaceGate } from '@/components/shared/workspace-gate'
import { FolderTree, TrendingUp, Tag, Zap } from 'lucide-react'

export const metadata = {
  title: 'Categories | Forma',
  description: 'Manage your transaction categories',
}

/**
 * Categories page for comprehensive category management
 * Implements Requirements AC 2.1.1, AC 2.2.4: Categories require workspace (auto-created with workspace)
 */
export default function CategoriesPage() {
  return (
    <WorkspaceGate
      featureName="Category Management"
      description="Organize your transactions with custom categories to track spending patterns and make informed financial decisions."
      benefits={[
        {
          icon: <FolderTree className="w-5 h-5" />,
          text: 'Organize expenses and income into meaningful groups'
        },
        {
          icon: <TrendingUp className="w-5 h-5" />,
          text: 'Track spending patterns by category'
        },
        {
          icon: <Tag className="w-5 h-5" />,
          text: 'Create custom categories for your unique needs'
        },
        {
          icon: <Zap className="w-5 h-5" />,
          text: 'Auto-categorize transactions for faster entry'
        }
      ]}
    >
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Categories</h1>
            <p className="text-secondary mt-1">
              Organize your transactions with custom categories
            </p>
          </div>
        </div>

        <Suspense fallback={<CategoryManagerSkeleton />}>
          <CategoryManager />
        </Suspense>
      </div>
    </WorkspaceGate>
  )
}

/**
 * Loading skeleton for category manager
 */
function CategoryManagerSkeleton() {
  return (
    <div className="bg-glass backdrop-blur-[16px] border border-glass rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-glass rounded animate-pulse" />
        <div className="h-8 w-32 bg-glass rounded animate-pulse" />
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-glass border border-glass rounded-lg">
            <div className="w-6 h-6 bg-glass rounded animate-pulse" />
            <div className="w-3 h-3 bg-glass rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-glass rounded animate-pulse" />
            <div className="ml-auto flex gap-2">
              <div className="h-6 w-12 bg-glass rounded animate-pulse" />
              <div className="h-6 w-16 bg-glass rounded animate-pulse" />
              <div className="h-6 w-16 bg-glass rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}