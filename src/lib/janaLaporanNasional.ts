import apmLogo from '../assets/apm-logo.png'
import petaMalaysia from '../assets/peta-malaysia.png'
import { NEGERI_NORM } from './negeriVisual'
import { ambilJenisBencana, susunJenis, warnaJenisRgb } from './jenisBencana'
import type { ItemLaporanNasional, KorbanNegeri, PpsDitutup } from './laporanNasional'
import { ambilDataGraf } from './laporanNasionalGraf'
import type { TapisGraf, TitikGraf } from './laporanNasionalGraf'
import type { jsPDF } from 'jspdf'

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

const pad = (n: number) => String(n).padStart(2, '0')

// Colour of each disaster type = its category's colour (Urus Kategori)
const warnaBencana = warnaJenisRgb

// A small, simplified pictogram per disaster type, drawn inside a filled
// circle — not a copy of any specific icon set, just enough to be visually
// distinct at a glance (color already carries most of the distinction).
function lukisIkon(doc: jsPDF, jenis: string, cx: number, cy: number, r: number) {
  const warna = warnaBencana(jenis)
  doc.setFillColor(warna[0], warna[1], warna[2])
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(Math.max(r * 0.12, 0.15))
  doc.circle(cx, cy, r, 'FD')

  doc.setDrawColor(255, 255, 255)
  doc.setFillColor(255, 255, 255)
  doc.setLineWidth(Math.max(r * 0.15, 0.18))
  const s = r * 0.5

  switch (jenis) {
    case 'Ribut':
      // cloud (two overlapping circles) with a small bolt beneath
      doc.circle(cx - s * 0.35, cy - s * 0.15, s * 0.42, 'F')
      doc.circle(cx + s * 0.3, cy - s * 0.25, s * 0.5, 'F')
      doc.rect(cx - s * 0.75, cy - s * 0.15, s * 1.5, s * 0.35, 'F')
      doc.lines(
        [
          [s * 0.25, s * 0.35],
          [-s * 0.15, s * 0.05],
          [s * 0.2, s * 0.35],
        ],
        cx - s * 0.05,
        cy + s * 0.2,
        [1, 1],
        'F',
        true,
      )
      break
    case 'Banjir':
      // one wavy line (two humps)
      doc.setLineWidth(Math.max(r * 0.22, 0.25))
      doc.lines(
        [
          [s * 0.5, -s * 0.4],
          [s * 0.5, s * 0.4],
          [s * 0.5, -s * 0.4],
          [s * 0.5, s * 0.4],
        ],
        cx - s,
        cy,
        [1, 1],
        'S',
        false,
      )
      break
    case 'Tsunami':
      // one bigger wave with a curled crest
      doc.setLineWidth(Math.max(r * 0.24, 0.28))
      doc.lines(
        [
          [s * 0.6, -s * 0.9],
          [s * 0.5, s * 0.5],
          [s * 0.5, -s * 0.2],
        ],
        cx - s * 0.8,
        cy + s * 0.4,
        [1, 1],
        'S',
        false,
      )
      break
    case 'Kebakaran': {
      // flame silhouette: an outer teardrop with an inner notch
      doc.triangle(cx, cy - s * 1.05, cx - s * 0.8, cy + s * 0.75, cx + s * 0.8, cy + s * 0.75, 'F')
      doc.setFillColor(warna[0], warna[1], warna[2])
      doc.triangle(cx, cy - s * 0.15, cx - s * 0.35, cy + s * 0.6, cx + s * 0.35, cy + s * 0.6, 'F')
      break
    }
    case 'Tanah Runtuh':
      // two overlapping mountain peaks, plus a falling-rock line
      doc.triangle(cx - s * 0.5, cy - s * 0.3, cx - s * 1.1, cy + s * 0.7, cx + s * 0.1, cy + s * 0.7, 'F')
      doc.triangle(cx + s * 0.3, cy - s * 0.7, cx - s * 0.2, cy + s * 0.7, cx + s * 1.1, cy + s * 0.7, 'F')
      doc.setLineWidth(Math.max(r * 0.12, 0.15))
      doc.line(cx + s * 0.55, cy - s * 0.85, cx + s * 0.85, cy - s * 0.5)
      break
    case 'Pencemaran':
      // hazard diamond with a center dot
      doc.triangle(cx, cy - s, cx - s, cy, cx, cy + s, 'F')
      doc.triangle(cx, cy - s, cx + s, cy, cx, cy + s, 'F')
      doc.setFillColor(warna[0], warna[1], warna[2])
      doc.circle(cx, cy, s * 0.22, 'F')
      break
    case 'Bangunan Runtuh':
      // building outline, split into two "floors", with a crack through it
      doc.setLineWidth(Math.max(r * 0.14, 0.16))
      doc.rect(cx - s * 0.7, cy - s * 0.8, s * 1.4, s * 1.6, 'S')
      doc.line(cx - s * 0.7, cy, cx + s * 0.7, cy)
      doc.line(cx - s * 0.15, cy - s * 0.8, cx - s * 0.15, cy)
      doc.line(cx + s * 0.15, cy, cx + s * 0.15, cy + s * 0.8)
      doc.setLineWidth(Math.max(r * 0.2, 0.22))
      doc.line(cx - s * 0.85, cy - s * 0.5, cx + s * 0.85, cy + s * 0.9)
      break
    default:
      // unknown/legacy type — just leave the plain colored circle
      break
  }
}

function bulatAtas(n: number, langkah: number): number {
  return Math.max(langkah, Math.ceil(n / langkah) * langkah)
}

type SeriBar = { label: string; warna: [number, number, number]; nilai: number[] }
type SeriGaris = { label: string; warna: [number, number, number]; nilai: number[] }

// A combo bar + line chart, hand-drawn with jsPDF primitives — two bar
// series sharing the left axis (Mangsa/Keluarga), and one or two line
// series on the right axis (PPS, and optionally Negeri for the 7-day chart).
function lukisCarta(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  tajuk: string,
  kategori: string[],
  bar1: SeriBar,
  bar2: SeriBar,
  garis: SeriGaris[],
) {
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(tajuk, x + w / 2, y + 5, { align: 'center' })
  doc.setFontSize(6)
  doc.text('BIL MANGSA', x + 2, y + 12)
  doc.text('BIL PPS', x + w - 2, y + 12, { align: 'right' })

  const px = x + 14
  const py = y + 16
  const pw = w - 14 - 12
  const ph = h - 16 - 16 // top labels + bottom category labels/legend

  const maxBar = Math.max(1, ...bar1.nilai, ...bar2.nilai)
  const skalaKiri = bulatAtas(maxBar, maxBar > 100 ? 100 : 10)
  const maxGaris = Math.max(1, ...garis.flatMap((g) => g.nilai))
  const skalaKanan = bulatAtas(maxGaris, 1)

  // gridlines + axis numbers (4 bands)
  doc.setDrawColor(225, 225, 225)
  doc.setLineWidth(0.2)
  doc.setFontSize(5.5)
  for (let i = 0; i <= 4; i++) {
    const gy = py + ph - (ph * i) / 4
    doc.line(px, gy, px + pw, gy)
    doc.setTextColor(120, 120, 120)
    doc.text(String(Math.round((skalaKiri * i) / 4)), px - 2, gy + 1, { align: 'right' })
    doc.text(String(Math.round((skalaKanan * i) / 4)), px + pw + 2, gy + 1)
  }

  const n = kategori.length
  const langkahX = pw / n
  const lebarBar = langkahX * 0.32

  // bars
  kategori.forEach((_, i) => {
    const tengahX = px + langkahX * i + langkahX / 2
    const b1 = bar1.nilai[i] ?? 0
    const b2 = bar2.nilai[i] ?? 0
    const t1 = (b1 / skalaKiri) * ph
    const t2 = (b2 / skalaKiri) * ph

    doc.setFillColor(bar1.warna[0], bar1.warna[1], bar1.warna[2])
    doc.rect(tengahX - lebarBar - 0.5, py + ph - t1, lebarBar, t1, 'F')
    doc.setFillColor(bar2.warna[0], bar2.warna[1], bar2.warna[2])
    doc.rect(tengahX + 0.5, py + ph - t2, lebarBar, t2, 'F')

    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'bold')
    if (b1 > 0) {
      doc.setFillColor(253, 230, 138)
      const lebarLabel = doc.getTextWidth(String(b1)) + 2
      doc.rect(tengahX - lebarBar - 0.5 + lebarBar / 2 - lebarLabel / 2, py + ph - t1 - 5.5, lebarLabel, 4, 'F')
      doc.setTextColor(90, 70, 10)
      doc.text(String(b1), tengahX - lebarBar / 2 - 0.5, py + ph - t1 - 2.6, { align: 'center' })
    }
    if (b2 > 0) {
      doc.setTextColor(90, 90, 90)
      doc.text(String(b2), tengahX + lebarBar / 2 + 0.5, py + ph - t2 - 1.5, { align: 'center' })
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(80, 80, 80)
    doc.text(kategori[i], tengahX, py + ph + 5, { align: 'center' })
  })

  // line series (right axis)
  for (const g of garis) {
    doc.setDrawColor(g.warna[0], g.warna[1], g.warna[2])
    doc.setLineWidth(0.4)
    const titik = kategori.map((_, i) => {
      const tengahX = px + langkahX * i + langkahX / 2
      const nilai = g.nilai[i] ?? 0
      const gy = py + ph - (nilai / skalaKanan) * ph
      return [tengahX, gy] as [number, number]
    })
    for (let i = 0; i < titik.length - 1; i++) {
      doc.line(titik[i][0], titik[i][1], titik[i + 1][0], titik[i + 1][1])
    }
    doc.setFillColor(g.warna[0], g.warna[1], g.warna[2])
    for (const [tx, ty] of titik) doc.circle(tx, ty, 1.1, 'F')
  }

  // legend
  let lx = x + w / 2 - 40
  const ly = y + h - 4
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  for (const s of [bar1, bar2, ...garis]) {
    doc.setFillColor(s.warna[0], s.warna[1], s.warna[2])
    doc.rect(lx, ly - 2.2, 3, 2.2, 'F')
    doc.setTextColor(60, 60, 60)
    doc.text(s.label, lx + 4, ly)
    lx += doc.getTextWidth(s.label) + 12
  }
}

export async function bangunLaporanNasionalDoc(
  items: ItemLaporanNasional[],
  ditutup: PpsDitutup[] = [],
  tapis: TapisGraf = {},
  korban: KorbanNegeri[] = [],
  kawasan: string[] = [], // e.g. ['Perak', 'P.062 Sungai Siput', 'N.21 Lintang'] when filtered by Parlimen/ADUN
): Promise<{ doc: jsPDF; namaFail: string }> {
  const { default: JsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  // ambilJenisBencana: latest category colours and order before drawing
  const [logo, peta] = await Promise.all([muatGambar(apmLogo), muatGambar(petaMalaysia), ambilJenisBencana()])

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const lebar = doc.internal.pageSize.getWidth()
  const tinggi = doc.internal.pageSize.getHeight()
  const margin = 14
  const sekarang = new Date()
  const tarikh = sekarang.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })
  const masa = `${pad(sekarang.getHours())}${pad(sekarang.getMinutes())}H`

  // --- Cover page ---
  doc.setFillColor(11, 42, 92)
  doc.rect(0, 0, lebar, tinggi, 'F')
  if (logo) doc.addImage(logo, 'PNG', lebar / 2 - 15, 18, 30, 30)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('ANGKATAN PERTAHANAN AWAM MALAYSIA', lebar / 2, 60, { align: 'center' })
  doc.setFontSize(25)
  doc.setTextColor(255, 150, 40)
  doc.text('LAPORAN BENCANA NASIONAL', lebar / 2, 76, { align: 'center' })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text(tarikh.toUpperCase(), lebar / 2, 90, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`KEMASKINI SEHINGGA ${masa}`, lebar / 2, 97, { align: 'center' })
  // Report for one constituency (Parlimen / ADUN): named clearly on the cover
  if (kawasan.length > 0) {
    doc.setFontSize(13)
    doc.setTextColor(255, 150, 40)
    doc.text(kawasan.join(' — ').toUpperCase(), lebar / 2, 107, { align: 'center', maxWidth: lebar - 40 })
    doc.setTextColor(255, 255, 255)
  }
  doc.setFontSize(11)
  doc.text('Pusat Kawalan Operasi Pusat', lebar / 2, 116, { align: 'center' })
  doc.setFontSize(9)
  doc.text('Bahagian Pengurusan Bencana Operasi', lebar / 2, 122, { align: 'center' })

  // --- Summary page: counters + map + legend ---
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(11, 42, 92)
  doc.rect(0, 0, lebar, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('JUMLAH KESELURUHAN PUSAT PEMINDAHAN SEMENTARA', margin, 12)

  // Ended (TAMAT) disasters stay in the table but not in the "active" counters/map
  const aktif = items.filter((i) => !i.tamatPada)
  const negeriSet = new Set(aktif.map((i) => i.negeri).filter(Boolean))
  const daerahSet = new Set(aktif.filter((i) => i.daerah).map((i) => `${i.negeri}|${i.daerah}`))
  const ppsCount = items.reduce((n, i) => n + (i.pps ? i.pps.split('\n').filter((s) => s.trim()).length : 0), 0)
  const jumlahMangsa = items.reduce((n, i) => n + i.jumlahMangsa, 0)
  const jumlahKeluarga = items.reduce((n, i) => n + i.jumlahKeluarga, 0)

  const jenisAktif = new Set(aktif.map((i) => i.jenisBencana))
  const kaunter: [string, number][] = [
    ['JENIS BENCANA', jenisAktif.size],
    ['NEGERI', negeriSet.size],
    ['DAERAH', daerahSet.size],
    ['PUSAT PEMINDAHAN', ppsCount],
    ['KELUARGA', jumlahKeluarga],
    ['MANGSA', jumlahMangsa],
  ]
  const lebarKaunter = (lebar - margin * 2 - (kaunter.length - 1) * 6) / kaunter.length
  kaunter.forEach(([label, nilai], i) => {
    const x = margin + i * (lebarKaunter + 6)
    doc.setFillColor(11, 42, 92)
    doc.roundedRect(x, 24, lebarKaunter, 18, 2, 2, 'F')
    doc.setTextColor(255, 150, 40)
    doc.setFontSize(7)
    doc.text(label, x + lebarKaunter / 2, 30, { align: 'center' })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text(String(nilai), x + lebarKaunter / 2, 39, { align: 'center' })
  })

  // --- Map (real outline) — width leaves room for the two OUTER callout
  // columns. The gap between Peninsular and Borneo (measured empty band in
  // the source image: roughly x 0.26–0.50 of its width) is only wide enough
  // for ONE extra column, shared as overflow by whichever side needs it.
  // The whole block (map + callouts + legend) is vertically centered in the
  // space below the counters, instead of always starting right after them —
  // otherwise a light report leaves a large dead gap at the bottom. ---
  const kotakLebar = 32
  const jarakLuar = 3
  const nisbahPeta = 1000 / 332
  const petaLebar = lebar - margin * 2 - (kotakLebar + jarakLuar) * 2
  const petaTinggi = petaLebar / nisbahPeta
  const petaX = margin + kotakLebar + jarakLuar

  const negeriAktif = [...new Set(aktif.map((i) => i.negeri).filter((n): n is string => !!n))]
  const kotakTinggi = 5
  const lineTinggi = 2.6
  const langkah = kotakTinggi + 3 + 5 * lineTinggi + 2

  const kiriCount = negeriAktif.filter((n) => NEGERI_NORM[n] && NEGERI_NORM[n].x < 0.5).length
  const kananCount = negeriAktif.length - kiriCount
  const kiriLuarKotak = Math.ceil(kiriCount / 2)
  const kananLuarKotak = Math.ceil(kananCount / 2)
  const tengahKotak = Math.floor(kiriCount / 2) + Math.floor(kananCount / 2)
  const kolumTertinggiKotak = Math.max(kiriLuarKotak, kananLuarKotak, tengahKotak)
  const anggaranBlokTinggi = Math.max(petaTinggi, kolumTertinggiKotak * langkah) + 6 + 10 // + legend gap + legend height

  const ruangAtas = 44
  const ruangBawah = tinggi - 20
  const petaY = ruangAtas + Math.max(0, (ruangBawah - ruangAtas - anggaranBlokTinggi) / 2)

  if (peta) doc.addImage(peta, 'PNG', petaX, petaY, petaLebar, petaTinggi)

  // Column x-positions: outer-left / shared middle (in the gap) / outer-right.
  const xLuarKiri = margin
  const xTengah = petaX + 0.27 * petaLebar
  const xLuarKanan = lebar - margin - kotakLebar

  let yLuarKiri = petaY
  let yTengah = petaY
  let yLuarKanan = petaY
  let kiriGiliran = 0
  let kananGiliran = 0

  for (const negeri of negeriAktif) {
    const norm = NEGERI_NORM[negeri]
    if (!norm) continue
    const mx = petaX + norm.x * petaLebar
    const my = petaY + norm.y * petaTinggi

    const punyaNegeri = aktif.filter((i) => i.negeri === negeri)
    const jenisUtama = punyaNegeri[0]?.jenisBencana ?? ''
    lukisIkon(doc, jenisUtama, mx, my, 1.9)

    const daerahNegeri = new Set(punyaNegeri.filter((i) => i.daerah).map((i) => i.daerah))
    const ppsNegeri = punyaNegeri.reduce(
      (n, i) => n + (i.pps ? i.pps.split('\n').filter((s) => s.trim()).length : 0),
      0,
    )
    const keluargaNegeri = punyaNegeri.reduce((n, i) => n + i.jumlahKeluarga, 0)
    const mangsaNegeri = punyaNegeri.reduce((n, i) => n + i.jumlahMangsa, 0)
    const trendNegeri = punyaNegeri.some((i) => i.trend === 'naik')
      ? 'NAIK'
      : punyaNegeri.some((i) => i.trend === 'turun')
        ? 'TURUN'
        : 'KEKAL'

    const kiri = norm.x < 0.5
    let cx: number
    let cy: number
    let sisiKanan: boolean // does the box sit to the RIGHT of its marker (leader line points left into it)?
    if (kiri) {
      const guna = kiriGiliran % 2 === 0 ? 'luar' : 'tengah'
      kiriGiliran++
      cx = guna === 'luar' ? xLuarKiri : xTengah
      cy = guna === 'luar' ? yLuarKiri : yTengah
      if (guna === 'luar') yLuarKiri += langkah
      else yTengah += langkah
      sisiKanan = guna === 'tengah' // the gap sits to the right of the peninsular coastline
    } else {
      const guna = kananGiliran % 2 === 0 ? 'luar' : 'tengah'
      kananGiliran++
      cx = guna === 'luar' ? xLuarKanan : xTengah
      cy = guna === 'luar' ? yLuarKanan : yTengah
      if (guna === 'luar') yLuarKanan += langkah
      else yTengah += langkah
      sisiKanan = guna === 'luar' // outer-right column sits to the right of its marker; the gap sits to its left
    }

    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.3)
    doc.line(mx, my, sisiKanan ? cx : cx + kotakLebar, cy + kotakTinggi / 2)

    doc.setFillColor(11, 42, 92)
    doc.roundedRect(cx, cy, kotakLebar, kotakTinggi, 1.2, 1.2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text(negeri.toUpperCase(), cx + kotakLebar / 2, cy + 3.6, { align: 'center' })

    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    const baris = [
      `TREND : ${trendNegeri}`,
      `DAERAH : ${daerahNegeri.size}`,
      `PPS : ${ppsNegeri}`,
      `KELUARGA : ${keluargaNegeri}`,
      `MANGSA : ${mangsaNegeri}`,
    ]
    baris.forEach((t, i) => doc.text(t, cx, cy + kotakTinggi + 3 + i * lineTinggi))
  }

  // --- Legend — its Y adapts to however tall the tallest column actually ended up.
  // Only the types on this map, wrapping to a new row when the line is full ---
  const legendY = Math.max(petaY + petaTinggi, yLuarKiri, yTengah, yLuarKanan) + 6
  const jenisPeta = susunJenis(aktif.map((i) => i.jenisBencana))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  const kedudukan: { jenis: string; x: number; y: number }[] = []
  let lx = margin + 6
  let ly = legendY
  for (const jenis of jenisPeta) {
    const w = doc.getTextWidth(jenis) + 12
    if (lx + w > lebar - margin && lx > margin + 6) {
      lx = margin + 6
      ly += 10
    }
    kedudukan.push({ jenis, x: lx, y: ly })
    lx += w
  }
  if (jenisPeta.length > 0) {
    doc.setDrawColor(180, 180, 180)
    doc.setFillColor(235, 238, 244)
    doc.roundedRect(margin, legendY, lebar - margin * 2, ly - legendY + 10, 1, 1, 'FD')
  }
  for (const { jenis, x, y } of kedudukan) {
    lukisIkon(doc, jenis, x, y + 5, 2.6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 30, 30)
    doc.text(jenis, x + 4, y + 6)
  }

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.text(`${tarikh.toUpperCase()} (KEMASKINI SEHINGGA ${masa})`, lebar - margin, tinggi - 6, { align: 'right' })

  // --- Table page(s), grouped by Jenis Bencana (fixed order) then Zon ---
  // Same order as the category list (Urus Kategori)
  const jenisSet = susunJenis(items.map((i) => i.jenisBencana))
  const badan: Array<
    Array<string | { content: string; colSpan?: number; rowSpan?: number; styles?: Record<string, unknown> }>
  > = []
  let jumlahPpsKeseluruhan = 0
  let jumlahMangsaKeseluruhan = 0
  let jumlahKeluargaKeseluruhan = 0

  for (const jenis of jenisSet) {
    badan.push([
      {
        content: jenis.toUpperCase(),
        colSpan: 6,
        styles: { fillColor: '#b8c6d9', textColor: '#0b2a5c', fontStyle: 'bold', halign: 'center' },
      },
    ])
    const dalamJenis = items.filter((i) => i.jenisBencana === jenis)
    const zonSet = [...new Set(dalamJenis.map((i) => i.zon ?? '—'))]

    for (const zon of zonSet) {
      const dalamZon = dalamJenis.filter((i) => (i.zon ?? '—') === zon)
      let subMangsa = 0
      let subKeluarga = 0
      let subPps = 0
      dalamZon.forEach((i, idx) => {
        const ppsLines = i.pps ? i.pps.split('\n').filter((s) => s.trim()) : []
        subPps += ppsLines.length
        subMangsa += i.jumlahMangsa
        subKeluarga += i.jumlahKeluarga
        const baris: Array<string | { content: string; rowSpan?: number }> = [
          i.negeri ?? '—',
          i.daerah ?? '—',
          i.tamatPada
            ? `TAMAT — ${i.namaBencana} (${new Date(i.tamatPada).toLocaleDateString('ms-MY', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })})`
            : (i.pps ?? '—'),
          String(i.jumlahMangsa),
          String(i.jumlahKeluarga),
        ]
        if (idx === 0) baris.unshift({ content: `ZON ${zon}`, rowSpan: dalamZon.length })
        badan.push(baris)
      })
      badan.push([
        {
          content: 'JUMLAH KESELURUHAN',
          colSpan: 3,
          styles: { fillColor: '#0b2a5c', textColor: '#ffffff', fontStyle: 'bold' },
        },
        {
          content: String(subPps),
          styles: { fillColor: '#0b2a5c', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' },
        },
        { content: String(subMangsa), styles: { fillColor: '#0b2a5c', textColor: '#ffffff', fontStyle: 'bold' } },
        { content: String(subKeluarga), styles: { fillColor: '#0b2a5c', textColor: '#ffffff', fontStyle: 'bold' } },
      ])
      jumlahPpsKeseluruhan += subPps
      jumlahMangsaKeseluruhan += subMangsa
      jumlahKeluargaKeseluruhan += subKeluarga
    }
  }

  doc.addPage()
  doc.setFillColor(11, 42, 92)
  doc.rect(0, 0, lebar, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('JUMLAH KESELURUHAN PUSAT PEMINDAHAN SEMENTARA', margin, 12)

  autoTable(doc, {
    startY: 24,
    head: [['ZON', 'NEGERI', 'DAERAH', 'PUSAT PEMINDAHAN SEMENTARA (PPS)', 'JUMLAH MANGSA', 'JUMLAH KELUARGA']],
    body: badan,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: '#111827', textColor: '#ffffff', halign: 'center' },
    columnStyles: { 4: { halign: 'center' }, 5: { halign: 'center' } },
    margin: { left: margin, right: margin },
  })

  const kolum = (doc as unknown as { lastAutoTable: { finalY: number; columns: { width: number }[] } })
    .lastAutoTable
  const akhirY = kolum.finalY + 6

  // Build real column x-boundaries from the table's own rendered widths,
  // so the totals line up under PUSAT PEMINDAHAN / MANGSA / KELUARGA exactly.
  const batasKolum: number[] = [margin]
  for (const k of kolum.columns) batasKolum.push(batasKolum[batasKolum.length - 1] + k.width)

  doc.setFillColor(0, 0, 0)
  doc.rect(margin, akhirY, lebar - margin * 2, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('JUMLAH KESELURUHAN', margin + 4, akhirY + 5.5)

  const tengahKolum = (indeks: number) => (batasKolum[indeks] + batasKolum[indeks + 1]) / 2
  doc.text(String(jumlahPpsKeseluruhan), tengahKolum(3), akhirY + 5.5, { align: 'center' })
  doc.text(String(jumlahMangsaKeseluruhan), tengahKolum(4), akhirY + 5.5, { align: 'center' })
  doc.text(String(jumlahKeluargaKeseluruhan), tengahKolum(5), akhirY + 5.5, { align: 'center' })

  // --- PPS closed in the last 24 hours ---
  let mulaDitutup = akhirY + 18
  if (mulaDitutup + 30 > tinggi) {
    doc.addPage()
    mulaDitutup = 24
  }
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`PPS DITUTUP (24 JAM LEPAS): ${ditutup.length}`, margin, mulaDitutup)

  if (ditutup.length > 0) {
    autoTable(doc, {
      startY: mulaDitutup + 3,
      head: [['PPS', 'NEGERI', 'DAERAH', 'BENCANA', 'MASA DITUTUP', 'CATATAN']],
      body: ditutup.map((p) => [
        p.nama,
        p.negeri,
        p.daerah ?? '—',
        p.nama_bencana,
        new Date(p.ditutup_pada).toLocaleString('ms-MY', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        p.catatan_tutup || '—',
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
      headStyles: { fillColor: '#4b5563', textColor: '#ffffff' },
      margin: { left: margin, right: margin },
    })
  }

  // --- Deaths / injuries / missing (from the states' Damage_Casualties sheet) ---
  if (korban.length > 0) {
    const selepasDitutup =
      ditutup.length > 0
        ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
        : mulaDitutup + 10
    let mulaKorban = selepasDitutup
    if (mulaKorban + 30 > tinggi) {
      doc.addPage()
      mulaKorban = 24
    }
    const jumlah = (f: (k: KorbanNegeri) => number) => korban.reduce((n, k) => n + f(k), 0)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(
      `KEMATIAN: ${jumlah((k) => k.kematian)}   KECEDERAAN: ${jumlah((k) => k.kecederaan)}   HILANG: ${jumlah((k) => k.hilang)}`,
      margin,
      mulaKorban,
    )
    autoTable(doc, {
      startY: mulaKorban + 3,
      head: [['BENCANA', 'NEGERI', 'KEMATIAN', 'KECEDERAAN', 'HILANG']],
      body: korban.map((k) => [k.nama_bencana, k.negeri, k.kematian, k.kecederaan, k.hilang]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
      headStyles: { fillColor: '#991b1b', textColor: '#ffffff' },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
      margin: { left: margin, right: margin },
    })
  }

  // --- Graf Laporan Bencana ---
  doc.addPage()
  doc.setFillColor(11, 42, 92)
  doc.rect(0, 0, lebar, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('GRAF LAPORAN BENCANA', margin, 12)

  // Same filter as the table/map, so the PDF graphs show the same slice
  const dataGraf = await ambilDataGraf(tapis)

  const carta = (titik: TitikGraf[]) => ({
    kategori: titik.map((t) => t.label),
    mangsa: titik.map((t) => t.mangsa),
    keluarga: titik.map((t) => t.keluarga),
    pps: titik.map((t) => t.pps),
    negeri: titik.map((t) => t.negeri),
  })
  const duaJam = carta(dataGraf.duaJam)
  const harian = carta(dataGraf.harian)

  const tinggiCarta = (tinggi - 28 - 10) / 2

  lukisCarta(
    doc,
    margin,
    24,
    lebar - margin * 2,
    tinggiCarta,
    'GRAF LAPORAN BENCANA SETIAP 2 JAM',
    duaJam.kategori,
    { label: 'KELUARGA', warna: [217, 119, 6], nilai: duaJam.keluarga },
    { label: 'MANGSA', warna: [37, 99, 235], nilai: duaJam.mangsa },
    [{ label: 'PPS', warna: [22, 163, 74], nilai: duaJam.pps }],
  )

  lukisCarta(
    doc,
    margin,
    24 + tinggiCarta + 10,
    lebar - margin * 2,
    tinggiCarta,
    'GRAF LAPORAN BENCANA HARIAN (7 HARI)',
    harian.kategori,
    { label: 'MANGSA', warna: [249, 115, 22], nilai: harian.mangsa },
    { label: 'KELUARGA', warna: [234, 179, 8], nilai: harian.keluarga },
    [
      { label: 'PPS', warna: [37, 99, 235], nilai: harian.pps },
      { label: 'NEGERI', warna: [120, 120, 120], nilai: harian.negeri },
    ],
  )

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.text(`${tarikh.toUpperCase()} (KEMASKINI SEHINGGA ${masa})`, lebar - margin, tinggi - 6, { align: 'right' })

  const jumlahHalaman = doc.getNumberOfPages()
  for (let p = 1; p <= jumlahHalaman; p++) {
    doc.setPage(p)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Halaman ${p} / ${jumlahHalaman}`, lebar / 2, tinggi - 4, { align: 'center' })
  }

  const stamp = `${sekarang.getFullYear()}-${pad(sekarang.getMonth() + 1)}-${pad(sekarang.getDate())}-${pad(sekarang.getHours())}${pad(sekarang.getMinutes())}`
  // Constituency in the file name too, e.g. "laporan-bencana-p.062-sungai-siput-2026-10-21-1400.pdf"
  const bahagianKawasan = kawasan
    .slice(1)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return {
    doc,
    namaFail: bahagianKawasan
      ? `laporan-bencana-${bahagianKawasan}-${stamp}.pdf`
      : `laporan-bencana-nasional-${stamp}.pdf`,
  }
}

export async function janaLaporanNasional(items: ItemLaporanNasional[]) {
  const { doc, namaFail } = await bangunLaporanNasionalDoc(items)
  doc.save(namaFail)
}
