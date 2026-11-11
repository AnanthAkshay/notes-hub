export default function SectionHeading({
  kicker,
  title,
  subtitle,
  align = 'left',
  className = '',
  action,
}) {
  const alignment =
    align === 'center'
      ? 'text-center items-center'
      : align === 'right'
        ? 'text-right items-end'
        : 'text-left items-start'

  return (
    <div className={`flex flex-col ${alignment} mb-8 sm:mb-10 ${className}`}>
      {kicker && (
        <span className="font-mono-meta text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-subtle)] mb-2">
          {kicker}
        </span>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 w-full">
        <h2 className="font-display text-2xl sm:text-3xl md:text-[2.15rem] text-[var(--text-ink)] tracking-tight">
          {title}
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {subtitle && (
        <p className="mt-2 text-sm sm:text-base text-[var(--text-muted)] max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
