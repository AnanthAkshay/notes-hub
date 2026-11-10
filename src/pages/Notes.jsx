import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  CheckCircle2,
  Search,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { SUBJECTS, SEMESTERS, SORT_OPTIONS, ITEMS_PER_PAGE } from '../lib/constants'
import NoteCard from '../components/NoteCard'
import { NoteCardSkeleton } from '../components/ui/Skeleton'
import Button from '../components/ui/Button'
import { Chip } from '../components/ui/Pill'

export default function Notes() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read URL query parameters
  const currentSubject = searchParams.get('subject') || ''
  const currentSemester = searchParams.get('semester') || ''
  const verifiedOnlyParam = searchParams.get('verified_only') === 'true'
  const currentSort = searchParams.get('sort') || 'top'
  const currentSearch = searchParams.get('search') || ''

  // Local filter states (synced with URL)
  const [selectedSubject, setSelectedSubject] = useState(currentSubject)
  const [selectedSemester, setSelectedSemester] = useState(currentSemester)
  const [verifiedOnly, setVerifiedOnly] = useState(verifiedOnlyParam)
  const [searchTerm, setSearchTerm] = useState(currentSearch)
  const [sortBy, setSortBy] = useState(currentSort)

  const [notes, setNotes] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [userVotes, setUserVotes] = useState({})

  // Mobile filter drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Sync internal state when URL parameters change externally
  useEffect(() => {
    setSelectedSubject(searchParams.get('subject') || '')
    setSelectedSemester(searchParams.get('semester') || '')
    setVerifiedOnly(searchParams.get('verified_only') === 'true')
    setSortBy(searchParams.get('sort') || 'top')
    setSearchTerm(searchParams.get('search') || '')
  }, [searchParams])

  // Update URL search parameters
  const applyFilters = useCallback(
    (overrides = {}) => {
      const nextParams = new URLSearchParams()

      const subj = overrides.subject !== undefined ? overrides.subject : selectedSubject
      const sem = overrides.semester !== undefined ? overrides.semester : selectedSemester
      const ver = overrides.verified_only !== undefined ? overrides.verified_only : verifiedOnly
      const srt = overrides.sort !== undefined ? overrides.sort : sortBy
      const srch = overrides.search !== undefined ? overrides.search : searchTerm

      if (subj) nextParams.set('subject', subj)
      if (sem) nextParams.set('semester', sem)
      if (ver) nextParams.set('verified_only', 'true')
      if (srt && srt !== 'top') nextParams.set('sort', srt)
      if (srch) nextParams.set('search', srch)

      setSearchParams(nextParams)
      setMobileDrawerOpen(false)
    },
    [selectedSubject, selectedSemester, verifiedOnly, sortBy, searchTerm, setSearchParams]
  )

  const clearFilters = () => {
    setSelectedSubject('')
    setSelectedSemester('')
    setVerifiedOnly(false)
    setSearchTerm('')
    setSortBy('top')
    setSearchParams(new URLSearchParams())
    setMobileDrawerOpen(false)
  }

  // Load notes from Supabase with stable 3-tier ranking
  const fetchNotes = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        let query = supabase
          .from('notes')
          .select('*, profiles:uploaded_by(full_name, email, role)', { count: 'exact' })

        // Subject filter
        if (currentSubject) {
          query = query.eq('subject', currentSubject)
        }

        // Semester filter (matches '3' or 'Semester 3')
        if (currentSemester) {
          if (currentSemester.startsWith('Semester')) {
            query = query.eq('semester', currentSemester)
          } else {
            query = query.or(`semester.eq.${currentSemester},semester.eq.Semester ${currentSemester}`)
          }
        }

        // Verified only filter
        if (verifiedOnlyParam) {
          query = query.eq('verified', true)
        }

        // Search filter (title or description)
        if (currentSearch) {
          query = query.ilike('title', `%${currentSearch}%`)
        }

        // Stable 3-tier database ranking: verified first, then score, then newest
        if (currentSort === 'top') {
          query = query
            .order('verified', { ascending: false })
            .order('score', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
        } else if (currentSort === 'upvoted') {
          query = query
            .order('score', { ascending: false })
            .order('verified', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
        } else {
          // newest
          query = query
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
        }

        const offset = isLoadMore ? notes.length : 0
        const to = offset + ITEMS_PER_PAGE - 1
        query = query.range(offset, to)

        const { data, count, error } = await query

        if (error) throw error

        const newItems = data || []
        setTotalCount(count || 0)

        if (isLoadMore) {
          setNotes((prev) => [...prev, ...newItems])
        } else {
          setNotes(newItems)
        }

        setHasMore(offset + newItems.length < (count || 0))
      } catch (err) {
        console.error('[Notes] Error fetching notes:', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [currentSubject, currentSemester, verifiedOnlyParam, currentSort, currentSearch, notes.length]
  )

  // Fetch on parameter change
  useEffect(() => {
    fetchNotes(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubject, currentSemester, verifiedOnlyParam, currentSort, currentSearch])

  // Fetch logged-in user's cast votes
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
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, score: newScore } : n))
    )
  }

  // Active filters count indicator
  const activeFiltersCount =
    (currentSubject ? 1 : 0) +
    (currentSemester ? 1 : 0) +
    (verifiedOnlyParam ? 1 : 0) +
    (currentSearch ? 1 : 0)

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ================================================================== */}
        {/* Breadcrumb Navigation (Home > Notes)                               */}
        {/* ================================================================== */}
        <nav aria-label="Breadcrumb" className="mb-6 select-none">
          <ol className="flex items-center space-x-2 text-xs sm:text-sm text-black/50">
            <li>
              <Link to="/" className="hover:text-black transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-black">Notes</li>
            {currentSubject && (
              <>
                <li>/</li>
                <li className="text-black/80 font-medium truncate max-w-[200px]">
                  {currentSubject}
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* ================================================================== */}
        {/* Header Row: Title, Showing X-Y, Sort Dropdown & Mobile Filter Button */}
        {/* ================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-black/10 gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-black uppercase tracking-tight">
              {currentSubject || 'ALL STUDY NOTES'}
            </h1>
            <p className="text-xs sm:text-sm text-black/60 mt-1 font-medium">
              Showing {notes.length > 0 ? `1-${notes.length}` : '0'} of{' '}
              {totalCount} notes
              {activeFiltersCount > 0 && ` (${activeFiltersCount} filters active)`}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F0EEED] text-black text-xs font-semibold cursor-pointer border border-black/10"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-black/50 hidden md:inline">Sort by:</span>
              <div className="relative">
                <select
                  value={currentSort}
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    applyFilters({ sort: e.target.value })
                  }}
                  className="appearance-none bg-[#F0EEED] text-black text-xs font-semibold rounded-full pl-4 pr-9 py-2.5 border border-black/10 focus:outline-none focus:border-black cursor-pointer"
                  aria-label="Sort notes"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-black/50 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* Main Content Layout: Left Sidebar Filters + 3-Col Notes Grid        */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 sm:gap-10 items-start">
          {/* ---------------------------------------------------------------- */}
          {/* Desktop Left Sidebar: Filters Card (20px radius, hairline border)  */}
          {/* ---------------------------------------------------------------- */}
          <aside className="hidden lg:block lg:col-span-1 sticky top-28 bg-white rounded-[20px] border border-black/10 p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-black/10">
              <h2 className="font-display text-lg text-black uppercase tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
              </h2>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-black/50 hover:text-[#FF3333] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Keyword Search Input */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-black block mb-2">
                Search Title
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder="e.g. Normalization, CIDR"
                  className="w-full bg-[#F0EEED] text-black text-xs rounded-full pl-9 pr-3 py-2.5 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Verified Only Toggle */}
            <div className="pt-2">
              <label
                htmlFor="desktop-verified-toggle"
                className="flex items-center justify-between cursor-pointer p-3 rounded-[16px] bg-[#F0EEED] hover:bg-[#E8E5E4] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#01AB31]" />
                  <span className="text-xs font-bold text-black">Verified Only</span>
                </div>
                <input
                  id="desktop-verified-toggle"
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 accent-black cursor-pointer rounded"
                />
              </label>
            </div>

            {/* Semesters Filter Chips */}
            <div className="pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black block mb-2.5">
                Semester
              </label>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="All"
                  size="sm"
                  active={!selectedSemester}
                  onClick={() => setSelectedSemester('')}
                />
                {SEMESTERS.map((sem, i) => {
                  const semNum = String(i + 1)
                  const isActive =
                    selectedSemester === semNum || selectedSemester === sem
                  return (
                    <Chip
                      key={sem}
                      label={`Sem ${semNum}`}
                      size="sm"
                      active={isActive}
                      onClick={() =>
                        setSelectedSemester(isActive ? '' : semNum)
                      }
                    />
                  )
                })}
              </div>
            </div>

            {/* Subjects Filter List */}
            <div className="pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black block mb-2.5">
                Subject
              </label>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('')}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors font-medium flex items-center justify-between ${
                    !selectedSubject
                      ? 'bg-black text-white font-bold'
                      : 'text-black/70 hover:bg-[#F0EEED] hover:text-black'
                  }`}
                >
                  <span>All Subjects</span>
                </button>
                {SUBJECTS.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() =>
                      setSelectedSubject(selectedSubject === subj ? '' : subj)
                    }
                    className={`w-full text-left px-3 py-2 rounded-xl transition-colors font-medium flex items-center justify-between ${
                      selectedSubject === subj
                        ? 'bg-black text-white font-bold'
                        : 'text-black/70 hover:bg-[#F0EEED] hover:text-black'
                    }`}
                  >
                    <span className="truncate pr-2">{subj}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Apply Filter Button */}
            <div className="pt-2">
              <Button
                variant="black"
                size="md"
                onClick={() => applyFilters()}
                className="w-full"
              >
                <span>Apply Filters</span>
              </Button>
            </div>
          </aside>

          {/* ---------------------------------------------------------------- */}
          {/* Notes Grid (3-Column on Desktop, 2-Column on Mobile)              */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <NoteCardSkeleton key={i} />
                ))}
              </div>
            ) : notes.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      userVote={userVotes[note.id] || 0}
                      onVoteChange={handleVoteChange}
                    />
                  ))}
                </div>

                {/* "Load More" as Outlined Pill Button */}
                {hasMore && (
                  <div className="mt-12 text-center">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => fetchNotes(true)}
                      disabled={loadingMore}
                    >
                      <span>
                        {loadingMore ? 'Loading More Notes...' : 'Load More Notes'}
                      </span>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[#F0EEED] rounded-[24px] p-12 sm:p-16 text-center">
                <Search className="w-10 h-10 text-black/30 mx-auto mb-3" />
                <h3 className="font-display text-xl text-black uppercase">
                  No notes found
                </h3>
                <p className="text-sm text-black/60 mt-1 max-w-sm mx-auto">
                  Try clearing your search filters or be the first to upload
                  notes for this semester subject.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <span>Reset Filters</span>
                  </Button>
                  <Link to="/upload">
                    <Button variant="black" size="sm">
                      <span>Upload Notes</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Mobile Slide-Up Filter Drawer                                        */}
      {/* ==================================================================== */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div className="relative bg-white rounded-t-[28px] max-h-[85vh] overflow-y-auto p-6 space-y-6 z-10 animate-in slide-in-from-bottom duration-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <h2 className="font-display text-xl text-black uppercase">
                Filter Notes
              </h2>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-full text-black/60 hover:text-black hover:bg-[#F0EEED]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-black block mb-2">
                Search Title
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes..."
                className="w-full bg-[#F0EEED] text-black text-sm rounded-full px-4 py-2.5 border border-transparent focus:outline-none focus:border-black/20"
              />
            </div>

            {/* Verified Only */}
            <label
              htmlFor="mobile-verified-toggle"
              className="flex items-center justify-between cursor-pointer p-3.5 rounded-[16px] bg-[#F0EEED]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#01AB31]" />
                <span className="text-sm font-bold text-black">Verified Only</span>
              </div>
              <input
                id="mobile-verified-toggle"
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 accent-black rounded"
              />
            </label>

            {/* Semesters */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-black block mb-2">
                Semester
              </label>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="All"
                  size="sm"
                  active={!selectedSemester}
                  onClick={() => setSelectedSemester('')}
                />
                {SEMESTERS.map((sem, i) => {
                  const semNum = String(i + 1)
                  const isActive =
                    selectedSemester === semNum || selectedSemester === sem
                  return (
                    <Chip
                      key={sem}
                      label={`Sem ${semNum}`}
                      size="sm"
                      active={isActive}
                      onClick={() =>
                        setSelectedSemester(isActive ? '' : semNum)
                      }
                    />
                  )
                })}
              </div>
            </div>

            {/* Subjects */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-black block mb-2">
                Subject
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${
                    !selectedSubject
                      ? 'bg-black text-white'
                      : 'bg-[#F0EEED] text-black/70'
                  }`}
                >
                  All Subjects
                </button>
                {SUBJECTS.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() =>
                      setSelectedSubject(selectedSubject === subj ? '' : subj)
                    }
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${
                      selectedSubject === subj
                        ? 'bg-black text-white'
                        : 'bg-[#F0EEED] text-black/70'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={clearFilters}
                className="w-1/3"
              >
                <span>Reset</span>
              </Button>
              <Button
                variant="black"
                size="md"
                onClick={() => applyFilters()}
                className="flex-1"
              >
                <span>Apply Filters</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
