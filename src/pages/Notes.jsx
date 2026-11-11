import { useState, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Search,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { SUBJECTS, SEMESTERS, SORT_OPTIONS, ITEMS_PER_PAGE } from '../lib/constants'
import { fetchNotesFeed } from '../lib/notesApi'
import { updateNoteVoteInCache } from '../lib/queryClient'
import NoteCard from '../components/NoteCard'
import { NoteCardSkeleton } from '../components/ui/Skeleton'
import Button from '../components/ui/Button'
import { Chip } from '../components/ui/Pill'
import { VerifiedSealIcon } from '../components/icons/ArchiveIcons'

export default function Notes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentSubject = searchParams.get('subject') || ''
  const currentSemester = searchParams.get('semester') || ''
  const verifiedOnlyParam = searchParams.get('verified_only') === 'true'
  const currentSort = searchParams.get('sort') || 'top'
  const currentSearch = searchParams.get('search') || ''

  const [selectedSubject, setSelectedSubject] = useState(currentSubject)
  const [selectedSemester, setSelectedSemester] = useState(currentSemester)
  const [verifiedOnly, setVerifiedOnly] = useState(verifiedOnlyParam)
  const [searchTerm, setSearchTerm] = useState(currentSearch)
  const [sortBy, setSortBy] = useState(currentSort)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const searchParamsKey = searchParams.toString()
  const [prevSearchParamsKey, setPrevSearchParamsKey] = useState(searchParamsKey)
  if (prevSearchParamsKey !== searchParamsKey) {
    setPrevSearchParamsKey(searchParamsKey)
    setSelectedSubject(currentSubject)
    setSelectedSemester(currentSemester)
    setVerifiedOnly(verifiedOnlyParam)
    setSortBy(currentSort)
    setSearchTerm(currentSearch)
  }

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

  const filtersKey = useMemo(
    () => ({
      subject: currentSubject,
      semester: currentSemester,
      verifiedOnly: verifiedOnlyParam,
      sort: currentSort,
      search: currentSearch,
    }),
    [currentSubject, currentSemester, verifiedOnlyParam, currentSort, currentSearch]
  )

  const {
    data,
    isLoading: loading,
    isFetching,
    isFetchingNextPage: loadingMore,
    isPlaceholderData,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['notes-feed', user?.id || 'anon', filtersKey],
    queryFn: ({ pageParam = 0 }) =>
      fetchNotesFeed({
        ...filtersKey,
        limit: ITEMS_PER_PAGE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0)
      if (loaded < lastPage.totalCount && lastPage.items.length > 0) {
        return loaded
      }
      return undefined
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const notes = useMemo(() => {
    if (!data?.pages) return []
    const seen = new Set()
    const merged = []
    for (const page of data.pages) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          merged.push(item)
        }
      }
    }
    return merged
  }, [data])

  const totalCount = data?.pages?.[0]?.totalCount || 0
  const hasMore = Boolean(hasNextPage)

  const handleVoteChange = (noteId, newScore, newUserVote) => {
    updateNoteVoteInCache(queryClient, noteId, newScore, newUserVote)
  }

  const activeFiltersCount =
    (currentSubject ? 1 : 0) +
    (currentSemester ? 1 : 0) +
    (verifiedOnlyParam ? 1 : 0) +
    (currentSearch ? 1 : 0)

  return (
    <div className="bg-[var(--bg-canvas)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-5 select-none">
          <ol className="flex items-center space-x-2 text-xs text-[var(--text-subtle)] font-mono-meta">
            <li>
              <Link to="/" className="hover:text-[var(--text-ink)] transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-[var(--text-ink)]">Notes</li>
            {currentSubject && (
              <>
                <li>/</li>
                <li className="text-[var(--text-muted)] truncate max-w-[200px]">
                  {currentSubject}
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 mb-8 border-b border-[var(--border-hairline)] gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-[var(--text-ink)] tracking-tight">
              {currentSubject || 'All Study Notes'}
            </h1>
            <p className="font-mono-meta text-xs text-[var(--text-muted)] mt-1.5">
              Showing {notes.length > 0 ? `1-${notes.length}` : '0'} of {totalCount} entries
              {activeFiltersCount > 0 && ` · ${activeFiltersCount} filter(s) active`}
              {isFetching && isPlaceholderData && ' · Updating'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-[6px] bg-[var(--bg-elevated)] text-[var(--text-ink)] text-xs font-semibold cursor-pointer border border-[var(--border-hairline)]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-[4px] bg-[var(--bg-inverse)] text-[var(--text-inverse)] font-mono-meta text-[10px]">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-subtle)] hidden md:inline">Sort:</span>
              <div className="relative">
                <select
                  value={currentSort}
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    applyFilters({ sort: e.target.value })
                  }}
                  className="appearance-none bg-[var(--bg-elevated)] text-[var(--text-ink)] text-xs font-semibold rounded-[6px] pl-3.5 pr-8 py-2 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] cursor-pointer"
                  aria-label="Sort notes"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Left Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-1 sticky top-24 bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)]">
              <h2 className="font-display text-lg text-[var(--text-ink)] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
              </h2>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor="filter-search"
                className="text-[11px] font-mono-meta font-semibold uppercase tracking-wider text-[var(--text-subtle)] block mb-1.5"
              >
                Search Title
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="filter-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder="Normalization, CIDR..."
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-xs rounded-[6px] pl-8 pr-3 py-2 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="desktop-verified-toggle"
                className="flex items-center justify-between cursor-pointer p-3 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <VerifiedSealIcon className="w-4 h-4 text-[var(--accent-verified)]" />
                  <span className="text-xs font-semibold text-[var(--text-ink)]">
                    Verified Only
                  </span>
                </div>
                <input
                  id="desktop-verified-toggle"
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent-primary)] cursor-pointer rounded-[3px]"
                />
              </label>
            </div>

            <div>
              <span className="text-[11px] font-mono-meta font-semibold uppercase tracking-wider text-[var(--text-subtle)] block mb-2">
                Semester
              </span>
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

            <div>
              <span className="text-[11px] font-mono-meta font-semibold uppercase tracking-wider text-[var(--text-subtle)] block mb-2">
                Subject
              </span>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('')}
                  className={`w-full text-left px-2.5 py-2 rounded-[4px] transition-colors font-medium cursor-pointer ${
                    !selectedSubject
                      ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)] font-semibold'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-ink)]'
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
                    className={`w-full text-left px-2.5 py-2 rounded-[4px] transition-colors font-medium cursor-pointer ${
                      selectedSubject === subj
                        ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)] font-semibold'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-ink)]'
                    }`}
                  >
                    <span className="truncate block">{subj}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="black"
              size="md"
              onClick={() => applyFilters()}
              className="w-full"
            >
              <span>Apply Filters</span>
            </Button>
          </aside>

          {/* Notes Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <NoteCardSkeleton key={i} />
                ))}
              </div>
            ) : notes.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      userVote={note.my_vote || 0}
                      onVoteChange={handleVoteChange}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-10 text-center">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => fetchNextPage()}
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
              <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-12 text-center">
                <Search className="w-8 h-8 text-[var(--text-subtle)] mx-auto mb-3" />
                <h3 className="font-display text-xl text-[var(--text-ink)]">
                  No matching notes found
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                  Clear your active filters or upload the first study guide for this subject.
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

      {/* Mobile Filter Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/55"
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div className="relative bg-[var(--bg-elevated)] rounded-t-[10px] border-t border-[var(--border-strong)] max-h-[85vh] overflow-y-auto p-6 space-y-5 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)]">
              <h2 className="font-display text-xl text-[var(--text-ink)]">
                Filter Archive
              </h2>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close filters"
                className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-mono-meta font-semibold uppercase tracking-wider text-[var(--text-subtle)] block mb-1.5">
                Search Title
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes..."
                className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-sm rounded-[6px] px-3.5 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)]"
              />
            </div>

            <label
              htmlFor="mobile-verified-toggle"
              className="flex items-center justify-between cursor-pointer p-3 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
            >
              <div className="flex items-center gap-2">
                <VerifiedSealIcon className="w-4 h-4 text-[var(--accent-verified)]" />
                <span className="text-sm font-semibold text-[var(--text-ink)]">
                  Verified Only
                </span>
              </div>
              <input
                id="mobile-verified-toggle"
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 accent-[var(--accent-primary)] rounded-[3px]"
              />
            </label>

            <div>
              <span className="text-[11px] font-mono-meta font-semibold uppercase tracking-wider text-[var(--text-subtle)] block mb-2">
                Semester
              </span>
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

            <div>
              <span className="text-[11px] font-mono-meta font-semibold uppercase tracking-wider text-[var(--text-subtle)] block mb-2">
                Subject
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('')}
                  className={`w-full text-left px-3 py-2 rounded-[4px] text-xs font-semibold ${
                    !selectedSubject
                      ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
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
                    className={`w-full text-left px-3 py-2 rounded-[4px] text-xs font-semibold ${
                      selectedSubject === subj
                        ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

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
