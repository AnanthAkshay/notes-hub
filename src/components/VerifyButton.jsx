import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function VerifyButton({
  noteId,
  verified = false,
  uploadedBy,
  onVerificationChange,
}) {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  // 1. Security & Visibility: Visible ONLY to faculty with role === 'teacher'
  if (!user || profile?.role !== 'teacher') {
    return null
  }

  // 2. Prevent teacher from verifying their own note
  const isOwnNote = user.id === uploadedBy

  const handleToggleVerification = async () => {
    setLoading(true)
    setError('')

    try {
      const nextStatus = !verified
      const { data, error: rpcError } = await supabase.rpc('set_note_verified', {
        p_note_id: noteId,
        p_verified: nextStatus,
      })

      if (rpcError) throw rpcError

      setShowConfirm(false)
      onVerificationChange?.(data)
    } catch (err) {
      console.error('[Verify Error]', err)
      setError(
        err.message?.includes('Self-verification')
          ? "You cannot verify your own note."
          : err.message || 'Verification update failed.'
      )
      setTimeout(() => setError(''), 3500)
    } finally {
      setLoading(false)
    }
  }

  if (isOwnNote) {
    return (
      <span
        className="inline-block text-[11px] text-gray-400 font-medium px-2 py-1 rounded bg-gray-100 cursor-not-allowed select-none"
        title="You cannot verify notes that you uploaded yourself"
      >
        Self-authored
      </span>
    )
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Verify / Remove Verification Trigger Button */}
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => {
            setError('')
            setShowConfirm(true)
          }}
          disabled={loading}
          aria-label={verified ? 'Remove note verification' : 'Verify note'}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1 ${
            verified
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
          } shadow-2xs`}
        >
          <span>{verified ? '✕' : '✓'}</span>
          <span>{verified ? 'Unverify' : 'Verify'}</span>
        </button>
      ) : (
        /* Confirmation Bubble */
        <div className="absolute right-0 bottom-full mb-2 z-30 w-56 p-3 bg-white rounded-xl shadow-lg border border-gray-200 text-left animate-fade-in">
          <p className="text-xs font-bold text-gray-800 mb-1">
            {verified ? 'Revoke Verification?' : 'Verify this Note?'}
          </p>
          <p className="text-[11px] text-gray-500 mb-2.5 leading-snug">
            {verified
              ? 'Remove faculty verified badge from this note?'
              : 'Confirm this note adheres to department curriculum standards.'}
          </p>
          <div className="flex items-center justify-end space-x-1.5">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleToggleVerification}
              disabled={loading}
              className={`px-2.5 py-1 text-[11px] font-semibold text-white rounded transition-colors shadow-2xs ${
                verified
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? 'Updating...' : verified ? 'Yes, Unverify' : 'Yes, Verify'}
            </button>
          </div>
        </div>
      )}

      {/* Error Tooltip */}
      {error && (
        <div className="absolute right-0 bottom-full mb-2 z-40 whitespace-nowrap px-2.5 py-1 bg-rose-900 text-rose-100 text-[11px] rounded shadow-md animate-fade-in">
          {error}
        </div>
      )}
    </div>
  )
}

