import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Upload, ThumbsUp, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { SUBJECTS, getSubjectMeta } from '../lib/constants'
import Button from '../components/ui/Button'
import StatBlock from '../components/ui/StatBlock'
import SectionHeading from '../components/ui/SectionHeading'
import Marquee from '../components/ui/Marquee'
import NoteCard from '../components/NoteCard'
import { NoteCardSkeleton } from '../components/ui/Skeleton'
import HeroIllustration from '../components/HeroIllustration'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Real database stats
  const [stats, setStats] = useState({
    notesCount: 0,
    verifiedCount: 0,
    studentsCount: 0,
  })

  const [topVerifiedNotes, setTopVerifiedNotes] = useState([])
  const [newestNotes, setNewestNotes] = useState([])
  const [userVotes, setUserVotes] = useState({})
  const [loading, setLoading] = useState(true)

  // 1. Fetch cheap cached stats and featured note feeds
  useEffect(() => {
    let isMounted = true

    async function loadHomeData() {
      setLoading(true)
      try {
        // Run parallel queries: counts with { head: true } are extremely lightweight
        const [
          notesCountRes,
          verifiedCountRes,
          profilesCountRes,
          topNotesRes,
          newNotesRes,
        ] = await Promise.all([
          supabase.from('notes').select('*', { count: 'exact', head: true }),
          supabase.from('notes').select('*', { count: 'exact', head: true }).eq('verified', true),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase
            .from('notes')
            .select('*, profiles:uploaded_by(full_name, email, role)')
            .eq('verified', true)
            .order('score', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('notes')
            .select('*, profiles:uploaded_by(full_name, email, role)')
            .order('created_at', { ascending: false })
            .limit(4),
        ])

        if (!isMounted) return

        setStats({
          notesCount: notesCountRes.count || 0,
          verifiedCount: verifiedCountRes.count || 0,
          studentsCount: profilesCountRes.count || 0,
        })

        setTopVerifiedNotes(topNotesRes.data || [])
        setNewestNotes(newNotesRes.data || [])
      } catch (err) {
        console.error('[Home] Failed to load initial data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadHomeData()

    return () => {
      isMounted = false
    }
  }, [])

  // 2. Fetch logged-in user's cast votes
  useEffect(() => {
    let isMounted = true

    async function loadUserVotes() {
      if (!user) {
        setUserVotes({})
        return
      }

      try {
        const { data, error } = await supabase
          .from('votes')
          .select('note_id, value')
          .eq('user_id', user.id)

        if (error) {
          console.error('[Votes] Error fetching votes:', error)
          return
        }

        if (isMounted && data) {
          const map = {}
          data.forEach((v) => {
            map[v.note_id] = v.value
          })
          setUserVotes(map)
        }
      } catch (err) {
        console.error('[Votes] Failed to load votes:', err)
      }
    }

    loadUserVotes()

    return () => {
      isMounted = false
    }
  }, [user])

  const handleVoteChange = (noteId, newScore, newUserVote) => {
    setUserVotes((prev) => ({ ...prev, [noteId]: newUserVote }))
    setTopVerifiedNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, score: newScore } : n))
    )
    setNewestNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, score: newScore } : n))
    )
  }

  // Display formatted stat counts (e.g. "8+", "24+", "100+")
  const formatStat = (num) => {
    if (!num || num <= 0) return '0+'
    return `${num}+`
  }

  return (
    <div className="bg-white">
      {/* ==================================================================== */}
      {/* 1. HERO SECTION (Two Columns with Bold Editorial Aesthetic)          */}
      {/* ==================================================================== */}
      <section className="bg-[#F2F0F1] pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-black/10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Giant Display Headline, Subtext, CTA, Stats */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl text-black tracking-tight leading-[0.92] uppercase">
                FIND NOTES THAT <br />
                MATCH YOUR EXAM
              </h1>

              <p className="text-base sm:text-lg text-black/60 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Browse through verified lecture notes, handwritten summaries,
                and solved past papers curated by students and certified by
                professors.
              </p>

              <div>
                <Link to="/notes">
                  <Button variant="black" size="lg" className="w-full sm:w-auto">
                    <span>Browse All Notes</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {/* Real Database Stats Row with Thin Dividers */}
              <div className="pt-6 border-t border-black/10 flex items-center justify-center lg:justify-start gap-4 sm:gap-8">
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
                  label="Students"
                  isLast
                />
              </div>
            </div>

            {/* Right Column: Composed SVG/CSS Layered Illustration (No raster images) */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. BLACK FULL-WIDTH TICKER STRIP (Scrolling Academic Subjects)       */}
      {/* ==================================================================== */}
      <Marquee items={SUBJECTS} />

      {/* ==================================================================== */}
      {/* 3. SECTION: TOP VERIFIED NOTES (4-Column Grid on Desktop)            */}
      {/* ==================================================================== */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-black/10">
        <SectionHeading
          title="TOP VERIFIED NOTES"
          subtitle="Highest rated notes reviewed and certified by engineering faculty."
        />

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
          </div>
        ) : topVerifiedNotes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {topVerifiedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                userVote={userVotes[note.id] || 0}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#F0EEED] rounded-[24px] p-12 text-center text-black/60">
            <CheckCircle2 className="w-10 h-10 mx-auto text-[#01AB31] mb-3" />
            <p className="font-semibold text-black">No verified notes yet.</p>
            <p className="text-sm mt-1">Faculty are actively reviewing the queue.</p>
          </div>
        )}

        <div className="mt-10 sm:mt-12 text-center">
          <Link to="/notes?verified_only=true">
            <Button variant="outline" size="md">
              <span>View All Verified Notes</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. SECTION: NEWEST UPLOADS (4-Column Grid on Desktop)                */}
      {/* ==================================================================== */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-black/10">
        <SectionHeading
          title="NEWEST UPLOADS"
          subtitle="Fresh study guides and lecture summaries uploaded by your peers."
        />

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
            <NoteCardSkeleton />
          </div>
        ) : newestNotes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {newestNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                userVote={userVotes[note.id] || 0}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#F0EEED] rounded-[24px] p-12 text-center text-black/60">
            <p className="font-semibold text-black">No notes uploaded yet.</p>
            <p className="text-sm mt-1">Be the first to share notes with your batch!</p>
          </div>
        )}

        <div className="mt-10 sm:mt-12 text-center">
          <Link to="/notes">
            <Button variant="outline" size="md">
              <span>View All Notes</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. SECTION: BROWSE BY SUBJECT (Rounded Gray Tiles)                   */}
      {/* ==================================================================== */}
      <section id="subjects" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-black/10">
        <SectionHeading
          title="BROWSE BY SUBJECT"
          subtitle="Select your current semester subject to explore curated notes."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {SUBJECTS.slice(0, 9).map((subj) => {
            const meta = getSubjectMeta(subj)
            return (
              <div
                key={subj}
                onClick={() => navigate(`/notes?subject=${encodeURIComponent(subj)}`)}
                className="bg-[#F0EEED] hover:bg-[#E8E5E4] rounded-[24px] p-6 sm:p-8 transition-all duration-200 cursor-pointer flex flex-col justify-between aspect-[16/9] sm:aspect-[4/3] group relative overflow-hidden select-none border border-black/5"
              >
                {/* Background Watermark Initials */}
                <span className="absolute -right-2 -bottom-2 font-display text-8xl text-black/5 select-none pointer-events-none group-hover:scale-105 transition-transform">
                  {meta.initials}
                </span>

                <div className="flex items-center justify-between z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-black/50">
                    {meta.code}
                  </span>
                  <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="z-10 mt-auto">
                  <h3 className="font-display text-xl sm:text-2xl text-black uppercase tracking-tight leading-tight group-hover:text-black">
                    {subj}
                  </h3>
                  <p className="text-xs text-black/60 mt-1 font-medium">
                    Explore curated notes →
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. SECTION: HOW IT WORKS (3 Clean Numbered Steps)                   */}
      {/* ==================================================================== */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="HOW IT WORKS"
          subtitle="Three simple steps to collaborate, share, and revise with confidence."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-[24px] border border-black/10 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-display text-3xl sm:text-4xl text-black/20">
                  01
                </span>
                <span className="p-3 rounded-full bg-[#F0EEED] text-black">
                  <Upload className="w-5 h-5" />
                </span>
              </div>
              <h3 className="font-display text-xl text-black uppercase mb-2">
                Upload Study Notes
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Upload handwritten PDF summaries or paste external Google Drive links. Tag your semester and subject.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 text-xs font-semibold text-black/50">
              PDF or Google Drive • Max 10 MB
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-[24px] border border-black/10 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-display text-3xl sm:text-4xl text-black/20">
                  02
                </span>
                <span className="p-3 rounded-full bg-[#F0EEED] text-black">
                  <ThumbsUp className="w-5 h-5" />
                </span>
              </div>
              <h3 className="font-display text-xl text-black uppercase mb-2">
                Vote & Peer Review
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Classmates upvote clear explanations and downvote inaccurate formulas. Scores update with tamper-proof triggers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 text-xs font-semibold text-black/50">
              1 Vote Per Student • Author Protection
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-[24px] border border-black/10 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-display text-3xl sm:text-4xl text-black/20">
                  03
                </span>
                <span className="p-3 rounded-full bg-[#01AB31]/10 text-[#01AB31]">
                  <ShieldCheck className="w-5 h-5" />
                </span>
              </div>
              <h3 className="font-display text-xl text-black uppercase mb-2">
                Get Faculty Verified
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Professors review submissions in the faculty queue. Verified notes jump to the top of the feed with an official badge.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 text-xs font-semibold text-[#01AB31]">
              Verified Notes Rank #1 Always
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
