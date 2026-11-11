import { Link } from 'react-router-dom'
import { ExternalLink, AlertTriangle } from 'lucide-react'
import { formatRelativeDate } from '../lib/formatDate'
import { getSubjectMeta } from '../lib/constants'
import { isTeacherRole } from '../lib/authHelpers'
import { useAuth } from '../hooks/useAuth'
import VoteButtons from './VoteButtons'
import { Pill } from './ui/Pill'
import { CatalogDocIcon, VerifiedSealIcon } from './icons/ArchiveIcons'

export default function NoteCard({
  note,
  userVote = 0,
  onVoteChange,
  featured = false,
}) {
  const { profile } = useAuth()
  const isTeacher = isTeacherRole(profile?.role)

  const uploaderName =
    note.uploader_name ||
    note.profiles?.full_name ||
    note.profiles?.email?.split('@')[0] ||
    'Student'

  const verifierName =
    note.verifier_name ||
    note.verifier?.full_name ||
    'Faculty'

  const isExternalLink =
    note.file_url?.startsWith('http://') ||
    note.file_url?.startsWith('https://')

  const meta = getSubjectMeta(note.subject)
  const isNeedsReview = Boolean(
    note.needs_review ||
      (note.reports_count && note.reports_count > 0) ||
      note.score <= -3
  )

  return (
    <Link
      to={`/notes/${note.id}`}
      className={`group flex flex-col justify-between rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 sm:p-5 transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]/35 focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div>
        {/* Catalog Header Bar */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono-meta text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[var(--bg-surface)] text-[var(--text-ink)] border border-[var(--border-hairline)] shrink-0">
              {meta.code}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] truncate">
              {note.subject}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-mono-meta text-[11px] text-[var(--text-subtle)]">
            {isExternalLink ? (
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            ) : (
              <CatalogDocIcon className="w-3.5 h-3.5" />
            )}
            <span>{isExternalLink ? 'LINK' : 'PDF'}</span>
          </div>
        </div>

        {/* Title & Verification Line */}
        <div className="pt-3.5 space-y-2.5">
          <h3
            className={`font-display text-[var(--text-ink)] group-hover:text-[var(--accent-primary)] transition-colors line-clamp-2 leading-snug ${
              featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {note.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <Pill size="xs" variant="default">
              {note.semester}
            </Pill>

            {note.verified ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-verified)]">
                <VerifiedSealIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[165px]">
                  Verified by {verifierName}
                </span>
              </span>
            ) : (
              <span className="text-xs text-[var(--text-subtle)]">
                Community Upload
              </span>
            )}

            {isTeacher && isNeedsReview && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-danger)] bg-[var(--accent-danger-bg)] px-2 py-0.5 rounded-[4px] border border-[var(--accent-danger)]/30">
                <AlertTriangle className="w-3 h-3" />
                <span>Review</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Meta & Interactive Voting */}
      <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
        <VoteButtons
          noteId={note.id}
          initialScore={note.score}
          initialUserVote={note.my_vote ?? userVote}
          uploadedBy={note.uploaded_by}
          onVoteChange={(newScore, newUserVote) =>
            onVoteChange?.(note.id, newScore, newUserVote)
          }
          size="sm"
        />

        <div className="text-right min-w-0">
          <span className="block text-xs font-medium text-[var(--text-muted)] truncate max-w-[130px]">
            {uploaderName}
          </span>
          <span className="block font-mono-meta text-[10px] text-[var(--text-subtle)]">
            {formatRelativeDate(note.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}
