import { useState, useRef, useEffect, useCallback } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Mail, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import {
  ALLOWED_NOT_REGISTERED_MESSAGE,
  resolveLoginIdentifier,
  mapAuthErrorMessage,
} from '../lib/authHelpers'
import Button from '../components/ui/Button'
import { EyeOpenGlyph, EyeClosedGlyph } from '../components/icons/ArchiveIcons'

const RESEND_COOLDOWN_SECONDS = 60

export default function Login() {
  const { user, signInWithOtp, verifyOtp, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'msrit.edu'

  const [step, setStep] = useState('otp-request')
  const [identifier, setIdentifier] = useState('')
  const [resolvedEmail, setResolvedEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [maskDigits, setMaskDigits] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  const inputRefs = useRef([])
  const verifyingRef = useRef(false)
  const requestingRef = useRef(false)

  useEffect(() => {
    if (resendTimer <= 0) return undefined
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const sendOtpForEmail = useCallback(
    async (targetEmail) => {
      if (requestingRef.current) return
      requestingRef.current = true
      setError('')
      setInfoMessage('')
      setSubmitting(true)

      try {
        const { data: allowed, error: checkError } = await supabase.rpc(
          'check_email_allowed',
          { p_email: targetEmail }
        )

        if (checkError) {
          throw checkError
        }

        if (allowed !== true) {
          setError(ALLOWED_NOT_REGISTERED_MESSAGE)
          return
        }

        await signInWithOtp(targetEmail)
        setResolvedEmail(targetEmail)
        setStep('otp-verify')
        setOtpDigits(['', '', '', '', '', ''])
        setResendTimer(RESEND_COOLDOWN_SECONDS)
        setInfoMessage(`We sent a 6-digit verification code to ${targetEmail}`)
      } catch (err) {
        console.error('[OTP Request Error]', err)
        setError(mapAuthErrorMessage(err))
      } finally {
        requestingRef.current = false
        setSubmitting(false)
      }
    },
    [signInWithOtp]
  )

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    const resolved = resolveLoginIdentifier(identifier, allowedDomain)

    if (!resolved.valid) {
      setError(
        `Enter your college USN (e.g. 1MS24IS013) or institutional email (@${allowedDomain}).`
      )
      return
    }

    await sendOtpForEmail(resolved.email)
  }

  const handleResendCode = async () => {
    if (resendTimer > 0 || !resolvedEmail) return
    await sendOtpForEmail(resolvedEmail)
  }

  const submitOtpToken = useCallback(
    async (token) => {
      if (verifyingRef.current) return
      if (token.length !== 6) {
        setError('Please enter all 6 digits of the verification code.')
        return
      }

      verifyingRef.current = true
      setError('')
      setInfoMessage('')
      setSubmitting(true)

      try {
        await verifyOtp({ email: resolvedEmail, token })
        const destination = location.state?.from?.pathname || '/'
        navigate(destination, { replace: true })
      } catch (err) {
        console.error('[Verify OTP Error]', err)
        setError(mapAuthErrorMessage(err))
      } finally {
        verifyingRef.current = false
        setSubmitting(false)
      }
    },
    [verifyOtp, resolvedEmail, location.state, navigate]
  )

  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    await submitOtpToken(otpDigits.join(''))
  }

  const handleDigitChange = (index, rawValue) => {
    const digitsOnly = rawValue.replace(/\D/g, '')

    if (digitsOnly.length >= 6) {
      const pasted = digitsOnly.slice(0, 6).split('')
      setOtpDigits(pasted)
      inputRefs.current[5]?.focus()
      void submitOtpToken(pasted.join(''))
      return
    }

    if (digitsOnly.length > 1) {
      const prevDigit = otpDigits[index]
      if (prevDigit && digitsOnly.length === 2) {
        const newDigit =
          digitsOnly[0] === prevDigit ? digitsOnly[1] : digitsOnly[0]
        const next = [...otpDigits]
        next[index] = newDigit
        setOtpDigits(next)
        if (index < 5) inputRefs.current[index + 1]?.focus()
        const fullCode = next.join('')
        if (fullCode.length === 6 && next.every((d) => d.length === 1)) {
          void submitOtpToken(fullCode)
        }
        return
      }

      const next = [...otpDigits]
      for (let i = 0; i < digitsOnly.length && index + i < 6; i += 1) {
        next[index + i] = digitsOnly[i]
      }
      setOtpDigits(next)
      const focusIdx = Math.min(index + digitsOnly.length - 1, 5)
      if (focusIdx >= 0) inputRefs.current[focusIdx]?.focus()
      const fullCode = next.join('')
      if (fullCode.length === 6 && next.every((d) => d.length === 1)) {
        void submitOtpToken(fullCode)
      }
      return
    }

    const next = [...otpDigits]
    next[index] = digitsOnly
    setOtpDigits(next)

    if (digitsOnly && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    const fullCode = next.join('')
    if (fullCode.length === 6 && next.every((d) => d.length === 1)) {
      void submitOtpToken(fullCode)
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleChangeEmail = () => {
    setStep('otp-request')
    setOtpDigits(['', '', '', '', '', ''])
    setResendTimer(0)
    setError('')
    setInfoMessage('')
  }

  if (!authLoading && user) {
    const destination = location.state?.from?.pathname || '/'
    return <Navigate to={destination} replace />
  }

  return (
    <div className="min-h-[78vh] flex items-center justify-center px-4 py-12 bg-[var(--bg-canvas)]">
      <div className="max-w-md w-full bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-strong)] p-7 sm:p-9 text-left">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-[var(--border-hairline)]">
          <div className="w-10 h-10 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-ink)] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-[var(--text-ink)] tracking-tight">
              {step === 'otp-verify' ? 'Enter Verification Code' : 'Institutional Access'}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {step === 'otp-verify'
                ? `Sent to ${resolvedEmail}`
                : `Passwordless Email OTP for @${allowedDomain} roster & approved staff`}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-[6px] bg-[var(--accent-danger-bg)] border border-[var(--accent-danger)]/30 text-xs font-semibold text-[var(--accent-danger)]"
          >
            {error}
          </div>
        )}

        {infoMessage && (
          <div
            role="status"
            className="mb-5 p-3 rounded-[6px] bg-[var(--accent-verified-bg)] border border-[var(--accent-verified)]/30 text-xs font-semibold text-[var(--accent-verified)]"
          >
            {infoMessage}
          </div>
        )}

        {/* STEP 1: USN OR EMAIL INPUT */}
        {step === 'otp-request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
              >
                USN or College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={`1MS24IS013 or name@${allowedDomain}`}
                  aria-invalid={Boolean(error)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] pl-10 pr-4 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] transition-colors font-medium"
                />
              </div>
              <p className="text-[11px] text-[var(--text-subtle)] mt-1.5">
                Students: enter your USN (e.g. 1MS24IS013). Staff: enter your registered email.
              </p>
            </div>

            <Button
              type="submit"
              variant="black"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              <span>{submitting ? 'Checking & Sending...' : 'Send 6-Digit Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        {/* STEP 2: 6-DIGIT OTP CODE VERIFICATION */}
        {step === 'otp-verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-mono-meta text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                6-Digit Security Code
              </span>
              <button
                type="button"
                onClick={() => setMaskDigits((prev) => !prev)}
                aria-pressed={maskDigits}
                aria-label={maskDigits ? 'Show code digits' : 'Hide code digits'}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)] cursor-pointer"
              >
                {maskDigits ? (
                  <>
                    <EyeOpenGlyph className="w-3.5 h-3.5" />
                    <span>Show digits</span>
                  </>
                ) : (
                  <>
                    <EyeClosedGlyph className="w-3.5 h-3.5" />
                    <span>Hide digits</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type={maskDigits ? 'password' : 'text'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={submitting}
                  aria-label={`Verification digit ${idx + 1}`}
                  className="h-12 sm:h-13 text-center font-mono-meta font-semibold text-lg text-[var(--text-ink)] bg-[var(--bg-surface)] rounded-[6px] border border-[var(--border-hairline)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-elevated)] focus:outline-none transition-colors disabled:opacity-60"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <Button
              type="submit"
              variant="black"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              <span>{submitting ? 'Verifying Code...' : 'Verify & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={submitting}
                className="inline-flex items-center gap-1 hover:text-[var(--text-ink)] font-semibold cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change email</span>
              </button>

              {resendTimer > 0 ? (
                <span className="font-mono-meta text-[var(--text-subtle)]">
                  Resend in {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={submitting}
                  className="font-semibold text-[var(--text-ink)] underline hover:opacity-80 cursor-pointer disabled:opacity-50"
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
