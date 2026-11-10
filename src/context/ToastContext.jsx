import { useState, useCallback } from 'react'
import { ToastContext } from './toastContextDef'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, message, type }])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const showSuccess = useCallback(
    (msg, duration) => addToast(msg, 'success', duration),
    [addToast]
  )
  const showError = useCallback(
    (msg, duration) => addToast(msg, 'error', duration),
    [addToast]
  )
  const showInfo = useCallback(
    (msg, duration) => addToast(msg, 'info', duration),
    [addToast]
  )

  const value = {
    addToast,
    showSuccess,
    showError,
    showInfo,
    removeToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900/95 text-rose-100 border-rose-700'
                : 'bg-slate-900/95 text-slate-100 border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span>
                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠' : 'ℹ'}
              </span>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-xs opacity-70 hover:opacity-100 p-1"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

