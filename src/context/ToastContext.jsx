import { useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
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

      {/* Floating Black Rounded Pill Toasts Container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between px-4 py-3 rounded-full bg-black text-white shadow-xl border border-white/20 text-xs sm:text-sm font-medium animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              {toast.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-[#01AB31] shrink-0" />
              )}
              {toast.type === 'error' && (
                <AlertTriangle className="w-4 h-4 text-[#FF3333] shrink-0" />
              )}
              {toast.type === 'info' && (
                <Info className="w-4 h-4 text-[#FFC633] shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
