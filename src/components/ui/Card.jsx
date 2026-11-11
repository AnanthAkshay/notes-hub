export function Card({
  children,
  className = '',
  hover = false,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] transition-colors duration-150 ${
        hover ? 'hover:border-[var(--border-strong)]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export function Tile({
  children,
  className = '',
  hover = false,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border-hairline)] transition-colors duration-150 ${
        hover ? 'hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Card
