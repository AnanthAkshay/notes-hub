export default function SectionHeading({
  title,
  subtitle,
  align = 'center',
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
    <div className={`flex flex-col ${alignment} mb-8 sm:mb-12 ${className}`}>
      <div className="flex items-center justify-between w-full">
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-black tracking-tight uppercase">
          {title}
        </h2>
        {action && <div>{action}</div>}
      </div>
      {subtitle && (
        <p className="mt-2 text-sm sm:text-base text-black/60 max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}
