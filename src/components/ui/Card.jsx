export function Card({
  children,
  className = '',
  hover = false,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`bg-white rounded-[20px] border border-black/10 transition-all duration-200 ${
        hover ? 'hover:-translate-y-1 hover:border-black/30' : ''
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
      className={`bg-[#F0EEED] rounded-[20px] transition-all duration-200 ${
        hover ? 'hover:bg-[#E8E5E4] hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Card
