export default function StatBlock({ value, label, isLast = false, className = '' }) {
  return (
    <div
      className={`flex flex-col pr-6 sm:pr-8 md:pr-10 ${
        isLast ? '' : 'border-r border-black/10'
      } ${className}`}
    >
      <span className="font-display text-2xl sm:text-3xl md:text-4xl text-black tracking-tight">
        {value}
      </span>
      <span className="text-xs sm:text-sm text-black/60 font-medium mt-1 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}
