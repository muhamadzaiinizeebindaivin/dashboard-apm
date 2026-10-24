import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'pkop' | 'pkon'
export type StatusAkaun = 'menunggu_kelulusan' | 'aktif' | 'ditolak'

type Profile = {
  id: string
  full_name: string | null
  role: UserRole | null // null until a Super Admin approves the registration
  status: StatusAkaun
  catatan_kelulusan: string | null // reason given when a registration is rejected
}

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  profilSedia: boolean // the profile request has answered (row found or not)
  signOut: () => Promise<void>
  muatSemulaProfil: () => Promise<void>
}

const PROFIL_KOLUM = 'id, full_name, role, status, catatan_kelulusan'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // `loading` only reflects whether we know yet if there IS a session —
  // it does NOT wait for the profile row. That way the dashboard renders
  // right after login instead of blocking on a second fetch; the role
  // badge in the nav just fills in a moment later once profile arrives.
  const [loading, setLoading] = useState(true)
  const [profilSedia, setProfilSedia] = useState(false)
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

    setProfilSedia(false)
    supabase
      .from('profiles')
      .select(PROFIL_KOLUM)
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        // No row (deleted / never created) or request refused: profile stays null,
        // and the guards then show the status page instead of the dashboard
        setProfile((data as Profile | null) ?? null)
        setProfilSedia(true)
        loadedUserId.current = session.user.id
      })
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
  }

  // "Semak semula" on the waiting page: has a Super Admin decided yet?
  async function muatSemulaProfil() {
    if (!session?.user) return
    const { data } = await supabase.from('profiles').select(PROFIL_KOLUM).eq('id', session.user.id).single()
    if (data) setProfile(data as Profile)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, profilSedia, signOut, muatSemulaProfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
