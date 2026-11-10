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
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2'

  const variants = {
    black: 'bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 border border-transparent shadow-none',
    outline: 'bg-white text-black border border-black/20 hover:border-black hover:bg-neutral-50 active:bg-neutral-100',
    white: 'bg-white text-black hover:bg-neutral-100 active:bg-neutral-200 border border-transparent',
    ghost: 'bg-transparent text-black hover:bg-black/5 active:bg-black/10 border border-transparent',
    danger: 'bg-[#FF3333] text-white hover:bg-red-600 active:bg-red-700 border border-transparent',
  }

  const sizes = {
    sm: 'text-xs px-4 py-2 gap-1.5',
    md: 'text-sm px-6 py-3 gap-2',
    lg: 'text-base px-8 py-4 gap-2.5 font-semibold',
    icon: 'p-2.5 rounded-full aspect-square',
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
