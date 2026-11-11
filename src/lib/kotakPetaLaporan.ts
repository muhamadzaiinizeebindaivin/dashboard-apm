import { kumpulanNegeri } from './kumpulanNegeri'
import { susunJenis } from './jenisBencana'
import { NEGERI_NORM } from './negeriVisual'
import type { ItemLaporanNasional } from './laporanNasional'

// Callout boxes of the Laporan Nasional map (on-screen preview and PDF):
// one box per state AND disaster type, so a state with a flood and a
// landslide gets two boxes and two markers instead of one merged box.

export type KotakPeta = {
  negeri: string
  jenis: string
  x: number // marker position, as a share (0–1) of the map width / height
  y: number
  kiri: boolean // the state is on the left half of the map (Peninsular)
  baris: string[] // lines under the box title
}

// Lines under each box title (JENIS, TREND, DAERAH, PPS, KELUARGA, MANGSA)
export const BARIS_KOTAK = 6

// Gap between the markers of one state, as a share of the map width
const JARAK_PENANDA = 0.022

const kiraPps = (pps: string | null) => (pps ? pps.split('\n').filter((s) => s.trim()).length : 0)

export function kotakPetaLaporan(aktif: ItemLaporanNasional[]): KotakPeta[] {
  const negeriAktif = [...new Set(aktif.map((i) => kumpulanNegeri(i.negeri)).filter((n): n is string => !!n))]
  const hasil: KotakPeta[] = []

  for (const negeri of negeriAktif) {
    const norm = NEGERI_NORM[negeri]
    if (!norm) continue

    // KL, Putrajaya and Labuan: one Wilayah Persekutuan group
    const punyaNegeri = aktif.filter((i) => kumpulanNegeri(i.negeri) === negeri)
    // Same order as the category list (Urus Kategori)
    const jenisNegeri = susunJenis(punyaNegeri.map((i) => i.jenisBencana))

    jenisNegeri.forEach((jenis, idx) => {
      const punya = punyaNegeri.filter((i) => i.jenisBencana === jenis)
      const daerah = new Set(punya.filter((i) => i.daerah).map((i) => i.daerah))
      const pps = punya.reduce((n, i) => n + kiraPps(i.pps), 0)
      const keluarga = punya.reduce((n, i) => n + i.jumlahKeluarga, 0)
      const mangsa = punya.reduce((n, i) => n + i.jumlahMangsa, 0)
      const trend = punya.some((i) => i.trend === 'naik')
        ? 'NAIK'
        : punya.some((i) => i.trend === 'turun')
          ? 'TURUN'
          : 'KEKAL'

      hasil.push({
        negeri,
        jenis,
        // Markers of one state side by side, centred on the state
        x: norm.x + (idx - (jenisNegeri.length - 1) / 2) * JARAK_PENANDA,
        y: norm.y,
        kiri: norm.x < 0.5,
        baris: [
          `JENIS : ${jenis.toUpperCase()}`,
          `TREND : ${trend}`,
          `DAERAH : ${daerah.size}`,
          `PPS : ${pps}`,
          `KELUARGA : ${keluarga}`,
          `MANGSA : ${mangsa}`,
        ],
      })
    })
  }
  return hasil
}