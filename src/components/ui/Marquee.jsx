import { Link } from 'react-router-dom'
import { SUBJECTS, getSubjectMeta } from '../../lib/constants'

export default function Marquee({ items = SUBJECTS, className = '' }) {
  return (
    <nav
      className={`w-full bg-[var(--bg-surface)] border-y border-[var(--border-hairline)] ${className}`}
      aria-label="Subject index quick links"
      data-no-print
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
        <span className="font-mono-meta text-[11px] uppercase tracking-widest text-[var(--text-subtle)] pr-3 border-r border-[var(--border-hairline)] shrink-0">
          Catalog
        </span>
        <div className="flex items-center gap-1.5">
          {items.map((subj) => {
            const meta = getSubjectMeta(subj)
            return (
              <Link
                key={subj}
                to={`/notes?subject=${encodeURIComponent(subj)}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-hairline)] whitespace-nowrap transition-colors"
              >
                <span className="font-mono-meta text-[10px] text-[var(--text-subtle)]">
                  {meta.code}
                </span>
                <span>{subj}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
