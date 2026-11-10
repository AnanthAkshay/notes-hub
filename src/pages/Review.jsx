import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import NoteCard from '../components/NoteCard'
import { formatRelativeDate } from '../lib/formatDate'

export default function Review() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  // Tabs: 'unverified' or 'reported'
  const [activeTab, setActiveTab] = useState('unverified')

  // Unverified queue state
  const [unverifiedNotes, setUnverifiedNotes] = useState([])
  const [unverifiedVotes, setUnverifiedVotes] = useState({})
  const [loadingUnverified, setLoadingUnverified] = useState(true)

  // Reported / Needs Review queue state
  const [reportedNotes, setReportedNotes] = useState([])
  const [loadingReported, setLoadingReported] = useState(true)

  // Action states
  const [deletingNote, setDeletingNote] = useState(null) // note object to delete
  const [actionInProgress, setActionInProgress] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load both queues asynchronously when tab, user, or refresh key changes
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
      // 1. Delete from database via RPC (cascades to votes & reports)
      const { data, error } = await supabase.rpc('teacher_delete_note', {
        p_note_id: deletingNote.id,
      })
      if (error) throw error

      // 2. Clean up file from Supabase storage if hosted in "notes-files"
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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-purple-100 text-purple-800 border border-purple-200">
                Faculty Portal
              </span>
              <span className="text-xs text-gray-500">Teacher-Only Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Curriculum Review & Moderation Queue
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review unverified submissions and investigate community-flagged notes.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setActiveTab('unverified')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
              activeTab === 'unverified'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
            }`}
          >
            <span>Unverified Notes</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'unverified'
                  ? 'bg-blue-800 text-blue-100'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {unverifiedNotes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reported')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
              activeTab === 'reported'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
            }`}
          >
            <span>Reported / Needs Review</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'reported'
                  ? 'bg-rose-800 text-rose-100'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {reportedNotes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Unverified Notes Queue */}
      {activeTab === 'unverified' && (
        <div>
          {loadingUnverified ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((placeholder) => (
                <div
                  key={placeholder}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs animate-pulse h-56"
                >
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3.5 bg-gray-100 rounded w-full mb-2"></div>
                  <div className="h-3.5 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : unverifiedNotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                All Submissions Reviewed!
              </h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                There are no pending unverified notes awaiting review.
              </p>
              <Link
                to="/"
                className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                Browse Verified Feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unverifiedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  userVote={unverifiedVotes[note.id] || 0}
                  onVerificationChange={() => setRefreshTrigger((k) => k + 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reported / Needs Review Queue */}
      {activeTab === 'reported' && (
        <div>
          {loadingReported ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs animate-pulse h-40"
                ></div>
              ))}
            </div>
          ) : reportedNotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No Flagged Notes!
              </h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                No notes have open reports or critical low scores. Community moderation is clear.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {reportedNotes.map((note) => (
                <div
                  key={note.id}
                  className={`bg-white rounded-2xl border shadow-xs p-6 transition-all ${
                    note.needs_review
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-amber-200'
                  }`}
                >
                  {/* Card Header & Status Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {note.subject}
                      </span>
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                        {note.semester}
                      </span>
                      {note.verified && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    {/* Needs Review Alert Badge */}
                    <div className="flex items-center space-x-2">
                      {note.needs_review && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1 animate-pulse">
                          <span>⚠</span>
                          <span>Needs Immediate Review</span>
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        Score: {note.score}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-lg font-bold text-gray-900 mb-1">
                    {note.title}
                  </h2>
                  <p className="text-sm text-gray-600 mb-3">
                    {note.description || (
                      <span className="italic text-gray-400">No description.</span>
                    )}
                  </p>

                  <div className="text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                    <span>Uploaded by: <span className="font-semibold text-gray-700">{note.uploader_name || 'Student'}</span></span>
                    <span>Uploaded {formatRelativeDate(note.created_at)}</span>
                  </div>

                  {/* Open Reports List */}
                  {note.open_reports && note.open_reports.length > 0 && (
                    <div className="mb-5 bg-rose-50/60 rounded-xl p-4 border border-rose-200">
                      <p className="text-xs font-bold text-rose-900 mb-2 flex items-center space-x-1.5">
                        <span>🚩</span>
                        <span>Open Reports ({note.open_reports.length}):</span>
                      </p>
                      <ul className="space-y-2 text-xs text-gray-700">
                        {note.open_reports.map((report) => (
                          <li
                            key={report.id}
                            className="bg-white/90 p-2.5 rounded-lg border border-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                          >
                            <div>
                              <span className="font-semibold capitalize text-rose-800">
                                {report.reason}:
                              </span>{' '}
                              <span>{report.details || 'No additional details.'}</span>
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                              {formatRelativeDate(report.created_at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Teacher Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <a
                      href={note.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors border border-blue-200"
                    >
                      Inspect File ↗
                    </a>

                    <div className="flex items-center space-x-2">
                      {/* Dismiss Reports */}
                      {note.open_report_count > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDismissReports(note.id)}
                          disabled={actionInProgress}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          Dismiss Reports
                        </button>
                      )}

                      {/* Toggle Verification */}
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(note.id, note.verified)}
                        disabled={actionInProgress}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                          note.verified
                            ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        {note.verified ? 'Remove Verification' : 'Verify Note'}
                      </button>

                      {/* Delete Note */}
                      <button
                        type="button"
                        onClick={() => setDeletingNote(note)}
                        disabled={actionInProgress}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Delete Note
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6 text-left">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold mb-3">
              ⚠
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Delete Note Permanently?
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-gray-800">
                &ldquo;{deletingNote.title}&rdquo;
              </span>
              ? This removes the note, its attached storage file, votes, and reports. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeletingNote(null)}
                disabled={actionInProgress}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionInProgress}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {actionInProgress ? 'Deleting...' : 'Yes, Delete Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
