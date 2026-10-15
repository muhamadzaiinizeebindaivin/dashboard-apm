import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useRealtime } from './realtime'

// A disaster with no new report for this long is ended automatically (pg_cron job)
export const HAD_TAMAT_AUTO_JAM = 24

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