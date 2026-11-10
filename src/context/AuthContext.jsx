import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './authContextDef'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Helper to fetch the matching row from the "profiles" table
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[Auth] Error fetching profile:', error.message)
        return null
      }
      setProfile(data)
      return data
    } catch (err) {
      console.error('[Auth] Unexpected error fetching profile:', err)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true

    // 1. Restore existing session on initial load
    async function initSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[Auth] Error getting session:', error.message)
        }

        if (isMounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
        }
      } catch (err) {
        console.error('[Auth] Failed to initialize session:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initSession()

    // 2. Listen to real-time auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // Sign up with email, password, and full name
  const signUp = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          role: 'student', // default role
        },
      },
    })
    if (error) throw error
    return data
  }

  // Sign in with email and password
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // Request 6-digit OTP code sent to college email
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

  // Sign out the current user
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithOtp,
    verifyOtp,
    signOut,
    refreshProfile: () => (user ? fetchProfile(user.id) : Promise.resolve(null)),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

