import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { JENIS_BENCANA } from './laporanBencana'
import { kunci } from './normalisasi'

// Disaster types = the categories managed in "Urus Kategori" (table kategori_bencana),
// read through a public function so the /laporan form works before login too.
// If they can't be read, the original 7 types keep the forms and reports working.

export type JenisBencana = { key: string; label: string; warna: string | null }

// Colours used before categories had their own (and as a fallback)
const WARNA_ASAL: Record<string, string> = {
  Ribut: '#3b8ed6',
  Banjir: '#2563eb',
  Tsunami: '#14828c',
  Kebakaran: '#dc2626',
  'Tanah Runtuh': '#785428',
  Pencemaran: '#ca8a04',
  'Bangunan Runtuh': '#6b7280',
}

const ASAL: JenisBencana[] = JENIS_BENCANA.map((label) => ({ key: kunci(label), label, warna: WARNA_ASAL[label] }))

// Last list read, shared by the forms, the national report and its PDF
let simpanan: JenisBencana[] | null = null

export async function ambilJenisBencana(): Promise<JenisBencana[]> {
  const { data, error } = await supabase.rpc('senarai_kategori_awam')
  const senarai = (data as JenisBencana[] | null) ?? []
  if (error || senarai.length === 0) return simpanan ?? ASAL
  simpanan = senarai
  return senarai
}

export function useJenisBencana() {
  const [senarai, setSenarai] = useState<JenisBencana[]>(() => simpanan ?? ASAL)
  useEffect(() => {
    let batal = false
    ambilJenisBencana().then((s) => {
      if (!batal) setSenarai(s)
    })
    return () => {
      batal = true
    }
  }, [])
  return senarai
}

// Colour of a type: its category's colour, else the original one, else grey
export function warnaJenis(jenis: string): string {
  const k = kunci(jenis)
  const w = (simpanan ?? ASAL).find((j) => kunci(j.label) === k)?.warna
  if (w && /^#[0-9a-f]{6}$/i.test(w)) return w
  return WARNA_ASAL[jenis] ?? '#6b7280'
}

export function warnaJenisRgb(jenis: string): [number, number, number] {
  const h = warnaJenis(jenis)
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

// Types in the same order as the category list (Urus Kategori); unknown ones last
export function susunJenis(jenis: string[]): string[] {
  const urutan = (simpanan ?? ASAL).map((j) => kunci(j.label))
  const kedudukan = (j: string) => {
    const i = urutan.indexOf(kunci(j))
    return i === -1 ? urutan.length : i
  }
  return [...new Set(jenis)].sort((a, b) => kedudukan(a) - kedudukan(b) || a.localeCompare(b))
}