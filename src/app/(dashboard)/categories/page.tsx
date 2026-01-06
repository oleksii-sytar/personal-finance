import { Suspense } from 'react'
import { CategoryManager } from '@/components/categories'

export const metadata = {
  title: 'Categories | Forma',
  description: 'Manage your transaction categories',
}

/**
 * Categories page for comprehensive category management
 * Implements Requirements 7.1, 7.2, 7.3, 7.4, 7.5: Complete category management interface
 */
export default function CategoriesPage() {
  return (
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