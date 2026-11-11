export default function Button({
  children,
  variant = 'black',
  size = 'md',
  className = '',
  type = 'button',
  disabled = false,
  onClick,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-[6px] transition-all duration-150 select-none cursor-pointer active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2'

  const variants = {
    black:
      'bg-[var(--bg-inverse)] text-[var(--text-inverse)] hover:opacity-90 border border-transparent',
    outline:
      'bg-[var(--bg-elevated)] text-[var(--text-ink)] border border-[var(--border-strong)] hover:bg-[var(--bg-surface)]',
    white:
      'bg-[var(--bg-elevated)] text-[var(--text-ink)] border border-[var(--border-hairline)] hover:bg-[var(--bg-surface)]',
    ghost:
      'bg-transparent text-[var(--text-ink)] hover:bg-[var(--bg-surface)] border border-transparent',
    danger:
      'bg-[var(--accent-danger)] text-white hover:opacity-90 border border-transparent',
  }

  const sizes = {
    sm: 'text-xs px-3.5 py-2 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-sm sm:text-base px-6 py-3 gap-2 font-semibold',
    icon: 'p-2 rounded-[6px] aspect-square',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.black} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
