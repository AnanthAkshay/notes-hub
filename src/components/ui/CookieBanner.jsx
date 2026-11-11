import { useState } from 'react'
import Button from './Button'

const CONSENT_KEY = 'notes_hub_cookie_consent'

export default function CookieBanner() {
  const [accepted, setAccepted] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return (
        window.localStorage.getItem(CONSENT_KEY) === 'accepted' ||
        document.cookie.includes('notes_hub_consent=1')
      )
    } catch {
      return false
    }
  })

  if (accepted) return null

  const handleAccept = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, 'accepted')
      document.cookie = 'notes_hub_consent=1; path=/; max-age=31536000; SameSite=Lax'
    } catch {
      // Ignore storage failures
    }
    setAccepted(true)
  }

  return (
    <aside
      aria-label="Storage and cookie notice"
      data-no-print
      className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        Notes Hub uses essential local storage only for your login session, theme, and cached notes feed. Zero third-party tracking cookies.
      </p>
      <Button
        variant="black"
        size="sm"
        onClick={handleAccept}
        className="shrink-0 self-end sm:self-center"
      >
        Got it
      </Button>
    </aside>
  )
}

