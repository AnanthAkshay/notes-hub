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
    <div className="bg-black text-white text-xs sm:text-sm py-2.5 px-4 relative flex items-center justify-center font-medium z-50">
      <p className="text-center pr-8 sm:pr-0">
        <span>Notes verified by faculty. </span>
        <span className="text-white/70 hidden xs:inline">
          Log in with your college email/USN to vote.
        </span>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
