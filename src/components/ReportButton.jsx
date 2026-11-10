import { useState } from 'react'
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
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size={size}
        onClick={handleOpen}
        title="Report issue with this note"
        className="text-black/60 hover:text-black hover:bg-[#F0EEED]"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>Report</span>
      </Button>

      {/* Login Prompt Tooltip */}
      {showLoginPrompt && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5">
          <span>Sign in to report</span>
          <Link
            to="/login"
            className="underline font-bold text-[#FFC633]"
            onClick={(e) => e.stopPropagation()}
          >
            Log In
          </Link>
        </div>
      )}

      {/* Modal Backdrop and Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !submitting && setIsOpen(false)}
          />

          <div
            className="relative bg-white rounded-[24px] shadow-2xl max-w-md w-full p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-150 border border-black/10 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-full bg-[#FF3333]/10 text-[#FF3333]">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h3 className="font-display text-lg text-black uppercase tracking-tight">
                  Report Note
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={submitting}
                className="p-1.5 rounded-full text-black/50 hover:text-black hover:bg-[#F0EEED] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-black/60 mt-3 line-clamp-1 font-medium">
              Note: &ldquo;{noteTitle}&rdquo;
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                  Reason for report
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#F0EEED] text-black text-xs font-semibold rounded-full px-4 py-2.5 border border-black/10 focus:outline-none focus:border-black cursor-pointer"
                >
                  <option value="incorrect">Incorrect Information / Calculation Errors</option>
                  <option value="incomplete">Incomplete Notes / Missing Pages</option>
                  <option value="duplicate">Duplicate of an Existing Note</option>
                  <option value="inappropriate">Inappropriate or Plagiarized Content</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                  Additional Details <span className="font-normal text-black/40 lowercase">(optional, max 300)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Specify page numbers or explain the inaccuracy..."
                  className="w-full bg-[#F0EEED] text-black text-xs rounded-2xl p-3.5 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white resize-none transition-all"
                />
                <div className="text-[10px] text-black/40 text-right mt-1">
                  {details.length}/300
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="black"
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
