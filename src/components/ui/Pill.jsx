export function Pill({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center rounded-[4px] font-medium transition-colors select-none'

  const variants = {
    default:
      'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-hairline)]',
    black:
      'bg-[var(--bg-inverse)] text-[var(--text-inverse)] border border-transparent',
    white:
      'bg-[var(--bg-elevated)] text-[var(--text-ink)] border border-[var(--border-hairline)]',
    verified:
      'bg-[var(--accent-verified-bg)] text-[var(--accent-verified)] border border-[var(--accent-verified)]/30 font-semibold',
    danger:
      'bg-[var(--accent-danger-bg)] text-[var(--accent-danger)] border border-[var(--accent-danger)]/30 font-semibold',
    yellow:
      'bg-[var(--accent-amber-bg)] text-[var(--accent-amber)] border border-[var(--accent-amber)]/30 font-semibold',
  }

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }

  return (
    <span
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export function Chip({
  label,
  active = false,
  onClick,
  count,
  className = '',
  size = 'md',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-[4px] transition-colors duration-150 cursor-pointer select-none font-medium active:scale-[0.98] ${
        size === 'sm' ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3.5 py-1.5'
      } ${
        active
          ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)] border border-[var(--bg-inverse)]'
          : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-ink)] border border-[var(--border-hairline)]'
      } ${className}`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-1.5 text-[11px] font-mono-meta px-1 py-0.2 rounded-[2px] ${
            active
              ? 'bg-[var(--bg-elevated)]/20 text-[var(--text-inverse)]'
              : 'bg-[var(--bg-elevated)] text-[var(--text-subtle)]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export default Pill
