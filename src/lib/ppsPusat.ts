export type PpsInput = {
  kunci: string // local React key
  nama: string
  mangsa: string
  keluarga: string
  latitude: number | null
  longitude: number | null
  sedia: boolean // prefilled from an already-open PPS
}

export type PpsSediaAda = {
  nama: string
  daerah: string | null
  latitude: number | null
  longitude: number | null
  jumlah_mangsa: number | null
  jumlah_keluarga: number | null
  status: string
}

export function ppsKosong(): PpsInput {
  return {
    kunci: crypto.randomUUID(),
    nama: '',
    mangsa: '',
    keluarga: '',
    latitude: null,
    longitude: null,
    sedia: false,
  }
}

// Mirrors the SQL pps_kunci() so client-side duplicate checks match the DB
export function normalNamaPps(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function semakPps(rows: PpsInput[]): string | null {
  if (rows.length === 0) return 'Sila tambah sekurang-kurangnya satu PPS.'

  const dilihat = new Set<string>()
  for (const [i, r] of rows.entries()) {
    const n = i + 1
    if (!r.nama.trim()) return `Sila isi Nama PPS ${n}.`
    if (!/^\d+$/.test(r.mangsa.trim())) return `Jumlah Mangsa PPS ${n} mesti nombor bulat (0 atau lebih).`
    if (!/^\d+$/.test(r.keluarga.trim())) return `Jumlah Keluarga PPS ${n} mesti nombor bulat (0 atau lebih).`

    const k = normalNamaPps(r.nama)
    if (dilihat.has(k)) return `PPS "${r.nama.trim()}" disenaraikan lebih daripada sekali.`
    dilihat.add(k)
  }
  return null
}

// --- Pengurusan PPS (phase 2) ---

export type StatusPps = 'dibuka' | 'cadangan_tutup' | 'ditutup'

export type PpsPusat = {
  id: string
  nama_bencana: string
  negeri: string
  daerah: string | null
  zon: string | null
  nama: string
  latitude: number | null
  longitude: number | null
  status: StatusPps
  sebab_cadangan: string | null
  jumlah_mangsa: number
  jumlah_keluarga: number
  dibuka_pada: string
  dikemaskini_pada: string
  ditutup_pada: string | null
  catatan_tutup: string | null
  dilapor_pada: string | null // last time a report listed this PPS
  mukim: string | null
  pengurus_nama: string | null
  pengurus_jawatan: string | null
  pengurus_telefon: string | null
}

export const STATUS_PPS: Record<StatusPps, { label: string; className: string }> = {
  dibuka: { label: 'Dibuka', className: 'bg-emerald-100 text-emerald-700' },
  cadangan_tutup: { label: 'Cadangan Tutup', className: 'bg-amber-100 text-amber-800' },
  ditutup: { label: 'Ditutup', className: 'bg-neutral-100 text-neutral-600' },
}

export const SEBAB_CADANGAN: Record<string, string> = {
  tiada_mangsa: '0 mangsa dalam laporan terkini',
  tidak_dilaporkan: 'Tidak dilaporkan dalam laporan terkini',
  dilapor_tutup: 'Ditanda "Tutup" dalam laporan negeri',
}

export function formatTarikhMasa(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// An open PPS with no report for this long gets the "Tiada kemas kini" badge
// (reports come every 4 h, sometimes 2 h: 4 h + 2 h margin)
export const HAD_TIADA_KEMASKINI_JAM = 6

// Hours since the last report for an open PPS past the limit, otherwise null
export function jamTanpaLaporan(pps: PpsPusat, kini: number): number | null {
  if (pps.status !== 'dibuka') return null
  const terakhir = new Date(pps.dilapor_pada ?? pps.dibuka_pada).getTime()
  const jam = (kini - terakhir) / 3_600_000
  return jam > HAD_TIADA_KEMASKINI_JAM ? Math.floor(jam) : null
}

// "013-7567487" / "60125729248" / "09-623 6655" -> "tel:+60137567487"
export function pautanTelefon(no: string | null): string | null {
  if (!no) return null
  let d = no.replace(/\D/g, '')
  if (d.startsWith('0')) d = `60${d.slice(1)}`
  return d.length >= 9 ? `tel:+${d}` : null
}