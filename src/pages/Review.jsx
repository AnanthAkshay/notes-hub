import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Check,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import NoteCard from '../components/NoteCard'
import { formatRelativeDate } from '../lib/formatDate'
import Button from '../components/ui/Button'
import { Pill } from '../components/ui/Pill'
import { NoteCardSkeleton } from '../components/ui/Skeleton'

export default function Review() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [activeTab, setActiveTab] = useState('unverified')

  const [unverifiedNotes, setUnverifiedNotes] = useState([])
  const [unverifiedVotes, setUnverifiedVotes] = useState({})
  const [loadingUnverified, setLoadingUnverified] = useState(true)

  const [reportedNotes, setReportedNotes] = useState([])
  const [loadingReported, setLoadingReported] = useState(true)

  const [deletingNote, setDeletingNote] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load both queues asynchronously
  useEffect(() => {
    let isMounted = true

    async function loadAllQueues() {
      // 1. Fetch unverified notes
      try {
        const { data, error } = await supabase
          .from('notes')
          .select(
            `
            id,
            title,
            subject,
            semester,
            description,
            file_url,
            score,
            verified,
            verified_by,
            verified_at,
            created_at,
            uploaded_by,
            profiles:uploaded_by (
              id,
              email,
              full_name,
              role
            ),
            verifier:profiles!verified_by (
              id,
              full_name,
              role
            )
          `
          )
          .eq('verified', false)
          .order('created_at', { ascending: false })

        if (!isMounted) return
        if (error) throw error

        const list = data || []
        setUnverifiedNotes(list)

        if (user && list.length > 0) {
          const ids = list.map((n) => n.id)
          const { data: votesData } = await supabase
            .from('votes')
            .select('note_id, value')
            .in('note_id', ids)
            .eq('user_id', user.id)

          if (!isMounted) return
          const map = {}
          votesData?.forEach((v) => {
            map[v.note_id] = v.value
          })
          setUnverifiedVotes(map)
        }
      } catch (err) {
        if (isMounted) {
          console.error('[Review] Failed to load unverified notes:', err)
          showError(err.message || 'Failed to load unverified queue.')
        }
      } finally {
        if (isMounted) setLoadingUnverified(false)
      }

      // 2. Fetch reported / needs review notes
      try {
        const { data: repData, error: repError } = await supabase
          .from('notes_reported_queue')
          .select('*')

        if (!isMounted) return
        if (repError) throw repError
        setReportedNotes(repData || [])
      } catch (err) {
        if (isMounted) {
          console.error('[Review] Failed to load reported notes:', err)
          showError(err.message || 'Failed to load reported notes queue.')
        }
      } finally {
        if (isMounted) setLoadingReported(false)
      }
    }

    loadAllQueues()

    return () => {
      isMounted = false
    }
  }, [user, refreshTrigger, showError])

  // Action: Dismiss open reports for a note
  const handleDismissReports = async (noteId) => {
    setActionInProgress(true)
    try {
      const { data, error } = await supabase.rpc('dismiss_reports_for_note', {
        p_note_id: noteId,
      })
      if (error) throw error

      showSuccess(`Dismissed ${data.resolved_count || ''} report(s).`)
      setRefreshTrigger((k) => k + 1)
    } catch (err) {
      console.error('[Dismiss Reports Error]', err)
      showError(err.message || 'Failed to dismiss reports.')
    } finally {
      setActionInProgress(false)
    }
  }

  // Action: Toggle verification on reported note
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
      setRefreshTrigger((k) => k + 1)
    } catch (err) {
      console.error('[Verify Toggle Error]', err)
      showError(err.message || 'Failed to update verification.')
    } finally {
      setActionInProgress(false)
    }
  }

  // Action: Permanently delete note & clean up storage file
  const handleConfirmDelete = async () => {
    if (!deletingNote) return

    setActionInProgress(true)
    try {
      const { data, error } = await supabase.rpc('teacher_delete_note', {
        p_note_id: deletingNote.id,
      })
      if (error) throw error

      const fileUrl = data.file_url || deletingNote.file_url
      if (fileUrl && fileUrl.includes('/notes-files/')) {
        const parts = fileUrl.split('/notes-files/')
        if (parts.length > 1) {
          const storagePath = decodeURIComponent(parts[1])
          await supabase.storage.from('notes-files').remove([storagePath])
        }
      }

      showSuccess('Note and associated storage files deleted permanently.')
      setDeletingNote(null)
      setRefreshTrigger((k) => k + 1)
    } catch (err) {
      console.error('[Delete Note Error]', err)
      showError(err.message || 'Failed to delete note.')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 min-h-screen">
      {/* Header Banner */}
      <div className="bg-white rounded-[24px] border border-black/10 p-6 sm:p-10 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black text-white">
                Faculty Portal
              </span>
              <span className="text-xs text-black/50 font-medium">Teacher-Only Access</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl text-black uppercase tracking-tight">
              CURRICULUM REVIEW QUEUE
            </h1>
            <p className="text-xs sm:text-sm text-black/60 mt-1.5 max-w-xl">
              Inspect student submissions for syllabus accuracy, certify high quality
              materials, and resolve community-flagged issues.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshTrigger((k) => k + 1)}
            disabled={actionInProgress}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold text-black bg-[#F0EEED] hover:bg-[#E8E5E4] px-4 py-2 rounded-full border border-black/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Tab Switcher Pills */}
        <div className="mt-8 flex p-1 rounded-full bg-[#F0EEED] max-w-md border border-black/5">
          <button
            type="button"
            onClick={() => setActiveTab('unverified')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'unverified'
                ? 'bg-black text-white shadow-xs'
                : 'text-black/60 hover:text-black'
            }`}
          >
            <span>Unverified Notes</span>
            <span
              className={`text-[10px] px-2 py-0.2 rounded-full ${
                activeTab === 'unverified'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/10 text-black'
              }`}
            >
              {unverifiedNotes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reported')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reported'
                ? 'bg-black text-white shadow-xs'
                : 'text-black/60 hover:text-black'
            }`}
          >
            <span>Needs Review</span>
            {reportedNotes.length > 0 && (
              <span className="bg-[#FF3333] text-white text-[10px] px-2 py-0.2 rounded-full font-bold">
                {reportedNotes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: UNVERIFIED NOTES GRID                                         */}
      {/* ==================================================================== */}
      {activeTab === 'unverified' && (
        <div>
          {loadingUnverified ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <NoteCardSkeleton />
              <NoteCardSkeleton />
              <NoteCardSkeleton />
              <NoteCardSkeleton />
            </div>
          ) : unverifiedNotes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {unverifiedNotes.map((note) => (
                <div key={note.id} className="flex flex-col">
                  <NoteCard
                    note={note}
                    userVote={unverifiedVotes[note.id] || 0}
                    onVoteChange={(newScore) => {
                      setUnverifiedNotes((prev) =>
                        prev.map((n) =>
                          n.id === note.id ? { ...n, score: newScore } : n
                        )
                      )
                    }}
                  />
                  {/* Quick Verify Action under Card */}
                  <div className="mt-2">
                    <Button
                      variant="black"
                      size="sm"
                      onClick={() => handleToggleVerified(note.id, false)}
                      disabled={actionInProgress || note.uploaded_by === user?.id}
                      className="w-full text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#01AB31]" />
                      <span>Verify & Rank Top</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#F0EEED] rounded-[24px] p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#01AB31] mx-auto mb-3" />
              <h3 className="font-display text-xl text-black uppercase">
                Queue Clean
              </h3>
              <p className="text-sm text-black/60 mt-1">
                All submitted study notes have been reviewed by faculty!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: REPORTED / NEEDS REVIEW QUEUE                                 */}
      {/* ==================================================================== */}
      {activeTab === 'reported' && (
        <div>
          {loadingReported ? (
            <div className="space-y-4">
              <div className="h-28 bg-[#F0EEED] rounded-[20px] animate-pulse" />
              <div className="h-28 bg-[#F0EEED] rounded-[20px] animate-pulse" />
            </div>
          ) : reportedNotes.length > 0 ? (
            <div className="space-y-4">
              {reportedNotes.map((note) => {
                const isAutoFlagged = note.score <= -3
                return (
                  <div
                    key={note.id}
                    className="bg-white rounded-[20px] border border-black/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-black/30 transition-colors shadow-2xs"
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
                            <span>Auto-Flagged (Negative Score: {note.score})</span>
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
                        className="font-display text-lg text-black uppercase hover:underline block leading-snug"
                      >
                        {note.title}
                      </Link>

                      {note.recent_report_reason && (
                        <p className="text-xs text-[#FF3333] font-semibold">
                          Reason: {note.recent_report_reason}
                          {note.recent_report_details && (
                            <span className="text-black/60 font-normal">
                              {' '}
                              — &ldquo;{note.recent_report_details}&rdquo;
                            </span>
                          )}
                        </p>
                      )}

                      <div className="text-xs text-black/50">
                        Uploaded by {note.uploader_name || 'Student'} •{' '}
                        {formatRelativeDate(note.created_at)}
                      </div>
                    </div>

                    {/* Actions */}
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
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>{note.verified ? 'Un-verify' : 'Verify'}</span>
                      </Button>

                      {note.open_reports_count > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissReports(note.id)}
                          disabled={actionInProgress}
                          className="text-black/60 hover:text-black"
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
            <div className="bg-[#F0EEED] rounded-[24px] p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#01AB31] mx-auto mb-3" />
              <h3 className="font-display text-xl text-black uppercase">
                Zero Pending Reports
              </h3>
              <p className="text-sm text-black/60 mt-1">
                No materials have been flagged for review.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !actionInProgress && setDeletingNote(null)}
          />

          <div className="relative bg-white rounded-[24px] max-w-md w-full p-6 sm:p-8 z-10 border border-black/10 shadow-2xl text-left">
            <h3 className="font-display text-xl text-[#FF3333] uppercase">
              Delete Study Note
            </h3>
            <p className="text-xs text-black/60 mt-2 leading-relaxed">
              Are you sure you want to permanently delete &ldquo;
              <strong>{deletingNote.title}</strong>&rdquo;? This will remove the
              file from storage and all student votes. This action cannot be
              undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingNote(null)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={actionInProgress}
              >
                {actionInProgress ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
