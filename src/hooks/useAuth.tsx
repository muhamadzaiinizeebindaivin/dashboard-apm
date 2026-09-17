import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'pkop' | 'pkon'

type Profile = {
  id: string
  full_name: string | null
  role: UserRole
}

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // `loading` only reflects whether we know yet if there IS a session —
  // it does NOT wait for the profile row. That way the dashboard renders
  // right after login instead of blocking on a second fetch; the role
  // badge in the nav just fills in a moment later once profile arrives.
  const [loading, setLoading] = useState(true)
  const loadedUserId = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setProfile(null)
        loadedUserId.current = null
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return

    // Token refresh / tab-refocus fires this too, but the user hasn't
    // changed — skip re-fetching unless it's genuinely a different user.
    if (loadedUserId.current === session.user.id) return

    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data as Profile | null)
        loadedUserId.current = session.user.id
      })
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
