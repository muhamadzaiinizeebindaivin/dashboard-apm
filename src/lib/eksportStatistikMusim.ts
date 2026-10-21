import type { Workbook } from 'exceljs'
import apmLogo from '../assets/apm-logo.png'
import type { StatistikMusimData } from './statistikMusim'
import type { Musim } from '../pages/StatistikMusim'

// Export of the Statistik Musim view: PDF (same look as the other reports) and
// Excel (one sheet per section). Both use the figures already computed on screen.

const LABEL_JENIS: Record<Musim['jenis'], string> = {
  timur_laut: 'Monsun Timur Laut',
  barat_daya: 'Monsun Barat Daya',
}

const pad = (n: number) => String(n).padStart(2, '0')
const nombor = (n: number) => n.toLocaleString('ms-MY', { maximumFractionDigits: 1 })

// "2026-11-01" or an ISO timestamp -> "01/11/2026" (calendar date, no timezone shift for plain dates)
function tarikh(iso: string) {
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function namaFail(musim: Musim, ext: string) {
  return `STATISTIK MUSIM ${musim.nama}`.toUpperCase().replace(/[\\/:*?"<>|]+/g, '-') + `.${ext}`
}

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

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export async function janaPdfStatistikMusim(musim: Musim, d: StatistikMusimData) {
  const [{ default: JsPDF }, { default: autoTable }, logo] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    muatGambar(apmLogo),
  ])

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const lebar = doc.internal.pageSize.getWidth()
  const tinggi = doc.internal.pageSize.getHeight()
  const margin = 14
  const sekarang = new Date()
  const akhirJadual = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // --- Header (same layout as the other reports) ---
  if (logo) doc.addImage(logo, 'PNG', lebar / 2 - 10, 10, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(`STATISTIK MUSIM: ${musim.nama.toUpperCase()}`, lebar / 2, 37, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Pusat Kawalan Operasi Pusat', lebar / 2, 43, { align: 'center' })
  doc.setFontSize(8)
  doc.text('Bahagian Pengurusan Bencana Operasi', lebar / 2, 48, { align: 'center' })
  doc.setFontSize(9)
  const sehingga = d.sehingga < musim.tarikh_tamat ? ` (dikira sehingga ${tarikh(d.sehingga)})` : ''
  doc.text(
    `${LABEL_JENIS[musim.jenis]}  ·  ${tarikh(musim.tarikh_mula)} – ${tarikh(musim.tarikh_tamat)}${sehingga}`,
    lebar / 2,
    53,
    { align: 'center' },
  )
  doc.text(
    `Dijana pada: ${tarikh(sekarang.toISOString())} ${pad(sekarang.getHours())}:${pad(sekarang.getMinutes())}`,
    lebar / 2,
    58,
    { align: 'center' },
  )

  // --- Summary boxes ---
  const r = d.ringkasan
  const kotak: [string, string, string][] = [
    ['BENCANA', nombor(r.bilBencana), ''],
    ['LAPORAN', nombor(r.bilLaporan), ''],
    ['NEGERI TERJEJAS', nombor(r.bilNegeri), ''],
    ['PUNCAK MANGSA', nombor(r.puncakMangsa?.nilai ?? 0), r.puncakMangsa ? tarikh(r.puncakMangsa.tarikh) : ''],
    ['PUNCAK PPS', nombor(r.puncakPps?.nilai ?? 0), r.puncakPps ? tarikh(r.puncakPps.tarikh) : ''],
    ['PUNCAK KIR', nombor(r.puncakKeluarga?.nilai ?? 0), r.puncakKeluarga ? tarikh(r.puncakKeluarga.tarikh) : ''],
  ]
  const jarak = 3
  const lebarKotak = (lebar - margin * 2 - jarak * (kotak.length - 1)) / kotak.length
  kotak.forEach(([label, nilai, kecil], i) => {
    const x = margin + i * (lebarKotak + jarak)
    doc.setFillColor(11, 42, 92)
    doc.roundedRect(x, 64, lebarKotak, 22, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(label, x + lebarKotak / 2, 70, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(nilai, x + lebarKotak / 2, 78, { align: 'center' })
    if (kecil) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text(`pada ${kecil}`, x + lebarKotak / 2, 83, { align: 'center' })
    }
  })
  doc.setTextColor(0, 0, 0)

  // --- Daily victims graph ---
  const gx = margin + 14
  const gy = 98
  const gw = lebar - margin * 2 - 14
  const gh = 80
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('MANGSA DI PPS (HARIAN, PADA 23:59)', margin, gy - 4)
  const titik = d.harian
  const max = Math.max(1, ...titik.map((t) => t.mangsa))
  const px = (i: number) => gx + (titik.length <= 1 ? gw / 2 : (i * gw) / (titik.length - 1))
  const py = (v: number) => gy + gh - (gh * v) / max

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setDrawColor(220)
  doc.setLineWidth(0.2)
  for (const f of [0, 0.5, 1]) {
    doc.line(gx, py(max * f), gx + gw, py(max * f))
    doc.setTextColor(130)
    doc.text(nombor(Math.round(max * f)), gx - 2, py(max * f) + 1, { align: 'right' })
  }
  if (titik.length > 0) {
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(0.6)
    for (let i = 1; i < titik.length; i++) doc.line(px(i - 1), py(titik[i - 1].mangsa), px(i), py(titik[i].mangsa))
    const langkah = Math.max(1, Math.ceil(titik.length / 10))
    titik.forEach((t, i) => {
      if (i % langkah === 0 || i === titik.length - 1) doc.text(t.label, px(i), gy + gh + 5, { align: 'center' })
    })
    const iPuncak = r.puncakMangsa ? titik.findIndex((t) => t.tarikh === r.puncakMangsa!.tarikh) : -1
    if (iPuncak >= 0) {
      doc.setFillColor(249, 115, 22)
      doc.circle(px(iPuncak), py(titik[iPuncak].mangsa), 1.2, 'F')
      doc.setTextColor(194, 65, 12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Puncak ${nombor(titik[iPuncak].mangsa)}`, px(iPuncak), Math.max(gy + 3, py(titik[iPuncak].mangsa) - 3), {
        align: 'center',
      })
    }
  }
  doc.setTextColor(0, 0, 0)

  // --- Tables, one section after another ---
  let y = tinggi // forces a new page for the first table
  const gaya = {
    theme: 'grid' as const,
    styles: { fontSize: 7.5, cellPadding: 1.6, valign: 'middle' as const },
    headStyles: { fillColor: '#0b2a5c', textColor: '#ffffff' },
    footStyles: { fillColor: '#111827', textColor: '#ffffff', fontStyle: 'bold' as const },
    margin: { left: margin, right: margin, top: 18 },
  }

  function bahagian(tajuk: string, head: string[], body: (string | number)[][], kosong: string, nota?: string) {
    if (y > tinggi - 45) {
      doc.addPage()
      y = 18
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(11, 42, 92)
    doc.text(tajuk, margin, y)
    doc.setTextColor(0, 0, 0)
    if (body.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(130)
      doc.text(kosong, margin, y + 6)
      doc.setTextColor(0, 0, 0)
      y += 14
      return
    }
    // Number columns (every value a number) are right-aligned, header included
    const kanan = head.map((_, i) => body.every((b) => typeof b[i] === 'number'))
    autoTable(doc, {
      ...gaya,
      startY: y + 2,
      head: [head.map((h, i) => ({ content: h, styles: { halign: kanan[i] ? ('right' as const) : ('left' as const) } }))],
      body: body.map((b) => b.map((x) => (typeof x === 'number' ? nombor(x) : x))),
      columnStyles: Object.fromEntries(kanan.map((k, i) => [i, k ? { halign: 'right' as const } : {}])),
    })
    y = akhirJadual() + 4
    if (nota) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(110)
      doc.text(nota, margin, y + 1)
      doc.setTextColor(0, 0, 0)
      y += 5
    }
    y += 6
  }

  bahagian(
    'MENGIKUT NEGERI',
    ['Negeri', 'Bencana', 'Puncak Mangsa', 'Puncak PPS', 'Hari Aktif'],
    d.ikutNegeri.map((n) => [n.negeri, n.bilBencana, n.puncakMangsa, n.puncakPps, n.hariAktif]),
    'Tiada negeri terjejas.',
  )
  bahagian(
    'MENGIKUT JENIS BENCANA',
    ['Jenis', 'Bencana', 'Puncak Mangsa'],
    d.ikutJenis.map((j) => [j.jenis, j.bilBencana, j.puncakMangsa]),
    'Tiada bencana dalam musim ini.',
  )
  bahagian(
    'SENARAI BENCANA',
    ['Bencana', 'Jenis', 'Negeri', 'Laporan Pertama', 'Tamat', 'Tempoh (hari)', 'Puncak Mangsa'],
    d.bencana.map((b) => [
      b.nama,
      b.jenis,
      b.negeri.join(', ') || '—',
      b.laporanPertama ? tarikh(b.laporanPertama) : '—',
      b.tamatPada ? tarikh(b.tamatPada) : 'Masih aktif',
      b.tempohHari ?? '—',
      b.puncakMangsa,
    ]),
    'Tiada bencana dalam musim ini.',
  )
  const k = d.korban
  bahagian(
    `KORBAN  (Kematian ${nombor(k.kematian)} · Cedera ${nombor(k.cedera)} · Hilang ${nombor(k.hilang)})`,
    ['Negeri', 'Kematian', 'Cedera', 'Hilang'],
    k.ikutNegeri.map((x) => [x.negeri, x.kematian, x.cedera, x.hilang]),
    'Tiada korban dilaporkan.',
    k.ikutNegeri.length > 0
      ? `Dewasa: ${nombor(k.profil.dewasaLelaki)} lelaki, ${nombor(k.profil.dewasaPerempuan)} perempuan · Kanak-kanak: ${nombor(k.profil.kanakLelaki)} lelaki, ${nombor(k.profil.kanakPerempuan)} perempuan`
      : undefined,
  )
  bahagian(
    `MOBILISASI  (Kekuatan maksimum ${nombor(d.mobilisasi.kekuatan)})`,
    ['Agensi', 'Kekuatan', 'Aset Darat', 'Aset Air', 'Aset Udara'],
    d.mobilisasi.ikutAgensi.map((a) => [a.agensi, a.kekuatan, a.darat, a.air, a.udara]),
    'Tiada mobilisasi dilaporkan.',
    'Angka tertinggi yang dilaporkan bagi setiap agensi, bencana dan negeri sepanjang musim.',
  )
  bahagian(
    'KEROSAKAN INFRASTRUKTUR KERAJAAN',
    ['Kategori', 'Rosak', 'Musnah'],
    d.kerosakan.kerajaan.map((x) => [x.kategori, x.rosak, x.musnah]),
    'Tiada kerosakan dilaporkan.',
  )
  bahagian(
    'KEROSAKAN INFRASTRUKTUR SWASTA',
    ['Kategori', 'Rosak', 'Musnah'],
    d.kerosakan.swasta.map((x) => [x.kategori, x.rosak, x.musnah]),
    'Tiada kerosakan dilaporkan.',
  )
  bahagian(
    'PERTANIAN, AKUAKULTUR & TERNAKAN',
    ['Kategori', 'Bil. Terlibat', 'Keluasan (ha)', 'Jumlah Terjejas'],
    d.kerosakan.pertanian.map((p) => [p.kategori, p.bilTerlibat, p.kawasanHa, p.jumlahTerjejas]),
    'Tiada kerosakan pertanian dilaporkan.',
  )
  bahagian(
    `JALAN DITUTUP  (${nombor(d.jalan.jumlah)} jalan)`,
    ['Negeri', 'Jalan'],
    d.jalan.ikutNegeri.map((j) => [j.negeri, j.bil]),
    'Tiada jalan ditutup.',
  )
  bahagian(
    'PENUTUPAN JALAN PALING LAMA',
    ['Laluan', 'Negeri', 'Mula', 'Dibuka', 'Tempoh (jam)'],
    d.jalan.terpanjang.map((j) => [
      j.lokasi ? `${j.nama} (${j.lokasi})` : j.nama,
      j.negeri,
      tarikh(j.mula),
      j.tamat ? tarikh(j.tamat) : 'Belum dibuka',
      j.jam,
    ]),
    'Tiada jalan ditutup.',
  )

  // --- Page numbers ---
  const jumlahHalaman = doc.getNumberOfPages()
  for (let p = 1; p <= jumlahHalaman; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Halaman ${p} / ${jumlahHalaman}`, lebar / 2, tinggi - 6, { align: 'center' })
  }

  doc.save(namaFail(musim, 'pdf'))
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------
type Sel = string | number | Date | null
type Lajur = { tajuk: string; lebar: number; jenis?: 'nombor' | 'tarikh' }

// Plain dates become real Excel dates (built from local parts so Excel shows the Malaysian date)
function tarikhExcel(iso: string | null): Date | null {
  if (!iso) return null
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

function helaian(wb: Workbook, nama: string, lajur: Lajur[], baris: Sel[][]) {
  const ws = wb.addWorksheet(nama, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = lajur.map((l) => ({ header: l.tajuk, width: l.lebar }))
  const kepala = ws.getRow(1)
  kepala.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  kepala.alignment = { vertical: 'middle' }
  kepala.height = 20
  kepala.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2A5C' } }
  })
  for (const b of baris) ws.addRow(b)
  lajur.forEach((l, i) => {
    const col = ws.getColumn(i + 1)
    if (l.jenis === 'nombor') col.numFmt = '#,##0.##'
    if (l.jenis === 'tarikh') col.numFmt = 'dd/mm/yyyy'
  })
  if (baris.length === 0) ws.addRow(['Tiada data'])
  return ws
}

export async function janaExcelStatistikMusim(musim: Musim, d: StatistikMusimData) {
  const modul = (await import('exceljs')) as typeof import('exceljs') & { default?: typeof import('exceljs') }
  const XL = modul.default ?? modul
  const wb = new XL.Workbook()
  wb.created = new Date()
  const r = d.ringkasan

  // Ringkasan: label / value
  const ws = wb.addWorksheet('Ringkasan')
  ws.columns = [
    { header: 'Perkara', width: 30 },
    { header: 'Nilai', width: 22 },
    { header: 'Tarikh', width: 14 },
  ]
  const kepala = ws.getRow(1)
  kepala.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  kepala.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2A5C' } }
  })
  const ringkasan: Sel[][] = [
    ['Musim', musim.nama, null],
    ['Jenis', LABEL_JENIS[musim.jenis], null],
    ['Tarikh Mula', tarikhExcel(musim.tarikh_mula), null],
    ['Tarikh Tamat', tarikhExcel(musim.tarikh_tamat), null],
    ['Dikira Sehingga', tarikhExcel(d.sehingga), null],
    ['Bencana', r.bilBencana, null],
    ['Laporan', r.bilLaporan, null],
    ['Negeri Terjejas', r.bilNegeri, null],
    ['Puncak Mangsa', r.puncakMangsa?.nilai ?? 0, tarikhExcel(r.puncakMangsa?.tarikh ?? null)],
    ['Puncak PPS', r.puncakPps?.nilai ?? 0, tarikhExcel(r.puncakPps?.tarikh ?? null)],
    ['Puncak KIR', r.puncakKeluarga?.nilai ?? 0, tarikhExcel(r.puncakKeluarga?.tarikh ?? null)],
    ['Kematian', d.korban.kematian, null],
    ['Cedera', d.korban.cedera, null],
    ['Hilang', d.korban.hilang, null],
    ['Kekuatan Mobilisasi Maksimum', d.mobilisasi.kekuatan, null],
    ['Jalan Ditutup', d.jalan.jumlah, null],
  ]
  for (const b of ringkasan) {
    const row = ws.addRow(b)
    row.getCell(1).font = { bold: true }
    for (const i of [2, 3]) if (row.getCell(i).value instanceof Date) row.getCell(i).numFmt = 'dd/mm/yyyy'
  }
  ws.getColumn(2).alignment = { horizontal: 'left' }

  helaian(
    wb,
    'Harian',
    [
      { tajuk: 'Tarikh', lebar: 14, jenis: 'tarikh' },
      { tajuk: 'Mangsa', lebar: 12, jenis: 'nombor' },
      { tajuk: 'KIR', lebar: 12, jenis: 'nombor' },
      { tajuk: 'PPS', lebar: 10, jenis: 'nombor' },
    ],
    d.harian.map((t) => [tarikhExcel(t.tarikh), t.mangsa, t.keluarga, t.pps]),
  )
  helaian(
    wb,
    'Negeri',
    [
      { tajuk: 'Negeri', lebar: 22 },
      { tajuk: 'Bencana', lebar: 10, jenis: 'nombor' },
      { tajuk: 'Puncak Mangsa', lebar: 15, jenis: 'nombor' },
      { tajuk: 'Puncak PPS', lebar: 12, jenis: 'nombor' },
      { tajuk: 'Hari Aktif', lebar: 11, jenis: 'nombor' },
    ],
    d.ikutNegeri.map((n) => [n.negeri, n.bilBencana, n.puncakMangsa, n.puncakPps, n.hariAktif]),
  )
  helaian(
    wb,
    'Jenis',
    [
      { tajuk: 'Jenis Bencana', lebar: 22 },
      { tajuk: 'Bencana', lebar: 10, jenis: 'nombor' },
      { tajuk: 'Puncak Mangsa', lebar: 15, jenis: 'nombor' },
    ],
    d.ikutJenis.map((j) => [j.jenis, j.bilBencana, j.puncakMangsa]),
  )
  helaian(
    wb,
    'Bencana',
    [
      { tajuk: 'Bencana', lebar: 34 },
      { tajuk: 'Jenis', lebar: 16 },
      { tajuk: 'Negeri', lebar: 28 },
      { tajuk: 'Laporan Pertama', lebar: 16, jenis: 'tarikh' },
      { tajuk: 'Tamat', lebar: 14, jenis: 'tarikh' },
      { tajuk: 'Tempoh (hari)', lebar: 13, jenis: 'nombor' },
      { tajuk: 'Puncak Mangsa', lebar: 15, jenis: 'nombor' },
    ],
    d.bencana.map((b) => [
      b.nama,
      b.jenis,
      b.negeri.join(', '),
      tarikhExcel(b.laporanPertama),
      b.tamatPada ? tarikhExcel(b.tamatPada) : 'Masih aktif',
      b.tempohHari,
      b.puncakMangsa,
    ]),
  )
  helaian(
    wb,
    'Korban',
    [
      { tajuk: 'Negeri', lebar: 22 },
      { tajuk: 'Kematian', lebar: 11, jenis: 'nombor' },
      { tajuk: 'Cedera', lebar: 11, jenis: 'nombor' },
      { tajuk: 'Hilang', lebar: 11, jenis: 'nombor' },
    ],
    [
      ...d.korban.ikutNegeri.map((x): Sel[] => [x.negeri, x.kematian, x.cedera, x.hilang]),
      ...(d.korban.ikutNegeri.length > 0
        ? [
            ['JUMLAH', d.korban.kematian, d.korban.cedera, d.korban.hilang] as Sel[],
            [] as Sel[],
            ['Dewasa lelaki', d.korban.profil.dewasaLelaki] as Sel[],
            ['Dewasa perempuan', d.korban.profil.dewasaPerempuan] as Sel[],
            ['Kanak-kanak lelaki', d.korban.profil.kanakLelaki] as Sel[],
            ['Kanak-kanak perempuan', d.korban.profil.kanakPerempuan] as Sel[],
          ]
        : []),
    ],
  )
  helaian(
    wb,
    'Mobilisasi',
    [
      { tajuk: 'Agensi', lebar: 26 },
      { tajuk: 'Kekuatan', lebar: 11, jenis: 'nombor' },
      { tajuk: 'Aset Darat', lebar: 12, jenis: 'nombor' },
      { tajuk: 'Aset Air', lebar: 11, jenis: 'nombor' },
      { tajuk: 'Aset Udara', lebar: 12, jenis: 'nombor' },
    ],
    d.mobilisasi.ikutAgensi.map((a) => [a.agensi, a.kekuatan, a.darat, a.air, a.udara]),
  )
  helaian(
    wb,
    'Kerosakan',
    [
      { tajuk: 'Jenis', lebar: 12 },
      { tajuk: 'Kategori', lebar: 30 },
      { tajuk: 'Rosak', lebar: 10, jenis: 'nombor' },
      { tajuk: 'Musnah', lebar: 10, jenis: 'nombor' },
    ],
    [
      ...d.kerosakan.kerajaan.map((x): Sel[] => ['Kerajaan', x.kategori, x.rosak, x.musnah]),
      ...d.kerosakan.swasta.map((x): Sel[] => ['Swasta', x.kategori, x.rosak, x.musnah]),
    ],
  )
  helaian(
    wb,
    'Pertanian',
    [
      { tajuk: 'Kategori', lebar: 30 },
      { tajuk: 'Bil. Terlibat', lebar: 13, jenis: 'nombor' },
      { tajuk: 'Keluasan (ha)', lebar: 14, jenis: 'nombor' },
      { tajuk: 'Jumlah Terjejas', lebar: 16, jenis: 'nombor' },
    ],
    d.kerosakan.pertanian.map((p) => [p.kategori, p.bilTerlibat, p.kawasanHa, p.jumlahTerjejas]),
  )
  helaian(
    wb,
    'Jalan Ditutup',
    [
      { tajuk: 'Laluan', lebar: 36 },
      { tajuk: 'Negeri', lebar: 20 },
      { tajuk: 'Mula', lebar: 13, jenis: 'tarikh' },
      { tajuk: 'Dibuka', lebar: 13, jenis: 'tarikh' },
      { tajuk: 'Tempoh (jam)', lebar: 13, jenis: 'nombor' },
    ],
    d.jalan.terpanjang.map((j) => [
      j.lokasi ? `${j.nama} (${j.lokasi})` : j.nama,
      j.negeri,
      tarikhExcel(j.mula),
      j.tamat ? tarikhExcel(j.tamat) : 'Belum dibuka',
      j.jam,
    ]),
  )
  helaian(
    wb,
    'Jalan Ikut Negeri',
    [
      { tajuk: 'Negeri', lebar: 22 },
      { tajuk: 'Jalan Ditutup', lebar: 14, jenis: 'nombor' },
    ],
    d.jalan.ikutNegeri.map((j) => [j.negeri, j.bil]),
  )

  const buf = await wb.xlsx.writeBuffer()
  muatTurun(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    namaFail(musim, 'xlsx'),
  )
}