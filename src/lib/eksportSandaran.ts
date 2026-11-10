import { supabase } from './supabase'

// "Muat Turun Sandaran" (Admin, PKOP only): every table returned by the database
// function eksport_sandaran() in one Excel file, one sheet per table, encrypted with
// age in the browser before it is saved (.xlsx.age). Only the holders of the private
// keys listed in VITE_SANDARAN_PENERIMA can open it:
//   age -d -i kunci-sandaran.txt Sandaran_APM_BO_<tarikh>.xlsx.age > Sandaran.xlsx

// Public keys (age1…), comma-separated; public keys are not secret
const PENERIMA = (import.meta.env.VITE_SANDARAN_PENERIMA ?? '')
  .split(',')
  .map((k: string) => k.trim())
  .filter((k: string) => k.startsWith('age1'))

export const adaKunciSandaran = PENERIMA.length > 0

type ModulExcel = typeof import('exceljs')
type Jadual = Record<string, Record<string, unknown>[]>
type Sel = string | number | boolean | Date | null

// Excel refuses cells longer than 32 767 characters
const HAD_SEL = 32_000

// Timestamps from the database are UTC ("2026-10-17T12:00:00+00:00"). Plain dates
// ("2026-11-01", e.g. season dates) have no time and are left as they are.
const ISO_MASA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/
const MYT_MS = 8 * 60 * 60 * 1000 // Malaysia: UTC+8 all year (no daylight saving)
const FORMAT_MASA = 'dd/mm/yyyy hh:mm'
const ZON = { timeZone: 'Asia/Kuala_Lumpur' } as const

// Column widths (in characters)
const LEBAR_MIN = 10
const LEBAR_MAKS = 60 // long text / JSON stays readable without one column taking the whole screen
const LEBAR_MASA = 17 // "17/10/2026 20:00"

// ExcelJS writes a Date as its UTC clock time: shifting by +8 h makes Excel show Malaysian
// time, whatever the time zone of the computer doing the export
function keWaktuMalaysia(iso: string): Date | null {
  const t = Date.parse(iso.replace(/(\.\d{3})\d+/, '$1')) // Postgres gives microseconds
  return Number.isNaN(t) ? null : new Date(t + MYT_MS)
}

function nilaiSel(v: unknown): Sel {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'string' && ISO_MASA.test(v)) return keWaktuMalaysia(v) ?? v
  const teks = typeof v === 'string' ? v : JSON.stringify(v) // PPS lists, JSON columns…
  return teks.length > HAD_SEL ? `${teks.slice(0, HAD_SEL)} …(dipotong)` : teks
}

// How wide a value looks in a cell
function panjangPaparan(v: Sel): number {
  if (v === null) return 0
  if (v instanceof Date) return LEBAR_MASA
  if (typeof v === 'string') return v.split('\n').reduce((maks, l) => Math.max(maks, l.length), 0)
  return String(v).length
}

function simpanFail(data: Blob, nama: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const GAYA_TAJUK = {
  font: { bold: true },
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE2E8F0' } },
}

export async function eksportSandaran(namaPengguna?: string | null) {
  // Never produce a readable copy: no key, no download
  if (!adaKunciSandaran) {
    throw new Error('Kunci sandaran belum ditetapkan. Hubungi pentadbir sistem.')
  }

  const { data, error } = await supabase.rpc('eksport_sandaran')
  if (error) {
    throw new Error(
      error.code === '42501'
        ? 'Hanya Super Admin (PKOP) boleh memuat turun sandaran.'
        : 'Gagal memuat turun sandaran. Semak sambungan internet dan cuba lagi.',
    )
  }

  const jadual = (data ?? {}) as Jadual
  const namaJadual = Object.keys(jadual).sort()

  const modul = (await import('exceljs')) as ModulExcel & { default?: ModulExcel }
  const XL = modul.default ?? modul
  const wb = new XL.Workbook()
  wb.creator = 'APM BO'
  wb.created = new Date()

  // First sheet (filled in at the end): when, by whom, and how many rows per table
  const maklumat = wb.addWorksheet('Maklumat')

  let bilBaris = 0
  for (const nama of namaJadual) {
    const baris = jadual[nama] ?? []
    bilBaris += baris.length

    const ws = wb.addWorksheet(nama.slice(0, 31)) // Excel limit: 31 characters
    const lajur = [...new Set(baris.flatMap((b) => Object.keys(b)))]
    if (lajur.length === 0) {
      ws.getCell('A1').value = 'Tiada rekod'
      ws.getColumn(1).width = 20
      continue
    }

    const sel = baris.map((b) => lajur.map((k) => nilaiSel(b[k])))

    // Each column as wide as its header or its widest value, within limits
    ws.columns = lajur.map((k, i) => {
      let lebar = k.length
      for (const r of sel) lebar = Math.max(lebar, panjangPaparan(r[i]))
      return { header: k, key: k, width: Math.min(LEBAR_MAKS, Math.max(LEBAR_MIN, lebar + 2)) }
    })

    // Date columns: shown as a date + time, sortable and filterable in Excel
    lajur.forEach((_, i) => {
      if (sel.some((r) => r[i] instanceof Date)) ws.getColumn(i + 1).numFmt = FORMAT_MASA
    })

    for (const r of sel) ws.addRow(r)

    const tajuk = ws.getRow(1)
    tajuk.font = GAYA_TAJUK.font
    tajuk.fill = GAYA_TAJUK.fill
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: lajur.length } }
  }

  const sekarang = new Date()
  maklumat.columns = [
    { header: 'Perkara', key: 'a', width: 30 },
    { header: 'Nilai', key: 'b', width: 60 },
  ]
  maklumat.getRow(1).font = GAYA_TAJUK.font
  maklumat.getRow(1).fill = GAYA_TAJUK.fill
  maklumat.addRows([
    { a: 'Sistem', b: 'APM Bahagian Pengurusan Bencana Operasi' },
    { a: 'Dijana pada', b: sekarang.toLocaleString('ms-MY', ZON) },
    { a: 'Dijana oleh', b: namaPengguna || '—' },
    { a: 'Jumlah baris', b: bilBaris },
    { a: 'Zon masa', b: 'Semua masa dalam waktu Malaysia (UTC+8)' },
    { a: 'Nota', b: 'Mengandungi data peribadi. Simpan di tempat selamat.' },
    {},
  ])
  const tajukJadual = maklumat.addRow({ a: 'Jadual', b: 'Bilangan baris' })
  tajukJadual.font = GAYA_TAJUK.font
  tajukJadual.fill = GAYA_TAJUK.fill
  maklumat.addRows(namaJadual.map((n) => ({ a: n, b: (jadual[n] ?? []).length })))

  const buf = await wb.xlsx.writeBuffer()
  const tarikh = sekarang.toLocaleDateString('sv-SE', ZON) // YYYY-MM-DD in Malaysian time

  // Encrypt in the browser: the readable Excel never leaves memory
  const { Encrypter } = await import('age-encryption')
  const e = new Encrypter()
  for (const kunci of PENERIMA) e.addRecipient(kunci)
  const tersulit = await e.encrypt(new Uint8Array(buf as ArrayBuffer))

  // age returns a plain ArrayBuffer-backed array; the cast only satisfies TS 5.7+ typings
  simpanFail(
    new Blob([tersulit as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' }),
    `Sandaran_APM_BO_${tarikh}.xlsx.age`,
  )

  return { bilJadual: namaJadual.length, bilBaris }
}