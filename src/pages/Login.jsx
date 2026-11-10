import { useState, useRef, useEffect } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'

export default function Login() {
  const { user, signIn, signUp, signInWithOtp, verifyOtp, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Allowed domain from env
  const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'msrit.edu'

  // Mode: 'otp-request' | 'otp-verify' | 'password'
  const [authMode, setAuthMode] = useState('otp-request')
  const [isSignUp, setIsSignUp] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  // 6 separate OTP digits
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  // Resend countdown timer
  const [resendTimer, setResendTimer] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  useEffect(() => {
    let interval
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  // Redirect if logged in
  if (!authLoading && user) {
    const destination = location.state?.from?.pathname || '/'
    return <Navigate to={destination} replace />
  }

  // Resolve input to proper email: if user enters USN "1ms24is001", append "@msrit.edu"
  const getResolvedEmail = (raw) => {
    const trimmed = raw.trim().toLowerCase()
    if (!trimmed) return ''
    if (trimmed.includes('@')) return trimmed
    return `${trimmed}@${allowedDomain}`
  }

  const validateCollegeEmail = (raw) => {
    const resolved = getResolvedEmail(raw)
    const domainEscaped = allowedDomain.replace(/\./g, '\\.')
    const domainRegex = new RegExp(`@${domainEscaped}$`, 'i')
    return domainRegex.test(resolved)
  }

  // Send OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    const resolved = getResolvedEmail(email)
    if (!validateCollegeEmail(resolved)) {
      setError(`Access restricted: Please enter a valid college email or USN ending with @${allowedDomain}`)
      return
    }

    setSubmitting(true)
    try {
      await signInWithOtp(resolved)
      setAuthMode('otp-verify')
      setResendTimer(45)
      setInfoMessage(`We sent a 6-digit verification code to ${resolved}`)
    } catch (err) {
      console.error('[OTP Error]', err)
      // If OTP provider is not configured or fails, offer fallback to password
      setError(err.message || 'Failed to send OTP code. Try password sign-in below.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle individual OTP digit change
  const handleDigitChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste of complete 6-digit code
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('')
      const next = [...otpDigits]
      pasted.forEach((char, i) => {
        if (i < 6) next[i] = char
      })
      setOtpDigits(next)
      const nextIndex = Math.min(pasted.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    const next = [...otpDigits]
    next[index] = value.replace(/\D/g, '')
    setOtpDigits(next)

    // Auto-advance to next box if digit typed
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    const token = otpDigits.join('')
    if (token.length !== 6) {
      setError('Please enter all 6 digits of the verification code.')
      return
    }

    setSubmitting(true)
    const resolved = getResolvedEmail(email)

    try {
      await verifyOtp({ email: resolved, token })
      const destination = location.state?.from?.pathname || '/'
      navigate(destination)
    } catch (err) {
      console.error('[Verify OTP Error]', err)
      setError(err.message || 'Invalid or expired verification code. Please retry.')
    } finally {
      setSubmitting(false)
    }
  }

  // Password Sign In / Sign Up handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    const resolved = getResolvedEmail(email)
    if (!validateCollegeEmail(resolved)) {
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
          setError('Please provide your full name.')
          setSubmitting(false)
          return
        }

        const data = await signUp({
          email: resolved,
          password,
          fullName: fullName.trim(),
        })

        if (data?.session) {
          navigate('/')
        } else {
          setInfoMessage('Account created! Verification email has been dispatched.')
          setIsSignUp(false)
        }
      } else {
        await signIn({
          email: resolved,
          password,
        })
        const destination = location.state?.from?.pathname || '/'
        navigate(destination)
      }
    } catch (err) {
      console.error('[Auth Error]', err)
      if (err.message?.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please verify and try again.')
      } else {
        setError(err.message || 'Authentication error.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
      <div className="max-w-md w-full bg-white rounded-[24px] border border-black/10 p-8 sm:p-10 shadow-xs text-center">
        {/* Brand Icon & Heading */}
        <div className="w-12 h-12 rounded-full bg-[#F0EEED] flex items-center justify-center mx-auto mb-4 text-black">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl text-black uppercase tracking-tight">
          {authMode === 'otp-verify'
            ? 'ENTER VERIFY CODE'
            : authMode === 'password'
              ? isSignUp
                ? 'CREATE ACCOUNT'
                : 'SIGN IN'
              : 'COLLEGE ACCESS'}
        </h1>

        <p className="text-xs text-black/60 mt-1.5 mb-6 font-medium">
          {authMode === 'otp-verify'
            ? `Enter the 6-digit code sent to ${getResolvedEmail(email)}`
            : `Restricted to verified @${allowedDomain} college members`}
        </p>

        {/* Info or Error Notifications */}
        {error && (
          <div className="mb-6 p-3 rounded-[16px] bg-[#FF3333]/10 border border-[#FF3333]/20 text-xs font-semibold text-[#FF3333] text-left">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-3 rounded-[16px] bg-[#01AB31]/10 border border-[#01AB31]/20 text-xs font-semibold text-[#01AB31] text-left">
            {infoMessage}
          </div>
        )}

        {/* ================================================================ */}
        {/* FLOW 1: REQUEST OTP (Email / USN input)                           */}
        {/* ================================================================ */}
        {authMode === 'otp-request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                USN or College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-black/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`1ms24is001 or name@${allowedDomain}`}
                  className="w-full bg-[#F0EEED] text-black text-sm rounded-full pl-11 pr-4 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-black/40 mt-1 pl-2">
                Tip: Enter your USN or full institutional email.
              </p>
            </div>

            <Button
              type="submit"
              variant="black"
              size="lg"
              disabled={submitting}
              className="w-full mt-2 font-bold"
            >
              <span>{submitting ? 'Sending Code...' : 'Send 6-Digit Code'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <div className="pt-4 border-t border-black/10 text-center">
              <button
                type="button"
                onClick={() => setAuthMode('password')}
                className="text-xs font-semibold text-black/70 hover:text-black underline cursor-pointer"
              >
                Or sign in with Password / Existing Demo Account
              </button>
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* FLOW 2: ENTER 6-DIGIT CODE (Square rounded boxes)                */}
        {/* ================================================================ */}
        {authMode === 'otp-verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            {/* 6 separate square rounded code boxes */}
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e.target)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center font-display text-xl text-black bg-white rounded-xl border border-black/20 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all shadow-2xs"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <Button
              type="submit"
              variant="black"
              size="lg"
              disabled={submitting}
              className="w-full font-bold"
            >
              <span>{submitting ? 'Verifying Code...' : 'Verify & Continue'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <div className="flex items-center justify-between text-xs text-black/60 pt-2">
              <button
                type="button"
                onClick={() => setAuthMode('otp-request')}
                className="flex items-center gap-1 hover:text-black font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>

              {resendTimer > 0 ? (
                <span className="text-black/40">Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="font-bold text-black underline hover:opacity-80 cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* FLOW 3: PASSWORD LOGIN & SIGNUP (Existing accounts & demo)       */}
        {/* ================================================================ */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-[#F0EEED] text-black text-sm rounded-full px-4 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                USN or College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-black/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${allowedDomain} or USN`}
                  className="w-full bg-[#F0EEED] text-black text-sm rounded-full pl-11 pr-4 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-black/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F0EEED] text-black text-sm rounded-full pl-11 pr-4 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="black"
              size="lg"
              disabled={submitting}
              className="w-full mt-2 font-bold"
            >
              <span>{submitting ? 'Signing In...' : isSignUp ? 'Create Account' : 'Sign In with Password'}</span>
            </Button>

            <div className="pt-4 border-t border-black/10 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-black underline cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'New student? Register'}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('otp-request')}
                className="text-black/60 hover:text-black font-medium cursor-pointer"
              >
                Use 6-Digit OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
