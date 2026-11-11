const UTM_STORAGE_KEY = 'notes_hub_utm_attribution'
const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]

export function captureUtmFromSearch(searchString) {
  if (!searchString) return null
  const params = new URLSearchParams(searchString)
  const captured = {}
  let found = false

  for (const key of UTM_KEYS) {
    const val = params.get(key)?.trim()
    if (val) {
      captured[key] = val.slice(0, 120)
      found = true
    }
  }

  if (!found) return null

  const payload = {
    ...captured,
    landedAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage failures
    }
  }

  return payload
}

export function getStoredUtm() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function buildShareUrlWithUtm(pathname, source = 'copy_button') {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://notes-hub.local'
  const url = new URL(pathname, origin)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', 'share')
  return typeof window !== 'undefined'
    ? url.toString()
    : `${url.pathname}${url.search}`
}
