import { NEGERI_LIST } from './negeriVisual'
import { JENIS_BENCANA } from './laporanBencana'
import { kumpulanNegeri } from './kumpulanNegeri'

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
  'wilayah persekutuan': 'Wilayah Persekutuan',
  wp: 'Wilayah Persekutuan',
  'w p': 'Wilayah Persekutuan',
  malacca: 'Melaka',
}

export function normalNegeri(asal: string): string | null {
  // "WP Kuala Lumpur", "W.P. Labuan", "Wilayah Persekutuan Putrajaya"
  const k = kunci(asal).replace(/^(wilayah persekutuan|w p|wp) /, '')
  const negeri = NEGERI_IKUT_KUNCI.get(k) ?? ALIAS_NEGERI[k] ?? null
  // KL, Putrajaya and Labuan are recorded as one: "Wilayah Persekutuan"
  return negeri ? kumpulanNegeri(negeri) : null
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

// ---------------------------------------------------------------------------
// Agency names (Laporan Semasa mobilisation) -> one standard name, so the same
// agency isn't split over several rows in the MTL statistics:
//   "Jabatan Bomba Dan Penyelamat Malaysia (JBPM)" -> "JBPM"
//   "APM KUALA SELANGOR", "APM PETALING"           -> "APM"
//   "Polis Diraja Malaysia", "PDRM IPD TAWAU"      -> "PDRM"
// Unknown names are kept as typed (in capitals), so nothing is lost.
// ---------------------------------------------------------------------------

// Known agency acronyms (a name starting with one of these belongs to it)
const AKRONIM_AGENSI = new Set([
  'APM', 'JKM', 'PDRM', 'JBPM', 'RELA', 'ATM', 'KKM', 'JPKK', 'APMM', 'JKR', 'JPS', 'NADMA', 'PBSM', 'TNB', 'JPN',
])

// Other spellings of the same acronym
const ALIAS_AKRONIM: Record<string, string> = {
  JPAM: 'APM', // Jabatan Pertahanan Awam Malaysia, former name of APM
  MMEA: 'APMM',
  BOMBA: 'JBPM',
  POLIS: 'PDRM',
  TENTERA: 'ATM',
}

// Full names (or their first words), checked in this order
const NAMA_PENUH_AGENSI: [string, string][] = [
  ['angkatan pertahanan awam', 'APM'],
  ['jabatan pertahanan awam', 'APM'],
  ['pertahanan awam', 'APM'],
  ['jabatan bomba', 'JBPM'],
  ['bomba', 'JBPM'],
  ['polis diraja malaysia', 'PDRM'],
  ['polis', 'PDRM'],
  ['jabatan kebajikan masyarakat', 'JKM'],
  ['kebajikan masyarakat', 'JKM'],
  ['angkatan tentera', 'ATM'],
  ['tentera', 'ATM'],
  ['kementerian kesihatan', 'KKM'],
  ['jabatan kesihatan', 'KKM'],
  ['jabatan kerja raya', 'JKR'],
  ['jabatan pengairan dan saliran', 'JPS'],
  ['agensi penguatkuasaan maritim', 'APMM'],
  ['maritim', 'APMM'],
  ['jawatankuasa pembangunan dan keselamatan kampung', 'JPKK'],
  ['pasukan sukarelawan malaysia', 'RELA'],
  ['persatuan bulan sabit merah', 'PBSM'],
  ['bulan sabit merah', 'PBSM'],
  ['agensi pengurusan bencana negara', 'NADMA'],
]

export function normalAgensi(nama: string | null | undefined): string {
  const asal = (nama ?? '').replace(/\s+/g, ' ').trim()
  if (!asal) return 'Lain-lain'

  // 1. Acronym in brackets wins: "... Malaysia (JBPM)"
  const kurungan = asal.match(/\(\s*([A-Za-z]{2,12})\s*\)/)
  if (kurungan) {
    const akronim = kurungan[1].toUpperCase()
    return ALIAS_AKRONIM[akronim] ?? akronim
  }

  // 2. Full name, or its key words, at the start: "Jabatan Bomba Kuala Selangor"
  const k = kunci(asal)
  for (const [frasa, akronim] of NAMA_PENUH_AGENSI) {
    if (k === frasa || k.startsWith(`${frasa} `)) return akronim
  }

  // 3. Known acronym as the first word: "APM KUALA SELANGOR", "PDRM IPD TAWAU"
  const pertama = k.split(' ')[0].toUpperCase()
  const akronim = ALIAS_AKRONIM[pertama] ?? pertama
  if (AKRONIM_AGENSI.has(akronim)) return akronim

  // 4. Unknown agency: kept as typed, in capitals (so "Majlis X" and "MAJLIS X" still merge)
  return asal.toUpperCase()
}