import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useRealtime } from './realtime'
import { useAuth } from '../hooks/useAuth'

// Devices logged in to an account (Profil Saya, and Admin for the Super Admin).
// Rows come from the senarai_peranti SQL function (auth.sessions + sesi_aktif).

export type Peranti = {
  peranti_id: string
  ejen: string | null // browser user agent
  alamat_ip: string | null
  log_masuk: string
  aktif_terakhir: string
  semasa: boolean // the device viewing the list
}

export type JenisPeranti = 'telefon' | 'tablet' | 'komputer'

// Same limit as hadkan_sesi (SQL)
export const HAD_PERANTI = 2
const SEGAR_MS = 60_000

// "Mozilla/5.0 (X11; Ubuntu; …) Firefox/157.0" -> "Firefox · Linux"
export function bacaEjen(ua: string | null): { nama: string; jenis: JenisPeranti } {
  if (!ua) return { nama: 'Peranti tidak dikenali', jenis: 'komputer' }

  const sistem = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Macintosh|Mac OS X/.test(ua)
            ? 'Mac'
            : /CrOS/.test(ua)
              ? 'ChromeOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'Lain-lain'

  // Order matters: Edge, Opera and Samsung also contain "Chrome", and Chrome contains "Safari"
  const pelayar = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'Firefox'
          : /Chrome\/|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Pelayar'

  const jenis: JenisPeranti =
    sistem === 'iPad' || (sistem === 'Android' && !/Mobile/.test(ua))
      ? 'tablet'
      : sistem === 'iPhone' || sistem === 'Android'
        ? 'telefon'
        : 'komputer'

  return { nama: `${pelayar} · ${sistem}`, jenis }
}

// userId omitted = the logged-in user's own devices
export function usePeranti(userId?: string) {
  const { session } = useAuth()
  const sasaran = userId ?? session?.user?.id
  const [senarai, setSenarai] = useState<Peranti[]>([])
  const [memuat, setMemuat] = useState(true)
  const [ralat, setRalat] = useState('')

  const muat = useCallback(async () => {
    const { data, error } = await supabase.rpc('senarai_peranti', userId ? { p_user: userId } : {})
    setMemuat(false)
    if (error) {
      setRalat('Gagal memuatkan senarai peranti.')
      return
    }
    setRalat('')
    setSenarai((data as Peranti[]) ?? [])
  }, [userId])

  useEffect(() => {
    void muat()
  }, [muat])

  // Live: login / heartbeat of this account's devices, and any device logout
  // (Supabase can't filter delete events, so every logout reloads the open list).
  // The poll is a safety net in case the Realtime connection drops.
  useRealtime(
    'senarai-peranti',
    sasaran
      ? [
          { jadual: 'sesi_aktif', peristiwa: 'INSERT', tapis: `user_id=eq.${sasaran}` },
          { jadual: 'sesi_aktif', peristiwa: 'UPDATE', tapis: `user_id=eq.${sasaran}` },
          { jadual: 'sesi_aktif', peristiwa: 'DELETE' },
        ]
      : [],
    muat,
    { aktif: !!sasaran, tinjau: SEGAR_MS },
  )

  return { senarai, memuat, ralat, muat }
}

// Super Admin: end one device's session (it returns to the login page within a minute)
export async function logKeluarPeranti(perantiId: string): Promise<string | null> {
  const { error } = await supabase.rpc('log_keluar_peranti', { p_sesi: perantiId })
  return error ? error.message : null
}