import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useRealtime } from './realtime'

// No new report (or "Masih aktif" confirmation) for this long: the disaster needs action.
// Nothing is ended automatically any more: a person decides (popup on the Laman Utama).
export const HAD_TINDAKAN_JAM = 24
export const HAD_AMARAN_JAM = 20 // early warning: a report is due soon

export type BencanaTamat = {
  nama_bencana: string
  ditamatkan_pada: string
  ditamatkan_oleh: string | null
  catatan: string | null
}

// Ended disasters, kept live (several pages show the TAMAT badge)
export function useBencanaTamat() {
  const [senarai, setSenarai] = useState<BencanaTamat[]>([])

  const muat = useCallback(async () => {
    const { data, error } = await supabase.from('bencana_tamat').select('*')
    if (error) return // keep the last list: a TAMAT badge must not vanish on a network blip
    setSenarai((data as BencanaTamat[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
  }, [muat])
  useRealtime('bencana-tamat', ['bencana_tamat'], muat)

  return senarai
}