import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Trash2,
  Check,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { fetchReviewQueues } from '../lib/notesApi'
import { updateNoteVoteInCache } from '../lib/queryClient'
import NoteCard from '../components/NoteCard'
import { formatRelativeDate } from '../lib/formatDate'
import Button from '../components/ui/Button'
import ConfirmModal from '../components/ui/ConfirmModal'
import { Pill } from '../components/ui/Pill'
import { NoteCardSkeleton } from '../components/ui/Skeleton'
import { VerifiedSealIcon } from '../components/icons/ArchiveIcons'

export default function Review() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('unverified')
  const [deletingNote, setDeletingNote] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  const {
    data,
    isLoading: loadingQueues,
    refetch,
  } = useQuery({
    queryKey: ['review-queues', user?.id || 'anon'],
    queryFn: () => fetchReviewQueues(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const unverifiedNotes = data?.unverifiedNotes || []
  const reportedNotes = data?.reportedNotes || []
  const loadingUnverified = loadingQueues
  const loadingReported = loadingQueues

  const invalidateReviewAndFeeds = (noteId) => {
    queryClient.invalidateQueries({ queryKey: ['review-queues'] })
    queryClient.invalidateQueries({ queryKey: ['open-reports-count'] })
    queryClient.invalidateQueries({ queryKey: ['home-feed'] })
    queryClient.invalidateQueries({ queryKey: ['notes-feed'] })
    if (noteId) {
      queryClient.invalidateQueries({ queryKey: ['note-detail', noteId] })
    }
  }

  const handleDismissReports = async (noteId) => {
    setActionInProgress(true)
    try {
      const { data: resData, error } = await supabase.rpc('dismiss_reports_for_note', {
        p_note_id: noteId,
      })
      if (error) throw error

      showSuccess(`Dismissed ${resData.resolved_count || ''} report(s).`)
      invalidateReviewAndFeeds(noteId)
    } catch (err) {
      console.error('[Dismiss Reports Error]', err)
      showError(err.message || 'Failed to dismiss reports.')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleToggleVerified = async (noteId, currentStatus) => {
    setActionInProgress(true)
    try {
      const { error } = await supabase.rpc('set_note_verified', {
        p_note_id: noteId,
        p_verified: !currentStatus,
      })
      if (error) throw error

      showSuccess(
        !currentStatus
          ? 'Note verified successfully.'
          : 'Verification removed.'
      )
      invalidateReviewAndFeeds(noteId)
    } catch (err) {
      console.error('[Verify Toggle Error]', err)
      showError(err.message || 'Failed to update verification.')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingNote) return

    setActionInProgress(true)
    try {
      const { data: resData, error } = await supabase.rpc('teacher_delete_note', {
        p_note_id: deletingNote.id,
      })
      if (error) throw error

      const fileUrl = resData.file_url || deletingNote.file_url
      if (fileUrl && fileUrl.includes('/notes-files/')) {
        const parts = fileUrl.split('/notes-files/')
        if (parts.length > 1) {
          const storagePath = decodeURIComponent(parts[1])
          await supabase.storage.from('notes-files').remove([storagePath])
        }
      }

      const deletedId = deletingNote.id
      showSuccess('Note and associated storage files deleted permanently.')
      setDeletingNote(null)
      invalidateReviewAndFeeds(deletedId)
    } catch (err) {
      console.error('[Delete Note Error]', err)
      showError(err.message || 'Failed to delete note.')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 min-h-screen">
      {/* Header Banner */}
      <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono-meta text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-[4px] bg-[var(--bg-inverse)] text-[var(--text-inverse)]">
                Faculty Portal
              </span>
              <span className="font-mono-meta text-xs text-[var(--text-subtle)]">
                Teacher & Admin Access
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl text-[var(--text-ink)] tracking-tight">
              Curriculum Review Queue
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 max-w-xl">
              Inspect student submissions for syllabus accuracy, certify verified study materials, and resolve flagged reports.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={actionInProgress}
            className="self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </Button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex p-1 rounded-[6px] bg-[var(--bg-surface)] max-w-md border border-[var(--border-hairline)]">
          <button
            type="button"
            onClick={() => setActiveTab('unverified')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'unverified'
                ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            <span>Unverified Notes</span>
            <span
              className={`font-mono-meta text-[10px] px-1.5 py-0.5 rounded-[3px] ${
                activeTab === 'unverified'
                  ? 'bg-[var(--bg-elevated)]/20 text-[var(--text-inverse)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-ink)]'
              }`}
            >
              {unverifiedNotes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reported')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'reported'
                ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
            }`}
          >
            <span>Needs Review</span>
            {reportedNotes.length > 0 && (
              <span className="bg-[var(--accent-danger)] text-white font-mono-meta text-[10px] px-1.5 py-0.5 rounded-[3px] font-bold">
                {reportedNotes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: UNVERIFIED NOTES GRID */}
      {activeTab === 'unverified' && (
        <div>
          {loadingUnverified ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <NoteCardSkeleton />
              <NoteCardSkeleton />
              <NoteCardSkeleton />
              <NoteCardSkeleton />
            </div>
          ) : unverifiedNotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {unverifiedNotes.map((note) => (
                <div key={note.id} className="flex flex-col gap-2">
                  <NoteCard
                    note={note}
                    userVote={note.my_vote || 0}
                    onVoteChange={(noteId, newScore, newUserVote) => {
                      updateNoteVoteInCache(queryClient, noteId, newScore, newUserVote)
                    }}
                  />
                  <Button
                    variant="black"
                    size="sm"
                    onClick={() => handleToggleVerified(note.id, false)}
                    disabled={actionInProgress || note.uploaded_by === user?.id}
                    className="w-full text-xs font-semibold"
                  >
                    <VerifiedSealIcon className="w-3.5 h-3.5 text-[var(--accent-verified)]" />
                    <span>Verify & Rank Top</span>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-12 text-center">
              <VerifiedSealIcon className="w-8 h-8 text-[var(--accent-verified)] mx-auto mb-3" />
              <h3 className="font-display text-xl text-[var(--text-ink)]">
                Queue Clean
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                All submitted study notes have been reviewed by faculty.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPORTED / NEEDS REVIEW QUEUE */}
      {activeTab === 'reported' && (
        <div>
          {loadingReported ? (
            <div className="space-y-4">
              <div className="h-28 bg-[var(--bg-surface)] rounded-[8px] animate-archival-pulse" />
              <div className="h-28 bg-[var(--bg-surface)] rounded-[8px] animate-archival-pulse" />
            </div>
          ) : reportedNotes.length > 0 ? (
            <div className="space-y-4">
              {reportedNotes.map((note) => {
                const isAutoFlagged = note.score <= -3
                return (
                  <div
                    key={note.id}
                    className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill size="xs" variant="black">
                          {note.subject}
                        </Pill>
                        <Pill size="xs" variant="default">
                          {note.semester}
                        </Pill>
                        {isAutoFlagged ? (
                          <Pill size="xs" variant="danger">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Auto-Flagged (Score: {note.score})</span>
                          </Pill>
                        ) : (
                          <Pill size="xs" variant="danger">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{note.open_reports_count} Peer Report(s)</span>
                          </Pill>
                        )}
                        {note.verified && (
                          <Pill size="xs" variant="verified">
                            Verified
                          </Pill>
                        )}
                      </div>

                      <Link
                        to={`/notes/${note.id}`}
                        className="font-display text-lg text-[var(--text-ink)] hover:underline block leading-snug"
                      >
                        {note.title}
                      </Link>

                      {note.recent_report_reason && (
                        <p className="text-xs text-[var(--accent-danger)] font-semibold">
                          Reason: {note.recent_report_reason}
                          {note.recent_report_details && (
                            <span className="text-[var(--text-muted)] font-normal">
                              {' '}
                              ({note.recent_report_details})
                            </span>
                          )}
                        </p>
                      )}

                      <div className="font-mono-meta text-xs text-[var(--text-subtle)]">
                        Uploaded by {note.uploader_name || 'Student'} ·{' '}
                        {formatRelativeDate(note.created_at)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={note.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Inspect File</span>
                        </Button>
                      </a>

                      <Button
                        variant="black"
                        size="sm"
                        onClick={() => handleToggleVerified(note.id, note.verified)}
                        disabled={actionInProgress}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{note.verified ? 'Un-verify' : 'Verify'}</span>
                      </Button>

                      {note.open_reports_count > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissReports(note.id)}
                          disabled={actionInProgress}
                          className="text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                        >
                          <span>Dismiss Reports</span>
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingNote(note)}
                        disabled={actionInProgress}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Note</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-12 text-center">
              <VerifiedSealIcon className="w-8 h-8 text-[var(--accent-verified)] mx-auto mb-3" />
              <h3 className="font-display text-xl text-[var(--text-ink)]">
                Zero Pending Reports
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                No study materials have been flagged for review.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deletingNote)}
        title="Delete Study Note Permanently?"
        description={
          deletingNote
            ? `Permanently delete "${deletingNote.title}"? This removes the note record, attached storage file, and all community votes.`
            : ''
        }
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
        loading={actionInProgress}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingNote(null)}
      />
    </div>
  )
}
