import { supabase } from './supabase'

type BarisSemasa = {
  id: string
  nama_bencana: string | null
  jenis_bencana: string | null
  ringkasan_status: string | null
  created_at: string
}

type BarisPps = {
  laporan_id: string
  negeri: string | null
  zon: string | null
  pps: string | null
  jumlah_mangsa: number | null
  jumlah_keluarga: number | null
}

type BarisPusat = { id: string; nama_bencana: string; negeri: string; zon: string | null }
type BarisItem = { laporan_id: string; pps_id: string; jumlah_mangsa: number; jumlah_keluarga: number }
type BarisLog = { pps_id: string; ke: string; masa: string }

export type TitikGraf = {
  label: string
  mangsa: number
  keluarga: number
  pps: number
  negeri: number
}

export type TapisGraf = {
  negeri?: string
  jenis?: string
  zon?: string
}

// Per-PPS history, indexed for fast "as of time t" lookups
type DataPusat = {
  ppsIkutBencana: Map<string, string[]>
  pusat: Map<string, BarisPusat>
  kiraan: Map<string, { masa: number; mangsa: number; keluarga: number }[]> // reported counts, ascending
  log: Map<string, { masa: number; ke: string }[]> // manual status changes, ascending
}

function binaDataPusat(baris: BarisSemasa[], pusatRows: BarisPusat[], itemRows: BarisItem[], logRows: BarisLog[]): DataPusat {
  const masaLaporan = new Map(baris.map((b) => [b.id, new Date(b.created_at).getTime()]))

  const ppsIkutBencana = new Map<string, string[]>()
  const pusat = new Map<string, BarisPusat>()
  for (const p of pusatRows) {
    pusat.set(p.id, p)
    if (!ppsIkutBencana.has(p.nama_bencana)) ppsIkutBencana.set(p.nama_bencana, [])
    ppsIkutBencana.get(p.nama_bencana)!.push(p.id)
  }

  const kiraan = new Map<string, { masa: number; mangsa: number; keluarga: number }[]>()
  for (const i of itemRows) {
    const masa = masaLaporan.get(i.laporan_id)
    if (masa === undefined) continue
    if (!kiraan.has(i.pps_id)) kiraan.set(i.pps_id, [])
    kiraan.get(i.pps_id)!.push({ masa, mangsa: i.jumlah_mangsa, keluarga: i.jumlah_keluarga })
  }
  for (const arr of kiraan.values()) arr.sort((a, b) => a.masa - b.masa)

  const log = new Map<string, { masa: number; ke: string }[]>()
  for (const l of logRows) {
    if (!log.has(l.pps_id)) log.set(l.pps_id, [])
    log.get(l.pps_id)!.push({ masa: new Date(l.masa).getTime(), ke: l.ke })
  }
  for (const arr of log.values()) arr.sort((a, b) => a.masa - b.masa)

  return { ppsIkutBencana, pusat, kiraan, log }
}

function terakhirSebelum<T extends { masa: number }>(arr: T[] | undefined, t: number): T | undefined {
  if (!arr) return undefined
  let hasil: T | undefined
  for (const x of arr) {
    if (x.masa > t) break
    hasil = x
  }
  return hasil
}

// The state of the report "as of" a given moment, using the same rules as
// the current snapshot (ambilLaporanNasional). `tapis` applies the same
// Negeri/Jenis Bencana/Zon filter the on-page report and PDF use.
function snapshotPadaMasa(
  masa: Date,
  barisAsc: BarisSemasa[],
  pps: BarisPps[],
  data: DataPusat,
  tapis: TapisGraf,
): { mangsa: number; keluarga: number; pps: number; negeri: number } {
  const t = masa.getTime()
  const had = barisAsc.filter((b) => new Date(b.created_at).getTime() <= t)

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

  for (const [nama, arr] of kumpulan) {
    // New format: if this disaster already had per-PPS data at time t, use
    // each PPS's latest counts at t, minus the PPS that were closed at t.
    const idPps = data.ppsIkutBencana.get(nama.trim())
    const adaFormatBaru = idPps?.some((id) => terakhirSebelum(data.kiraan.get(id), t))

    if (idPps && adaFormatBaru) {
      const terkini = arr[arr.length - 1]
      if (tapis.jenis && terkini.jenis_bencana !== tapis.jenis) continue

      for (const id of idPps) {
        const k = terakhirSebelum(data.kiraan.get(id), t)
        if (!k) continue // not opened yet at t

        // Closed at t = last manual action is a closure, unless a later report
        // with victims re-opened it (the RPC re-opens automatically and that
        // isn't in the manual log).
        const l = terakhirSebelum(data.log.get(id), t)
        const ditutup = l?.ke === 'ditutup' && !(k.masa > l.masa && k.mangsa > 0)
        if (ditutup) continue

        const p = data.pusat.get(id)!
        if (tapis.negeri && p.negeri !== tapis.negeri) continue
        if (tapis.zon && p.zon !== tapis.zon) continue

        mangsa += k.mangsa
        keluarga += k.keluarga
        ppsCount += 1
        negeriSet.add(p.negeri)
      }
      continue
    }

    // Legacy: latest report at or before t that actually carried PPS data
    const sumber = [...arr].reverse().find((r) => r.ringkasan_status === 'ada_perubahan')
    if (!sumber) continue
    if (tapis.jenis && sumber.jenis_bencana !== tapis.jenis) continue

    for (const p of pps.filter((x) => x.laporan_id === sumber.id)) {
      if (tapis.negeri && p.negeri !== tapis.negeri) continue
      if (tapis.zon && p.zon !== tapis.zon) continue
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

export async function ambilDataGraf(tapis: TapisGraf = {}): Promise<{ duaJam: TitikGraf[]; harian: TitikGraf[] }> {
  const [{ data: semasaData }, { data: ppsData }, { data: pusatData }, { data: itemData }, { data: logData }] =
    await Promise.all([
      supabase
        .from('laporan_bencana')
        .select('id, nama_bencana, jenis_bencana, ringkasan_status, created_at')
        .eq('jenis_laporan', 'semasa')
        .order('created_at', { ascending: true }),
      supabase.from('laporan_pps').select('laporan_id, negeri, zon, pps, jumlah_mangsa, jumlah_keluarga'),
      supabase.from('pps_pusat').select('id, nama_bencana, negeri, zon'),
      supabase.from('laporan_pps_item').select('laporan_id, pps_id, jumlah_mangsa, jumlah_keluarga'),
      supabase.from('pps_status_log').select('pps_id, ke, masa'),
    ])

  const baris = (semasaData as BarisSemasa[]) ?? []
  const pps = (ppsData as BarisPps[]) ?? []
  const data = binaDataPusat(
    baris,
    (pusatData as BarisPusat[]) ?? [],
    (itemData as BarisItem[]) ?? [],
    (logData as BarisLog[]) ?? [],
  )

  // Round "now" down to the last even hour, so labels read 1200H/1400H/...
  // instead of whatever odd minute the report happened to be generated at.
  const jamGenap = new Date()
  jamGenap.setMinutes(0, 0, 0)
  if (jamGenap.getHours() % 2 !== 0) jamGenap.setHours(jamGenap.getHours() - 1)

  const duaJam: TitikGraf[] = []
  for (let i = 11; i >= 0; i--) {
    const masa = new Date(jamGenap.getTime() - i * 2 * 60 * 60 * 1000)
    const s = snapshotPadaMasa(masa, baris, pps, data, tapis)
    duaJam.push({ label: `${pad(masa.getHours())}${pad(masa.getMinutes())}H`, ...s })
  }

  const harian: TitikGraf[] = []
  for (let i = 6; i >= 0; i--) {
    const masa = new Date()
    if (i > 0) {
      masa.setDate(masa.getDate() - i)
      masa.setHours(23, 59, 59, 999)
    }
    const s = snapshotPadaMasa(masa, baris, pps, data, tapis)
    harian.push({ label: `${masa.getDate()}-${NAMA_BULAN[masa.getMonth()]}`, ...s })
  }

  return { duaJam, harian }
}