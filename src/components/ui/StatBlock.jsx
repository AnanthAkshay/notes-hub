export default function StatBlock({ value, label, isLast = false, className = '' }) {
  return (
    <div
      className={`flex flex-col pr-6 sm:pr-8 ${
        isLast ? '' : 'border-r border-[var(--border-hairline)]'
      } ${className}`}
    >
      <span className="font-mono-meta text-2xl sm:text-3xl font-semibold text-[var(--text-ink)] tracking-tight">
        {value}
      </span>
      <span className="text-[11px] sm:text-xs text-[var(--text-subtle)] font-medium mt-1 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}
