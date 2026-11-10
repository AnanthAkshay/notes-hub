import { useState } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, signIn, signUp, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  // Read allowed domain from environment (defaulting to msrit.edu)
  const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'msrit.edu'

  // Redirect to Home if user is already logged in
  if (!authLoading && user) {
    const destination = location.state?.from?.pathname || '/'
    return <Navigate to={destination} replace />
  }

  // Validate college domain
  const validateCollegeEmail = (emailInput) => {
    const normalized = emailInput.trim().toLowerCase()
    const domainEscaped = allowedDomain.replace(/\./g, '\\.')
    const domainRegex = new RegExp(`@${domainEscaped}$`, 'i')
    return domainRegex.test(normalized)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    const cleanEmail = email.trim().toLowerCase()

    // 1. Frontend validation for college domain
    if (!validateCollegeEmail(cleanEmail)) {
      setError(`Access restricted: Please enter your official college email ending with @${allowedDomain}`)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setSubmitting(true)

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please provide your full name for student verification.')
          setSubmitting(false)
          return
        }

        const data = await signUp({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
        })

        // Check if email confirmation is required by Supabase settings
        if (data?.session) {
          // Instant session granted (email confirmation disabled)
          navigate('/')
        } else {
          // Email confirmation enabled
          setInfoMessage(
            'Account created! A confirmation link has been sent to your college email. Please verify it before signing in.'
          )
          setIsSignUp(false)
        }
      } else {
        await signIn({
          email: cleanEmail,
          password,
        })
        const destination = location.state?.from?.pathname || '/'
        navigate(destination)
      }
    } catch (err) {
      console.error('[Auth Error]', err)
      // Provide clear user-friendly error messages
      if (err.message?.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please verify and try again.')
      } else if (err.message?.includes('Registration restricted')) {
        setError(err.message)
      } else {
        setError(err.message || 'An unexpected error occurred during authentication.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isSignUp ? 'Create your Account' : 'Welcome to Notes Hub'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp
              ? `Sign up with your @${allowedDomain} email`
              : 'Sign in to access, upload, and vote on notes'}
          </p>
        </div>

        {/* Informational Message Banner */}
        {infoMessage && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {infoMessage}
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name (Sign Up only) */}
          {isSignUp && (
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          )}

          {/* College Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              College Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`yourname@${allowedDomain}`}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only <span className="font-semibold text-gray-700">@{allowedDomain}</span> accounts are permitted.
            </p>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters.</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Switch mode toggle */}
        <div className="mt-6 pt-5 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? 'Already registered?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setInfoMessage('')
              }}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
