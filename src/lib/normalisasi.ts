import { NEGERI_LIST } from './negeriVisual'
import { JENIS_BENCANA } from './laporanBencana'

// Shared text normalisation for everything read from uploaded files
// (Laporan Awal .docx, Laporan Semasa .xlsx).

// "P. Pinang *" -> "p pinang"
export function kunci(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const NEGERI_IKUT_KUNCI = new Map(NEGERI_LIST.map((n) => [kunci(n), n]))

const ALIAS_NEGERI: Record<string, string> = {
  'p pinang': 'Pulau Pinang',
  penang: 'Pulau Pinang',
  'n sembilan': 'Negeri Sembilan',
  ns: 'Negeri Sembilan',
  kl: 'Kuala Lumpur',
  wpkl: 'Kuala Lumpur',
  malacca: 'Melaka',
}

export function normalNegeri(asal: string): string | null {
  // "WP Kuala Lumpur", "W.P. Labuan", "Wilayah Persekutuan Putrajaya"
  const k = kunci(asal).replace(/^(wilayah persekutuan|w p|wp) /, '')
  return NEGERI_IKUT_KUNCI.get(k) ?? ALIAS_NEGERI[k] ?? null
}

// Words that identify a disaster type inside a free-text name
const KATA_JENIS: [string, string][] = [
  ...JENIS_BENCANA.map((j): [string, string] => [kunci(j), j]),
  ['angin kencang', 'Ribut'],
  ['puting beliung', 'Ribut'],
  ['bumbung terbang', 'Ribut'],
  ['runtuhan tanah', 'Tanah Runtuh'],
  ['air pasang', 'Tsunami'],
  ['ombak', 'Tsunami'],
  ['kebakar', 'Kebakaran'],
]

// "Banjir kilat" -> "Banjir", "BENCANA RIBUT NEGERI SARAWAK" -> "Ribut".
// `dikenali`: the current category names (Urus Kategori), checked first and
// longest first, so "Fenomena Air Pasang" wins over the "air pasang" synonym.
export function normalJenis(asal: string, dikenali: string[] = []): string | null {
  const k = ` ${kunci(asal)} `
  const kategori = dikenali
    .map((j): [string, string] => [kunci(j), j])
    .filter(([kata]) => kata)
    .sort((a, b) => b[0].length - a[0].length)
  return [...kategori, ...KATA_JENIS].find(([kata]) => k.includes(kata))?.[1] ?? null
}

// PPS details (name, district, mukim, manager) are stored in capitals, like the
// NDCC Excel: "Dewan  Kg. Kiamsam" -> "DEWAN KG. KIAMSAM", "labuan" -> "LABUAN"
export function hurufBesar(s: string) {
  return s.replace(/\s+/g, ' ').trim().toUpperCase()
}

// District names follow the same rule
export const kemasNamaTempat = hurufBesar

// Disaster names are stored in one canonical form (same rule as the database)
export function normalNamaBencana(s: string) {
  return s.replace(/\s+/g, ' ').trim().toUpperCase()
}