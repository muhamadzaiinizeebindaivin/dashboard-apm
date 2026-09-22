import { supabase } from './supabase'

type BarisSemasa = {
  id: string
  nama_bencana: string | null
  ringkasan_status: string | null
  created_at: string
}

type BarisPps = {
  laporan_id: string
  negeri: string | null
  pps: string | null
  jumlah_mangsa: number | null
  jumlah_keluarga: number | null
}

export type TitikGraf = {
  label: string
  mangsa: number
  keluarga: number
  pps: number
  negeri: number
}

// The state of the report "as of" a given moment — same carry-forward rule
// as the current snapshot (ambilLaporanNasional), just re-run at an earlier
// point in time: for each disaster, use its most recent report at or before
// `masa` that actually carried PPS data.
function snapshotPadaMasa(
  masa: Date,
  barisAsc: BarisSemasa[],
  pps: BarisPps[],
): { mangsa: number; keluarga: number; pps: number; negeri: number } {
  const had = barisAsc.filter((b) => new Date(b.created_at).getTime() <= masa.getTime())

  const kumpulan = new Map<string, BarisSemasa[]>()
  for (const b of had) {
    const nama = b.nama_bencana ?? 'Tiada Nama'
    if (!kumpulan.has(nama)) kumpulan.set(nama, [])
    kumpulan.get(nama)!.push(b)
  }

  let mangsa = 0
  let keluarga = 0
  let ppsCount = 0
  const negeriSet = new Set<string>()

  for (const [, arr] of kumpulan) {
    // arr is in ascending order (barisAsc was fetched ascending) — walk
    // backwards to find the latest one that actually had PPS data.
    const sumber = [...arr].reverse().find((r) => r.ringkasan_status === 'ada_perubahan')
    if (!sumber) continue

    for (const p of pps.filter((x) => x.laporan_id === sumber.id)) {
      mangsa += p.jumlah_mangsa ?? 0
      keluarga += p.jumlah_keluarga ?? 0
      ppsCount += p.pps ? p.pps.split('\n').filter((s) => s.trim()).length : 0
      if (p.negeri) negeriSet.add(p.negeri)
    }
  }

  return { mangsa, keluarga, pps: ppsCount, negeri: negeriSet.size }
}

const pad = (n: number) => String(n).padStart(2, '0')
const NAMA_BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis']

export async function ambilDataGraf(): Promise<{ duaJam: TitikGraf[]; harian: TitikGraf[] }> {
  const [{ data: semasaData }, { data: ppsData }] = await Promise.all([
    supabase
      .from('laporan_bencana')
      .select('id, nama_bencana, ringkasan_status, created_at')
      .eq('jenis_laporan', 'semasa')
      .order('created_at', { ascending: true }),
    supabase.from('laporan_pps').select('laporan_id, negeri, pps, jumlah_mangsa, jumlah_keluarga'),
  ])

  const baris = (semasaData as BarisSemasa[]) ?? []
  const pps = (ppsData as BarisPps[]) ?? []

  // Round "now" down to the last even hour, so labels read 1200H/1400H/...
  // instead of whatever odd minute the report happened to be generated at.
  const jamGenap = new Date()
  jamGenap.setMinutes(0, 0, 0)
  if (jamGenap.getHours() % 2 !== 0) jamGenap.setHours(jamGenap.getHours() - 1)

  const duaJam: TitikGraf[] = []
  for (let i = 11; i >= 0; i--) {
    const masa = new Date(jamGenap.getTime() - i * 2 * 60 * 60 * 1000)
    const s = snapshotPadaMasa(masa, baris, pps)
    duaJam.push({ label: `${pad(masa.getHours())}${pad(masa.getMinutes())}H`, ...s })
  }

  const harian: TitikGraf[] = []
  for (let i = 6; i >= 0; i--) {
    const masa = new Date()
    if (i > 0) {
      masa.setDate(masa.getDate() - i)
      masa.setHours(23, 59, 59, 999)
    }
    const s = snapshotPadaMasa(masa, baris, pps)
    harian.push({ label: `${masa.getDate()}-${NAMA_BULAN[masa.getMonth()]}`, ...s })
  }

  return { duaJam, harian }
}
