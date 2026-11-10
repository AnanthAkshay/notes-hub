export function Pill({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center rounded-full font-medium transition-colors select-none'

  const variants = {
    default: 'bg-[#F0EEED] text-black/80 border border-black/5',
    black: 'bg-black text-white border border-transparent',
    white: 'bg-white text-black border border-black/10',
    verified: 'bg-[#01AB31]/10 text-[#01AB31] border border-[#01AB31]/20 font-semibold',
    danger: 'bg-[#FF3333]/10 text-[#FF3333] border border-[#FF3333]/20 font-semibold',
    yellow: 'bg-[#FFC633]/20 text-neutral-900 border border-[#FFC633]/40 font-semibold',
  }

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1',
    md: 'text-xs px-3 py-1.5 gap-1.5',
    lg: 'text-sm px-4 py-2 gap-2',
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
      className={`inline-flex items-center rounded-full transition-all duration-150 cursor-pointer select-none font-medium ${
        size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'
      } ${
        active
          ? 'bg-black text-white border border-black shadow-sm'
          : 'bg-[#F0EEED] text-black/70 hover:bg-[#E8E5E4] hover:text-black border border-transparent'
      } ${className}`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-1.5 text-[11px] px-1.5 py-0.2 rounded-full ${
            active ? 'bg-white/20 text-white' : 'bg-black/10 text-black/60'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export default Pill
