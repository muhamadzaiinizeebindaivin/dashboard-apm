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

// Max 2 devices per account (limit enforced in SQL: hadkan_sesi)
const SEMAK_SESI_MS = 60_000
// Set when this device was logged out by a newer login; read by the login form
export const KUNCI_NOTIS_SESI = 'notis-sesi-tamat'

// Session id inside the access token (JWT claim "session_id"): names this device's Realtime channel
function idSesiDaripadaToken(token: string | undefined): string | null {
  if (!token) return null
  try {
    const muatan = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof muatan.session_id === 'string' ? muatan.session_id : null
  } catch {
    return null
  }
}


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

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'SIGNED_IN' && newSession) {
        // New login (password, invite or reset link): keep max 2 devices.
        // Run outside the callback, since Supabase calls inside it can deadlock.
        setTimeout(() => {
          void supabase.rpc('hadkan_sesi').then(({ error }) => {
            if (error) console.error('[hadkan_sesi] gagal:', error)
          })
        }, 0)
      }
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

  // Device kicked by a newer login or by the Super Admin: its token stays valid up to 1 h.
  // The database sends a "sesi_tamat" message on this device's own channel (instant),
  // and the check also runs every minute and on tab focus as a backup.
  const userIdSesi = session?.user?.id
  const idSesi = idSesiDaripadaToken(session?.access_token)
  useEffect(() => {
    if (!userIdSesi) return
    let batal = false

    const semak = async () => {
      const { data, error } = await supabase.rpc('sesi_masih_sah')
      if (batal || error) return // network/server error: never log out on a failed check
      if (data === false) {
        try {
          sessionStorage.setItem(KUNCI_NOTIS_SESI, '1')
        } catch {
          // storage blocked: the logout still happens, just without the notice
        }
        await supabase.auth.signOut({ scope: 'local' })
      }
    }

    const bilaNampak = () => {
      if (document.visibilityState === 'visible') void semak()
    }

    void semak()
    const pemasa = setInterval(semak, SEMAK_SESI_MS)
    document.addEventListener('visibilitychange', bilaNampak)
    window.addEventListener('focus', bilaNampak)

    // Instant: the message only triggers the check, which confirms the session is really gone
    const saluran = idSesi
      ? supabase
          .channel(`sesi:${idSesi}`)
          .on('broadcast', { event: 'sesi_tamat' }, () => void semak())
          .subscribe()
      : null

    return () => {
      batal = true
      clearInterval(pemasa)
      document.removeEventListener('visibilitychange', bilaNampak)
      window.removeEventListener('focus', bilaNampak)
      if (saluran) void supabase.removeChannel(saluran)
    }
  }, [userIdSesi, idSesi])

  async function signOut() {
    // Remove this device from open device lists right away (errors ignored: logout must still happen)
    await supabase.rpc('tamat_sesi_saya')
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