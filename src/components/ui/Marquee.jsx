import { SUBJECTS } from '../../lib/constants'

export default function Marquee({ items = SUBJECTS, className = '' }) {
  // Duplicate array so it scrolls seamlessly without empty gaps
  const displayItems = [...items, ...items, ...items]

  return (
    <div
      className={`w-full bg-black text-white py-6 sm:py-8 overflow-hidden select-none border-y border-black/20 ${className}`}
      aria-label="Academic Subjects Ticker"
    >
      <div className="animate-marquee items-center gap-10 sm:gap-14">
        {displayItems.map((subj, index) => (
          <span
            key={`${subj}-${index}`}
            className="font-display text-lg sm:text-2xl md:text-3xl text-white tracking-wider uppercase whitespace-nowrap opacity-90 hover:opacity-100 transition-opacity flex items-center gap-8"
          >
            <span>{subj}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
          </span>
        ))}
      </div>
    </div>
  )
}
