import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Button from './ui/Button'
import { BrandSealIcon } from './icons/ArchiveIcons'

const LAST_UPDATED_LABEL = 'November 11, 2026'

export default function Footer() {
  return (
    <footer className="mt-16 sm:mt-20 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]" data-no-print>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Asymmetric Editorial Footer Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-10 border-b border-[var(--border-hairline)]">
          {/* Col 1-5: Editorial Identity & Callout */}
          <div className="lg:col-span-5 space-y-5">
            <Link to="/" className="inline-flex items-center gap-2">
              <BrandSealIcon className="w-5 h-5 text-[var(--accent-primary)]" />
              <span className="font-display text-2xl text-[var(--text-ink)] tracking-tight">
                Notes.Hub
              </span>
            </Link>

            <p className="text-sm text-[var(--text-muted)] max-w-md leading-relaxed">
              An institutional study repository built for engineering cohorts. Notes rank by faculty certification first, then peer vote consensus, then upload recency.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Link to="/upload">
                <Button variant="black" size="sm">
                  <span>Contribute Study Notes</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link to="/notes">
                <Button variant="outline" size="sm">
                  <span>Browse Full Index</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Col 6-8: Quick Navigation */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-mono-meta text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
              Repository
            </h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link to="/notes" className="hover:text-[var(--text-ink)] transition-colors">
                  All Study Notes
                </Link>
              </li>
              <li>
                <Link
                  to="/notes?verified_only=true"
                  className="hover:text-[var(--text-ink)] transition-colors"
                >
                  Faculty Verified Only
                </Link>
              </li>
              <li>
                <Link
                  to="/notes?sort=upvoted"
                  className="hover:text-[var(--text-ink)] transition-colors"
                >
                  Highest Rated Notes
                </Link>
              </li>
              <li>
                <Link to="/review" className="hover:text-[var(--text-ink)] transition-colors">
                  Faculty Review Queue
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[var(--text-ink)] transition-colors">
                  Passwordless OTP Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 9-12: Semester Index & Repository Info */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="font-mono-meta text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
              Semester Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              {[
                { sem: '3', label: 'Sem 3 · DSA & Logic' },
                { sem: '4', label: 'Sem 4 · OS & DBMS' },
                { sem: '5', label: 'Sem 5 · CN & TOC' },
                { sem: '6', label: 'Sem 6 · ML & Web' },
                { sem: '7', label: 'Sem 7 · Cloud & Sec' },
                { sem: '8', label: 'Sem 8 · Electives' },
              ].map((item) => (
                <Link
                  key={item.sem}
                  to={`/notes?semester=${item.sem}`}
                  className="px-3 py-2 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:border-[var(--border-strong)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="font-mono-meta text-[11px] text-[var(--text-subtle)] pt-1">
              Restricted to @msrit.edu roster & approved faculty.
            </p>
          </div>
        </div>

        {/* Bottom Legal & Freshness Metadata */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--text-subtle)]">
          <p>
            Notes Hub · Non-commercial academic archive ·{' '}
            <a
              href="https://github.com/AnanthAkshay/notes-hub"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[var(--text-ink)]"
            >
              Source Repository
            </a>
          </p>
          <p className="font-mono-meta">
            Last updated: {LAST_UPDATED_LABEL} · Print ready (Ctrl+P)
          </p>
        </div>
      </div>
    </footer>
  )
}
