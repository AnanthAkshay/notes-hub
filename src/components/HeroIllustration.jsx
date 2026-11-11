import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getSubjectMeta } from '../lib/constants'
import { formatRelativeDate } from '../lib/formatDate'
import { CatalogDocIcon, VerifiedSealIcon } from './icons/ArchiveIcons'
import { Skeleton } from './ui/Skeleton'

export default function HeroIllustration({ featuredNote, loading = false }) {
  if (loading) {
    return (
      <div className="rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="pt-4 border-t border-[var(--border-hairline)] flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    )
  }

  if (!featuredNote) {
    return (
      <div className="rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)]">
          <span className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
            Verified Specimen
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-verified)]">
            <VerifiedSealIcon className="w-3.5 h-3.5" />
            <span>Faculty Standard</span>
          </span>
        </div>
        <p className="font-display text-xl text-[var(--text-ink)]">
          Faculty-reviewed study notes appear here once published.
        </p>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Upload PDFs or Google Drive links tagged by semester and subject. Approved notes rank at the top of every feed.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline pt-2"
        >
          <span>Submit first study note</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  const meta = getSubjectMeta(featuredNote.subject)

  return (
    <Link
      to={`/notes/${featuredNote.id}`}
      className="group block rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-6 transition-colors duration-150 hover:bg-[var(--bg-surface)]/40"
    >
      <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-2">
          <span className="font-mono-meta text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[var(--bg-surface)] text-[var(--text-ink)] border border-[var(--border-hairline)]">
            {meta.code}
          </span>
          <span className="font-mono-meta text-[11px] text-[var(--text-subtle)] uppercase">
            {featuredNote.semester}
          </span>
        </div>
        {featuredNote.verified && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-verified)]">
            <VerifiedSealIcon className="w-3.5 h-3.5" />
            <span>Verified</span>
          </span>
        )}
      </div>

      <div className="py-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-ink)] shrink-0">
            <CatalogDocIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-[var(--text-subtle)] block mb-1">
              {featuredNote.subject}
            </span>
            <h3 className="font-display text-xl sm:text-2xl text-[var(--text-ink)] group-hover:text-[var(--accent-primary)] transition-colors leading-snug">
              {featuredNote.title}
            </h3>
          </div>
        </div>
      </div>

      <div className="pt-3.5 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-3 font-mono-meta">
          <span className="font-semibold text-[var(--text-ink)]">
            {featuredNote.score >= 0 ? `+${featuredNote.score}` : featuredNote.score} net votes
          </span>
          <span className="text-[var(--text-subtle)]">
            {formatRelativeDate(featuredNote.created_at)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 font-medium text-[var(--text-ink)] group-hover:translate-x-0.5 transition-transform">
          <span>Inspect</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  )
}
