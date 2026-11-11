import { useState } from 'react'
import { X } from 'lucide-react'

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('notes_hub_announcement_dismissed') === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem('notes_hub_announcement_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div
      className="bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-xs py-2 px-4 relative flex items-center justify-center font-medium z-40"
      data-no-print
    >
      <p className="text-center pr-8 sm:pr-0">
        <span>Notes verified by faculty. </span>
        <span className="opacity-75 hidden sm:inline">
          Sign in with your college USN or approved staff email via 6-digit OTP.
        </span>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-1 opacity-75 hover:opacity-100 transition-opacity cursor-pointer rounded-[4px]"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
