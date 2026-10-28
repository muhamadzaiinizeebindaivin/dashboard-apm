import apmLogo from '../assets/apm-logo.png'

// "Makluman Awal Insiden" poster, drawn on a canvas (A4 portrait, 1240 × 1754 px ≈ 150 dpi).
// Same canvas for the PNG (WhatsApp / social media) and the PDF (download + e-mail attachment).

export type DataPoster = {
  tarikh_masa: string // ISO
  ringkasan: string
  tempat: string
  daerah: string
  negeri: string
  sumber_laporan?: string // printed as "SUMBER: ..." above the footer
}

const W = 1240
const H = 1754

const BIRU_GELAP = '#0a2a6b'
const BIRU = '#1a4fa0'
const BIRU_TERANG = '#2f74d0'
const OREN = '#f37021'
const MERAH = '#d7262e'
const LATAR = '#eef3fb'
const TEKS = '#0f1b33'
const FON = 'Arial, Helvetica, sans-serif'

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

// "18 OKTOBER 2026" / "10:00H"
export function tarikhPoster(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}
export function masaPoster(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}H`
}

function muatImej(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Parallelogram (slanted banner)
function serong(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, condong: number, warna: string) {
  ctx.beginPath()
  ctx.moveTo(x + condong, y)
  ctx.lineTo(x + w + condong, y)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.fillStyle = warna
  ctx.fill()
}

function segiBulat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Wrap text to a width: returns the lines
function balut(ctx: CanvasRenderingContext2D, teks: string, lebar: number): string[] {
  const baris: string[] = []
  for (const perenggan of teks.split('\n')) {
    let semasa = ''
    for (const perkataan of perenggan.split(/\s+/).filter(Boolean)) {
      const cuba = semasa ? `${semasa} ${perkataan}` : perkataan
      if (ctx.measureText(cuba).width <= lebar || !semasa) semasa = cuba
      else {
        baris.push(semasa)
        semasa = perkataan
      }
    }
    if (semasa) baris.push(semasa)
  }
  return baris
}

// Largest font size (down to `min`) that fits in `maxBaris` lines; returns size + lines
function muatkanTeks(ctx: CanvasRenderingContext2D, teks: string, lebar: number, maxBaris: number, maks: number, min: number) {
  for (let saiz = maks; saiz >= min; saiz -= 2) {
    ctx.font = `bold ${saiz}px ${FON}`
    const baris = balut(ctx, teks, lebar)
    if (baris.length <= maxBaris) return { saiz, baris }
  }
  ctx.font = `bold ${min}px ${FON}`
  const baris = balut(ctx, teks, lebar)
  if (baris.length > maxBaris) {
    baris.length = maxBaris
    baris[maxBaris - 1] = `${baris[maxBaris - 1].replace(/\s*\S*$/, '')}…`
  }
  return { saiz: min, baris }
}

// --- Small pictograms, drawn in white inside the round badges ---
function ikonKalendar(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save()
  ctx.strokeStyle = '#fff'
  ctx.fillStyle = '#fff'
  ctx.lineWidth = 6
  segiBulat(ctx, cx - 32, cy - 26, 64, 58, 8)
  ctx.stroke()
  ctx.fillRect(cx - 32, cy - 26, 64, 14)
  ctx.fillRect(cx - 20, cy - 38, 6, 18)
  ctx.fillRect(cx + 14, cy - 38, 6, 18)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) ctx.fillRect(cx - 22 + c * 17, cy - 2 + r * 15, 10, 9)
  ctx.restore()
}

function ikonAmaran(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save()
  ctx.strokeStyle = '#fff'
  ctx.fillStyle = '#fff'
  ctx.lineWidth = 7
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, cy - 36)
  ctx.lineTo(cx + 38, cy + 30)
  ctx.lineTo(cx - 38, cy + 30)
  ctx.closePath()
  ctx.stroke()
  ctx.fillRect(cx - 4, cy - 14, 8, 26)
  ctx.beginPath()
  ctx.arc(cx, cy + 20, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function ikonPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, warna = '#fff', skala = 1) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(skala, skala)
  ctx.fillStyle = warna
  ctx.beginPath()
  ctx.arc(0, -12, 24, Math.PI * 0.85, Math.PI * 0.15, false)
  ctx.lineTo(0, 34)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = warna === '#fff' ? BIRU : '#fff'
  ctx.beginPath()
  ctx.arc(0, -12, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function ikonJam(ctx: CanvasRenderingContext2D, cx: number, cy: number, warna: string) {
  ctx.save()
  ctx.strokeStyle = warna
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(cx, cy, 15, 0, Math.PI * 2)
  ctx.moveTo(cx, cy - 9)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx + 7, cy + 4)
  ctx.stroke()
  ctx.restore()
}

function ikonKalendarKecil(ctx: CanvasRenderingContext2D, cx: number, cy: number, warna: string) {
  ctx.save()
  ctx.strokeStyle = warna
  ctx.fillStyle = warna
  ctx.lineWidth = 3
  ctx.strokeRect(cx - 15, cy - 12, 30, 27)
  ctx.fillRect(cx - 15, cy - 12, 30, 7)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) ctx.fillRect(cx - 10 + c * 8, cy - 1 + r * 7, 5, 4)
  ctx.restore()
}

// One section: rounded frame + round badge + slanted title
function bingkai(
  ctx: CanvasRenderingContext2D,
  y: number,
  h: number,
  warna: string,
  tajuk: string,
  ikon: (cx: number, cy: number) => void,
  jarakHuruf = 0,
) {
  const x = 60
  const w = W - 120
  // Frame
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = warna
  ctx.lineWidth = 4
  segiBulat(ctx, x, y, w, h, 22)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Title banner + its darker tail, and the two stripes on the right
  serong(ctx, x + 120, y - 34, 560, 68, 30, warna)
  serong(ctx, x + 690, y - 4, 290, 8, 4, warna)
  serong(ctx, w - 30, y - 34, 26, 40, 22, BIRU_GELAP)
  serong(ctx, w - 2, y - 34, 26, 40, 22, warna)

  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.font = `bold 46px ${FON}`
  ctx.textBaseline = 'middle'
  const teks = jarakHuruf ? tajuk.split('').join(' '.repeat(jarakHuruf)) : tajuk
  ctx.fillText(teks, x + 175, y + 1)
  ctx.restore()

  // Round badge, overlapping the frame's top-left corner
  const cx = x + 70
  const cy = y + 18
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx, cy, 78, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = warna
  ctx.beginPath()
  ctx.arc(cx, cy, 68, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ikon(cx, cy)
}

// "Label  :  VALUE" with a dotted line under the value
function baris(
  ctx: CanvasRenderingContext2D,
  y: number,
  label: string,
  nilai: string,
  ikon?: (cx: number, cy: number) => void,
) {
  if (ikon) ikon(195, y)
  ctx.save()
  ctx.fillStyle = TEKS
  ctx.textBaseline = 'middle'
  ctx.font = `bold 30px ${FON}`
  ctx.fillText(label, 230, y)
  ctx.fillText(':', 520, y)

  // Value: shrink to fit the line
  let saiz = 40
  ctx.font = `bold ${saiz}px ${FON}`
  while (ctx.measureText(nilai).width > 590 && saiz > 24) {
    saiz -= 2
    ctx.font = `bold ${saiz}px ${FON}`
  }
  ctx.fillText(nilai, 560, y - 6)

  ctx.strokeStyle = '#8a94a6'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.moveTo(560, y + 26)
  ctx.lineTo(W - 100, y + 26)
  ctx.stroke()
  ctx.restore()
}

function slogan(ctx: CanvasRenderingContext2D, x: number, y: number, saiz: number) {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.font = `italic bold ${saiz}px ${FON}`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('Sentiasa - Siap - Sedia', x, y)
  ctx.strokeStyle = OREN
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x - saiz * 9.5, y + 14)
  ctx.quadraticCurveTo(x - saiz * 5, y + 4, x, y + 12)
  ctx.stroke()
  ctx.restore()
}

export async function lukisPosterInsiden(data: DataPoster): Promise<HTMLCanvasElement> {
  const kanvas = document.createElement('canvas')
  kanvas.width = W
  kanvas.height = H
  const ctx = kanvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak disokong')

  const logo = await muatImej(apmLogo)

  // --- Body background ---
  ctx.fillStyle = LATAR
  ctx.fillRect(0, 0, W, H)

  // --- Header ---
  const gHeader = ctx.createLinearGradient(0, 0, W, 420)
  gHeader.addColorStop(0, BIRU_GELAP)
  gHeader.addColorStop(1, BIRU_TERANG)
  ctx.fillStyle = gHeader
  ctx.fillRect(0, 0, W, 410)
  // Orange accents in the corners
  serong(ctx, -60, 300, 170, 26, 60, OREN)
  serong(ctx, W - 230, 8, 250, 18, 30, OREN)
  serong(ctx, W - 150, 360, 220, 18, 40, OREN)

  if (logo) {
    const h = 96
    const w = (logo.width / logo.height) * h
    ctx.drawImage(logo, 150, 24, w, h)
  }
  ctx.fillStyle = '#fff'
  ctx.font = `bold 38px ${FON}`
  ctx.textBaseline = 'middle'
  ctx.fillText('ANGKATAN PERTAHANAN AWAM MALAYSIA', 270, 72)

  // "MAKLUMAN AWAL" on red, "INSIDEN" on white
  serong(ctx, 150, 140, 760, 112, 40, MERAH)
  ctx.save()
  ctx.fillStyle = '#fff'
  // Shrink to the banner if the device's font is wider than Arial
  let saizTajuk = 92
  ctx.font = `italic bold ${saizTajuk}px ${FON}`
  while (ctx.measureText('MAKLUMAN AWAL').width > 700 && saizTajuk > 60) {
    saizTajuk -= 2
    ctx.font = `italic bold ${saizTajuk}px ${FON}`
  }
  ctx.textAlign = 'center'
  ctx.fillText('MAKLUMAN AWAL', 550, 198)
  ctx.restore()

  serong(ctx, 130, 262, 640, 110, 36, '#ffffff')
  serong(ctx, 160, 372, 580, 10, 6, OREN)
  ctx.save()
  ctx.fillStyle = '#3a3f4a'
  ctx.font = `bold 96px ${FON}`
  ctx.textAlign = 'center'
  ctx.fillText('I N S I D E N', 465, 320)
  ctx.restore()

  slogan(ctx, W - 50, 330, 34)

  // --- Section 1: Masa / Tarikh ---
  const y1 = 480
  bingkai(ctx, y1, 250, OREN, 'MASA / TARIKH', (cx, cy) => ikonKalendar(ctx, cx, cy))
  baris(ctx, y1 + 120, 'Tarikh', tarikhPoster(data.tarikh_masa), (cx, cy) => ikonKalendarKecil(ctx, cx, cy, BIRU_GELAP))
  baris(ctx, y1 + 195, 'Masa', masaPoster(data.tarikh_masa), (cx, cy) => ikonJam(ctx, cx, cy, BIRU_GELAP))

  // --- Section 2: Insiden (summary centred, as large as fits) ---
  const y2 = 800
  const h2 = 340
  bingkai(ctx, y2, h2, MERAH, 'INSIDEN', (cx, cy) => ikonAmaran(ctx, cx, cy), 2)
  const { saiz, baris: barisInsiden } = muatkanTeks(ctx, data.ringkasan.toUpperCase(), W - 260, 4, 56, 30)
  ctx.save()
  ctx.fillStyle = TEKS
  ctx.font = `bold ${saiz}px ${FON}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tinggiBaris = saiz * 1.25
  const pusatY = y2 + 60 + (h2 - 60) / 2
  barisInsiden.forEach((b, i) => {
    ctx.fillText(b, W / 2, pusatY + (i - (barisInsiden.length - 1) / 2) * tinggiBaris)
  })
  ctx.restore()

  // --- Section 3: Lokasi ---
  const y3 = 1210
  bingkai(ctx, y3, 250, BIRU, 'LOKASI', (cx, cy) => ikonPin(ctx, cx, cy))
  baris(ctx, y3 + 120, 'Lokasi', data.tempat.toUpperCase(), (cx, cy) => ikonPin(ctx, cx, cy, BIRU_GELAP, 0.55))
  baris(ctx, y3 + 195, 'Daerah / Negeri', `${data.daerah.toUpperCase()} / ${data.negeri.toUpperCase()}`)

  // --- Source of the report (required on every poster) ---
  if (data.sumber_laporan?.trim()) {
    ctx.save()
    ctx.fillStyle = TEKS
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    let saizSumber = 28
    const teksSumber = `SUMBER: ${data.sumber_laporan.trim().toUpperCase()}`
    ctx.font = `bold ${saizSumber}px ${FON}`
    while (ctx.measureText(teksSumber).width > W - 160 && saizSumber > 18) {
      saizSumber -= 2
      ctx.font = `bold ${saizSumber}px ${FON}`
    }
    ctx.fillText(teksSumber, W - 80, 1496)
    ctx.restore()
  }

  // --- Stripes above the footer ---
  serong(ctx, -40, 1505, 330, 22, 40, OREN)
  serong(ctx, -40, 1535, 220, 12, 24, BIRU)
  serong(ctx, W - 300, 1505, 360, 22, 40, OREN)

  // --- Footer ---
  ctx.fillStyle = BIRU_GELAP
  ctx.fillRect(0, 1560, W, H - 1560)
  ctx.fillStyle = OREN
  ctx.fillRect(60, 1600, 7, 120)

  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `bold 26px ${FON}`
  ctx.fillText('Dikeluarkan :', 90, 1625)
  ctx.font = `bold 36px ${FON}`
  ctx.fillText('Pusat Kawalan Operasi Pusat', 90, 1668)
  ctx.font = `26px ${FON}`
  ctx.fillText('Bahagian Pengurusan Bencana dan Operasi', 90, 1702)
  ctx.fillText('Ibu Pejabat Pertahanan Awam', 90, 1734)
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillRect(770, 1600, 2, 130)
  slogan(ctx, W - 60, 1675, 40)

  return kanvas
}

const namaAsas = (d: DataPoster) => {
  const t = new Date(d.tarikh_masa)
  const tarikh = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}`
  return `Makluman_Awal_Insiden_${d.negeri.replace(/\s+/g, '_')}_${tarikh}`
}

function muatTurun(url: string, nama: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// PNG for WhatsApp / social media
export async function muatTurunPosterPng(data: DataPoster) {
  const kanvas = await lukisPosterInsiden(data)
  const blob = await new Promise<Blob | null>((resolve) => kanvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Gagal menjana PNG')
  const url = URL.createObjectURL(blob)
  muatTurun(url, `${namaAsas(data)}.png`)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// A4 PDF: the poster as one full-page image (JPEG keeps the file small for e-mail)
export async function binaPosterPdf(data: DataPoster) {
  const kanvas = await lukisPosterInsiden(data)
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addImage(kanvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297)
  return { doc, namaFail: `${namaAsas(data)}.pdf` }
}

export async function muatTurunPosterPdf(data: DataPoster) {
  const { doc, namaFail } = await binaPosterPdf(data)
  doc.save(namaFail)
}

// Base64 (no "data:" prefix), for the e-mail attachment
export async function posterPdfBase64(data: DataPoster) {
  const { doc, namaFail } = await binaPosterPdf(data)
  const uri = doc.output('datauristring')
  return { base64: uri.slice(uri.indexOf(',') + 1), namaFail }
}
