import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { WILAYAH_PERSEKUTUAN, kumpulanNegeri } from './kumpulanNegeri'

// Parlimen / ADUN reference list (table kawasan_pilihan_raya), loaded once and shared.
// Labels carry their code: "P.062 Sungai Siput", "N.21 Lintang" (Sabah/Sarawak: name only).

export type KawasanPR = { negeri: string; parlimen: string; dun: string | null }

let cache: Promise<KawasanPR[]> | null = null

export function ambilKawasan(): Promise<KawasanPR[]> {
  if (!cache) {
    cache = Promise.resolve(
      supabase.from('kawasan_pilihan_raya').select('negeri, parlimen, dun').order('id'),
    ).then(({ data, error }) => {
      if (error) {
        cache = null // try again next time
        return []
      }
      return (data as KawasanPR[]) ?? []
    })
  }
  return cache
}

export function useKawasan(): KawasanPR[] {
  const [kawasan, setKawasan] = useState<KawasanPR[]>([])
  useEffect(() => {
    let aktif = true
    ambilKawasan().then((k) => {
      if (aktif) setKawasan(k)
    })
    return () => {
      aktif = false
    }
  }, [])
  return kawasan
}

// A real state matches itself; "Wilayah Persekutuan" matches KL, Putrajaya and Labuan
const padanNegeri = (k: KawasanPR, negeri: string) =>
  negeri === WILAYAH_PERSEKUTUAN ? kumpulanNegeri(k.negeri) === WILAYAH_PERSEKUTUAN : k.negeri === negeri

// Parlimen of a state, in official order
export function parlimenNegeri(kawasan: KawasanPR[], negeri: string): string[] {
  return [...new Set(kawasan.filter((k) => padanNegeri(k, negeri)).map((k) => k.parlimen))]
}

// ADUN of a state, or of one of its Parlimen
export function dunNegeri(kawasan: KawasanPR[], negeri: string, parlimen?: string): string[] {
  return kawasan
    .filter((k) => padanNegeri(k, negeri) && (!parlimen || k.parlimen === parlimen) && k.dun)
    .map((k) => k.dun!)
}

// Parlimen an ADUN belongs to (to fill the Parlimen when only the ADUN is chosen)
export function parlimenBagiDun(kawasan: KawasanPR[], negeri: string, dun: string): string | null {
  return kawasan.find((k) => padanNegeri(k, negeri) && k.dun === dun)?.parlimen ?? null
}