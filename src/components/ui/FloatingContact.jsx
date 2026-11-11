import { useState, useEffect } from 'react'
import { MessageSquare, X, CheckCircle2 } from 'lucide-react'
import Button from './Button'

export default function FloatingContact() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('Access / Roster Inquiry')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanEmail = email.trim()
    const cleanMsg = message.trim()

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid college or contact email.')
      return
    }
    if (cleanMsg.length < 10) {
      setError('Please include at least 10 characters describing your question.')
      return
    }

    setError('')
    setSubmitted(true)
  }

  const handleReset = () => {
    setSubmitted(false)
    setMessage('')
    setError('')
    setOpen(false)
  }

  return (
    <div data-no-print>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open department support contact"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[6px] bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-xs font-medium border border-transparent transition-all duration-150 cursor-pointer hover:opacity-90 active:scale-[0.98]"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Help & Contact</span>
      </button>

      {open && (
        <div
          className="fixed bottom-16 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-dialog-title"
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-hairline)]">
            <div>
              <h3 id="contact-dialog-title" className="font-display text-lg text-[var(--text-ink)]">
                Archive Support
              </h3>
              <p className="text-[11px] text-[var(--text-subtle)]">
                Roster requests, broken PDFs, or faculty onboarding
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close contact dialog"
              className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-[6px] bg-[var(--accent-verified-bg)] border border-[var(--accent-verified)]/30 flex items-start gap-2.5 text-xs text-[var(--accent-verified)]">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Message prepared for coordinator review.</p>
                  <p className="mt-1 text-[var(--text-muted)]">
                    Topic: {topic}. For urgent faculty access, contact your department Notes Hub administrator.
                  </p>
                </div>
              </div>
              <Button variant="black" size="sm" onClick={handleReset} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-2.5 rounded-[6px] bg-[var(--accent-danger-bg)] border border-[var(--accent-danger)]/30 text-xs text-[var(--accent-danger)] font-medium">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1"
                >
                  Your Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="1ms24is013@msrit.edu"
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-xs rounded-[6px] px-3 py-2 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)]"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-topic"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1"
                >
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-xs rounded-[6px] px-3 py-2 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)]"
                >
                  <option value="Access / Roster Inquiry">Access / Roster Inquiry</option>
                  <option value="Faculty Verification">Faculty Verification</option>
                  <option value="Report Broken Link">Report Broken Link</option>
                  <option value="General Feedback">General Feedback</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share details, USN, or note title..."
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-xs rounded-[6px] px-3 py-2 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] resize-none"
                />
              </div>

              <Button type="submit" variant="black" size="sm" className="w-full">
                Send Inquiry
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

