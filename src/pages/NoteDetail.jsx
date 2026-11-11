import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ExternalLink,
  Download,
  Calendar,
  User,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Printer,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getSubjectMeta } from '../lib/constants'
import { formatRelativeDate } from '../lib/formatDate'
import { fetchNoteDetail } from '../lib/notesApi'
import { updateNoteVoteInCache, updateNoteVerificationInCache } from '../lib/queryClient'
import { buildShareUrlWithUtm } from '../lib/utm'
import VoteButtons from '../components/VoteButtons'
import VerifyButton from '../components/VerifyButton'
import ReportButton from '../components/ReportButton'
import Button from '../components/ui/Button'
import CopyButton from '../components/ui/CopyButton'
import { Pill } from '../components/ui/Pill'
import { Skeleton } from '../components/ui/Skeleton'
import { CatalogDocIcon, VerifiedSealIcon } from '../components/icons/ArchiveIcons'

export default function NoteDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('details')

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['note-detail', id, user?.id || 'anon'],
    queryFn: () => fetchNoteDetail(id, user?.id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const note = data?.note || null
  const userVote = data?.myVote ?? 0

  const handleVoteChange = (newScore, newUserVote) => {
    updateNoteVoteInCache(queryClient, id, newScore, newUserVote)
  }

  const handleVerificationChange = (updatedFields) => {
    updateNoteVerificationInCache(queryClient, id, updatedFields)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-5 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <Skeleton className="md:col-span-5 w-full aspect-[4/3]" />
          <div className="md:col-span-7 space-y-4">
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-48" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
          <CatalogDocIcon className="w-6 h-6" />
        </div>
        <h2 className="font-display text-2xl text-[var(--text-ink)]">
          Note Not Found
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          The requested study note does not exist or may have been removed by faculty moderation.
        </p>
        <div className="mt-6">
          <Link to="/notes">
            <Button variant="black" size="md">
              <ArrowLeft className="w-4 h-4" />
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

  const lastUpdatedIso = note.verified_at || note.created_at
  const lastUpdatedText = lastUpdatedIso
    ? new Date(lastUpdatedIso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  const shareUrl = buildShareUrlWithUtm(`/notes/${note.id}`, 'note_detail')
  const citationText = `${uploaderName}. "${note.title}" (${note.subject}, ${note.semester}). Notes Hub Archive. ${shareUrl}`

  return (
    <div className="bg-[var(--bg-canvas)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-5 select-none" data-no-print>
          <ol className="flex flex-wrap items-center gap-2 text-xs font-mono-meta text-[var(--text-subtle)]">
            <li>
              <Link to="/" className="hover:text-[var(--text-ink)] transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/notes" className="hover:text-[var(--text-ink)] transition-colors">
                Notes
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                to={`/notes?subject=${encodeURIComponent(note.subject)}`}
                className="hover:text-[var(--text-ink)] transition-colors truncate max-w-[160px]"
              >
                {note.subject}
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-[var(--text-ink)] truncate max-w-[200px]">
              {note.title}
            </li>
          </ol>
        </nav>

        <div className="mb-6 flex items-center justify-between gap-3" data-no-print>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-ink)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <CopyButton text={shareUrl} label="Copy Link" copiedLabel="Link Copied" />
            <CopyButton text={citationText} label="Copy Citation" copiedLabel="Cited" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              title="Print note summary"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Main Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-10 border-b border-[var(--border-hairline)]">
          {/* Left Column: Archival Folio Specimen */}
          <div className="lg:col-span-5">
            <div className="rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-6 sm:p-8 flex flex-col justify-between min-h-[300px] sm:min-h-[360px]">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-hairline)]">
                <span className="font-mono-meta text-xs font-semibold px-2.5 py-1 rounded-[4px] bg-[var(--bg-surface)] text-[var(--text-ink)] border border-[var(--border-hairline)]">
                  {meta.code} · {meta.initials}
                </span>
                {note.verified ? (
                  <Pill size="sm" variant="verified">
                    <VerifiedSealIcon className="w-3.5 h-3.5" />
                    <span>Faculty Verified</span>
                  </Pill>
                ) : (
                  <Pill size="sm" variant="default">
                    Community Pool
                  </Pill>
                )}
              </div>

              <div className="py-8 flex flex-col items-start gap-4">
                <div className="p-3.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-ink)]">
                  <CatalogDocIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)] block">
                    Catalog Record
                  </span>
                  <p className="font-display text-xl text-[var(--text-ink)]">
                    {note.subject}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {note.semester} · {isExternalLink ? 'External Shared Document' : 'Hosted PDF Attachment'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between font-mono-meta text-xs text-[var(--text-subtle)]">
                <span>Score: {note.score}</span>
                <span>Updated {lastUpdatedText}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Voting, Summary & Primary Actions */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill size="sm" variant="black">
                  {note.subject}
                </Pill>
                <Pill size="sm" variant="default">
                  {note.semester}
                </Pill>
                {note.verified && (
                  <Pill size="sm" variant="verified">
                    <VerifiedSealIcon className="w-3.5 h-3.5" />
                    <span>Verified by {verifierName}</span>
                  </Pill>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-[var(--text-ink)] tracking-tight leading-tight">
                {note.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 py-3 border-y border-[var(--border-hairline)]">
                <VoteButtons
                  noteId={note.id}
                  initialScore={note.score}
                  initialUserVote={userVote}
                  uploadedBy={note.uploaded_by}
                  onVoteChange={handleVoteChange}
                  size="md"
                />
                <span className="font-mono-meta text-xs text-[var(--text-muted)]">
                  {note.score === 1 ? '1 net vote' : `${note.score} net votes`}
                </span>
              </div>

              <div className="py-1">
                <h2 className="font-mono-meta text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] mb-2">
                  Summary & Overview
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                  {note.description || (
                    <span className="italic text-[var(--text-subtle)]">
                      No description provided by the author.
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-2 text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                  <span>
                    Uploaded by <strong className="text-[var(--text-ink)]">{uploaderName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono-meta">
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                  <span>Published {formatRelativeDate(note.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono-meta">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                  <span>Last updated {lastUpdatedText}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-4" data-no-print>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href={note.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button
                    variant="black"
                    size="lg"
                    className="w-full"
                  >
                    {isExternalLink ? (
                      <>
                        <span>Open External Document</span>
                        <ExternalLink className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>View / Download Notes</span>
                      </>
                    )}
                  </Button>
                </a>

                <VerifyButton
                  noteId={note.id}
                  verified={note.verified}
                  uploadedBy={note.uploaded_by}
                  onVerificationChange={handleVerificationChange}
                  size="lg"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-subtle)] pt-2">
                <ReportButton
                  noteId={note.id}
                  noteTitle={note.title}
                  uploadedBy={note.uploaded_by}
                />
                <span className="font-mono-meta">Institutional Roster Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Academic Details & Verification */}
        <div className="mt-10">
          <div className="flex items-center border-b border-[var(--border-hairline)] gap-8" data-no-print>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-3.5 text-sm font-display transition-colors cursor-pointer relative ${
                activeTab === 'details'
                  ? 'text-[var(--text-ink)]'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]'
              }`}
            >
              <span>Academic Details</span>
              {activeTab === 'details' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-ink)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className={`pb-3.5 text-sm font-display transition-colors cursor-pointer relative flex items-center gap-1.5 ${
                activeTab === 'verification'
                  ? 'text-[var(--text-ink)]'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]'
              }`}
            >
              <span>Faculty Verification</span>
              {note.verified && (
                <span className="w-2 h-2 rounded-full bg-[var(--accent-verified)]" />
              )}
              {activeTab === 'verification' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-ink)]" />
              )}
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="pt-7 max-w-3xl">
              <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div>
                    <dt className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Subject
                    </dt>
                    <dd className="font-semibold text-[var(--text-ink)] mt-0.5">
                      {note.subject}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Semester
                    </dt>
                    <dd className="font-semibold text-[var(--text-ink)] mt-0.5">
                      {note.semester}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Uploaded By
                    </dt>
                    <dd className="font-semibold text-[var(--text-ink)] mt-0.5">
                      {uploaderName}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Last Updated
                    </dt>
                    <dd className="font-semibold text-[var(--text-ink)] mt-0.5 font-mono-meta">
                      {lastUpdatedText}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                      File Source
                    </dt>
                    <dd className="font-semibold text-[var(--text-ink)] mt-0.5">
                      {isExternalLink ? 'External Shared Link' : 'Supabase Storage (PDF/Image)'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                      Net Community Score
                    </dt>
                    <dd className="font-semibold text-[var(--text-ink)] mt-0.5 font-mono-meta">
                      {note.score} points
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="pt-7 max-w-3xl">
              <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-6">
                {note.verified ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[6px] bg-[var(--accent-verified-bg)] text-[var(--accent-verified)] flex items-center justify-center">
                        <VerifiedSealIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg text-[var(--text-ink)]">
                          Faculty Certified
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Reviewed and approved by {verifierName}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      This study material has been inspected by a faculty member and confirmed to reflect syllabus concepts, formulas, and exam expectations.
                    </p>

                    {note.verified_at && (
                      <div className="pt-3 border-t border-[var(--border-hairline)] font-mono-meta text-xs text-[var(--text-subtle)]">
                        Verified on{' '}
                        {new Date(note.verified_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[6px] bg-[var(--bg-surface)] text-[var(--text-muted)] flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg text-[var(--text-ink)]">
                          Community Review In Progress
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Pending inspection by department professors
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      This note is currently in the community pool. Peers can upvote or downvote it; once verified by faculty, it ranks at the top of the catalog.
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
