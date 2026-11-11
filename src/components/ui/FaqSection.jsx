import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'Who can sign in and upload study materials?',
    answer:
      'Students listed in the institutional ISE roster can sign in using their USN (converted automatically to @msrit.edu) and a 6-digit email verification code. Faculty teachers and admins are approved through the staff allowlist.',
  },
  {
    question: 'How does ranking work across the archive?',
    answer:
      'By default, the feed uses a three-tier deterministic order: Faculty Verified notes always rank first, followed by highest community vote score, and then newest upload timestamp.',
  },
  {
    question: 'What prevents vote manipulation or double counting?',
    answer:
      'All votes pass through the cast_vote database RPC with a per-note row lock and a self-healing database trigger that recalculates score directly from individual user votes. Authors cannot vote on their own notes.',
  },
  {
    question: 'What file types and sizes are accepted?',
    answer:
      'Direct uploads support PDF, PNG, and JPG/JPEG files up to 10 MB. Larger study packs or multi-file folders can be attached as an external HTTPS link such as Google Drive.',
  },
  {
    question: 'When is a note flagged for faculty review?',
    answer:
      'Any note that accumulates 3 or more peer reports or drops to a community score of -3 or below is automatically surfaced in the teacher-only moderation queue.',
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[var(--border-hairline)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-4 space-y-3">
          <span className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[var(--text-subtle)] block">
            Archive Guidelines
          </span>
          <h2 className="font-display text-2xl sm:text-3xl text-[var(--text-ink)] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            How institutional access, faculty certification, and peer voting keep the repository reliable.
          </p>
        </div>

        <div className="lg:col-span-8 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div key={item.question} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left py-1 cursor-pointer group"
                >
                  <span className="font-semibold text-sm sm:text-base text-[var(--text-ink)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2.5 pr-6 text-sm text-[var(--text-muted)] leading-relaxed">
                    {item.answer}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

