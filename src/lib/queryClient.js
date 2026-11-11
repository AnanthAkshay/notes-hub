import { QueryClient } from '@tanstack/react-query'

export const AUTH_CACHE_KEY = 'notes_hub_auth_cache_v1'
export const RQ_FEED_CACHE_KEY = 'notes_hub_rq_cache_v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const FEED_STALE_TIME_MS = 60 * 1000
const MAX_PERSISTED_QUERIES = 10

export function readAuthCache() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.userId) return null
    return parsed
  } catch {
    return null
  }
}

export function writeAuthCache(snapshot) {
  if (typeof window === 'undefined') return
  try {
    if (!snapshot || !snapshot.userId) {
      window.localStorage.removeItem(AUTH_CACHE_KEY)
      return
    }
    window.localStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({
        userId: snapshot.userId,
        email: snapshot.email || '',
        fullName: snapshot.fullName || '',
        role: snapshot.role || 'student',
        usn: snapshot.usn || '',
        updatedAt: Date.now(),
      })
    )
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function clearPersistedFeedCache() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(RQ_FEED_CACHE_KEY)
  } catch {
    // Ignore storage errors
  }
}

function isPersistableFeedKey(queryKey) {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false
  return queryKey[0] === 'home-feed' || queryKey[0] === 'notes-feed'
}

function persistFeedQueries(client, currentUserIdKey) {
  if (typeof window === 'undefined') return
  try {
    const allQueries = client.getQueryCache().getAll()
    const entries = allQueries
      .filter(
        (q) =>
          q.state.status === 'success' &&
          q.state.data !== undefined &&
          isPersistableFeedKey(q.queryKey) &&
          q.queryKey[1] === currentUserIdKey
      )
      .sort((a, b) => (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0))
      .slice(0, MAX_PERSISTED_QUERIES)
      .map((q) => ({
        queryKey: q.queryKey,
        data: q.state.data,
        savedAt: q.state.dataUpdatedAt || Date.now(),
      }))

    window.localStorage.setItem(
      RQ_FEED_CACHE_KEY,
      JSON.stringify({
        userIdKey: currentUserIdKey,
        entries,
      })
    )
  } catch {
    // Ignore storage quota or serialization errors
  }
}

function hydrateFeedQueries(client, currentUserIdKey) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(RQ_FEED_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.userIdKey !== currentUserIdKey || !Array.isArray(parsed.entries)) {
      return
    }

    const now = Date.now()
    for (const entry of parsed.entries) {
      if (!entry?.queryKey || entry.data === undefined) continue
      if (now - (entry.savedAt || 0) > CACHE_TTL_MS) continue

      // Hydrate with an older timestamp so cached notes render immediately
      // on browser refresh while TanStack Query revalidates quietly in background.
      const staleUpdatedAt = Math.max(0, (entry.savedAt || now) - (FEED_STALE_TIME_MS + 5000))
      client.setQueryData(entry.queryKey, entry.data, { updatedAt: staleUpdatedAt })
    }
  } catch {
    // Ignore malformed cache entries
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FEED_STALE_TIME_MS,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const initialAuth = readAuthCache()
const initialUserKey = initialAuth?.userId || 'anon'
hydrateFeedQueries(queryClient, initialUserKey)

let persistTimer = null
queryClient.getQueryCache().subscribe((event) => {
  if (!event?.query || !isPersistableFeedKey(event.query.queryKey)) return
  if (event.type !== 'updated' && event.type !== 'added') return
  if (event.query.state.status !== 'success') return

  const activeUserKey = readAuthCache()?.userId || 'anon'
  if (event.query.queryKey[1] !== activeUserKey) return

  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistFeedQueries(queryClient, activeUserKey)
  }, 150)
})

/**
 * Updates score and my_vote across all cached queries containing noteId so
 * navigation and refreshes immediately show authoritative vote state.
 */
export function updateNoteVoteInCache(client, noteId, score, myVote) {
  client.cancelQueries({ queryKey: ['home-feed'] })
  client.cancelQueries({ queryKey: ['notes-feed'] })
  client.cancelQueries({ queryKey: ['note-detail', noteId] })

  const patchItem = (item) =>
    item && item.id === noteId ? { ...item, score, my_vote: myVote } : item

  client.setQueriesData({ queryKey: ['home-feed'] }, (old) => {
    if (!old) return old
    return {
      ...old,
      topVerifiedNotes: Array.isArray(old.topVerifiedNotes)
        ? old.topVerifiedNotes.map(patchItem)
        : old.topVerifiedNotes,
      newestNotes: Array.isArray(old.newestNotes)
        ? old.newestNotes.map(patchItem)
        : old.newestNotes,
    }
  })

  client.setQueriesData({ queryKey: ['notes-feed'] }, (old) => {
    if (!old || !Array.isArray(old.pages)) return old
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: Array.isArray(page.items) ? page.items.map(patchItem) : page.items,
      })),
    }
  })

  client.setQueriesData({ queryKey: ['note-detail', noteId] }, (old) => {
    if (!old || !old.note) return old
    return {
      ...old,
      note: { ...old.note, score },
      myVote,
    }
  })

  client.setQueriesData({ queryKey: ['review-queues'] }, (old) => {
    if (!old) return old
    return {
      ...old,
      unverifiedNotes: Array.isArray(old.unverifiedNotes)
        ? old.unverifiedNotes.map(patchItem)
        : old.unverifiedNotes,
    }
  })
}

export function updateNoteVerificationInCache(client, noteId, updatedFields) {
  client.setQueriesData({ queryKey: ['note-detail', noteId] }, (old) => {
    if (!old || !old.note) return old
    return {
      ...old,
      note: {
        ...old.note,
        verified: updatedFields.verified,
        verified_by: updatedFields.verified_by,
        verified_at: updatedFields.verified_at,
        verifier: updatedFields.verified
          ? updatedFields.verifier_name
            ? { full_name: updatedFields.verifier_name, email: old.note.verifier?.email || '' }
            : old.note.verifier
          : null,
      },
    }
  })

  client.invalidateQueries({ queryKey: ['home-feed'] })
  client.invalidateQueries({ queryKey: ['notes-feed'] })
  client.invalidateQueries({ queryKey: ['review-queues'] })
}

