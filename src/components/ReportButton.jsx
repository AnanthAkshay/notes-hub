import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function ReportButton({ noteId, noteTitle, uploadedBy }) {
  const { user } = useAuth()
  const { showSuccess, showError, showInfo } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('incorrect')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 1. Guard: The author cannot report their own note
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
        // Unique constraint violation (23505): User already reported this note
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
    <div className="relative inline-flex items-center">
      {/* Report Flag Button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Report note"
        title="Report issue with this note"
        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
      >
        <svg
          className="w-3.5 h-3.5 fill-current"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Login Prompt Popover */}
      {showLoginPrompt && (
        <div className="absolute right-0 bottom-full mb-1.5 z-30 w-44 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg text-center animate-fade-in">
          <span>Please </span>
          <Link
            to="/login"
            className="text-blue-300 font-semibold underline hover:text-blue-200"
          >
            log in to report
          </Link>
          <span> notes.</span>
        </div>
      )}

      {/* Report Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-md bg-rose-50 text-rose-600 text-sm font-bold">
                  🚩
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  Report Study Material
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
                aria-label="Close report modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 line-clamp-1">
              Note: <span className="font-semibold text-gray-700">{noteTitle}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reason */}
              <div>
                <label
                  htmlFor="reportReason"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Primary Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  id="reportReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="incorrect">Inaccurate or incorrect content</option>
                  <option value="incomplete">Incomplete notes / missing modules</option>
                  <option value="duplicate">Duplicate upload</option>
                  <option value="inappropriate">Inappropriate / off-topic content</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              {/* Additional Details */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="reportDetails"
                    className="block text-xs font-semibold text-gray-700"
                  >
                    Additional Details <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-gray-400">
                    {details.length} / 300
                  </span>
                </div>
                <textarea
                  id="reportDetails"
                  rows={3}
                  maxLength={300}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Specify incorrect formulas, unit numbers, or missing chapters..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <span>Submitting report...</span>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

