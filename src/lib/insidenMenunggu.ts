import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Insiden confirmed as a disaster by PKOP, still waiting for their Laporan Awal
// (notification on the report page). Staff see theirs (PKON: own state only);
// PKOD see them with the /laporan access code.

export type InsidenMenunggu = {
  id: string
  nama_bencana: string | null
  ringkasan: string
  tempat: string
  daerah: string
  negeri: string
  diputuskan_pada: string | null
}

// The table is locked to PKOP, so no Realtime here: checked every minute and on tab focus
const SEMAK_MS = 60_000

// kod: the /laporan access code (null for logged-in staff)
export function useInsidenMenunggu(kod: string | null) {
  const [senarai, setSenarai] = useState<InsidenMenunggu[]>([])

  const muat = useCallback(async () => {
    const { data, error } = await supabase.rpc('insiden_menunggu', { p_code: kod })
    if (error) return // keep what is on screen
    setSenarai((data as InsidenMenunggu[]) ?? [])
  }, [kod])

  useEffect(() => {
    void muat()
    const pemasa = setInterval(muat, SEMAK_MS)
    const bilaNampak = () => {
      if (document.visibilityState === 'visible') void muat()
    }
    document.addEventListener('visibilitychange', bilaNampak)
    return () => {
      clearInterval(pemasa)
      document.removeEventListener('visibilitychange', bilaNampak)
    }
  }, [muat])

  return { senarai, muat }
}

// Name shown for an insiden (older confirmations may have no disaster name)
export const namaInsiden = (i: Pick<InsidenMenunggu, 'nama_bencana' | 'ringkasan'>) => i.nama_bencana || i.ringkasan
