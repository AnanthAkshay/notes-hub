export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-archival-pulse bg-[var(--bg-surface)] rounded-[4px] ${className}`}
      aria-hidden="true"
    />
  )
}

export function NoteCardSkeleton() {
  return (
    <div
      className="flex flex-col rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 gap-3"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-hairline)]">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="space-y-2 py-1">
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <Skeleton className="h-4 w-2/5" />
      <div className="flex items-center justify-between pt-3 mt-auto border-t border-[var(--border-hairline)]">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

export function PageFallbackSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
      <div className="space-y-2.5 border-b border-[var(--border-hairline)] pb-6">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <NoteCardSkeleton />
        <NoteCardSkeleton />
        <NoteCardSkeleton />
        <NoteCardSkeleton />
      </div>
    </div>
  )
}

export default Skeleton
