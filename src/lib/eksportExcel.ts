import type { Cell, Row, Style, Workbook, Worksheet } from 'exceljs'
import { supabase } from './supabase'
import { cariZon } from './laporanBencana'
import { kunci } from './normalisasi'
import { pastikan } from './pastikan'
import { ambilSemua, dalamKepingan } from './ambilSemua'
import type { DataLampiran } from './bacaLampiranSemasa'

// "Jana Excel" of the Laporan Nasional: one NDCC "Laporan Situasi Bencana"
// workbook per disaster type, built from the official template in
// public/templat/ so the states' layout, colours and formulas are kept.

type ModulExcel = typeof import('exceljs')

export const LALUAN_TEMPLAT = '/templat/laporan-situasi-bencana.xlsx'

export type PpsEksport = {
  nama_bencana: string
  negeri: string
  daerah: string | null
  mukim: string | null
  nama: string
  status: string
  dibuka_pada: string | null
  ditutup_pada: string | null
  jumlah_mangsa: number
  jumlah_keluarga: number
  dewasa_lelaki: number | null
  dewasa_perempuan: number | null
  kanak_lelaki: number | null
  kanak_perempuan: number | null
  pengurus_nama: string | null
  pengurus_jawatan: string | null
  pengurus_telefon: string | null
  parlimen: string | null
  dun: string | null
}

export type DataEksport = {
  jenis: string
  label: string // state / zone / "NASIONAL", used in the file name
  namaBencana: string[]
  negeri: string[]
  masa: Date
  pps: PpsEksport[]
  halLain: string[]
  lampiran: DataLampiran
}

// `nama`: only these disasters (date filter of the Laporan Nasional)
// `parlimen` / `dun`: only the PPS of that constituency (ShelterStatus sheet)
export type TapisEksport = {
  negeri?: string
  zon?: string
  jenis?: string
  nama?: string[]
  parlimen?: string
  dun?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

// ExcelJS writes dates as UTC: rebuild them from local parts so Excel shows Malaysian time
function tarikhExcel(iso: string | null): Date | null {
  if (!iso) return null
  const t = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(t.getTime())) return null
  return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes()))
}

const SUBTAJUK = new Set([
  'lelaki', 'perempuan', 'dewasa', 'kanak kanak', 'darat', 'air', 'udara', 'jenis',
  'kuantiti unit', 'rosak', 'musnah', 'latitude', 'longitude', 'buka', 'tutup',
])

function teksSel(c: Cell): string {
  if (c.isMerged && c.master !== c) return ''
  const v = c.value
  if (v == null) return ''
  if (typeof v === 'object') {
    if ('formula' in v || 'sharedFormula' in v) return ''
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if (v instanceof Date) return ''
  }
  return String(v)
}

// Same header logic as the reader: header row, then data after the sub-headers
function jadual(ws: Worksheet, labelPertama: string) {
  let hi = -1
  for (let r = 1; r <= 15 && hi < 0; r++) {
    ws.getRow(r).eachCell((c) => {
      if (hi < 0 && kunci(teksSel(c)) === labelPertama) hi = r
    })
  }
  if (hi < 0) return null
  const subTajuk = (r: number) => {
    let ya = false
    ws.getRow(r).eachCell((c) => {
      const t = teksSel(c)
      if (SUBTAJUK.has(kunci(t)) || t.trim().startsWith('[')) ya = true
    })
    return ya
  }
  let mula = hi + 1
  while (mula <= hi + 3 && subTajuk(mula)) mula++

  const tajuk: { col: number; k: string }[][] = []
  for (let r = hi; r < mula; r++) {
    const baris: { col: number; k: string }[] = []
    ws.getRow(r).eachCell((c) => baris.push({ col: Number(c.col), k: kunci(teksSel(c)) }))
    tajuk.push(baris)
  }
  const cari = (ok: (k: string) => boolean) => {
    for (const t of tajuk) {
      const x = t.find((c) => ok(c.k))
      if (x) return x.col
    }
    return -1
  }
  return {
    mula,
    lajur: (...label: string[]) => cari((k) => label.includes(k)),
    lajurMula: (awalan: string) => cari((k) => k.startsWith(awalan)),
  }
}

const huruf = (ws: Worksheet, col: number) => ws.getColumn(col).letter

function tulis(row: Row, col: number, nilai: Cell['value']) {
  if (col > 0) row.getCell(col).value = nilai
}

const salinGaya = (s: Partial<Style>) => JSON.parse(JSON.stringify(s ?? {})) as Partial<Style>

// ---------- General_Info ----------
function isiMaklumatAm(ws: Worksheet, d: DataEksport) {
  const ppsBuka = d.pps.filter((p) => p.status !== 'ditutup')
  const daerah = new Set(ppsBuka.map((p) => kunci(p.daerah ?? '')).filter(Boolean))
  const mangsa = ppsBuka.reduce((n, p) => n + p.jumlah_mangsa, 0)
  const keluarga = ppsBuka.reduce((n, p) => n + p.jumlah_keluarga, 0)
  const korban = d.lampiran.korban
  const jumlahKategori = (kata: string) =>
    korban.filter((k) => kunci(k.kategori ?? '').includes(kata)).reduce((n, k) => n + k.jumlah, 0)

  let ringkasan =
    `${ppsBuka.length} PPS dibuka di ${daerah.size} daerah (${d.negeri.join(', ')}) ` +
    `menempatkan ${mangsa} mangsa daripada ${keluarga} keluarga.`
  if (korban.length > 0) {
    ringkasan += ` Kematian: ${jumlahKategori('mati')}, Kecederaan: ${jumlahKategori('cedera')}, Hilang: ${jumlahKategori('hilang')}.`
  }

  const m = d.masa
  const nilai: Record<string, string> = {
    'nama bencana': d.namaBencana.join(' / '),
    negeri: d.negeri.join(', '),
    'tarikh masa': `${pad(m.getDate())}/${pad(m.getMonth() + 1)}/${m.getFullYear()} @ ${pad(m.getHours())}${pad(m.getMinutes())}HRS`,
    'ringkasan laporan': ringkasan,
    'hal hal lain': d.halLain.join('\n'),
  }
  const ada: Record<string, boolean> = {
    'general info': true,
    shelterstatus: d.pps.length > 0,
    mobilization: d.lampiran.mobilisasi.length > 0,
    'damage casualties': d.lampiran.korban.length > 0,
    casualtiesdetail: d.lampiran.korbanButiran.length > 0,
    'damage infrastructure govt': d.lampiran.kerosakanKerajaan.length > 0,
    'damage infrastructure private': d.lampiran.kerosakanSwasta.length > 0,
    'aqua agri livestockdamage': d.lampiran.pertanian.length > 0,
    closedroad: d.lampiran.jalanDitutup.length > 0,
  }

  let dalamOrang = false // "Disediakan / Disahkan Oleh": left for the signing officer
  for (let r = 1; r <= 40; r++) {
    const row = ws.getRow(r)
    row.eachCell((c) => {
      const k = kunci(teksSel(c))
      if (k === 'disediakan oleh' || k === 'disahkan oleh') dalamOrang = true
      if (!dalamOrang && k in nilai) row.getCell(Number(c.col) + 1).value = nilai[k]
      if (k in ada && typeof row.getCell(Number(c.col) + 1).value === 'boolean') {
        row.getCell(Number(c.col) + 1).value = ada[k]
      }
    })
  }
}

// ---------- ShelterStatus: one block per district + yellow JUMLAH row ----------
function isiPps(ws: Worksheet, d: DataEksport) {
  const j = jadual(ws, 'nama pusat pemindahan')
  if (!j) return
  const c = {
    daerah: j.lajur('daerah'),
    mukim: j.lajur('mukim'),
    nama: j.lajur('nama pusat pemindahan'),
    buka: j.lajur('buka'),
    tutup: j.lajur('tutup'),
    mangsa: j.lajur('jumlah mangsa pemindahan'),
    keluarga: j.lajurMula('jumlah keluarga'),
    jantina: j.lajur('jantina'),
    dewasa: j.lajur('dewasa'),
    kanak: j.lajur('kanak kanak'),
    pengurus: j.lajur('pengurus pusat pemindahan'),
    jawatan: j.lajur('jawatan'),
    telefon: j.lajur('nombor telefon'),
  }

  // Model rows prepared in the template: data row, then JUMLAH row
  const LEBAR = 31
  const gayaData = Array.from({ length: LEBAR }, (_, i) => salinGaya(ws.getRow(j.mula).getCell(i + 1).style))
  const gayaJumlah = Array.from({ length: LEBAR }, (_, i) => salinGaya(ws.getRow(j.mula + 1).getCell(i + 1).style))
  const tinggiData = ws.getRow(j.mula).height
  ws.unMergeCells(j.mula + 1, 1, j.mula + 1, 3)
  for (const r of [j.mula, j.mula + 1]) {
    for (let i = 1; i <= LEBAR; i++) ws.getRow(r).getCell(i).value = null
  }

  // District blocks (alphabetical), open PPS first inside each block
  const ikutDaerah = new Map<string, PpsEksport[]>()
  for (const p of d.pps) {
    const k = kunci(p.daerah ?? '') || '-'
    if (!ikutDaerah.has(k)) ikutDaerah.set(k, [])
    ikutDaerah.get(k)!.push(p)
  }
  const blok = [...ikutDaerah.values()].sort((a, b) => (a[0].daerah ?? '').localeCompare(b[0].daerah ?? ''))

  const L = (col: number) => huruf(ws, col)
  let r = j.mula
  for (const senarai of blok) {
    senarai.sort((a, b) =>
      a.status === 'ditutup' && b.status !== 'ditutup'
        ? 1
        : b.status === 'ditutup' && a.status !== 'ditutup'
          ? -1
          : a.nama.localeCompare(b.nama),
    )
    const awal = r
    senarai.forEach((p, i) => {
      // A closed PPS no longer holds anyone: 0, like in the states' reports
      const ditutup = p.status === 'ditutup'
      const row = ws.getRow(r)
      row.height = tinggiData
      for (let x = 1; x <= LEBAR; x++) row.getCell(x).style = salinGaya(gayaData[x - 1])
      tulis(row, 1, i + 1)
      tulis(row, c.daerah, p.daerah)
      tulis(row, c.mukim, p.mukim)
      tulis(row, c.nama, p.nama)
      tulis(row, c.buka, tarikhExcel(p.dibuka_pada))
      tulis(row, c.tutup, p.status === 'ditutup' ? tarikhExcel(p.ditutup_pada) : null)
      tulis(row, c.keluarga, ditutup ? 0 : p.jumlah_keluarga)
      tulis(row, c.pengurus, p.pengurus_nama)
      tulis(row, c.jawatan, p.pengurus_jawatan)
      tulis(row, c.telefon, p.pengurus_telefon)

      // Sex/age breakdown when it adds up; otherwise the total alone
      const pecahan = [p.dewasa_lelaki, p.dewasa_perempuan, p.kanak_lelaki, p.kanak_perempuan]
      const lengkap =
        !ditutup &&
        c.jantina > 0 && c.dewasa > 0 && c.kanak > 0 &&
        pecahan.every((x) => x != null) &&
        pecahan.reduce<number>((n, x) => n + (x ?? 0), 0) === p.jumlah_mangsa
      if (lengkap) {
        tulis(row, c.dewasa, p.dewasa_lelaki)
        tulis(row, c.dewasa + 1, p.dewasa_perempuan)
        tulis(row, c.kanak, p.kanak_lelaki)
        tulis(row, c.kanak + 1, p.kanak_perempuan)
        tulis(row, c.jantina, { formula: `${L(c.dewasa)}${r}+${L(c.kanak)}${r}` })
        tulis(row, c.jantina + 1, { formula: `${L(c.dewasa + 1)}${r}+${L(c.kanak + 1)}${r}` })
        tulis(row, c.mangsa, { formula: `${L(c.jantina)}${r}+${L(c.jantina + 1)}${r}` })
      } else {
        tulis(row, c.mangsa, ditutup ? 0 : p.jumlah_mangsa)
      }
      r++
    })

    // JUMLAH: open PPS (named, no closing date) and totals of the block
    const akhir = r - 1
    const row = ws.getRow(r)
    for (let x = 1; x <= LEBAR; x++) row.getCell(x).style = salinGaya(gayaJumlah[x - 1])
    row.getCell(1).value = 'JUMLAH'
    ws.mergeCells(r, 1, r, 3)
    if (c.nama > 0 && c.tutup > 0) {
      row.getCell(c.nama).value = {
        formula: `COUNTA(${L(c.nama)}${awal}:${L(c.nama)}${akhir})-COUNTA(${L(c.tutup)}${awal}:${L(c.tutup)}${akhir})`,
      }
    }
    const lajurJumlah = [c.mangsa, c.keluarga, c.mangsa + 2, c.jantina, c.jantina + 1, c.dewasa, c.dewasa + 1, c.kanak, c.kanak + 1]
    for (const col of lajurJumlah) {
      if (col > 0) row.getCell(col).value = { formula: `SUM(${L(col)}${awal}:${L(col)}${akhir})` }
    }
    r++
  }
}

// ---------- Other sheets ----------
function isiBaris<T>(ws: Worksheet | undefined, labelPertama: string, rows: T[], isi: (row: Row, x: T, j: NonNullable<ReturnType<typeof jadual>>) => void) {
  if (!ws || rows.length === 0) return
  const j = jadual(ws, labelPertama)
  if (!j) return
  rows.forEach((x, i) => isi(ws.getRow(j.mula + i), x, j))
}

function isiLampiran(wb: Workbook, d: DataEksport) {
  const l = d.lampiran
  isiBaris(wb.getWorksheet('Mobilization'), 'agensi ngo', l.mobilisasi, (row, m, j) => {
    const darat = j.lajur('darat')
    const air = j.lajur('air')
    const udara = j.lajur('udara')
    tulis(row, j.lajur('agensi ngo'), m.agensi)
    tulis(row, j.lajur('tindakan', 'jenis tindak balas'), m.tindakan)
    tulis(row, j.lajurMula('kekuatan ahli'), m.kekuatan)
    tulis(row, darat, m.darat_jenis)
    tulis(row, darat > 0 ? darat + 1 : -1, m.darat_kuantiti)
    tulis(row, air, m.air_jenis)
    tulis(row, air > 0 ? air + 1 : -1, m.air_kuantiti)
    tulis(row, udara, m.udara_jenis)
    tulis(row, udara > 0 ? udara + 1 : -1, m.udara_kuantiti)
    tulis(row, j.lajurMula('tarikh mula operasi'), tarikhExcel(m.tarikh_mula))
    tulis(row, j.lajurMula('tarikh tamat operasi'), tarikhExcel(m.tarikh_tamat))
    tulis(row, j.lajur('catatan'), m.catatan)
  })

  isiBaris(wb.getWorksheet('Damage_Casualties'), 'daerah', l.korban, (row, k, j) => {
    const lelaki = j.lajur('lelaki')
    const dewasa = j.lajur('dewasa')
    const kanak = j.lajur('kanak kanak')
    tulis(row, j.lajur('daerah'), k.daerah)
    tulis(row, j.lajur('kategori'), k.kategori)
    tulis(row, lelaki, k.lelaki)
    tulis(row, lelaki > 0 ? lelaki + 1 : -1, k.perempuan)
    tulis(row, dewasa, k.dewasa_lelaki)
    tulis(row, dewasa > 0 ? dewasa + 1 : -1, k.dewasa_perempuan)
    tulis(row, kanak, k.kanak_lelaki)
    tulis(row, kanak > 0 ? kanak + 1 : -1, k.kanak_perempuan)
    tulis(row, j.lajurMula('jumlah keseluruhan'), k.jumlah)
  })

  isiBaris(wb.getWorksheet('CasualtiesDetail'), 'nama mangsa', l.korbanButiran, (row, b, j) => {
    tulis(row, j.lajur('nama mangsa'), b.nama)
    tulis(row, j.lajur('alamat'), b.alamat)
    tulis(row, j.lajur('kategori'), b.kategori)
    tulis(row, j.lajur('umur'), b.umur)
    tulis(row, j.lajur('jantina'), b.jantina)
    tulis(row, j.lajur('bangsa'), b.bangsa)
    tulis(row, j.lajur('catatan'), b.catatan)
    tulis(row, j.lajurMula('sebab kematian'), b.sebab_kematian)
  })

  for (const [helaian, rows] of [
    ['Damage_Infrastructure(Govt)', l.kerosakanKerajaan],
    ['Damage_Infrastructure(Private)', l.kerosakanSwasta],
  ] as const) {
    isiBaris(wb.getWorksheet(helaian), 'daerah', [...rows], (row, k, j) => {
      tulis(row, j.lajur('daerah'), k.daerah)
      tulis(row, j.lajur('kategori'), k.kategori)
      tulis(row, j.lajur('rosak'), k.rosak)
      tulis(row, j.lajur('musnah'), k.musnah)
      tulis(row, j.lajur('hak milik'), k.hak_milik)
      tulis(row, j.lajurMula('perincian kerosakan'), k.perincian)
    })
  }

  isiBaris(wb.getWorksheet('Aqua,Agri,LivestockDamage'), 'daerah', l.pertanian, (row, p, j) => {
    tulis(row, j.lajur('daerah'), p.daerah)
    tulis(row, j.lajur('alamat'), p.alamat)
    tulis(row, j.lajur('kategori'), p.kategori)
    tulis(row, j.lajur('sub kategori'), p.sub_kategori)
    tulis(row, j.lajurMula('punca kerosakan'), p.punca)
    tulis(row, j.lajurMula('bilangan petani'), p.bil_terlibat)
    tulis(row, j.lajurMula('anggaran kawasan'), p.kawasan_ha)
    tulis(row, j.lajurMula('jumlah terjejas'), p.jumlah_terjejas)
    tulis(row, j.lajur('catatan'), p.catatan)
  })

  isiBaris(wb.getWorksheet('ClosedRoad'), 'daerah', l.jalanDitutup, (row, x, j) => {
    tulis(row, j.lajur('daerah'), x.daerah)
    tulis(row, j.lajur('mukim'), x.mukim)
    tulis(row, j.lajurMula('nama laluan'), x.nama_laluan)
    tulis(row, j.lajurMula('lokasi penutupan'), x.lokasi)
    tulis(row, j.lajur('laluan alternatif'), x.laluan_alternatif)
    tulis(row, j.lajur('latitude'), x.latitude)
    tulis(row, j.lajur('longitude'), x.longitude)
    tulis(row, j.lajurMula('tarikh masa penutupan bermula'), tarikhExcel(x.mula))
    tulis(row, j.lajurMula('tarikh masa penutupan berakhir'), tarikhExcel(x.tamat))
    tulis(row, j.lajur('url'), x.url)
    tulis(row, j.lajurMula('punca penutupan'), x.punca)
  })
}

// Builds one workbook from the template (pure: also runs in Node for tests)
export async function binaExcel(XL: ModulExcel, templat: ArrayBuffer, d: DataEksport): Promise<ArrayBuffer> {
  const wb = new XL.Workbook()
  await wb.xlsx.load(templat)
  const gi = wb.getWorksheet('General_Info')
  const ss = wb.getWorksheet('ShelterStatus')
  if (gi) isiMaklumatAm(gi, d)
  if (ss) isiPps(ss, d)
  isiLampiran(wb, d)
  // Formulas have no cached results: Excel recalculates when the file opens
  wb.calcProperties.fullCalcOnLoad = true
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

// "TERENGGANU (BANJIR) 2200H.xlsx", like the states' own files
export function namaFailEksport(d: DataEksport) {
  const asas = `${d.label} (${d.jenis}) ${pad(d.masa.getHours())}${pad(d.masa.getMinutes())}H`
  return `${asas.toUpperCase().replace(/[\\/:*?"<>|]+/g, '-')}.xlsx`
}

// ---------- Data: active disasters, one workbook per state + type, with the page filters ----------
type BarisLaporan = {
  id: string
  nama_bencana: string | null
  jenis_bencana: string | null
  negeri: string | null
  jenis_laporan: string
  hal_lain: string | null
  created_at: string
}

export async function ambilDataEksport(tapis: TapisEksport): Promise<DataEksport[]> {
  const [lapData, ppsData, tamatData] = await Promise.all([
    ambilSemua<BarisLaporan>(() =>
      supabase
        .from('laporan_bencana')
        .select('id, nama_bencana, jenis_bencana, negeri, jenis_laporan, hal_lain, created_at')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
    ),
    ambilSemua<PpsEksport>(() => supabase.from('pps_pusat').select('*').order('id')),
    supabase.from('bencana_tamat').select('nama_bencana').then(pastikan),
  ])
  const laporan = (lapData as BarisLaporan[]) ?? []
  const semuaPps = (ppsData as PpsEksport[]) ?? []
  const tamat = new Set(((tamatData as { nama_bencana: string }[]) ?? []).map((t) => t.nama_bencana))

  const lulusNegeri = (n: string | null) =>
    !!n && (!tapis.negeri || n === tapis.negeri) && (!tapis.zon || cariZon(n) === tapis.zon)

  // Type of each active disaster = type in its latest report
  const jenisIkutBencana = new Map<string, string>()
  for (const r of laporan) {
    const nama = r.nama_bencana?.trim()
    if (!nama || tamat.has(nama) || jenisIkutBencana.has(nama)) continue
    jenisIkutBencana.set(nama, r.jenis_bencana?.trim() || 'Lain-lain')
  }

  // Active disasters kept by the type filter, then their PPS / reports kept by the state filters
  const bencanaAktif = new Set(
    [...jenisIkutBencana]
      .filter(([n, j]) => (!tapis.jenis || j === tapis.jenis) && (!tapis.nama || tapis.nama.includes(n)))
      .map(([n]) => n),
  )
  const ppsAktif = semuaPps.filter(
    (p) =>
      bencanaAktif.has(p.nama_bencana) &&
      lulusNegeri(p.negeri) &&
      (!tapis.parlimen || p.parlimen === tapis.parlimen) &&
      (!tapis.dun || p.dun === tapis.dun),
  )
  const laporanAktif = laporan.filter(
    (r) => !!r.nama_bencana && bencanaAktif.has(r.nama_bencana) && lulusNegeri(r.negeri),
  )

  // One workbook per state + disaster type (the NDCC template holds a single type),
  // sorted by state, then type
  const kumpulan = new Map<string, { negeri: string; jenis: string }>()
  const tambah = (negeri: string, nama: string) => {
    const jenis = jenisIkutBencana.get(nama)!
    kumpulan.set(`${negeri}|${jenis}`, { negeri, jenis })
  }
  for (const p of ppsAktif) tambah(p.negeri, p.nama_bencana)
  // With a Parlimen/ADUN filter, only disasters that have PPS in that constituency
  if (!tapis.parlimen && !tapis.dun) for (const r of laporanAktif) tambah(r.negeri!, r.nama_bencana!)
  const senaraiKumpulan = [...kumpulan.values()].sort(
    (a, b) => a.negeri.localeCompare(b.negeri) || a.jenis.localeCompare(b.jenis),
  )

  // Extra sheets fetched once for every state, then split per workbook
  const lampiranSemua = await ambilLampiranTerkini(laporanAktif.filter((r) => r.jenis_laporan === 'semasa'))

  const masa = new Date()
  const keluaran: DataEksport[] = []

  for (const { negeri, jenis } of senaraiKumpulan) {
    const padan = (nama: string | null, n: string | null) => n === negeri && !!nama && jenisIkutBencana.get(nama) === jenis
    const pps = ppsAktif.filter((p) => padan(p.nama_bencana, p.negeri))
    const laporanDitapis = laporanAktif.filter((r) => padan(r.nama_bencana, r.negeri))
    const laporanSemasa = laporanDitapis.filter((r) => r.jenis_laporan === 'semasa')

    const namaAda = [...new Set([...pps.map((p) => p.nama_bencana), ...laporanDitapis.map((r) => r.nama_bencana!)])]

    // Latest "Hal-hal lain" per disaster (one state per workbook now)
    const halLain: string[] = []
    const dilihat = new Set<string>()
    for (const r of laporanSemasa) {
      if (dilihat.has(r.nama_bencana!) || !r.hal_lain?.trim()) continue
      dilihat.add(r.nama_bencana!)
      halLain.push(namaAda.length > 1 ? `${r.nama_bencana}: ${r.hal_lain.trim()}` : r.hal_lain.trim())
    }

    keluaran.push({
      jenis,
      label: negeri,
      namaBencana: namaAda,
      negeri: [negeri],
      masa,
      pps,
      halLain,
      lampiran: pecahLampiran(lampiranSemua, new Set(laporanSemasa.map((r) => r.id))),
    })
  }
  return keluaran
}

// Extra-sheet rows still carrying the report they came from, to split them per workbook
type Ada = { laporan_id: string }
type LampiranBerId = { [K in keyof DataLampiran]: (DataLampiran[K][number] & Ada)[] }

function pecahLampiran(l: LampiranBerId, ids: Set<string>): DataLampiran {
  const ambil = <T extends Ada>(rows: T[]) => rows.filter((x) => ids.has(x.laporan_id))
  return {
    mobilisasi: ambil(l.mobilisasi),
    korban: ambil(l.korban),
    korbanButiran: ambil(l.korbanButiran),
    kerosakanKerajaan: ambil(l.kerosakanKerajaan),
    kerosakanSwasta: ambil(l.kerosakanSwasta),
    pertanian: ambil(l.pertanian),
    jalanDitutup: ambil(l.jalanDitutup),
  }
}

// Other sheets: for each disaster + state, the latest report that carried that sheet
async function ambilLampiranTerkini(laporanSemasa: BarisLaporan[]): Promise<LampiranBerId> {
  // At most the 10 latest reports per disaster + state are searched
  const calon: BarisLaporan[] = []
  const bil = new Map<string, number>()
  for (const r of laporanSemasa) {
    const k = `${r.nama_bencana}|${r.negeri}`
    const n = bil.get(k) ?? 0
    if (n < 10) calon.push(r)
    bil.set(k, n + 1)
  }
  const ids = calon.map((r) => r.id)
  const kosong: LampiranBerId = {
    mobilisasi: [], korban: [], korbanButiran: [], kerosakanKerajaan: [], kerosakanSwasta: [], pertanian: [], jalanDitutup: [],
  }
  if (ids.length === 0) return kosong

  const ambil = <T>(jadualDb: string) =>
    dalamKepingan<T & Ada>(ids, (x) => supabase.from(jadualDb).select('*').in('laporan_id', x).order('id'))
  const [mob, kor, but, ker, per, jal] = await Promise.all([
    ambil<DataLampiran['mobilisasi'][number]>('laporan_mobilisasi'),
    ambil<DataLampiran['korban'][number]>('laporan_korban'),
    ambil<DataLampiran['korbanButiran'][number]>('laporan_korban_butiran'),
    ambil<DataLampiran['kerosakanKerajaan'][number] & { jenis: string }>('laporan_kerosakan'),
    ambil<DataLampiran['pertanian'][number]>('laporan_pertanian'),
    ambil<DataLampiran['jalanDitutup'][number]>('laporan_jalan_ditutup'),
  ])

  // calon is newest-first: keep, per disaster + state, the first report that has rows
  const terkini = <T extends Ada>(rows: T[]) => {
    const adaIkutLaporan = new Set(rows.map((x) => x.laporan_id))
    const dipilih = new Set<string>()
    const kumpulan = new Set<string>()
    for (const r of calon) {
      const k = `${r.nama_bencana}|${r.negeri}`
      if (kumpulan.has(k) || !adaIkutLaporan.has(r.id)) continue
      kumpulan.add(k)
      dipilih.add(r.id)
    }
    return rows.filter((x) => dipilih.has(x.laporan_id))
  }

  const kini = Date.now()
  return {
    mobilisasi: terkini(mob),
    korban: terkini(kor),
    korbanButiran: terkini(but),
    kerosakanKerajaan: terkini(ker.filter((k) => k.jenis === 'kerajaan')),
    kerosakanSwasta: terkini(ker.filter((k) => k.jenis === 'swasta')),
    pertanian: terkini(per),
    jalanDitutup: terkini(jal).filter((x) => !x.tamat || new Date(x.tamat).getTime() > kini),
  }
}

// ---------- Button action: fetch, build, download (one file, or a .zip) ----------
function muatTurun(data: Blob, nama: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const namaSelamat = (s: string) => s.toUpperCase().replace(/[\\/:*?"<>|]+/g, '-')

export async function janaExcelNasional(tapis: TapisEksport): Promise<number> {
  const senarai = await ambilDataEksport(tapis)
  if (senarai.length === 0) return 0

  const [modul, jawapan] = await Promise.all([
    import('exceljs') as Promise<ModulExcel & { default?: ModulExcel }>,
    fetch(LALUAN_TEMPLAT),
  ])
  if (!jawapan.ok) throw new Error('Templat Excel tidak dijumpai')
  const XL = modul.default ?? modul
  const templat = await jawapan.arrayBuffer()

  const fail = await Promise.all(
    senarai.map(async (d) => ({ negeri: d.label, nama: namaFailEksport(d), data: await binaExcel(XL, templat, d) })),
  )

  if (fail.length === 1) {
    muatTurun(new Blob([fail[0].data], { type: MIME_XLSX }), fail[0].nama)
  } else {
    // Several files: one .zip, one folder per state ("JOHOR/JOHOR (BANJIR) 2200H.xlsx")
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const f of fail) zip.folder(namaSelamat(f.negeri))!.file(f.nama, f.data)

    // Zip named after the filters, not after the first state in it
    const label = tapis.negeri ?? (tapis.zon ? `ZON ${tapis.zon}` : 'NASIONAL')
    const jenis = tapis.jenis ? ` (${tapis.jenis})` : ''
    const m = senarai[0].masa
    muatTurun(
      await zip.generateAsync({ type: 'blob' }),
      namaSelamat(`LAPORAN SITUASI BENCANA ${label}${jenis} ${pad(m.getHours())}${pad(m.getMinutes())}H`) + '.zip',
    )
  }
  return fail.length
}