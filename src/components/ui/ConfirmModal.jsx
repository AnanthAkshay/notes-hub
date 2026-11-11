import { useEffect } from 'react'
import Button from './Button'

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      data-no-print
    >
      <div
        className="fixed inset-0 bg-black/55 transition-opacity"
        onClick={() => !loading && onCancel?.()}
      />
      <div className="relative z-10 w-full max-w-md rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-6 text-left">
        <h3
          id="confirm-modal-title"
          className={`font-display text-xl ${
            confirmVariant === 'danger'
              ? 'text-[var(--accent-danger)]'
              : 'text-[var(--text-ink)]'
          }`}
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

