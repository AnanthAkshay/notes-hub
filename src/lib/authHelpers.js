export const ALLOWED_NOT_REGISTERED_MESSAGE =
  "This email isn't registered. Students use their college USN. Teachers: ask the admin to add you."

export const USN_PATTERN = /^1MS\d{2}IS\d{3}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const IDENTIFIER_WITHOUT_AT = /^[a-z0-9._-]+$/i

export function isTeacherRole(role) {
  return role === 'teacher' || role === 'admin'
}

export function isAdminRole(role) {
  return role === 'admin'
}

/**
 * Converts a student USN (e.g. "1MS24IS013") or full email into a normalized
 * lowercase email address for OTP login.
 */
export function resolveLoginIdentifier(rawInput, allowedDomain = 'msrit.edu') {
  const trimmed = String(rawInput || '').trim()
  if (!trimmed) {
    return { email: '', isUsn: false, valid: false }
  }

  const normalizedDomain = String(allowedDomain || 'msrit.edu')
    .trim()
    .toLowerCase()

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase()
    return {
      email,
      isUsn: false,
      valid: EMAIL_PATTERN.test(email),
    }
  }

  if (!IDENTIFIER_WITHOUT_AT.test(trimmed)) {
    return { email: '', isUsn: false, valid: false }
  }

  const isUsn = USN_PATTERN.test(trimmed)
  const email = `${trimmed.toLowerCase()}@${normalizedDomain}`
  return {
    email,
    isUsn,
    valid: EMAIL_PATTERN.test(email),
  }
}

/**
 * Maps Supabase Auth / Postgres trigger / OTP errors into clear user-facing messages.
 */
export function mapAuthErrorMessage(err) {
  const msg = String(err?.message || err || '')
  const status = err?.status

  if (
    status === 429 ||
    /429|rate limit|too many requests|for security purposes|only request this after/i.test(msg)
  ) {
    return 'Too many attempts. Please wait 60 seconds before trying again.'
  }

  if (
    /not_registered|not registered|student_roster|staff_allowlist|database error saving new user/i.test(
      msg
    )
  ) {
    return ALLOWED_NOT_REGISTERED_MESSAGE
  }

  if (/expired/i.test(msg)) {
    return 'That verification code has expired. Please request a new 6-digit code.'
  }

  if (/invalid|token|otp|unable to verify|forbidden/i.test(msg)) {
    return 'Incorrect verification code. Please check all 6 digits and try again.'
  }

  return msg || 'Authentication failed. Please try again.'
}

