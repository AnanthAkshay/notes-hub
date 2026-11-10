import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openReportsCount, setOpenReportsCount] = useState(0)

  const isTeacher = profile?.role === 'teacher'
  const roleLabel = profile?.role || 'student'

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

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
    }`

  const mobileNavLinkClass = ({ isActive }) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
    }`

  const handleSignOut = async () => {
    try {
      await signOut()
      setMobileMenuOpen(false)
      navigate('/login')
    } catch (err) {
      console.error('Failed to sign out:', err)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-xs sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
          >
            <span className="text-xl font-bold tracking-tight text-blue-600 flex items-center space-x-1.5">
              <span>📚</span>
              <span>Notes Hub</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/upload" className={navLinkClass}>
              Upload
            </NavLink>
            {isTeacher && (
              <NavLink
                to="/review"
                className={({ isActive }) =>
                  `relative px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`
                }
              >
                <span>Review</span>
                {openReportsCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-rose-600 rounded-full">
                    {openReportsCount}
                  </span>
                )}
              </NavLink>
            )}

            {user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="flex flex-col text-right">
                  <span
                    className="text-xs font-semibold text-gray-800 max-w-[130px] truncate"
                    title={user.email}
                  >
                    {profile?.full_name || user.email.split('@')[0]}
                  </span>
                  <span
                    className={`inline-block self-end px-2 py-0.2 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
                      isTeacher
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {roleLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
            )}
          </nav>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            {isTeacher && openReportsCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                {openReportsCount} alert{openReportsCount > 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fade-in">
          <NavLink
            to="/"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Home Feed
          </NavLink>
          <NavLink
            to="/upload"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Upload Notes
          </NavLink>
          {isTeacher && (
            <NavLink
              to="/review"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <div className="flex items-center justify-between">
                <span>Faculty Review Queue</span>
                {openReportsCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-600 rounded-full">
                    {openReportsCount}
                  </span>
                )}
              </div>
            </NavLink>
          )}

          <div className="pt-3 border-t border-gray-100">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800 truncate">
                    {profile?.full_name || user.email}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
                      isTeacher
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {roleLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-center py-2 px-3 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 px-4 rounded-lg bg-blue-600 text-white font-medium text-sm"
              >
                Sign In / Register
              </NavLink>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
