import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Menu,
  X,
  PlusCircle,
  User,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { isAdminRole, isTeacherRole } from '../lib/authHelpers'
import { getInitialTheme, applyTheme } from '../lib/theme'
import { RoleBadge } from './ui/Badge'
import Button from './ui/Button'
import {
  BrandSealIcon,
  VerifiedSealIcon,
  SunGlyph,
  MoonGlyph,
} from './icons/ArchiveIcons'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState(() => getInitialTheme())

  const searchInputRef = useRef(null)

  const isTeacher = isTeacherRole(profile?.role)
  const isAdmin = isAdminRole(profile?.role)

  const { data: openReportsCount = 0 } = useQuery({
    queryKey: ['open-reports-count', user?.id || 'anon'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_open_reports_count')
      if (error) {
        console.error('[Navbar] Error getting reports count:', error)
        return 0
      }
      return Number(data) || 0
    },
    enabled: Boolean(user?.id && isTeacher),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const [prevSearch, setPrevSearch] = useState(location.search)
  if (prevSearch !== location.search) {
    setPrevSearch(location.search)
    const urlQuery = new URLSearchParams(location.search).get('search') || ''
    setSearchQuery(urlQuery)
  }

  // "/" shortcut to focus site search
  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      e.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      navigate(`/notes?search=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/notes')
    }
    setMobileSearchOpen(false)
  }

  const handleSignOut = async () => {
    try {
      setUserDropdownOpen(false)
      setMobileMenuOpen(false)
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Failed to sign out:', err)
    }
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-[var(--text-ink)] select-none ${
      isActive ? 'text-[var(--text-ink)] font-semibold' : 'text-[var(--text-muted)]'
    }`

  return (
    <header
      className="bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)] sticky top-0 z-40"
      data-no-print
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px] gap-4">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 -ml-2 rounded-[6px] text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <Link
              to="/"
              className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] rounded-[4px]"
              onClick={() => setMobileMenuOpen(false)}
            >
              <BrandSealIcon className="w-5 h-5 text-[var(--accent-primary)]" />
              <span className="font-display text-xl sm:text-2xl text-[var(--text-ink)] tracking-tight">
                Notes.Hub
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-5 lg:gap-7 ml-2" aria-label="Primary navigation">
              <NavLink to="/notes" className={navLinkClass}>
                Archive
              </NavLink>
              <NavLink
                to="/notes?verified_only=true"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-[var(--text-ink)] flex items-center gap-1.5 select-none ${
                    isActive ? 'text-[var(--text-ink)] font-semibold' : 'text-[var(--text-muted)]'
                  }`
                }
              >
                <VerifiedSealIcon className="w-3.5 h-3.5 text-[var(--accent-verified)]" />
                <span>Verified</span>
              </NavLink>
              <a
                href="/#subjects"
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)] transition-colors select-none"
              >
                Subjects
              </a>
              {isTeacher && (
                <NavLink
                  to="/review"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors hover:text-[var(--text-ink)] flex items-center gap-1.5 select-none ${
                      isActive ? 'text-[var(--text-ink)] font-semibold' : 'text-[var(--text-muted)]'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4 text-[var(--text-ink)]" />
                  <span>Review</span>
                  {openReportsCount > 0 && (
                    <span className="bg-[var(--accent-danger)] text-white font-mono-meta text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]">
                      {openReportsCount}
                    </span>
                  )}
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          {/* Middle: Site Search Bar */}
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-2">
            <form onSubmit={handleSearchSubmit} className="w-full relative" role="search">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes by title..."
                  aria-label="Search notes"
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] pl-10 pr-9 py-2 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] transition-colors"
                />
                <kbd className="hidden lg:inline-block absolute right-2.5 font-mono-meta text-[10px] px-1.5 py-0.5 rounded-[3px] border border-[var(--border-hairline)] text-[var(--text-subtle)] bg-[var(--bg-elevated)] pointer-events-none">
                  /
                </kbd>
              </div>
            </form>
          </div>

          {/* Right: Theme toggle, Search mobile, Upload, Account */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Toggle search"
              className="md:hidden p-2 rounded-[6px] text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <SunGlyph className="w-4 h-4" />
              ) : (
                <MoonGlyph className="w-4 h-4" />
              )}
            </button>

            <Link
              to="/upload"
              title="Upload Notes"
              aria-label="Upload Notes"
              className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-[6px] bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-xs font-medium hover:opacity-90 active:scale-[0.985] transition-all select-none"
            >
              <PlusCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Upload</span>
            </Link>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-label="Account menu"
                  aria-expanded={userDropdownOpen}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-[6px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer select-none border border-[var(--border-hairline)]"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[4px] bg-[var(--bg-inverse)] text-[var(--text-inverse)] flex items-center justify-center font-mono-meta font-semibold text-xs uppercase">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden lg:flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[var(--text-ink)] max-w-[110px] truncate">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </span>
                    {profile?.usn ? (
                      <span className="font-mono-meta text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-hairline)]">
                        {profile.usn}
                      </span>
                    ) : (
                      <RoleBadge role={profile?.role} />
                    )}
                  </div>
                </button>

                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-strong)] py-3 px-4 z-50 text-sm">
                      <div className="pb-3 border-b border-[var(--border-hairline)]">
                        <p className="font-semibold text-[var(--text-ink)] truncate">
                          {profile?.full_name || 'Student'}
                        </p>
                        {profile?.usn && (
                          <p className="font-mono-meta text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                            {profile.usn}
                          </p>
                        )}
                        <p className="text-xs text-[var(--text-subtle)] truncate mt-0.5">
                          {user.email}
                        </p>
                        <div className="mt-2">
                          <RoleBadge role={profile?.role} />
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <Link
                          to="/upload"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors text-xs font-medium"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>Upload Study Notes</span>
                        </Link>
                        {isTeacher && (
                          <Link
                            to="/review"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center justify-between px-2 py-1.5 rounded-[4px] text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors text-xs font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>Faculty Review Queue</span>
                            </span>
                            {openReportsCount > 0 && (
                              <span className="bg-[var(--accent-danger)] text-white font-mono-meta text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]">
                                {openReportsCount}
                              </span>
                            )}
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors text-xs font-medium"
                          >
                            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>Admin Staff Panel</span>
                          </Link>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[var(--border-hairline)]">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[var(--accent-danger)] hover:bg-[var(--accent-danger-bg)] transition-colors text-xs font-medium cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <User className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-3 pt-1">
            <form onSubmit={handleSearchSubmit} className="relative" role="search">
              <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes by title..."
                className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] pl-10 pr-4 py-2 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)]"
              />
            </form>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 pt-3 pb-5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/notes"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-[6px] text-sm font-semibold text-[var(--text-ink)] bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
            >
              All Notes
            </NavLink>
            <NavLink
              to="/notes?verified_only=true"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-[6px] text-sm font-semibold text-[var(--text-ink)] bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
            >
              <VerifiedSealIcon className="w-3.5 h-3.5 text-[var(--accent-verified)]" />
              <span>Verified</span>
            </NavLink>
          </div>
          <a
            href="/#subjects"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-[6px] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
          >
            Browse Subject Catalog
          </a>
          {isTeacher && (
            <NavLink
              to="/review"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-[6px] text-sm font-semibold text-[var(--text-ink)] hover:bg-[var(--bg-surface)]"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Faculty Review Queue</span>
              </span>
              {openReportsCount > 0 && (
                <span className="bg-[var(--accent-danger)] text-white font-mono-meta text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]">
                  {openReportsCount}
                </span>
              )}
            </NavLink>
          )}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-[6px] text-sm font-semibold text-[var(--text-ink)] hover:bg-[var(--bg-surface)]"
            >
              Admin Staff Panel
            </NavLink>
          )}

          <div className="pt-2 border-t border-[var(--border-hairline)] flex flex-col gap-2">
            <Link
              to="/upload"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button variant="black" size="md" className="w-full">
                <PlusCircle className="w-4 h-4" />
                <span>Upload New Notes</span>
              </Button>
            </Link>
            {user ? (
              <Button
                variant="outline"
                size="md"
                onClick={handleSignOut}
                className="w-full text-[var(--accent-danger)]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({profile?.usn || user.email})</span>
              </Button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button variant="outline" size="md" className="w-full">
                  <span>Sign In with USN / Email OTP</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
