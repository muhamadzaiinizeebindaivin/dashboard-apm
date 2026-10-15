import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Shared Realtime subscription.
// - Unique channel name per mount: two components using the same hook no longer
//   share (and remove) each other's channel.
// - Debounced: a burst of changes (e.g. a Laporan Semasa import touching 30 PPS)
//   triggers one reload instead of 30.
// - Optional poll, only while the tab is visible; coming back to the tab
//   refreshes once (Realtime may have dropped while it was in the background).

type Peristiwa = '*' | 'INSERT' | 'UPDATE' | 'DELETE'
type LanggananJadual = { jadual: string; peristiwa?: Peristiwa; tapis?: string }
export type Langganan = string | LanggananJadual

type Pilihan = {
  aktif?: boolean // false: no subscription at all (default true)
  tunda?: number // debounce in ms (default 500)
  tinjau?: number // poll interval in ms while the tab is visible (default 0 = none)
}

let bil = 0
export function saluranUnik(nama: string) {
  bil += 1
  return `${nama}-${bil}-${Math.random().toString(36).slice(2, 8)}`
}

export function useRealtime(
  nama: string,
  langganan: Langganan[],
  onChange: () => void,
  { aktif = true, tunda = 500, tinjau = 0 }: Pilihan = {},
) {
  // Always call the latest callback without re-subscribing on every render
  const panggil = useRef(onChange)
  useEffect(() => {
    panggil.current = onChange
  })

  // Inline arrays are new on every render: compare by content instead
  const kunci = JSON.stringify(langganan)

  useEffect(() => {
    if (!aktif) return
    let pemasa: ReturnType<typeof setTimeout> | undefined
    const jadualkan = () => {
      clearTimeout(pemasa)
      pemasa = setTimeout(() => panggil.current(), tunda)
    }

    const channel = supabase.channel(saluranUnik(nama))
    for (const l of JSON.parse(kunci) as Langganan[]) {
      const s: LanggananJadual = typeof l === 'string' ? { jadual: l } : l
      channel.on(
        'postgres_changes',
        { event: s.peristiwa ?? '*', schema: 'public', table: s.jadual, ...(s.tapis ? { filter: s.tapis } : {}) },
        jadualkan,
      )
    }
    channel.subscribe()

    const jeda =
      tinjau > 0
        ? setInterval(() => {
            if (document.visibilityState === 'visible') panggil.current()
          }, tinjau)
        : undefined
    const bilaKembali = () => {
      if (document.visibilityState === 'visible') jadualkan()
    }
    document.addEventListener('visibilitychange', bilaKembali)

    return () => {
      clearTimeout(pemasa)
      clearInterval(jeda)
      document.removeEventListener('visibilitychange', bilaKembali)
      supabase.removeChannel(channel)
    }
  }, [nama, kunci, aktif, tunda, tinjau])
}