import { cn } from '../../utils/cn'

export function Skeleton({ className }) {
  return <div className={cn('shimmer rounded-lg bg-surface-3', className)} />
}

// Composed loading state for a stat card
export function StatCardSkeleton() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="mt-5 h-8 w-24" />
      <Skeleton className="mt-2 h-4 w-32" />
    </div>
  )
}

// Composed loading state for a table
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }) {
  return <Skeleton className={cn('h-64 w-full', className)} />
}

export default Skeleton
