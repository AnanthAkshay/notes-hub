import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { SUBJECTS, getSubjectMeta } from '../lib/constants'
import { fetchHomeFeed } from '../lib/notesApi'
import { updateNoteVoteInCache } from '../lib/queryClient'
import Button from '../components/ui/Button'
import StatBlock from '../components/ui/StatBlock'
import SectionHeading from '../components/ui/SectionHeading'
import Marquee from '../components/ui/Marquee'
import NoteCard from '../components/NoteCard'
import { NoteCardSkeleton } from '../components/ui/Skeleton'
import HeroIllustration from '../components/HeroIllustration'
import FaqSection from '../components/ui/FaqSection'
import { VerifiedSealIcon } from '../components/icons/ArchiveIcons'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery({
    queryKey: ['home-feed', user?.id || 'anon'],
    queryFn: fetchHomeFeed,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const stats = data?.stats || {
    notesCount: 0,
    verifiedCount: 0,
    studentsCount: 0,
  }
  const topVerifiedNotes = data?.topVerifiedNotes || []
  const newestNotes = data?.newestNotes || []

  const handleVoteChange = (noteId, newScore, newUserVote) => {
    updateNoteVoteInCache(queryClient, noteId, newScore, newUserVote)
  }

  const formatStat = (num) => {
    if (!num || num <= 0) return '0'
    return `${num}+`
  }

  return (
    <div className="bg-[var(--bg-canvas)]">
      {/* 1. ASYMMETRIC EDITORIAL HERO */}
      <section className="bg-[var(--bg-elevated)] pt-10 pb-14 sm:pt-16 sm:pb-20 border-b border-[var(--border-hairline)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="font-mono-meta text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-subtle)] block">
                ISE Departmental Study Repository · Free Academic Archive
              </span>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-[var(--text-ink)] tracking-tight leading-[1.03]">
                Lecture notes reviewed by peers, certified by faculty.
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-xl leading-relaxed">
                Explore syllabus-aligned handwritten summaries, solved past exam papers, and lab guides ranked by verification status and peer votes.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link to="/notes">
                  <Button variant="black" size="lg">
                    <span>Browse All Notes</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/upload">
                  <Button variant="outline" size="lg">
                    <span>Submit Notes</span>
                  </Button>
                </Link>
              </div>

              <div className="pt-6 border-t border-[var(--border-hairline)] flex flex-wrap items-center gap-6 sm:gap-8">
                <StatBlock
                  value={formatStat(stats.notesCount)}
                  label="Study Notes"
                />
                <StatBlock
                  value={formatStat(stats.verifiedCount)}
                  label="Faculty Verified"
                />
                <StatBlock
                  value={formatStat(stats.studentsCount)}
                  label="Contributors"
                  isLast
                />
              </div>
            </div>

            <div className="lg:col-span-5">
              <HeroIllustration
                featuredNote={topVerifiedNotes[0] || newestNotes[0] || null}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATIC SUBJECT CATALOG STRIP */}
      <Marquee items={SUBJECTS} />

      {/* 3. TOP VERIFIED NOTES (Asymmetric Lead Card + Grid) */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[var(--border-hairline)]">
        <SectionHeading
          kicker="Faculty Endorsed"
          title="Top Verified Notes"
          subtitle="Highest-ranked study guides inspected and certified by department professors."
          action={
            <Link to="/notes?verified_only=true">
              <Button variant="outline" size="sm">
                <span>View All Verified</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
          </div>
        ) : topVerifiedNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topVerifiedNotes.map((note, idx) => (
              <NoteCard
                key={note.id}
                note={note}
                userVote={note.my_vote || 0}
                onVoteChange={handleVoteChange}
                featured={idx === 0 && topVerifiedNotes.length >= 2}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-10 text-center text-[var(--text-muted)]">
            <VerifiedSealIcon className="w-8 h-8 mx-auto text-[var(--accent-verified)] mb-3" />
            <p className="font-semibold text-[var(--text-ink)]">No verified notes yet.</p>
            <p className="text-sm mt-1">Faculty are reviewing submissions in the queue.</p>
          </div>
        )}
      </section>

      {/* 4. NEWEST UPLOADS */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[var(--border-hairline)]">
        <SectionHeading
          kicker="Recent Additions"
          title="Newest Uploads"
          subtitle="Fresh summaries and past-paper solutions shared by your cohort."
          action={
            <Link to="/notes?sort=newest">
              <Button variant="outline" size="sm">
                <span>Browse Latest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
          </div>
        ) : newestNotes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {newestNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                userVote={note.my_vote || 0}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-10 text-center text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text-ink)]">No notes uploaded yet.</p>
            <p className="text-sm mt-1">Be the first student to publish notes for your semester.</p>
          </div>
        )}
      </section>

      {/* 5. SUBJECT DIRECTORY LEDGER (Asymmetric 12-Col Matrix) */}
      <section
        id="subjects"
        className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-3">
            <span className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[var(--text-subtle)] block">
              Curriculum Index
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-[var(--text-ink)] tracking-tight">
              Browse by Course Subject
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Jump directly to verified materials and peer-ranked summaries indexed by department subject code.
            </p>
            <div className="pt-2">
              <Link to="/notes">
                <Button variant="outline" size="sm">
                  <span>Open Full Filter Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUBJECTS.map((subj) => {
              const meta = getSubjectMeta(subj)
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => navigate(`/notes?subject=${encodeURIComponent(subj)}`)}
                  className="group text-left rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]/45 px-4 py-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-mono-meta text-[11px] font-semibold text-[var(--accent-primary)] block">
                      {meta.code} · {meta.initials}
                    </span>
                    <span className="font-semibold text-sm text-[var(--text-ink)] truncate block mt-0.5">
                      {subj}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-subtle)] group-hover:text-[var(--text-ink)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6. EXPANDABLE FAQ SECTION */}
      <FaqSection />
    </div>
  )
}
