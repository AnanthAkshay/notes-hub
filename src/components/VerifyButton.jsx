import { useState } from 'react'
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Button from './ui/Button'

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
        className="inline-block text-[11px] text-black/40 font-semibold px-2.5 py-1 rounded-full bg-[#F0EEED] cursor-not-allowed select-none"
        title="Faculty cannot verify their own uploaded materials"
      >
        Self-authored
      </span>
    )
  }

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      {!showConfirm ? (
        <Button
          variant={verified ? 'outline' : 'black'}
          size={size}
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          title={verified ? 'Un-verify this note' : 'Verify this note as syllabus-accurate'}
        >
          {verified ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#01AB31]" />
              <span>Verified ✓</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFC633]" />
              <span>Verify Note</span>
            </>
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 p-1 bg-[#F0EEED] rounded-full border border-black/10 animate-in fade-in zoom-in-95 duration-100">
          <span className="text-[11px] font-semibold text-black px-2">
            {verified ? 'Un-verify?' : 'Verify note?'}
          </span>
          <Button
            variant="black"
            size="sm"
            onClick={handleToggleVerification}
            disabled={loading}
            className="text-[11px] px-3 py-1"
          >
            {loading ? '...' : 'Yes'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(false)}
            className="text-[11px] px-2.5 py-1"
          >
            Cancel
          </Button>
        </div>
      )}

      {error && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#FF3333] text-white text-[11px] px-3 py-1 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
