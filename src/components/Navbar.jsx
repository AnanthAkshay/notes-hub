import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Search,
  Menu,
  X,
  PlusCircle,
  User,
  LogOut,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { RoleBadge } from './ui/Badge'
import Button from './ui/Button'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openReportsCount, setOpenReportsCount] = useState(0)

  const isTeacher = profile?.role === 'teacher'

  // Fetch count of open reports for teacher badge
  useEffect(() => {
    let isMounted = true

    async function loadReportsBadge() {
      if (!user || !isTeacher) {
        setOpenReportsCount(0)
        return
      }

      try {
        const { data, error } = await supabase.rpc('get_open_reports_count')
        if (error) {
          console.error('[Navbar] Error getting reports count:', error)
          return
        }
        if (isMounted) setOpenReportsCount(Number(data) || 0)
      } catch (err) {
        console.error('[Navbar] Failed to query reports badge:', err)
      }
    }

    loadReportsBadge()

    return () => {
      isMounted = false
    }
  }, [user, isTeacher])

  const [prevSearch, setPrevSearch] = useState(location.search)
  if (prevSearch !== location.search) {
    setPrevSearch(location.search)
    const urlQuery = new URLSearchParams(location.search).get('search') || ''
    setSearchQuery(urlQuery)
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
    `text-sm font-medium transition-colors hover:text-black select-none ${
      isActive ? 'text-black font-semibold' : 'text-black/60'
    }`

  return (
    <header className="bg-white border-b border-black/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-4">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 -ml-2 rounded-full text-black hover:bg-[#F0EEED] transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <Link
              to="/"
              className="flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-black rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="font-display text-xl sm:text-2xl md:text-3xl text-black tracking-tight uppercase">
                NOTES.HUB
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 ml-2 lg:ml-4">
              <NavLink to="/notes" className={navLinkClass}>
                Notes
              </NavLink>
              <NavLink
                to="/notes?verified_only=true"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-black flex items-center gap-1.5 select-none ${
                    isActive ? 'text-black font-semibold' : 'text-black/60'
                  }`
                }
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#01AB31]" />
                <span>Verified</span>
              </NavLink>
              <a href="/#subjects" className="text-sm font-medium text-black/60 hover:text-black transition-colors select-none">
                Subjects
              </a>
              {isTeacher && (
                <NavLink
                  to="/review"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors hover:text-black flex items-center gap-1.5 select-none ${
                      isActive ? 'text-black font-semibold' : 'text-black/60'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>Review</span>
                  {openReportsCount > 0 && (
                    <span className="bg-[#FF3333] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {openReportsCount}
                    </span>
                  )}
                </NavLink>
              )}
            </nav>
          </div>

          {/* Middle: Large Pill Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg mx-2">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-black/40 absolute left-4.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes by title or subject..."
                  aria-label="Search notes"
                  className="w-full bg-[#F0EEED] text-black placeholder:text-black/40 text-sm rounded-full pl-11 pr-4 py-2.5 sm:py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                />
              </div>
            </form>
          </div>

          {/* Right: Actions (Mobile Search Icon, Upload, Account) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Search"
              className="md:hidden p-2 rounded-full text-black hover:bg-[#F0EEED] transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Upload Button */}
            <Link to="/upload">
              <Button
                variant="black"
                size="sm"
                className="hidden sm:inline-flex"
                title="Upload Notes"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload</span>
              </Button>
              <button
                type="button"
                className="sm:hidden p-2 rounded-full bg-black text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Upload Notes"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </Link>

            {/* Account / Profile Button */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-label="Account menu"
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-full bg-[#F0EEED] hover:bg-[#E8E5E4] transition-colors cursor-pointer select-none border border-black/5"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs uppercase">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden lg:inline text-xs font-semibold text-black max-w-[100px] truncate">
                    {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-[20px] shadow-lg border border-black/10 py-3 px-4 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                      <div className="pb-3 border-b border-black/10">
                        <p className="font-semibold text-black truncate">
                          {profile?.full_name || 'Student'}
                        </p>
                        <p className="text-xs text-black/60 truncate mt-0.5">
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
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-black/80 hover:text-black hover:bg-[#F0EEED] transition-colors"
                        >
                          <PlusCircle className="w-4 h-4 text-black/60" />
                          <span>Upload Study Notes</span>
                        </Link>
                        {isTeacher && (
                          <Link
                            to="/review"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg text-black/80 hover:text-black hover:bg-[#F0EEED] transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-black/60" />
                              <span>Faculty Review Queue</span>
                            </span>
                            {openReportsCount > 0 && (
                              <span className="bg-[#FF3333] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                {openReportsCount}
                              </span>
                            )}
                          </Link>
                        )}
                      </div>

                      <div className="pt-2 border-t border-black/10">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[#FF3333] hover:bg-red-50 transition-colors font-medium cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="black" size="sm">
                  <User className="w-4 h-4" />
                  <span>Log In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Expandable Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-black/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes by title or subject..."
                className="w-full bg-[#F0EEED] text-black placeholder:text-black/40 text-sm rounded-full pl-11 pr-4 py-2.5 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all"
              />
            </form>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/10 bg-white px-4 pt-3 pb-6 space-y-3">
          <NavLink
            to="/notes"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-base font-semibold text-black hover:bg-[#F0EEED] transition-colors"
          >
            All Notes
          </NavLink>
          <NavLink
            to="/notes?verified_only=true"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-base font-semibold text-black hover:bg-[#F0EEED] transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-[#01AB31]" />
            <span>Verified Notes</span>
          </NavLink>
          <a
            href="/#subjects"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-base font-semibold text-black hover:bg-[#F0EEED] transition-colors"
          >
            Browse by Subject
          </a>
          {isTeacher && (
            <NavLink
              to="/review"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-base font-semibold text-black hover:bg-[#F0EEED] transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Faculty Review Queue</span>
              </span>
              {openReportsCount > 0 && (
                <span className="bg-[#FF3333] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {openReportsCount}
                </span>
              )}
            </NavLink>
          )}

          <div className="pt-2 border-t border-black/10 flex flex-col gap-2">
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
                className="w-full text-[#FF3333] hover:text-[#FF3333]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user.email})</span>
              </Button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button variant="outline" size="md" className="w-full">
                  <span>Sign In with College Email</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
