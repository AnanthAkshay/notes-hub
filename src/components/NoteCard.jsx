import { Link } from 'react-router-dom'
import { FileText, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatRelativeDate } from '../lib/formatDate'
import { getSubjectMeta } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'
import VoteButtons from './VoteButtons'
import { Pill } from './ui/Pill'

export default function NoteCard({
  note,
  userVote = 0,
  onVoteChange,
}) {
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'

  const uploaderName =
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
    note.needs_review || (note.reports_count && note.reports_count > 0) || note.score <= -3
  )

  return (
    <Link
      to={`/notes/${note.id}`}
      className="group flex flex-col focus-visible:outline-2 focus-visible:outline-black rounded-[20px] transition-transform duration-200 hover:-translate-y-1 select-none"
    >
      {/* Generated Graphic Cover Tile (20px radius in #F0EEED, tinted per subject) */}
      <div
        className="w-full aspect-[4/3] rounded-[20px] bg-[#F0EEED] relative flex flex-col items-center justify-center p-6 overflow-hidden border border-black/5 transition-colors group-hover:border-black/20"
        style={{
          backgroundColor: meta.tint,
        }}
      >
        {/* Subtle background monogram */}
        <span
          className="absolute -right-4 -bottom-4 font-display text-7xl sm:text-8xl select-none pointer-events-none opacity-10"
          style={{ color: meta.accent }}
        >
          {meta.initials}
        </span>

        {/* Central Graphic Document Emblem */}
        <div className="w-16 h-20 sm:w-20 sm:h-24 bg-white rounded-xl shadow-xs border border-black/10 flex flex-col items-center justify-between p-3 relative transform transition-transform duration-200 group-hover:scale-105">
          <div className="flex items-center justify-between w-full">
            <span
              className="font-display text-xs font-black tracking-wider"
              style={{ color: meta.accent }}
            >
              {meta.initials}
            </span>
            <FileText className="w-4 h-4 text-black/40" />
          </div>

          <div className="w-full text-center py-1">
            <span className="text-[10px] font-bold tracking-widest text-black/40 uppercase block">
              {meta.code}
            </span>
          </div>

          <div className="w-full border-t border-black/10 pt-1 flex items-center justify-between text-[9px] text-black/50 font-medium">
            <span>{note.semester}</span>
            {isExternalLink ? (
              <ExternalLink className="w-2.5 h-2.5" />
            ) : (
              <span>PDF</span>
            )}
          </div>
        </div>

        {/* Top Badges overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
          <Pill size="xs" variant="white">
            {note.subject}
          </Pill>
          {note.verified && (
            <span className="bg-[#01AB31] text-white p-1 rounded-full shadow-xs" title="Faculty Verified">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Note Card Meta Details */}
      <div className="pt-3 pb-1 flex flex-col flex-1">
        {/* Title (2-line clamp) */}
        <h3 className="font-bold text-base sm:text-lg text-black line-clamp-2 leading-snug group-hover:text-black/80 transition-colors">
          {note.title}
        </h3>

        {/* Score Pill & Sem Chip (Like star ratings row in reference) */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2">
            <VoteButtons
              noteId={note.id}
              initialScore={note.score}
              initialUserVote={userVote}
              uploadedBy={note.uploaded_by}
              onVoteChange={onVoteChange}
              size="sm"
            />
            <Pill size="xs" variant="default">
              {note.semester}
            </Pill>
          </div>

          {/* Teacher-only needs review indicator */}
          {isTeacher && isNeedsReview && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF3333] bg-[#FF3333]/10 px-2 py-0.5 rounded-full border border-[#FF3333]/20">
              <AlertTriangle className="w-3 h-3" />
              <span>Review</span>
            </span>
          )}
        </div>

        {/* Faculty Verified Badge */}
        {note.verified ? (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#01AB31] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Verified by {verifierName}</span>
          </div>
        ) : (
          <div className="mt-2.5 text-xs text-black/40 font-medium">
            Community Upload
          </div>
        )}

        {/* Uploader and Relative Date */}
        <div className="mt-2 text-xs text-black/50 flex items-center justify-between pt-2 border-t border-black/5">
          <span className="truncate max-w-[140px]">By {uploaderName}</span>
          <span className="shrink-0">{formatRelativeDate(note.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}
