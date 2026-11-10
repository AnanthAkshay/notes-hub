import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import NoteCard from '../components/NoteCard'
import {
  SEMESTERS,
  SUBJECTS,
  SORT_OPTIONS,
  ITEMS_PER_PAGE,
} from '../lib/constants'

export default function Home() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read state from URL search params (enables shareable links & browser history)
  const currentSort = searchParams.get('sort') || 'top'
  const currentSubject = searchParams.get('subject') || ''
  const currentSemester = searchParams.get('semester') || ''
  const currentSearch = searchParams.get('q') || ''
  const isVerifiedOnly =
    searchParams.get('verified') === 'true' ||
    searchParams.get('verified') === '1'

  // Notes state
  const [notes, setNotes] = useState([])
  const [userVotes, setUserVotes] = useState({}) // { [note_id]: value (1 or -1) }
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Local search input state (for debouncing into URL)
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [prevSearchParam, setPrevSearchParam] = useState(currentSearch)

  // Synchronize local search input if URL changes externally (e.g. Back/Forward button)
  if (currentSearch !== prevSearchParam) {
    setPrevSearchParam(currentSearch)
    setSearchInput(currentSearch)
  }

  // Refs for race-condition prevention and auto-scroll
  const requestIdRef = useRef(0)
  const resultsRef = useRef(null)

  // Helper to update URL search parameters cleanly
  const updateParams = useCallback(
    (updates, resetPage = true) => {
      setLoading(true)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          Object.entries(updates).forEach(([key, value]) => {
            if (
              value === null ||
              value === undefined ||
              value === '' ||
              (key === 'sort' && value === 'top')
            ) {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          })
          return next
        },
        { replace: true }
      )

      if (resetPage) {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [setSearchParams]
  )

  // Debounce search input changes into the URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateParams({ q: searchInput.trim() ? searchInput.trim() : null })
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchInput, currentSearch, updateParams])

  // Helper to fetch user's votes for note IDs in ONE single query
  const fetchVotesForNotes = async (noteIds, currentUserId) => {
    if (!currentUserId || !noteIds || noteIds.length === 0) {
      return {}
    }
    try {
      const { data, error: votesError } = await supabase
        .from('votes')
        .select('note_id, value')
        .in('note_id', noteIds)
        .eq('user_id', currentUserId)

      if (votesError) {
        console.error('[Votes] Error fetching user votes:', votesError)
        return {}
      }

      const map = {}
      data?.forEach((v) => {
        map[v.note_id] = v.value
      })
      return map
    } catch (err) {
      console.error('[Votes] Unexpected error loading user votes:', err)
      return {}
    }
  }

  // Fetch initial/filtered notes whenever parameters change (asynchronously after render)
  useEffect(() => {
    let isMounted = true
    const activeRequestId = ++requestIdRef.current

    async function loadFeed() {
      try {
        setError('')
        const from = 0
        const to = ITEMS_PER_PAGE - 1

        let query = supabase
          .from('notes')
          .select(
            `
            id,
            title,
            subject,
            semester,
            description,
            file_url,
            score,
            verified,
            verified_by,
            verified_at,
            created_at,
            uploaded_by,
            profiles:uploaded_by (
              id,
              email,
              full_name,
              role
            ),
            verifier:profiles!verified_by (
              id,
              full_name,
              role
            )
          `,
            { count: 'exact' }
          )

        // 1. Database-Level Multi-Tier Sorting (never sorted in browser)
        if (currentSort === 'top') {
          // Phase 6 Default: verified DESC -> score DESC -> created_at DESC -> id DESC
          query = query
            .order('verified', { ascending: false })
            .order('score', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
        } else if (currentSort === 'newest') {
          // Newest first
          query = query
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
        } else if (currentSort === 'upvoted') {
          // Most upvoted first (ignores verified)
          query = query
            .order('score', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
        }

        // 2. Filters
        if (isVerifiedOnly) {
          query = query.eq('verified', true)
        }
        if (currentSubject) {
          query = query.eq('subject', currentSubject)
        }
        if (currentSemester) {
          query = query.eq('semester', currentSemester)
        }
        if (currentSearch) {
          query = query.ilike('title', `%${currentSearch}%`)
        }

        // 3. Stable range pagination
        query = query.range(from, to)

        const { data, count, error: queryError } = await query

        if (!isMounted || activeRequestId !== requestIdRef.current) return
        if (queryError) throw queryError

        const fetchedNotes = data || []
        setTotalCount(count || 0)
        setNotes(fetchedNotes)
        setHasMore(fetchedNotes.length === ITEMS_PER_PAGE)
        setPage(0)

        // Query user votes in one batch for newly loaded notes
        if (user && fetchedNotes.length > 0) {
          const fetchedIds = fetchedNotes.map((n) => n.id)
          const newVotes = await fetchVotesForNotes(fetchedIds, user.id)
          if (isMounted) setUserVotes(newVotes)
        } else if (!user) {
          setUserVotes({})
        }
      } catch (err) {
        if (isMounted && activeRequestId === requestIdRef.current) {
          console.error('[Home] Error fetching notes:', err)
          setError(
            err.message || 'Failed to load study notes. Please check your connection.'
          )
        }
      } finally {
        if (isMounted && activeRequestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    }

    loadFeed()

    return () => {
      isMounted = false
    }
  }, [
    currentSort,
    isVerifiedOnly,
    currentSubject,
    currentSemester,
    currentSearch,
    user,
  ])

  // Pagination handler for "Load more"
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    const nextPage = page + 1
    const from = nextPage * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    try {
      let query = supabase
        .from('notes')
        .select(
          `
          id,
          title,
          subject,
          semester,
          description,
          file_url,
          score,
          verified,
          verified_by,
          verified_at,
          created_at,
          uploaded_by,
          profiles:uploaded_by (
            id,
            email,
            full_name,
            role
          ),
          verifier:profiles!verified_by (
            id,
            full_name,
            role
          )
        `
        )

      if (currentSort === 'top') {
        query = query
          .order('verified', { ascending: false })
          .order('score', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
      } else if (currentSort === 'newest') {
        query = query
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
      } else if (currentSort === 'upvoted') {
        query = query
          .order('score', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
      }

      if (isVerifiedOnly) query = query.eq('verified', true)
      if (currentSubject) query = query.eq('subject', currentSubject)
      if (currentSemester) query = query.eq('semester', currentSemester)
      if (currentSearch) query = query.ilike('title', `%${currentSearch}%`)

      query = query.range(from, to)

      const { data, error: pageError } = await query
      if (pageError) throw pageError

      const moreNotes = data || []
      setNotes((prev) => [...prev, ...moreNotes])
      setHasMore(moreNotes.length === ITEMS_PER_PAGE)
      setPage(nextPage)

      if (user && moreNotes.length > 0) {
        const moreIds = moreNotes.map((n) => n.id)
        const moreVotes = await fetchVotesForNotes(moreIds, user.id)
        setUserVotes((prev) => ({ ...prev, ...moreVotes }))
      }
    } catch (err) {
      console.error('[Home] Failed to load more notes:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  // Update card score & vote state in memory when a vote succeeds
  const handleVoteChange = (noteId, newScore, newUserVote) => {
    setNotes((prevNotes) =>
      prevNotes.map((n) => (n.id === noteId ? { ...n, score: newScore } : n))
    )
    setUserVotes((prevVotes) => ({
      ...prevVotes,
      [noteId]: newUserVote,
    }))
  }

  // Update card verification state in memory when teacher verifies/unverifies
  const handleVerificationChange = (noteId, verifyResult) => {
    setNotes((prevNotes) =>
      prevNotes.map((n) =>
        n.id === noteId
          ? {
              ...n,
              verified: verifyResult.verified,
              verified_by: verifyResult.verified_by,
              verified_at: verifyResult.verified_at,
              verifier_name: verifyResult.verifier_name,
              verifier: verifyResult.verified
                ? {
                    id: verifyResult.verified_by,
                    full_name: verifyResult.verifier_name,
                  }
                : null,
            }
          : n
      )
    )
  }

  // Clear all filters back to defaults
  const handleResetFilters = () => {
    setLoading(true)
    setSearchInput('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const isFiltered = Boolean(
    currentSubject ||
      currentSemester ||
      currentSearch ||
      isVerifiedOnly ||
      currentSort !== 'top'
  )

  // Find index where verified notes end and unverified begin (for visual divider in "Top" sort)
  let verifiedBoundaryIndex = -1
  if (currentSort === 'top' && !isVerifiedOnly && notes.length > 1) {
    const firstUnverifiedIndex = notes.findIndex((n) => !n.verified)
    // Show boundary if there is at least one verified note followed by unverified notes
    if (firstUnverifiedIndex > 0) {
      verifiedBoundaryIndex = firstUnverifiedIndex - 1
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 sm:p-10 text-white shadow-md mb-8">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-100 uppercase tracking-wider mb-3 backdrop-blur-xs">
            Student & Faculty Resource Hub
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            Peer Notes & Verified Academic Resources
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed mb-6">
            Find handwritten notes, textbook summaries, and lecture notes curated by students and verified by faculty.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/upload"
              className="px-5 py-2.5 bg-white text-blue-700 font-semibold text-sm rounded-xl shadow-xs hover:bg-blue-50 transition-colors"
            >
              Upload Notes
            </Link>
            {!user && (
              <Link
                to="/login"
                className="px-5 py-2.5 bg-blue-600/50 hover:bg-blue-600 text-white font-medium text-sm rounded-xl border border-white/20 transition-colors"
              >
                Sign In to Vote
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Sort Control Bar */}
      <div
        ref={resultsRef}
        className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 sm:p-5 mb-8 scroll-mt-20"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search by title (4 cols on lg) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="searchNotes" className="sr-only">
              Search Notes
            </label>
            <div className="relative">
              <input
                id="searchNotes"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search notes by title..."
                className="w-full pl-3.5 pr-8 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    updateParams({ q: null })
                  }}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Subject Filter (3 cols on lg) */}
          <div className="lg:col-span-3">
            <select
              value={currentSubject}
              onChange={(e) => updateParams({ subject: e.target.value || null })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            >
              <option value="">All Subjects</option>
              {SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter (2 cols on lg) */}
          <div className="lg:col-span-2">
            <select
              value={currentSemester}
              onChange={(e) => updateParams({ semester: e.target.value || null })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            >
              <option value="">All Semesters</option>
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown (3 cols on lg) */}
          <div className="lg:col-span-3">
            <select
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-blue-50/30 text-blue-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Verified Toggle, Results Count & Clear Filters */}
        <div className="mt-3.5 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Verified Only Toggle Button */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() =>
                updateParams({ verified: isVerifiedOnly ? null : 'true' })
              }
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                isVerifiedOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{isVerifiedOnly ? '✓' : '○'}</span>
              <span>Verified Only</span>
            </button>

            {/* Results Count */}
            {!loading && (
              <span className="text-gray-500 font-medium">
                Showing{' '}
                <span className="font-bold text-gray-800">{notes.length}</span>{' '}
                {totalCount > notes.length ? `of ${totalCount} ` : ''}notes
              </span>
            )}
          </div>

          {/* Right: Active Filter Indicators and Reset Button */}
          {isFiltered && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 hidden sm:inline">Active filters:</span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800 mb-8">
          <p className="font-semibold mb-2">Error loading notes</p>
          <p className="text-sm text-rose-700 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              updateParams({})
            }}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((placeholder) => (
            <div
              key={placeholder}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs animate-pulse flex flex-col justify-between h-56"
            >
              <div>
                <div className="flex gap-2 mb-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3.5 bg-gray-100 rounded w-full mb-2"></div>
                <div className="h-3.5 bg-gray-100 rounded w-2/3"></div>
              </div>
              <div className="h-8 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
            📝
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No notes found
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            {isFiltered
              ? 'No notes match your active filters and sort criteria. Try adjusting your search or clearing filters.'
              : 'No study notes have been uploaded yet. Be the first student or faculty member to contribute!'}
          </p>
          {isFiltered ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          ) : (
            <Link
              to="/upload"
              className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              Upload First Note
            </Link>
          )}
        </div>
      ) : (
        /* Notes Card Grid with Top Ranking Visual Divider */
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {notes.map((note, index) => (
              <div key={note.id} className="contents">
                <NoteCard
                  note={note}
                  userVote={userVotes[note.id] || 0}
                  onVoteChange={handleVoteChange}
                  onVerificationChange={handleVerificationChange}
                />

                {/* Phase 6 Visual Divider: Rendered where verified notes end and community notes begin in 'Top' sort */}
                {index === verifiedBoundaryIndex && (
                  <div className="col-span-full py-4 my-2 flex items-center justify-center">
                    <div className="flex-1 border-t border-slate-200"></div>
                    <span className="px-3.5 py-1 mx-3 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold tracking-wider uppercase flex items-center space-x-1.5 shadow-2xs">
                      <span>↓</span>
                      <span>Community Uploads (Ranked by Net Score)</span>
                    </span>
                    <div className="flex-1 border-t border-slate-200"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading more notes...' : 'Load More Notes'}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
