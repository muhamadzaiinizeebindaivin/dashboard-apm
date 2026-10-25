import { NEGERI_LIST } from './negeriVisual'

// Kuala Lumpur, Putrajaya and Labuan are shown, filtered and assigned as ONE unit:
// "Wilayah Persekutuan". The data keeps the real territory underneath (reports, PPS…),
// the grouping is applied when choosing / comparing a state. Same rule as the SQL
// function kumpulan_negeri().

export const WILAYAH_PERSEKUTUAN = 'Wilayah Persekutuan'
const ANGGOTA_WP = new Set(['Kuala Lumpur', 'Putrajaya', 'Labuan'])

// "Labuan" -> "Wilayah Persekutuan", "Perak" -> "Perak"
export function kumpulanNegeri(negeri: string | null | undefined): string {
  if (!negeri) return ''
  return ANGGOTA_WP.has(negeri) ? WILAYAH_PERSEKUTUAN : negeri
}

// Choices for every Negeri dropdown: the states, then Wilayah Persekutuan once
export const SENARAI_KUMPULAN_NEGERI: string[] = [
  ...NEGERI_LIST.filter((n) => !ANGGOTA_WP.has(n)),
  WILAYAH_PERSEKUTUAN,
]

// Does a record's state belong to the chosen group?
export const samaKumpulan = (negeriRekod: string | null | undefined, pilihan: string) =>
  kumpulanNegeri(negeriRekod) === pilihan

// Report title for the chosen group: national, a state, or Wilayah Persekutuan
export function tajukLaporan(negeri?: string | null): string {
  if (!negeri) return 'LAPORAN BENCANA NASIONAL'
  if (negeri === WILAYAH_PERSEKUTUAN) return 'LAPORAN BENCANA WILAYAH PERSEKUTUAN'
  // "Negeri Sembilan" already starts with "Negeri"
  return /^negeri\s/i.test(negeri)
    ? `LAPORAN BENCANA ${negeri.toUpperCase()}`
    : `LAPORAN BENCANA NEGERI ${negeri.toUpperCase()}`
}

// Real state values behind a choice, for database filters: .in('negeri', ahliKumpulan(x))
// (records can also be saved directly as "Wilayah Persekutuan", e.g. PARAS)
export function ahliKumpulan(pilihan: string): string[] {
  return pilihan === WILAYAH_PERSEKUTUAN ? [...ANGGOTA_WP, WILAYAH_PERSEKUTUAN] : [pilihan]
}