import { supabase } from './supabase'
import { cariZon } from './laporanBencana'

export type ItemLaporanNasional = {
  jenisBencana: string
  namaBencana: string
  trend: string | null
  zon: string | null
  negeri: string | null
  daerah: string | null
  pps: string | null
  jumlahMangsa: number
  jumlahKeluarga: number
}

type BarisSemasa = {
  id: string
  nama_bencana: string | null
  jenis_bencana: string | null
  negeri: string | null
  ringkasan_status: string | null
  trend: string | null
  created_at: string
}

type BarisPps = {
  laporan_id: string
  zon: string | null
  negeri: string | null
  daerah: string | null
  pps: string | null
  jumlah_mangsa: number | null
  jumlah_keluarga: number | null
}

// --- New-format PPS (pps_pusat) ---

type BarisPusat = {
  nama_bencana: string
  negeri: string
  daerah: string | null
  zon: string | null
  nama: string
  jumlah_mangsa: number
  jumlah_keluarga: number
  status: string
}

// A disaster whose PPS live in pps_pusat: list only the PPS that are still
// open (dibuka or cadangan_tutup — a suggestion isn't a closure until
// confirmed), grouped by negeri/daerah so rows keep the same shape as the
// legacy ones. If every PPS is closed, the disaster stays listed with zeros.
function itemDariPusat(nama: string, terkini: BarisSemasa, pusat: BarisPusat[]): ItemLaporanNasional[] {
  const asas = {
    jenisBencana: terkini.jenis_bencana || 'Lain-lain',
    namaBencana: nama,
    trend: terkini.trend,
  }

  const dibuka = pusat.filter((p) => p.status !== 'ditutup')
  if (dibuka.length === 0) {
    return [
      {
        ...asas,
        zon: terkini.negeri ? cariZon(terkini.negeri) : null,
        negeri: terkini.negeri,
        daerah: null,
        pps: null,
        jumlahMangsa: 0,
        jumlahKeluarga: 0,
      },
    ]
  }

  const kumpulan = new Map<string, BarisPusat[]>()
  for (const p of dibuka) {
    const kunci = `${p.negeri}|${p.daerah ?? ''}`
    if (!kumpulan.has(kunci)) kumpulan.set(kunci, [])
    kumpulan.get(kunci)!.push(p)
  }

  return Array.from(kumpulan.values()).map((arr) => ({
    ...asas,
    zon: arr[0].zon,
    negeri: arr[0].negeri,
    daerah: arr[0].daerah,
    pps: arr.map((p) => p.nama).join('\n'),
    jumlahMangsa: arr.reduce((n, p) => n + p.jumlah_mangsa, 0),
    jumlahKeluarga: arr.reduce((n, p) => n + p.jumlah_keluarga, 0),
  }))
}

export type PpsDitutup = {
  nama: string
  nama_bencana: string
  negeri: string
  daerah: string | null
  ditutup_pada: string
  catatan_tutup: string | null
}

export async function ambilPpsDitutup24Jam(): Promise<PpsDitutup[]> {
  const sejak = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('pps_pusat')
    .select('nama, nama_bencana, negeri, daerah, ditutup_pada, catatan_tutup')
    .eq('status', 'ditutup')
    .gte('ditutup_pada', sejak)
    .order('ditutup_pada', { ascending: false })
  return (data as PpsDitutup[]) ?? []
}

// For each disaster (grouped by Nama Bencana), the PPS numbers come from its
// most recent report that actually carried PPS data ("Ada Perubahan"), even
// if the very latest update said "Tiada Perubahan" — that update still
// confirms the previous numbers still stand. A disaster that has never had
// PPS data is still listed, using its own Negeri and zero counts, rather
// than being left out entirely.
export async function ambilLaporanNasional(): Promise<ItemLaporanNasional[]> {
  const { data } = await supabase
    .from('laporan_bencana')
    .select('id, nama_bencana, jenis_bencana, negeri, ringkasan_status, trend, created_at')
    .eq('jenis_laporan', 'semasa')
    .order('created_at', { ascending: false })

  const baris = (data as BarisSemasa[]) ?? []

  const kumpulan = new Map<string, BarisSemasa[]>()
  for (const b of baris) {
    const nama = b.nama_bencana ?? 'Tiada Nama'
    if (!kumpulan.has(nama)) kumpulan.set(nama, [])
    kumpulan.get(nama)!.push(b)
  }

  const items: ItemLaporanNasional[] = []
  const sumber: { laporanId: string; jenisBencana: string; namaBencana: string; trend: string | null }[] = []

  // Disasters reported in the new per-PPS format read from pps_pusat, which
  // excludes closed PPS and covers every negeri (not just the latest report's).
  const { data: pusatData } = await supabase
    .from('pps_pusat')
    .select('nama_bencana, negeri, daerah, zon, nama, jumlah_mangsa, jumlah_keluarga, status')

  const pusatIkutBencana = new Map<string, BarisPusat[]>()
  for (const p of (pusatData as BarisPusat[]) ?? []) {
    if (!pusatIkutBencana.has(p.nama_bencana)) pusatIkutBencana.set(p.nama_bencana, [])
    pusatIkutBencana.get(p.nama_bencana)!.push(p)
  }

  for (const [nama, arr] of kumpulan) {
    const terkini = arr[0]

    const pusat = pusatIkutBencana.get(nama.trim())
    if (pusat) {
      items.push(...itemDariPusat(nama, terkini, pusat))
      continue
    }

    // Legacy disasters (reported before per-PPS tracking): unchanged logic
    const adaPerubahan = arr.find((r) => r.ringkasan_status === 'ada_perubahan')

    if (adaPerubahan) {
      sumber.push({
        laporanId: adaPerubahan.id,
        jenisBencana: terkini.jenis_bencana || 'Lain-lain',
        namaBencana: nama,
        trend: terkini.trend,
      })
    } else {
      items.push({
        jenisBencana: terkini.jenis_bencana || 'Lain-lain',
        namaBencana: nama,
        trend: terkini.trend,
        zon: terkini.negeri ? cariZon(terkini.negeri) : null,
        negeri: terkini.negeri,
        daerah: null,
        pps: null,
        jumlahMangsa: 0,
        jumlahKeluarga: 0,
      })
    }
  }

  if (sumber.length > 0) {
    const { data: ppsData } = await supabase
      .from('laporan_pps')
      .select('laporan_id, zon, negeri, daerah, pps, jumlah_mangsa, jumlah_keluarga')
      .in(
        'laporan_id',
        sumber.map((s) => s.laporanId),
      )

    const baris_pps = (ppsData as BarisPps[]) ?? []

    for (const p of baris_pps) {
      const s = sumber.find((x) => x.laporanId === p.laporan_id)
      if (!s) continue
      items.push({
        jenisBencana: s.jenisBencana,
        namaBencana: s.namaBencana,
        trend: s.trend,
        zon: p.zon,
        negeri: p.negeri,
        daerah: p.daerah,
        pps: p.pps,
        jumlahMangsa: p.jumlah_mangsa ?? 0,
        jumlahKeluarga: p.jumlah_keluarga ?? 0,
      })
    }
  }

  return items
}
