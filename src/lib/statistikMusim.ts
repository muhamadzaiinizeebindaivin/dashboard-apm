import { supabase } from './supabase'
import { ambilSemua, dalamKepingan } from './ambilSemua'
import { kunci } from './normalisasi'
import { ambilSejarahPps, snapshotIkutBencana } from './laporanNasionalGraf'

// Full statistics of one monsoon season (Statistik Musim page).
// - Victims / PPS / KIR: replayed day by day with the same engine as the
//   Laporan Nasional graphs (snapshotIkutBencana), so both always agree.
// - Extra Excel sheets: each Laporan Semasa repeats the CUMULATIVE situation,
//   so Korban / Kerosakan / Pertanian take the latest report in the season for
//   each disaster + state (never a sum of reports). Mobilisasi takes the highest
//   strength reported; closed roads are de-duplicated across all reports.

export type TitikHarian = { tarikh: string; label: string; mangsa: number; keluarga: number; pps: number }
export type Puncak = { nilai: number; tarikh: string } | null

export type StatistikMusimData = {
  belumMula: boolean
  sehingga: string // last day counted (YYYY-MM-DD): season end, or today if still running
  ringkasan: {
    bilBencana: number
    bilLaporan: number
    bilNegeri: number
    puncakMangsa: Puncak
    puncakPps: Puncak
    puncakKeluarga: Puncak
  }
  harian: TitikHarian[]
  ikutNegeri: { negeri: string; bilBencana: number; puncakMangsa: number; puncakPps: number; hariAktif: number }[]
  ikutJenis: { jenis: string; bilBencana: number; puncakMangsa: number }[]
  bencana: {
    nama: string
    jenis: string
    negeri: string[]
    laporanPertama: string | null
    tamatPada: string | null
    tempohHari: number | null
    puncakMangsa: number
  }[]
  korban: {
    kematian: number
    cedera: number
    hilang: number
    ikutNegeri: { negeri: string; kematian: number; cedera: number; hilang: number }[]
    profil: { dewasaLelaki: number; dewasaPerempuan: number; kanakLelaki: number; kanakPerempuan: number }
  }
  mobilisasi: {
    kekuatan: number
    ikutAgensi: { agensi: string; kekuatan: number; darat: number; air: number; udara: number }[]
  }
  kerosakan: {
    kerajaan: { kategori: string; rosak: number; musnah: number }[]
    swasta: { kategori: string; rosak: number; musnah: number }[]
    pertanian: { kategori: string; bilTerlibat: number; kawasanHa: number; jumlahTerjejas: number }[]
  }
  jalan: {
    jumlah: number
    ikutNegeri: { negeri: string; bil: number }[]
    terpanjang: { negeri: string; nama: string; lokasi: string; mula: string; tamat: string | null; jam: number }[]
  }
}

type BarisLaporan = {
  id: string
  nama_bencana: string | null
  jenis_bencana: string | null
  negeri: string | null
  jenis_laporan: string
  created_at: string
}
type Ada = { laporan_id: string }
type RowKorban = Ada & {
  kategori: string | null
  dewasa_lelaki: number | null
  dewasa_perempuan: number | null
  kanak_lelaki: number | null
  kanak_perempuan: number | null
  jumlah: number | null
}
type RowKerosakan = Ada & { jenis: string; kategori: string | null; rosak: number | null; musnah: number | null }
type RowPertanian = Ada & {
  kategori: string | null
  bil_terlibat: number | null
  kawasan_ha: number | string | null
  jumlah_terjejas: number | string | null
}
type RowMobilisasi = Ada & {
  agensi: string | null
  kekuatan: number | null
  darat_kuantiti: number | null
  air_kuantiti: number | null
  udara_kuantiti: number | null
}
type RowJalan = Ada & {
  nama_laluan: string | null
  lokasi: string | null
  mula: string | null
  tamat: string | null
}

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis']
const pad = (n: number) => String(n).padStart(2, '0')
const isoTarikh = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const nom = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? Number(v) : v
  return n != null && Number.isFinite(n) ? n : 0
}

function tarikhTempatan(iso: string, akhirHari = false) {
  const [y, m, d] = iso.split('-').map(Number)
  return akhirHari ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d)
}

function kategoriKorban(k: string | null): 'kematian' | 'cedera' | 'hilang' | null {
  const s = kunci(k ?? '')
  if (s.includes('mati') || s.includes('maut') || s.includes('death')) return 'kematian'
  if (s.includes('cedera') || s.includes('injur')) return 'cedera'
  if (s.includes('hilang') || s.includes('missing')) return 'hilang'
  return null
}

function tambahKe<T>(peta: Map<string, T>, k: string, mula: () => T, ubah: (x: T) => void) {
  if (!peta.has(k)) peta.set(k, mula())
  ubah(peta.get(k)!)
}

export async function ambilStatistikMusim(tarikhMula: string, tarikhTamat: string): Promise<StatistikMusimData> {
  const mula = tarikhTempatan(tarikhMula)
  const akhir = tarikhTempatan(tarikhTamat, true)
  const kini = new Date()
  const sehinggaMasa = akhir.getTime() < kini.getTime() ? akhir : kini
  const belumMula = mula.getTime() > kini.getTime()

  const [sejarah, laporanMusim] = await Promise.all([
    ambilSejarahPps(),
    ambilSemua<BarisLaporan>(() =>
      supabase
        .from('laporan_bencana')
        .select('id, nama_bencana, jenis_bencana, negeri, jenis_laporan, created_at')
        .gte('created_at', mula.toISOString())
        .lte('created_at', akhir.toISOString())
        .order('created_at', { ascending: true })
        .order('id'),
    ),
  ])

  // ---------- Disasters of the season: a report in the season, or victims in PPS during it ----------
  const jenisBencana = new Map<string, string>()
  const negeriBencana = new Map<string, Set<string>>()
  for (const r of laporanMusim) {
    const nama = r.nama_bencana?.trim()
    if (!nama) continue
    jenisBencana.set(nama, r.jenis_bencana?.trim() || jenisBencana.get(nama) || 'Lain-lain') // latest wins
    tambahKe(negeriBencana, nama, () => new Set<string>(), (s) => r.negeri && s.add(r.negeri))
  }

  // ---------- Day-by-day replay ----------
  const harian: TitikHarian[] = []
  const puncakIkutBencana = new Map<string, number>()
  const negeriHarian = new Map<string, { puncakMangsa: number; puncakPps: number; hariAktif: number }>()
  const jenisHarian = new Map<string, number>() // jenis -> peak victims

  if (!belumMula) {
    for (let d = new Date(mula); d.getTime() <= sehinggaMasa.getTime(); d.setDate(d.getDate() + 1)) {
      const hujung = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
      const masa = hujung.getTime() > kini.getTime() ? kini : hujung
      const snap = snapshotIkutBencana(masa, sejarah)

      let mangsa = 0
      let keluarga = 0
      let pps = 0
      const negeriHari = new Map<string, { mangsa: number; pps: number }>()
      const jenisHari = new Map<string, number>()

      for (const [namaAsal, b] of snap) {
        const nama = namaAsal.trim()
        mangsa += b.mangsa
        keluarga += b.keluarga
        pps += b.pps
        if (b.mangsa > 0 || b.pps > 0) {
          if (!jenisBencana.has(nama)) jenisBencana.set(nama, b.jenis?.trim() || 'Lain-lain')
          puncakIkutBencana.set(nama, Math.max(puncakIkutBencana.get(nama) ?? 0, b.mangsa))
        }
        const jenis = jenisBencana.get(nama) ?? (b.jenis?.trim() || 'Lain-lain')
        jenisHari.set(jenis, (jenisHari.get(jenis) ?? 0) + b.mangsa)
        for (const [negeri, n] of b.ikutNegeri) {
          if (!negeri) continue
          if (n.mangsa > 0 || n.pps > 0) tambahKe(negeriBencana, nama, () => new Set<string>(), (s) => s.add(negeri))
          tambahKe(negeriHari, negeri, () => ({ mangsa: 0, pps: 0 }), (x) => {
            x.mangsa += n.mangsa
            x.pps += n.pps
          })
        }
      }

      for (const [negeri, x] of negeriHari) {
        tambahKe(negeriHarian, negeri, () => ({ puncakMangsa: 0, puncakPps: 0, hariAktif: 0 }), (s) => {
          s.puncakMangsa = Math.max(s.puncakMangsa, x.mangsa)
          s.puncakPps = Math.max(s.puncakPps, x.pps)
          if (x.mangsa > 0) s.hariAktif += 1
        })
      }
      for (const [jenis, m] of jenisHari) jenisHarian.set(jenis, Math.max(jenisHarian.get(jenis) ?? 0, m))

      harian.push({ tarikh: isoTarikh(d), label: `${d.getDate()} ${BULAN[d.getMonth()]}`, mangsa, keluarga, pps })
    }
  }

  const puncak = (f: (t: TitikHarian) => number): Puncak =>
    harian.reduce<Puncak>((p, t) => (f(t) > (p?.nilai ?? 0) ? { nilai: f(t), tarikh: t.tarikh } : p), null)

  // ---------- Disaster list ----------
  const namaBencana = [...jenisBencana.keys()]
  const pertama = new Map<string, string>()
  if (namaBencana.length > 0) {
    const semuaLaporan = await dalamKepingan<{ nama_bencana: string; created_at: string }>(namaBencana, (x) =>
      supabase
        .from('laporan_bencana')
        .select('nama_bencana, created_at, id')
        .in('nama_bencana', x)
        .order('created_at', { ascending: true })
        .order('id'),
    )
    for (const r of semuaLaporan) {
      const nama = r.nama_bencana.trim()
      if (!pertama.has(nama)) pertama.set(nama, r.created_at)
    }
  }
  const tamatIkutNama = new Map([...sejarah.tamat].map(([n, t]) => [n.trim(), t]))

  const bencana = namaBencana
    .map((nama) => {
      const mulaB = pertama.get(nama) ?? null
      const tamatMs = tamatIkutNama.get(nama)
      const hujungMs = tamatMs ?? kini.getTime()
      return {
        nama,
        jenis: jenisBencana.get(nama) ?? 'Lain-lain',
        negeri: [...(negeriBencana.get(nama) ?? [])].sort(),
        laporanPertama: mulaB,
        tamatPada: tamatMs !== undefined ? new Date(tamatMs).toISOString() : null,
        tempohHari: mulaB ? Math.max(1, Math.ceil((hujungMs - new Date(mulaB).getTime()) / 86_400_000)) : null,
        puncakMangsa: puncakIkutBencana.get(nama) ?? 0,
      }
    })
    .sort((a, b) => b.puncakMangsa - a.puncakMangsa || a.nama.localeCompare(b.nama))

  // ---------- By state / by type ----------
  const semuaNegeri = new Set<string>()
  for (const s of negeriBencana.values()) for (const n of s) semuaNegeri.add(n)
  for (const n of negeriHarian.keys()) semuaNegeri.add(n)

  const ikutNegeri = [...semuaNegeri]
    .map((negeri) => ({
      negeri,
      bilBencana: [...negeriBencana.values()].filter((s) => s.has(negeri)).length,
      puncakMangsa: negeriHarian.get(negeri)?.puncakMangsa ?? 0,
      puncakPps: negeriHarian.get(negeri)?.puncakPps ?? 0,
      hariAktif: negeriHarian.get(negeri)?.hariAktif ?? 0,
    }))
    .sort((a, b) => b.puncakMangsa - a.puncakMangsa || a.negeri.localeCompare(b.negeri))

  const bilIkutJenis = new Map<string, number>()
  for (const j of jenisBencana.values()) bilIkutJenis.set(j, (bilIkutJenis.get(j) ?? 0) + 1)
  const ikutJenis = [...bilIkutJenis]
    .map(([jenis, bilBencana]) => ({ jenis, bilBencana, puncakMangsa: jenisHarian.get(jenis) ?? 0 }))
    .sort((a, b) => b.puncakMangsa - a.puncakMangsa || b.bilBencana - a.bilBencana)

  // ---------- Extra sheets ----------
  const semasa = laporanMusim.filter((r) => r.jenis_laporan === 'semasa' && r.nama_bencana)
  const laporanIkutId = new Map(semasa.map((r) => [r.id, r]))
  const kunciLaporan = (r: BarisLaporan) => `${r.nama_bencana!.trim()}|${r.negeri ?? ''}`

  // Cumulative sheets: the 10 latest reports per disaster + state are enough to find the latest one with rows
  const terbaruDahulu = [...semasa].reverse()
  const calon: BarisLaporan[] = []
  const bilCalon = new Map<string, number>()
  for (const r of terbaruDahulu) {
    const k = kunciLaporan(r)
    const n = bilCalon.get(k) ?? 0
    if (n < 10) calon.push(r)
    bilCalon.set(k, n + 1)
  }
  const idCalon = calon.map((r) => r.id)
  const idSemua = semasa.map((r) => r.id)

  const ambil = <T>(jadual: string, kolum: string, ids: string[]) =>
    ids.length === 0
      ? Promise.resolve([] as T[])
      : dalamKepingan<T>(ids, (x) => supabase.from(jadual).select(`id, laporan_id, ${kolum}`).in('laporan_id', x).order('id'))

  const [korbanRows, kerosakanRows, pertanianRows, mobilisasiRows, jalanRows] = await Promise.all([
    ambil<RowKorban>('laporan_korban', 'kategori, dewasa_lelaki, dewasa_perempuan, kanak_lelaki, kanak_perempuan, jumlah', idCalon),
    ambil<RowKerosakan>('laporan_kerosakan', 'jenis, kategori, rosak, musnah', idCalon),
    ambil<RowPertanian>('laporan_pertanian', 'kategori, bil_terlibat, kawasan_ha, jumlah_terjejas', idCalon),
    ambil<RowMobilisasi>('laporan_mobilisasi', 'agensi, kekuatan, darat_kuantiti, air_kuantiti, udara_kuantiti', idSemua),
    ambil<RowJalan>('laporan_jalan_ditutup', 'nama_laluan, lokasi, mula, tamat', idSemua),
  ])

  // Latest report (newest first in `calon`) that carried rows of this sheet, per disaster + state
  const terkini = <T extends Ada>(rows: T[]) => {
    const ada = new Set(rows.map((x) => x.laporan_id))
    const dipilih = new Set<string>()
    const dilihat = new Set<string>()
    for (const r of calon) {
      const k = kunciLaporan(r)
      if (dilihat.has(k) || !ada.has(r.id)) continue
      dilihat.add(k)
      dipilih.add(r.id)
    }
    return rows.filter((x) => dipilih.has(x.laporan_id))
  }
  const negeriOf = (x: Ada) => laporanIkutId.get(x.laporan_id)?.negeri || 'Tidak dinyatakan'

  // Korban
  const korbanNegeri = new Map<string, { kematian: number; cedera: number; hilang: number }>()
  const profil = { dewasaLelaki: 0, dewasaPerempuan: 0, kanakLelaki: 0, kanakPerempuan: 0 }
  for (const k of terkini(korbanRows)) {
    const kat = kategoriKorban(k.kategori)
    if (!kat) continue
    tambahKe(korbanNegeri, negeriOf(k), () => ({ kematian: 0, cedera: 0, hilang: 0 }), (x) => {
      x[kat] += nom(k.jumlah)
    })
    profil.dewasaLelaki += nom(k.dewasa_lelaki)
    profil.dewasaPerempuan += nom(k.dewasa_perempuan)
    profil.kanakLelaki += nom(k.kanak_lelaki)
    profil.kanakPerempuan += nom(k.kanak_perempuan)
  }
  const korbanIkutNegeri = [...korbanNegeri]
    .map(([negeri, x]) => ({ negeri, ...x }))
    .sort((a, b) => b.kematian + b.cedera + b.hilang - (a.kematian + a.cedera + a.hilang))
  const jumlahKorban = (f: 'kematian' | 'cedera' | 'hilang') => korbanIkutNegeri.reduce((n, x) => n + x[f], 0)

  // Kerosakan + pertanian
  const kumpulKerosakan = (rows: RowKerosakan[]) => {
    const peta = new Map<string, { rosak: number; musnah: number }>()
    for (const r of rows) {
      tambahKe(peta, r.kategori?.trim() || 'Lain-lain', () => ({ rosak: 0, musnah: 0 }), (x) => {
        x.rosak += nom(r.rosak)
        x.musnah += nom(r.musnah)
      })
    }
    return [...peta]
      .map(([kategori, x]) => ({ kategori, ...x }))
      .sort((a, b) => b.rosak + b.musnah - (a.rosak + a.musnah))
  }
  const kerosakanTerkini = terkini(kerosakanRows)
  const pertanianPeta = new Map<string, { bilTerlibat: number; kawasanHa: number; jumlahTerjejas: number }>()
  for (const p of terkini(pertanianRows)) {
    tambahKe(pertanianPeta, p.kategori?.trim() || 'Lain-lain', () => ({ bilTerlibat: 0, kawasanHa: 0, jumlahTerjejas: 0 }), (x) => {
      x.bilTerlibat += nom(p.bil_terlibat)
      x.kawasanHa += nom(p.kawasan_ha)
      x.jumlahTerjejas += nom(p.jumlah_terjejas)
    })
  }

  // Mobilisasi: highest figure reported per disaster + state + agency, then added up per agency
  const mobPuncak = new Map<string, { agensi: string; kekuatan: number; darat: number; air: number; udara: number }>()
  for (const m of mobilisasiRows) {
    const r = laporanIkutId.get(m.laporan_id)
    if (!r) continue
    const agensi = m.agensi?.trim() || 'Lain-lain'
    tambahKe(mobPuncak, `${kunciLaporan(r)}|${kunci(agensi)}`, () => ({ agensi, kekuatan: 0, darat: 0, air: 0, udara: 0 }), (x) => {
      x.kekuatan = Math.max(x.kekuatan, nom(m.kekuatan))
      x.darat = Math.max(x.darat, nom(m.darat_kuantiti))
      x.air = Math.max(x.air, nom(m.air_kuantiti))
      x.udara = Math.max(x.udara, nom(m.udara_kuantiti))
    })
  }
  const mobAgensi = new Map<string, { agensi: string; kekuatan: number; darat: number; air: number; udara: number }>()
  for (const x of mobPuncak.values()) {
    tambahKe(mobAgensi, kunci(x.agensi), () => ({ agensi: x.agensi, kekuatan: 0, darat: 0, air: 0, udara: 0 }), (a) => {
      a.kekuatan += x.kekuatan
      a.darat += x.darat
      a.air += x.air
      a.udara += x.udara
    })
  }
  const ikutAgensi = [...mobAgensi.values()].sort((a, b) => b.kekuatan - a.kekuatan)

  // Closed roads: one entry per state + road + location across all reports
  const jalanPeta = new Map<string, { negeri: string; nama: string; lokasi: string; mula: number | null; tamat: number | null }>()
  for (const j of jalanRows) {
    const negeri = negeriOf(j)
    const nama = j.nama_laluan?.trim() || 'Tidak dinamakan'
    const lokasi = j.lokasi?.trim() || ''
    const mulaJ = j.mula ? new Date(j.mula).getTime() : null
    const tamatJ = j.tamat ? new Date(j.tamat).getTime() : null
    tambahKe(jalanPeta, `${negeri}|${kunci(nama)}|${kunci(lokasi)}`, () => ({ negeri, nama, lokasi, mula: null, tamat: null }), (x) => {
      if (mulaJ !== null) x.mula = x.mula === null ? mulaJ : Math.min(x.mula, mulaJ)
      if (tamatJ !== null) x.tamat = x.tamat === null ? tamatJ : Math.max(x.tamat, tamatJ)
    })
  }
  const jalanSemua = [...jalanPeta.values()]
  const jalanNegeri = new Map<string, number>()
  for (const j of jalanSemua) jalanNegeri.set(j.negeri, (jalanNegeri.get(j.negeri) ?? 0) + 1)
  const terpanjang = jalanSemua
    .filter((j) => j.mula !== null)
    .map((j) => ({
      negeri: j.negeri,
      nama: j.nama,
      lokasi: j.lokasi,
      mula: new Date(j.mula!).toISOString(),
      tamat: j.tamat !== null ? new Date(j.tamat).toISOString() : null,
      // Still closed (no end time): counted up to the end of the season, or now
      jam: Math.max(0, Math.round(((j.tamat ?? sehinggaMasa.getTime()) - j.mula!) / 3_600_000)),
    }))
    .sort((a, b) => b.jam - a.jam)
    .slice(0, 10)

  return {
    belumMula,
    sehingga: isoTarikh(sehinggaMasa),
    ringkasan: {
      bilBencana: bencana.length,
      bilLaporan: laporanMusim.length,
      bilNegeri: semuaNegeri.size,
      puncakMangsa: puncak((t) => t.mangsa),
      puncakPps: puncak((t) => t.pps),
      puncakKeluarga: puncak((t) => t.keluarga),
    },
    harian,
    ikutNegeri,
    ikutJenis,
    bencana,
    korban: {
      kematian: jumlahKorban('kematian'),
      cedera: jumlahKorban('cedera'),
      hilang: jumlahKorban('hilang'),
      ikutNegeri: korbanIkutNegeri,
      profil,
    },
    mobilisasi: { kekuatan: ikutAgensi.reduce((n, a) => n + a.kekuatan, 0), ikutAgensi },
    kerosakan: {
      kerajaan: kumpulKerosakan(kerosakanTerkini.filter((k) => k.jenis === 'kerajaan')),
      swasta: kumpulKerosakan(kerosakanTerkini.filter((k) => k.jenis === 'swasta')),
      pertanian: [...pertanianPeta]
        .map(([kategori, x]) => ({ kategori, ...x }))
        .sort((a, b) => b.bilTerlibat - a.bilTerlibat),
    },
    jalan: {
      jumlah: jalanSemua.length,
      ikutNegeri: [...jalanNegeri].map(([negeri, bil]) => ({ negeri, bil })).sort((a, b) => b.bil - a.bil),
      terpanjang,
    },
  }
}