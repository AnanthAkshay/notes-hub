import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './authContextDef'
import {
  readAuthCache,
  writeAuthCache,
  clearPersistedFeedCache,
  queryClient,
} from '../lib/queryClient'

export function AuthProvider({ children }) {
  const [cachedAuth] = useState(() => readAuthCache())

  const [user, setUser] = useState(() =>
    cachedAuth?.userId ? { id: cachedAuth.userId, email: cachedAuth.email } : null
  )
  const [profile, setProfile] = useState(() =>
    cachedAuth?.userId
      ? {
          id: cachedAuth.userId,
          email: cachedAuth.email,
          full_name: cachedAuth.fullName || '',
          role: cachedAuth.role || 'student',
          usn: cachedAuth.usn || null,
        }
      : null
  )
  // Never block first paint when a cached session/role is available
  const [loading, setLoading] = useState(() => !cachedAuth?.userId)
  const [profileResolved, setProfileResolved] = useState(() => Boolean(cachedAuth?.userId))

  const activeUserIdRef = useRef(cachedAuth?.userId || null)
  const profileFetchPromiseRef = useRef({ userId: null, promise: null })
  const isMountedRef = useRef(true)

  // Deduplicated background profile validator (selects only needed columns)
  const fetchProfile = useCallback((sessionUser) => {
    const userId = sessionUser?.id
    if (!userId) return Promise.resolve(null)

    const inFlight = profileFetchPromiseRef.current
    if (inFlight.userId === userId && inFlight.promise) {
      return inFlight.promise
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, usn')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.error('[Auth] Error fetching profile:', error.message)
          return null
        }

        if (data && isMountedRef.current && activeUserIdRef.current === userId) {
          setProfile(data)
          writeAuthCache({
            userId: data.id,
            email: data.email || sessionUser.email || '',
            fullName: data.full_name || '',
            role: data.role || 'student',
            usn: data.usn || '',
          })
        }
        return data
      } catch (err) {
        console.error('[Auth] Unexpected error fetching profile:', err)
        return null
      } finally {
        if (isMountedRef.current && activeUserIdRef.current === userId) {
          setProfileResolved(true)
        }
        if (profileFetchPromiseRef.current.userId === userId) {
          profileFetchPromiseRef.current = { userId: null, promise: null }
        }
      }
    })()

    profileFetchPromiseRef.current = { userId, promise }
    return promise
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    const applyAuthenticatedUser = (sessionUser) => {
      const prevUserId = activeUserIdRef.current
      activeUserIdRef.current = sessionUser.id

      if (prevUserId && prevUserId !== sessionUser.id) {
        clearPersistedFeedCache()
        queryClient.invalidateQueries({ queryKey: ['home-feed'] })
        queryClient.invalidateQueries({ queryKey: ['notes-feed'] })
      }

      setUser(sessionUser)
      setLoading(false)

      const currentCache = readAuthCache()
      if (currentCache?.userId === sessionUser.id) {
        setProfileResolved(true)
        setProfile((prev) =>
          prev && prev.id === sessionUser.id
            ? prev
            : {
                id: currentCache.userId,
                email: currentCache.email || sessionUser.email || '',
                full_name: currentCache.fullName || '',
                role: currentCache.role || 'student',
                usn: currentCache.usn || null,
              }
        )
      } else {
        setProfileResolved(false)
        writeAuthCache({
          userId: sessionUser.id,
          email: sessionUser.email || '',
          fullName: sessionUser.user_metadata?.full_name || '',
          role: 'student',
          usn: '',
        })
      }

      // Validate/refresh profile quietly in background
      void fetchProfile(sessionUser)
    }

    const clearSessionState = () => {
      const hadUser = Boolean(activeUserIdRef.current)
      activeUserIdRef.current = null
      writeAuthCache(null)
      if (hadUser) {
        clearPersistedFeedCache()
        queryClient.invalidateQueries({ queryKey: ['home-feed'] })
        queryClient.invalidateQueries({ queryKey: ['notes-feed'] })
      }
      setUser(null)
      setProfile(null)
      setProfileResolved(true)
      setLoading(false)
    }

    async function initSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('[Auth] Error getting session:', error.message)
        }

        if (!isMountedRef.current) return

        if (session?.user) {
          applyAuthenticatedUser(session.user)
        } else {
          clearSessionState()
        }
      } catch (err) {
        console.error('[Auth] Failed to initialize session:', err)
        if (isMountedRef.current) setLoading(false)
      }
    }

    initSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) return

      if (event === 'SIGNED_OUT' || !session?.user) {
        clearSessionState()
        return
      }

      const isNewSignIn =
        event === 'SIGNED_IN' && activeUserIdRef.current !== session.user.id

      applyAuthenticatedUser(session.user)

      if (isNewSignIn) {
        queryClient.invalidateQueries({ queryKey: ['home-feed'] })
        queryClient.invalidateQueries({ queryKey: ['notes-feed'] })
      }
    })

    return () => {
      isMountedRef.current = false
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

  // Request 6-digit passwordless OTP code sent to registered student/staff email
  const signInWithOtp = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    if (error) throw error
    return data
  }

  // Verify 6-digit OTP code
  const verifyOtp = async ({ email, token }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    activeUserIdRef.current = null
    writeAuthCache(null)
    clearPersistedFeedCache()
    queryClient.invalidateQueries({ queryKey: ['home-feed'] })
    queryClient.invalidateQueries({ queryKey: ['notes-feed'] })
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    profileResolved,
    signInWithOtp,
    verifyOtp,
    signOut,
    refreshProfile: () => (user ? fetchProfile(user) : Promise.resolve(null)),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
