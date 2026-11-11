import { useState } from 'react'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { isTeacherRole } from '../lib/authHelpers'
import Button from './ui/Button'
import ConfirmModal from './ui/ConfirmModal'
import { VerifiedSealIcon } from './icons/ArchiveIcons'

export default function VerifyButton({
  noteId,
  verified = false,
  uploadedBy,
  onVerificationChange,
  size = 'sm',
}) {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  if (!user || !isTeacherRole(profile?.role)) {
    return null
  }

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
      setShowConfirm(false)
      setError(
        err.message?.includes('Self-verification')
          ? 'You cannot verify your own note.'
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
        className="inline-block text-[11px] text-[var(--text-subtle)] font-mono-meta px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] cursor-not-allowed select-none"
        title="Faculty cannot verify their own uploaded materials"
      >
        Self-authored
      </span>
    )
  }

  return (
    <div
      className="relative inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      data-no-print
    >
      <Button
        variant={verified ? 'outline' : 'black'}
        size={size}
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        title={verified ? 'Revoke faculty verification' : 'Certify note as syllabus-accurate'}
      >
        {verified ? (
          <>
            <VerifiedSealIcon className="w-4 h-4 text-[var(--accent-verified)]" />
            <span>Verified</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-[var(--accent-amber)]" />
            <span>Verify Note</span>
          </>
        )}
      </Button>

      <ConfirmModal
        open={showConfirm}
        title={verified ? 'Revoke Faculty Verification?' : 'Verify Study Note?'}
        description={
          verified
            ? 'This will remove the Faculty Verified seal and return the note to normal community ranking.'
            : 'Certifying confirms this note matches syllabus standards and places it at the top of the feed.'
        }
        confirmLabel={verified ? 'Remove Verification' : 'Verify Note'}
        confirmVariant={verified ? 'danger' : 'black'}
        loading={loading}
        onConfirm={handleToggleVerification}
        onCancel={() => setShowConfirm(false)}
      />

      {error && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-[var(--accent-danger)] text-white text-[11px] px-3 py-1 rounded-[4px] whitespace-nowrap flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
