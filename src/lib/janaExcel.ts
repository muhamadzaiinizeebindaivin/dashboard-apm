import {
  TARIKH_MASA_FIELD,
  KEJADIAN_FIELDS,
  HAL_LAIN_FIELD,
  PENYEDIA_FIELDS,
  PERHATIAN_FIELDS,
} from './laporanBencana'
import type { FieldDef, LaporanBencanaRow } from './laporanBencana'

type Options = {
  rows: LaporanBencanaRow[]
  jenis: 'awal' | 'semasa'
  jenisLabel: string
  negeri: string
  dari: Date
  hingga: Date
}

type Kolum = {
  header: string
  width: number
  date?: boolean
  get: (r: LaporanBencanaRow) => string | Date | null
}

function daripadaField(def: FieldDef, awalan = ''): Kolum {
  const isDate = def.type === 'datetime'
  return {
    header: `${awalan}${def.no ? def.no + ' ' : ''}${def.label}`,
    width: isDate ? 20 : def.wide ? 40 : 20,
    date: isDate,
    get: (r) => {
      const v = r[def.key]
      if (!v) return null
      return isDate ? new Date(v) : v
    },
  }
}

const KOLUM: Kolum[] = [
  { header: 'Masa Diterima', width: 20, date: true, get: (r) => new Date(r.created_at) },
  { header: 'Jenis Laporan', width: 16, get: (r) => (r.jenis_laporan === 'awal' ? 'Laporan Awal' : 'Laporan Semasa') },
  daripadaField(TARIKH_MASA_FIELD),
  ...KEJADIAN_FIELDS.map((f) => daripadaField(f)),
  daripadaField(HAL_LAIN_FIELD),
  ...PENYEDIA_FIELDS.map((f) => daripadaField(f, 'Disediakan Oleh - ')),
  ...PERHATIAN_FIELDS.map((f) => daripadaField(f, 'Diberi Perhatian - ')),
]

const pad = (n: number) => String(n).padStart(2, '0')

function kira(rows: LaporanBencanaRow[], key: string) {
  const peta = new Map<string, number>()
  for (const r of rows) {
    const k = (r[key] as string | null)?.trim() || '(tiada)'
    peta.set(k, (peta.get(k) ?? 0) + 1)
  }
  return [...peta.entries()].sort((a, b) => b[1] - a[1])
}

export async function janaExcelLaporan({ rows, jenis, jenisLabel, negeri, dari, hingga }: Options) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.created = hingga

  // ---- Sheet 1: Laporan ----
  const ws = wb.addWorksheet('Laporan')
  ws.columns = KOLUM.map((k) => ({ header: k.header, width: k.width }))

  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }
  header.alignment = { vertical: 'middle', wrapText: true }
  header.height = 30

  for (const r of rows) {
    const row = ws.addRow(KOLUM.map((k) => k.get(r)))
    row.alignment = { vertical: 'top', wrapText: true }
    KOLUM.forEach((k, i) => {
      if (k.date) row.getCell(i + 1).numFmt = 'dd/mm/yyyy hh:mm'
    })
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: KOLUM.length } }

  // ---- Sheet 2: Ringkasan ----
  const rs = wb.addWorksheet('Ringkasan')
  rs.columns = [{ width: 34 }, { width: 22 }]
  const waktu = (d: Date) => d.toLocaleString('ms-MY')

  const tajuk = (teks: string) => {
    const row = rs.addRow([teks])
    row.font = { bold: true, color: { argb: 'FF047857' } }
  }

  rs.addRow(['Jenis Laporan', jenisLabel])
  rs.addRow(['Negeri', negeri || 'Semua negeri'])
  rs.addRow(['Tempoh', `${waktu(dari)} hingga ${waktu(hingga)}`])
  rs.addRow(['Dijana pada', waktu(hingga)])
  const jumlah = rs.addRow(['Jumlah laporan', rows.length])
  jumlah.font = { bold: true }

  rs.addRow([])
  tajuk('Mengikut Negeri')
  for (const [k, n] of kira(rows, 'negeri')) rs.addRow([k, n])

  rs.addRow([])
  tajuk('Mengikut Jenis Bencana')
  for (const [k, n] of kira(rows, 'jenis_bencana')) rs.addRow([k, n])

  // ---- Download ----
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const stamp = `${hingga.getFullYear()}-${pad(hingga.getMonth() + 1)}-${pad(hingga.getDate())}-${pad(hingga.getHours())}${pad(hingga.getMinutes())}`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-${jenis}-${stamp}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}