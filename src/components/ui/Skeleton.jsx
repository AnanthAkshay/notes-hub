export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-[#F0EEED] rounded-[20px] ${className}`}
      aria-hidden="true"
    />
  )
}

export function NoteCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="w-full aspect-[4/3] rounded-[20px]" />
      <div className="space-y-2 mt-1">
        <Skeleton className="h-5 w-4/5 rounded-full" />
        <Skeleton className="h-4 w-1/2 rounded-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export default Skeleton
