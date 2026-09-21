import { cn } from '@/lib/utils'

/** Shimmering placeholder used while data loads. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-[var(--bg-glass-interactive)]', className)}
      {...props}
    />
  )
}

/** A glass card filled with skeleton lines. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('glass-card p-6', className)}>
      <Skeleton className="mb-4 h-5 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}