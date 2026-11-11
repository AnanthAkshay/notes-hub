import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Flag, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import Button from './ui/Button'

export default function ReportButton({ noteId, noteTitle, uploadedBy, size = 'sm' }) {
  const { user } = useAuth()
  const { showSuccess, showError, showInfo } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('incorrect')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape' && !submitting) setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, submitting])

  if (user && user.id === uploadedBy) {
    return null
  }

  const handleOpen = () => {
    if (!user) {
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 3500)
      return
    }
    setIsOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error } = await supabase.from('reports').insert({
        note_id: noteId,
        reported_by: user.id,
        reason,
        details: details.trim() ? details.trim().slice(0, 300) : null,
      })

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          showInfo('You have already submitted a report for this note. Faculty will review it.')
          setIsOpen(false)
          return
        }
        throw error
      }

      showSuccess('Thanks! A faculty member will review this note.')
      setIsOpen(false)
      setDetails('')
      setReason('incorrect')
    } catch (err) {
      console.error('[Report Error]', err)
      showError(err.message || 'Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
      data-no-print
    >
      <Button
        variant="ghost"
        size={size}
        onClick={handleOpen}
        title="Report issue with this note"
        className="text-[var(--text-muted)] hover:text-[var(--text-ink)]"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>Report</span>
      </Button>

      {showLoginPrompt && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-xs px-3 py-1.5 rounded-[6px] border border-[var(--border-strong)] whitespace-nowrap flex items-center gap-2">
          <span>Sign in to report</span>
          <Link
            to="/login"
            className="underline font-semibold text-[var(--accent-amber)]"
            onClick={(e) => e.stopPropagation()}
          >
            Log In
          </Link>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/55 transition-opacity"
            onClick={() => !submitting && setIsOpen(false)}
          />

          <div
            className="relative bg-[var(--bg-elevated)] rounded-[8px] max-w-md w-full p-6 z-10 border border-[var(--border-strong)] text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-[4px] bg-[var(--accent-danger-bg)] text-[var(--accent-danger)]">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h3
                  id="report-modal-title"
                  className="font-display text-lg text-[var(--text-ink)]"
                >
                  Report Study Note
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={submitting}
                aria-label="Close report dialog"
                className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 line-clamp-1 font-medium">
              Note: &ldquo;{noteTitle}&rdquo;
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="report-reason"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
                >
                  Reason
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-xs font-medium rounded-[6px] px-3 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] cursor-pointer"
                >
                  <option value="incorrect">Incorrect Information / Calculation Errors</option>
                  <option value="incomplete">Incomplete Notes / Missing Pages</option>
                  <option value="duplicate">Duplicate of an Existing Note</option>
                  <option value="inappropriate">Inappropriate or Plagiarized Content</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="report-details"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
                >
                  Details <span className="font-normal text-[var(--text-subtle)] lowercase">(optional, max 300)</span>
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder="Describe the error or missing page..."
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-xs rounded-[6px] p-3 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] resize-none"
                />
                <div className="text-right font-mono-meta text-[10px] text-[var(--text-subtle)] mt-1">
                  {details.length}/300
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
