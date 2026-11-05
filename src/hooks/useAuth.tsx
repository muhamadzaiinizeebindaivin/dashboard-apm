import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
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
  negeri: string | null // PKON: the only state (or "Wilayah Persekutuan") they can see; PKOP: null
}

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  profilSedia: boolean // the profile request has answered (row found, no row, or failed)
  profilRalat: string | null // the request FAILED (network / Supabase down) — not the same as "no row"
  signOut: () => Promise<void>
  muatSemulaProfil: () => Promise<void>
}

const PROFIL_KOLUM = 'id, full_name, role, status, catatan_kelulusan, negeri'

// maybeSingle: a missing row gives data = null WITHOUT an error,
// so `error` only ever means the request itself failed
function ambilProfil(userId: string) {
  return supabase.from('profiles').select(PROFIL_KOLUM).eq('id', userId).maybeSingle()
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
  const [profilSedia, setProfilSedia] = useState(false)
  const [profilRalat, setProfilRalat] = useState<string | null>(null)
  const loadedUserId = useRef<string | null>(null)
  const currentUserId = useRef<string | null>(null) // drops answers that arrive after the user changed

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        // Back to the initial state, so the next login waits for its own profile
        // instead of briefly showing the status page
        setProfile(null)
        setProfilSedia(false)
        setProfilRalat(null)
        loadedUserId.current = null
        currentUserId.current = null
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return
    const userId = session.user.id
    currentUserId.current = userId

    // Token refresh / tab-refocus fires this too, but the user hasn't
    // changed — skip re-fetching unless it's genuinely a different user.
    if (loadedUserId.current === userId) return

    setProfilSedia(false)
    ambilProfil(userId).then(({ data, error }) => {
      if (currentUserId.current !== userId) return

      if (error) {
        // Request failed (e.g. Supabase 503): NOT "profile deleted".
        // Not marked as loaded, so the next session event or a retry tries again.
        setProfile(null)
        setProfilRalat(error.message)
      } else {
        // data = null here really means no row (deleted / never created)
        setProfile((data as Profile | null) ?? null)
        setProfilRalat(null)
        loadedUserId.current = userId
      }
      setProfilSedia(true)
    })
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
  }

  // "Semak Status" / "Cuba Semula" on the status page, and the automatic retry
  const muatSemulaProfil = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    const { data, error } = await ambilProfil(userId)
    if (currentUserId.current !== userId) return

    if (error) {
      setProfilRalat(error.message) // keep whatever profile we already had
      return
    }
    setProfile((data as Profile | null) ?? null)
    setProfilRalat(null)
    setProfilSedia(true)
    loadedUserId.current = userId
  }, [session])

  return (
    <AuthContext.Provider value={{ session, profile, loading, profilSedia, profilRalat, signOut, muatSemulaProfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}