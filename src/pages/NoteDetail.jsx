import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  ExternalLink,
  Download,
  CheckCircle2,
  Calendar,
  User,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { getSubjectMeta } from '../lib/constants'
import { formatRelativeDate } from '../lib/formatDate'
import VoteButtons from '../components/VoteButtons'
import VerifyButton from '../components/VerifyButton'
import ReportButton from '../components/ReportButton'
import Button from '../components/ui/Button'
import { Pill } from '../components/ui/Pill'
import { Skeleton } from '../components/ui/Skeleton'

export default function NoteDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [note, setNote] = useState(null)
  const [userVote, setUserVote] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'verification'

  useEffect(() => {
    let isMounted = true

    async function loadNoteData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch note data with uploader and verifier relations
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .select('*, profiles:uploaded_by(full_name, email, role), verifier:verified_by(full_name, email)')
          .eq('id', id)
          .single()

        if (noteError) throw noteError
        if (!isMounted) return

        setNote(noteData)

        // Fetch user's vote if authenticated
        if (user) {
          const { data: voteData } = await supabase
            .from('votes')
            .select('value')
            .eq('note_id', id)
            .eq('user_id', user.id)
            .maybeSingle()

          if (isMounted && voteData) {
            setUserVote(voteData.value || 0)
          }
        }
      } catch (err) {
        console.error('[NoteDetail] Error:', err)
        if (isMounted) setError(err.message || 'Note not found')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadNoteData()

    return () => {
      isMounted = false
    }
  }, [id, user])

  const handleVoteChange = (newScore, newUserVote) => {
    setUserVote(newUserVote)
    setNote((prev) => (prev ? { ...prev, score: newScore } : null))
  }

  const handleVerificationChange = (updatedFields) => {
    setNote((prev) =>
      prev
        ? {
            ...prev,
            verified: updatedFields.verified,
            verified_by: updatedFields.verified_by,
            verified_at: updatedFields.verified_at,
          }
        : null
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-6 w-48 mb-8 rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Skeleton className="w-full aspect-square rounded-[24px]" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-4/5 rounded-full" />
            <Skeleton className="h-6 w-1/3 rounded-full" />
            <Skeleton className="h-24 w-full rounded-[20px]" />
            <Skeleton className="h-12 w-48 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[#F0EEED] flex items-center justify-center mx-auto mb-4 text-black">
          <FileText className="w-8 h-8 text-black/40" />
        </div>
        <h2 className="font-display text-2xl text-black uppercase">
          Note Not Found
        </h2>
        <p className="text-sm text-black/60 mt-2">
          The requested study note does not exist or may have been removed.
        </p>
        <div className="mt-6">
          <Link to="/notes">
            <Button variant="black" size="md">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Back to All Notes</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const meta = getSubjectMeta(note.subject)
  const uploaderName =
    note.profiles?.full_name ||
    note.profiles?.email?.split('@')[0] ||
    'Student'

  const verifierName =
    note.verifier?.full_name ||
    note.verifier?.email?.split('@')[0] ||
    'Faculty'

  const isExternalLink =
    note.file_url?.startsWith('http://') ||
    note.file_url?.startsWith('https://')

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 select-none">
          <ol className="flex items-center space-x-2 text-xs sm:text-sm text-black/50">
            <li>
              <Link to="/" className="hover:text-black transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/notes" className="hover:text-black transition-colors">
                Notes
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                to={`/notes?subject=${encodeURIComponent(note.subject)}`}
                className="hover:text-black transition-colors truncate max-w-[150px]"
              >
                {note.subject}
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-black truncate max-w-[180px]">
              {note.title}
            </li>
          </ol>
        </nav>

        {/* Back Link */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/60 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Main Product/Note Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-black/10">
          {/* Left Column: Large Gray Tile with Graphic Cover */}
          <div className="lg:col-span-5">
            <div
              className="w-full aspect-square rounded-[24px] bg-[#F0EEED] relative flex flex-col items-center justify-center p-8 overflow-hidden border border-black/10 select-none shadow-xs"
              style={{ backgroundColor: meta.tint }}
            >
              {/* Background Monogram */}
              <span
                className="absolute -right-6 -bottom-6 font-display text-9xl select-none pointer-events-none opacity-10"
                style={{ color: meta.accent }}
              >
                {meta.initials}
              </span>

              {/* Graphic Document Emblem */}
              <div className="w-36 h-48 sm:w-44 sm:h-56 bg-white rounded-2xl shadow-md border border-black/10 flex flex-col items-center justify-between p-6 relative">
                <div className="flex items-center justify-between w-full">
                  <span
                    className="font-display text-lg font-black tracking-wider"
                    style={{ color: meta.accent }}
                  >
                    {meta.initials}
                  </span>
                  <FileText className="w-6 h-6 text-black/30" />
                </div>

                <div className="w-full text-center py-2">
                  <span className="text-xs font-bold tracking-widest text-black/40 uppercase block">
                    {meta.code}
                  </span>
                  <span className="text-[11px] font-semibold text-black/60 mt-1 block">
                    {note.semester}
                  </span>
                </div>

                <div className="w-full border-t border-black/10 pt-2 flex items-center justify-between text-xs text-black/50 font-medium">
                  <span>{isExternalLink ? 'Drive' : 'PDF'}</span>
                  {note.verified && (
                    <CheckCircle2 className="w-4 h-4 text-[#01AB31]" />
                  )}
                </div>
              </div>

              {/* Top Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <Pill size="sm" variant="white">
                  {note.subject}
                </Pill>
                {note.verified && (
                  <Pill size="sm" variant="verified">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Faculty Verified</span>
                  </Pill>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Title, Metadata, Voting, Primary Action */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <Pill size="sm" variant="black">
                  {note.subject}
                </Pill>
                <Pill size="sm" variant="default">
                  {note.semester}
                </Pill>
                {note.verified ? (
                  <Pill size="sm" variant="verified">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified by {verifierName}</span>
                  </Pill>
                ) : (
                  <Pill size="sm" variant="default">
                    Community Upload
                  </Pill>
                )}
              </div>

              {/* Display-Type Title */}
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-black uppercase tracking-tight leading-tight">
                {note.title}
              </h1>

              {/* Vote Score Pill & Voting Arrows */}
              <div className="flex items-center gap-4 py-2 border-y border-black/10">
                <VoteButtons
                  noteId={note.id}
                  initialScore={note.score}
                  initialUserVote={userVote}
                  uploadedBy={note.uploaded_by}
                  onVoteChange={handleVoteChange}
                  size="md"
                />
                <span className="text-xs text-black/50">
                  {note.score === 1
                    ? '1 net vote'
                    : `${note.score} net community votes`}
                </span>
              </div>

              {/* Description */}
              <div className="py-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-black mb-2">
                  Summary & Overview
                </h2>
                <p className="text-sm sm:text-base text-black/70 leading-relaxed font-normal whitespace-pre-line">
                  {note.description || (
                    <span className="italic text-black/40">
                      No description provided by the author.
                    </span>
                  )}
                </p>
              </div>

              {/* Uploader & Timestamp */}
              <div className="pt-2 text-xs text-black/60 flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-4 h-4 text-black/40" />
                  <span>
                    Uploaded by <strong className="text-black">{uploaderName}</strong>
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-black/40" />
                  <span>{formatRelativeDate(note.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Big Black Pill Primary Action */}
                <a
                  href={note.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button
                    variant="black"
                    size="lg"
                    className="w-full text-base font-bold shadow-none"
                  >
                    {isExternalLink ? (
                      <>
                        <span>Open External Document</span>
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1" />
                        <span>View / Download Notes</span>
                      </>
                    )}
                  </Button>
                </a>

                {/* Teacher Verification Action */}
                <VerifyButton
                  noteId={note.id}
                  verified={note.verified}
                  uploadedBy={note.uploaded_by}
                  onVerificationChange={handleVerificationChange}
                  size="lg"
                />
              </div>

              {/* Secondary Actions: Report Button */}
              <div className="flex items-center justify-between text-xs text-black/50 pt-2">
                <ReportButton
                  noteId={note.id}
                  noteTitle={note.title}
                  uploadedBy={note.uploaded_by}
                />
                <span>Institutional ID Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* Tabs: "Details" and "Verification"                                 */}
        {/* ================================================================== */}
        <div className="mt-12">
          {/* Tab Headers */}
          <div className="flex items-center border-b border-black/10 gap-8">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-4 text-sm font-display uppercase tracking-wider transition-colors cursor-pointer relative ${
                activeTab === 'details'
                  ? 'text-black'
                  : 'text-black/40 hover:text-black/70'
              }`}
            >
              <span>Academic Details</span>
              {activeTab === 'details' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className={`pb-4 text-sm font-display uppercase tracking-wider transition-colors cursor-pointer relative flex items-center gap-1.5 ${
                activeTab === 'verification'
                  ? 'text-black'
                  : 'text-black/40 hover:text-black/70'
              }`}
            >
              <span>Faculty Verification</span>
              {note.verified && (
                <span className="w-2 h-2 rounded-full bg-[#01AB31]" />
              )}
              {activeTab === 'verification' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          </div>

          {/* Tab 1: Details */}
          {activeTab === 'details' && (
            <div className="pt-8 max-w-3xl">
              <div className="bg-[#F0EEED] rounded-[20px] p-6 sm:p-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-black/50 block">
                      Subject
                    </span>
                    <span className="font-semibold text-black mt-0.5 block">
                      {note.subject}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-black/50 block">
                      Semester
                    </span>
                    <span className="font-semibold text-black mt-0.5 block">
                      {note.semester}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-black/50 block">
                      Uploaded By
                    </span>
                    <span className="font-semibold text-black mt-0.5 block">
                      {uploaderName} ({note.profiles?.email || 'Student'})
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-black/50 block">
                      Upload Timestamp
                    </span>
                    <span className="font-semibold text-black mt-0.5 block">
                      {new Date(note.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-black/50 block">
                      File Source
                    </span>
                    <span className="font-semibold text-black mt-0.5 block">
                      {isExternalLink ? 'External Shared Link' : 'Supabase Object Storage (PDF)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-black/50 block">
                      Net Community Score
                    </span>
                    <span className="font-semibold text-black mt-0.5 block">
                      {note.score} points
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Verification */}
          {activeTab === 'verification' && (
            <div className="pt-8 max-w-3xl">
              <div className="bg-[#F0EEED] rounded-[20px] p-6 sm:p-8">
                {note.verified ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#01AB31]/10 text-[#01AB31] flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg text-black uppercase">
                          Faculty Certified
                        </h3>
                        <p className="text-xs text-black/60">
                          Reviewed and approved by {verifierName}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-black/70 leading-relaxed pt-2">
                      This study material has been inspected by a verified faculty
                      member and confirmed to accurately reflect syllabus concepts,
                      formulas, and examination grading rubrics.
                    </p>

                    {note.verified_at && (
                      <div className="pt-3 border-t border-black/10 text-xs text-black/50">
                        Verification certified on{' '}
                        {new Date(note.verified_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-black/5 text-black/60 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg text-black uppercase">
                          Community Review In Progress
                        </h3>
                        <p className="text-xs text-black/60">
                          Pending inspection by department professors
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-black/70 leading-relaxed pt-2">
                      This note is currently in the community pool. Peers can upvote
                      or downvote it. Once a department professor verifies it,
                      it will be elevated with an official verification badge.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
