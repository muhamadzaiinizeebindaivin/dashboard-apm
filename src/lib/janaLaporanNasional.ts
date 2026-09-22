import apmLogo from '../assets/apm-logo.png'
import petaMalaysia from '../assets/peta-malaysia.png'
import { JENIS_BENCANA_SEMASA } from './laporanBencana'
import type { ItemLaporanNasional } from './laporanNasional'
import { ambilDataGraf } from './laporanNasionalGraf'
import type { TitikGraf } from './laporanNasionalGraf'
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

// Normalized (0–1) positions within the map image, taken directly from the
// source SVG's label_points (viewBox 0 0 1000 332) — cx/1000, cy/332.
const NEGERI_NORM: Record<string, { x: number; y: number }> = {
  Sabah: { x: 0.8398, y: 0.3364 },
  Perlis: { x: 0.0734, y: 0.1663 },
  Kedah: { x: 0.0937, y: 0.2437 },
  Kelantan: { x: 0.1565, y: 0.357 },
  Perak: { x: 0.1086, y: 0.3874 },
  Sarawak: { x: 0.6986, y: 0.7226 },
  'Pulau Pinang': { x: 0.0831, y: 0.3195 },
  Selangor: { x: 0.1315, y: 0.597 },
  'Negeri Sembilan': { x: 0.1646, y: 0.6809 },
  Melaka: { x: 0.1703, y: 0.7506 },
  Johor: { x: 0.2192, y: 0.7898 },
  Pahang: { x: 0.1746, y: 0.5527 },
  Terengganu: { x: 0.1967, y: 0.3675 },
  Labuan: { x: 0.7666, y: 0.331 },
  'Kuala Lumpur': { x: 0.1403, y: 0.6352 },
  Putrajaya: { x: 0.1406, y: 0.665 },
}

const WARNA_BENCANA: Record<string, [number, number, number]> = {
  Ribut: [56, 142, 214],
  Banjir: [37, 99, 235],
  'Ombak Besar': [20, 130, 140],
  Kebakaran: [220, 38, 38],
  'Tanah Runtuh': [120, 84, 40],
  Pencemaran: [202, 138, 4],
  'Bangunan Runtuh': [107, 114, 128],
}

function warnaBencana(jenis: string): [number, number, number] {
  return WARNA_BENCANA[jenis] ?? [90, 90, 90]
}

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
    case 'Ombak Besar':
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
): Promise<{ doc: jsPDF; namaFail: string }> {
  const { default: JsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const [logo, peta] = await Promise.all([muatGambar(apmLogo), muatGambar(petaMalaysia)])

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
  doc.setFontSize(11)
  doc.text('Pusat Kawalan Operasi Pusat', lebar / 2, 116, { align: 'center' })
  doc.setFontSize(8)
  doc.text('Ibu Pejabat Pertahanan Awam', lebar / 2, 122, { align: 'center' })

  // --- Summary page: counters + map + legend ---
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(11, 42, 92)
  doc.rect(0, 0, lebar, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('JUMLAH KESELURUHAN PUSAT PEMINDAHAN SEMENTARA', margin, 12)

  const negeriSet = new Set(items.map((i) => i.negeri).filter(Boolean))
  const daerahSet = new Set(items.filter((i) => i.daerah).map((i) => `${i.negeri}|${i.daerah}`))
  const ppsCount = items.reduce((n, i) => n + (i.pps ? i.pps.split('\n').filter((s) => s.trim()).length : 0), 0)
  const jumlahMangsa = items.reduce((n, i) => n + i.jumlahMangsa, 0)
  const jumlahKeluarga = items.reduce((n, i) => n + i.jumlahKeluarga, 0)

  const kaunter: [string, number][] = [
    ['NEGERI', negeriSet.size],
    ['DAERAH', daerahSet.size],
    ['PUSAT PEMINDAHAN', ppsCount],
    ['KELUARGA', jumlahKeluarga],
    ['MANGSA', jumlahMangsa],
  ]
  const lebarKaunter = (lebar - margin * 2 - 4 * 6) / 5
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

  const negeriAktif = [...new Set(items.map((i) => i.negeri).filter((n): n is string => !!n))]
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

    const punyaNegeri = items.filter((i) => i.negeri === negeri)
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

  // --- Legend — its Y adapts to however tall the tallest column actually ended up ---
  const legendY = Math.max(petaY + petaTinggi, yLuarKiri, yTengah, yLuarKanan) + 6
  doc.setDrawColor(180, 180, 180)
  doc.setFillColor(235, 238, 244)
  doc.roundedRect(margin, legendY, lebar - margin * 2, 10, 1, 1, 'FD')
  let lx = margin + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  for (const jenis of JENIS_BENCANA_SEMASA) {
    lukisIkon(doc, jenis, lx, legendY + 5, 2.6)
    doc.setTextColor(30, 30, 30)
    doc.text(jenis, lx + 4, legendY + 6)
    lx += doc.getTextWidth(jenis) + 12
  }

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.text(`${tarikh.toUpperCase()} (KEMASKINI SEHINGGA ${masa})`, lebar - margin, tinggi - 6, { align: 'right' })

  // --- Table page(s), grouped by Jenis Bencana (fixed order) then Zon ---
  const jenisAda = [...new Set(items.map((i) => i.jenisBencana))]
  const jenisSet = [
    ...JENIS_BENCANA_SEMASA.filter((j) => jenisAda.includes(j)),
    ...jenisAda.filter((j) => !JENIS_BENCANA_SEMASA.includes(j)),
  ]
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
          i.pps ?? '—',
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

  // --- Graf Laporan Bencana ---
  doc.addPage()
  doc.setFillColor(11, 42, 92)
  doc.rect(0, 0, lebar, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('GRAF LAPORAN BENCANA', margin, 12)

  const dataGraf = await ambilDataGraf()

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
  return { doc, namaFail: `laporan-bencana-nasional-${stamp}.pdf` }
}

export async function janaLaporanNasional(items: ItemLaporanNasional[]) {
  const { doc, namaFail } = await bangunLaporanNasionalDoc(items)
  doc.save(namaFail)
}
