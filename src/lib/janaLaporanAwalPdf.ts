import apmLogo from '../assets/apm-logo.png'
import { KEJADIAN_FIELDS } from './laporanBencana'
import type { LaporanBencanaRow } from './laporanBencana'
import type { CellDef } from 'jspdf-autotable'

// One Laporan Awal as a PDF, laid out like the NDCC Word form (Appendix B-1):
// Tarikh/Masa, Maklumat Kejadian 1.1–1.13, Hal-hal Lain, Disediakan Oleh, Telah Diberi Perhatian.

const BULAN = [
  'JANUARI',
  'FEBRUARI',
  'MAC',
  'APRIL',
  'MEI',
  'JUN',
  'JULAI',
  'OGOS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DISEMBER',
]
const pad = (n: number) => String(n).padStart(2, '0')

async function muatGambar(src: string): Promise<string | null> {
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// "27 OKTOBER 2026"
function tarikhPanjang(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

// "09:15 PAGI", "5:36 PETANG", "8:10 MALAM"
function masaMelayu(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const j = d.getHours()
  const tempoh = j < 12 ? 'PAGI' : j < 19 ? 'PETANG' : 'MALAM'
  const j12 = j % 12 === 0 ? 12 : j % 12
  return `${pad(j12)}:${pad(d.getMinutes())} ${tempoh}`
}

const nilai = (v: string | null | undefined) => (v ?? '').toString().trim()

export async function janaLaporanAwalPdf(row: LaporanBencanaRow) {
  const { default: JsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const logo = await muatGambar(apmLogo)

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const lebar = doc.internal.pageSize.getWidth()
  const tinggi = doc.internal.pageSize.getHeight()
  const margin = 15

  // --- Header ---
  if (logo) doc.addImage(logo, 'PNG', margin, 10, 16, 15)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('LAPORAN BENCANA', lebar / 2, 17, { align: 'center' })
  doc.setFontSize(9)
  doc.text('APPENDIX B-1', lebar - margin, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('National Disaster Command Centre', lebar / 2, 23, { align: 'center' })

  // --- Tarikh / Masa ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Tarikh/ Masa :', margin, 34)
  doc.text(
    row.tarikh_masa ? `${tarikhPanjang(row.tarikh_masa)} / ${masaMelayu(row.tarikh_masa)}` : '—',
    margin + 28,
    34,
  )

  // --- Table (4 columns: label | value | label | value; most rows use one label + 3 merged cells) ---
  const medan = Object.fromEntries(KEJADIAN_FIELDS.map((f) => [f.key, f]))
  const label = (key: string) => {
    const f = medan[key]
    return `${f.no} ${f.label.toUpperCase()}:\n(${(f.en ?? '').toUpperCase()})`
  }

  const tebal = { fontStyle: 'bold' } as const
  const tajukSeksyen = (teks: string): CellDef[] => [
    { content: teks, colSpan: 4, styles: { fillColor: '#0b2a5c', textColor: '#ffffff', fontStyle: 'bold' } },
  ]
  const barisMedan = (key: string): CellDef[] => [
    { content: label(key), styles: tebal },
    { content: nilai(row[key]).toUpperCase(), colSpan: 3 },
  ]
  const barisOrang = (teks: string, v: string): CellDef[] => [
    { content: teks, styles: tebal },
    { content: v.toUpperCase(), colSpan: 3 },
  ]
  const barisMasa = (iso: string | null): CellDef[] => [
    { content: 'TANDATANGAN & COP', styles: { fontStyle: 'bold', minCellHeight: 12 } },
    {
      content: iso ? `MASA : ${masaMelayu(iso)}     TARIKH : ${tarikhPanjang(iso)}` : 'MASA :          TARIKH :',
      colSpan: 3,
    },
  ]

  const badan: CellDef[][] = [
    tajukSeksyen('MAKLUMAT KEJADIAN (maklumat lengkap yang diperlukan untuk mendaftar bencana)'),
    ...['jenis_bencana', 'level', 'nama_bencana', 'bidang_kuasa', 'negeri', 'daerah', 'mukim', 'alamat'].map(
      barisMedan,
    ),
    // 1.9 Poskod and 1.10 Radius share one line, as in the Word form
    [
      { content: label('poskod'), styles: tebal },
      { content: nilai(row.poskod) },
      { content: label('radius'), styles: tebal },
      { content: nilai(row.radius).toUpperCase() },
    ],
    ...['sebab_kejadian', 'kandungan', 'catatan'].map(barisMedan),

    tajukSeksyen('HAL-HAL LAIN (aktiviti/perkara selain di atas perlukan perhatian)'),
    [{ content: nilai(row.hal_lain) || ' ', colSpan: 4, styles: { minCellHeight: 14 } }],

    tajukSeksyen('DISEDIAKAN OLEH'),
    barisOrang('NAMA', nilai(row.penyedia_nama)),
    barisOrang('JAWATAN', nilai(row.penyedia_jawatan)),
    barisOrang('NO. TELEFON', nilai(row.penyedia_telefon)),
    barisMasa(row.penyedia_masa),

    tajukSeksyen('TELAH DIBERI PERHATIAN'),
    barisOrang('NAMA', nilai(row.perhatian_nama)),
    barisOrang('JAWATAN', nilai(row.perhatian_jawatan)),
    barisOrang('NO. TELEFON', nilai(row.perhatian_telefon)),
    barisMasa(row.perhatian_masa),
  ]

  autoTable(doc, {
    startY: 38,
    body: badan,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle', textColor: '#141414', lineColor: '#787878' },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 46 },
      2: { cellWidth: 40 },
      3: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  })

  // --- Footer: map location + generation time ---
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(110)
  const sekarang = new Date()
  const lokasi =
    row.latitude && row.longitude
      ? `Lokasi bencana (peta): ${Number(row.latitude).toFixed(5)}, ${Number(row.longitude).toFixed(5)}   ·   `
      : ''
  doc.text(
    `${lokasi}Dijana pada ${tarikhPanjang(sekarang.toISOString())} ${masaMelayu(sekarang.toISOString())}`,
    margin,
    tinggi - 10,
  )

  const nama = (nilai(row.nama_bencana) || nilai(row.jenis_bencana) || 'Laporan')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  doc.save(`Laporan_Awal_${nama}.pdf`)
}
