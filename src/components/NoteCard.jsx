import { formatRelativeDate } from '../lib/formatDate'
import VoteButtons from './VoteButtons'
import VerifyButton from './VerifyButton'
import ReportButton from './ReportButton'

export default function NoteCard({
  note,
  userVote = 0,
  onVoteChange,
  onVerificationChange,
}) {
  const uploaderName =
    note.profiles?.full_name ||
    note.profiles?.email?.split('@')[0] ||
    'Student'

  const verifierName =
    note.verifier_name ||
    note.verifier?.full_name ||
    'Faculty'

  const isUploaderTeacher = note.profiles?.role === 'teacher'
  const isExternalLink =
    note.file_url?.startsWith('http://') ||
    note.file_url?.startsWith('https://')

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
      {/* Card Header & Badges */}
      <div className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {note.subject}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {note.semester}
            </span>
          </div>

          {/* Teacher Verified Badge (Interactive / Informative) */}
          {note.verified ? (
            <div
              className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300"
              title={
                note.verified_at
                  ? `Verified by ${verifierName} (${formatRelativeDate(note.verified_at)})`
                  : `Verified by ${verifierName}`
              }
            >
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Verified by {verifierName}</span>
            </div>
          ) : (
            <span className="text-[11px] text-gray-400 font-medium">
              Community Upload
            </span>
          )}
        </div>

        {/* Note Title */}
        <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-snug mb-2 line-clamp-2">
          {note.title}
        </h2>

        {/* Note Description */}
        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-4">
          {note.description || (
            <span className="italic text-gray-400">No description provided.</span>
          )}
        </p>

        {/* Uploader & Timestamp */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="text-gray-400">By</span>
            <span className="font-medium text-gray-700 truncate max-w-[130px]">
              {uploaderName}
            </span>
            {isUploaderTeacher && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-purple-100 text-purple-700 uppercase">
                Faculty
              </span>
            )}
          </div>
          <span title={note.created_at}>
            {formatRelativeDate(note.created_at)}
          </span>
        </div>
      </div>

      {/* Card Footer (Vote Capsule, Teacher Verify Button, View Button) */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-gray-100 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Interactive Vote Buttons */}
        <VoteButtons
          noteId={note.id}
          initialScore={note.score}
          initialUserVote={userVote}
          uploadedBy={note.uploaded_by}
          onVoteChange={(newScore, newUserVote) =>
            onVoteChange?.(note.id, newScore, newUserVote)
          }
        />

        {/* Middle/Right: Teacher Verify Button & View Link */}
        <div className="flex items-center space-x-2">
          {/* Phase 5 Teacher Verification Action */}
          <VerifyButton
            noteId={note.id}
            verified={note.verified}
            uploadedBy={note.uploaded_by}
            onVerificationChange={(res) => onVerificationChange?.(note.id, res)}
          />

          {/* View / Download Button */}
          <a
            href={note.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          >
            <span>{isExternalLink ? 'View' : 'View'}</span>
            <span>↗</span>
          </a>

          {/* Phase 7 Report Button */}
          <ReportButton
            noteId={note.id}
            noteTitle={note.title}
            uploadedBy={note.uploaded_by}
          />
        </div>
      </div>
    </div>
  )
}
