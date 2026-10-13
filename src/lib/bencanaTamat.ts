import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

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
    const { data } = await supabase.from('bencana_tamat').select('*')
    setSenarai((data as BencanaTamat[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
    const channel = supabase
      .channel(`bencana-tamat-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bencana_tamat' }, () => muat())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [muat])

  return senarai
}