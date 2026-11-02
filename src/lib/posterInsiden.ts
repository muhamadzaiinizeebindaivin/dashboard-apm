import latarAwal from '../assets/poster/latar-makluman-awal.jpg'
import latarSemasa from '../assets/poster/latar-maklumat-semasa.jpg'
import apmLogo from '../assets/apm-logo.png'

// Incident posters (A4 portrait, 2480 × 3508 px = 300 dpi; positions below are in a 1240 × 1754 grid, scaled ×2):
//   'awal'   = "Makluman Awal Insiden"   (Laporan Insiden)
//   'semasa' = "Maklumat Semasa Insiden" (Laporan Semasa)
// Background = the official PKOP template (banner, frames, footer already in it); the APM logo
// and the report's values are drawn on top (kept out of the JPEG so they stay sharp).
// Same canvas for the PNG (WhatsApp / social media) and the PDF (download + e-mail attachment).

export type JenisPoster = 'awal' | 'semasa'

const POSTER: Record<JenisPoster, { latar: string; namaFail: string }> = {
  awal: { latar: latarAwal, namaFail: 'Makluman_Awal_Insiden' },
  semasa: { latar: latarSemasa, namaFail: 'Maklumat_Semasa_Insiden' },
}

export type DataPoster = {
  tarikh_masa: string // ISO
  ringkasan: string
  tempat: string
  daerah: string
  negeri: string
  sumber_laporan?: string // printed as "SUMBER : ..." above the footer
}

const W = 1240
const H = 1754
const SKALA = 2 // 300 dpi output

// APM logo: crop of apm-logo.png (its transparent margins removed), where the template has its logo
const LOGO_SUMBER = { x: 86, y: 30, w: 357, h: 419 }
const LOGO = { x: 133, y: 12, tinggi: 126 }

const TEKS = '#0f1f4f' // navy, same as the template's labels
const FON = 'Arial, Helvetica, sans-serif'

// Field positions on the template (px, 1240 × 1754)
const MASA_TARIKH = { x: 450, lebar: 680, yTarikh: 589, yMasa: 653 } // baselines, just above the dotted lines
const KOTAK_INSIDEN = { x: 85, y: 860, lebar: 565, tinggi: 570 } // inside the red frame, below its title
const LOKASI = { x: 815, lebar: 350, yLokasi: 990, yDaerah: 1128 } // first baseline, on the dotted line
const SUMBER = { xKanan: 1162, y: 1446, lebar: 450 }

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

function muatImej(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal memuatkan templat poster'))
    img.src = src
  })
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

// Largest font size (down to `min`) where the text fits in `maxBaris` lines AND no single word
// overflows; below `min`, the last line is cut with "…". Leaves ctx.font set to the chosen size.
function muatkanTeks(ctx: CanvasRenderingContext2D, teks: string, lebar: number, maxBaris: number, maks: number, min: number) {
  for (let saiz = maks; saiz >= min; saiz -= 2) {
    ctx.font = `bold ${saiz}px ${FON}`
    const baris = balut(ctx, teks, lebar)
    if (baris.length <= maxBaris && baris.every((b) => ctx.measureText(b).width <= lebar)) return { saiz, baris }
  }
  ctx.font = `bold ${min}px ${FON}`
  const baris = balut(ctx, teks, lebar)
  if (baris.length > maxBaris) {
    baris.length = maxBaris
    baris[maxBaris - 1] = `${baris[maxBaris - 1].replace(/\s*\S*$/, '')}…`
  }
  return { saiz: min, baris }
}

// Value written on a dotted line; extra lines (long values) continue below it
function nilaiBaris(ctx: CanvasRenderingContext2D, teks: string, x: number, y: number, lebar: number, maxBaris: number, maks: number, min: number) {
  const { saiz, baris } = muatkanTeks(ctx, teks, lebar, maxBaris, maks, min)
  ctx.font = `bold ${saiz}px ${FON}`
  baris.forEach((b, i) => ctx.fillText(b, x, y + i * saiz * 1.2))
}

// `skala`: 2 = 300 dpi (downloads, e-mail); smaller for an on-screen preview
export async function lukisPosterInsiden(
  data: DataPoster,
  jenis: JenisPoster = 'awal',
  skala = SKALA,
): Promise<HTMLCanvasElement> {
  const kanvas = document.createElement('canvas')
  kanvas.width = Math.round(W * skala)
  kanvas.height = Math.round(H * skala)
  const ctx = kanvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak disokong')
  ctx.scale(skala, skala) // everything below is drawn in the 1240 × 1754 grid
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const [latar, logo] = await Promise.all([muatImej(POSTER[jenis].latar), muatImej(apmLogo)])
  ctx.drawImage(latar, 0, 0, W, H)
  const s = LOGO_SUMBER
  ctx.drawImage(logo, s.x, s.y, s.w, s.h, LOGO.x, LOGO.y, (s.w / s.h) * LOGO.tinggi, LOGO.tinggi)

  ctx.fillStyle = TEKS
  ctx.textBaseline = 'alphabetic'

  // --- Masa / Tarikh ---
  nilaiBaris(ctx, tarikhPoster(data.tarikh_masa), MASA_TARIKH.x, MASA_TARIKH.yTarikh, MASA_TARIKH.lebar, 1, 40, 26)
  nilaiBaris(ctx, masaPoster(data.tarikh_masa), MASA_TARIKH.x, MASA_TARIKH.yMasa, MASA_TARIKH.lebar, 1, 40, 26)

  // --- Insiden: summary centred in the red frame, as large as fits ---
  const k = KOTAK_INSIDEN
  // Largest size where the wrapped block fits the frame's width and height (cut with "…" at 24px)
  let saiz = 46
  let baris: string[] = []
  for (; saiz > 24; saiz -= 2) {
    ctx.font = `bold ${saiz}px ${FON}`
    baris = balut(ctx, data.ringkasan.toUpperCase(), k.lebar)
    if (baris.length * saiz * 1.3 <= k.tinggi && baris.every((b) => ctx.measureText(b).width <= k.lebar)) break
  }
  if (saiz === 24) baris = muatkanTeks(ctx, data.ringkasan.toUpperCase(), k.lebar, Math.floor(k.tinggi / (24 * 1.3)), 24, 24).baris
  const tinggiBaris = saiz * 1.3
  const pusatY = k.y + k.tinggi / 2
  ctx.save()
  ctx.font = `bold ${saiz}px ${FON}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  baris.forEach((b, i) => ctx.fillText(b, k.x + k.lebar / 2, pusatY + (i - (baris.length - 1) / 2) * tinggiBaris))
  ctx.restore()

  // --- Lokasi ---
  nilaiBaris(ctx, data.tempat.toUpperCase(), LOKASI.x, LOKASI.yLokasi, LOKASI.lebar, 3, 28, 18)
  nilaiBaris(ctx, `${data.daerah.toUpperCase()} / ${data.negeri.toUpperCase()}`, LOKASI.x, LOKASI.yDaerah, LOKASI.lebar, 3, 28, 18)

  // --- Source of the report (required on every poster), bottom-right like the template;
  // a long source wraps upwards so it never runs into the Insiden frame ---
  if (data.sumber_laporan?.trim()) {
    ctx.save()
    ctx.textAlign = 'right'
    const { saiz: saizSumber, baris: barisSumber } = muatkanTeks(
      ctx,
      `SUMBER : ${data.sumber_laporan.trim().toUpperCase()}`,
      SUMBER.lebar,
      2,
      26,
      18,
    )
    ctx.font = `bold ${saizSumber}px ${FON}`
    barisSumber.forEach((b, i) =>
      ctx.fillText(b, SUMBER.xKanan, SUMBER.y - (barisSumber.length - 1 - i) * saizSumber * 1.2),
    )
    ctx.restore()
  }

  return kanvas
}

const namaAsas = (d: DataPoster, jenis: JenisPoster) => {
  const t = new Date(d.tarikh_masa)
  const tarikh = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}`
  return `${POSTER[jenis].namaFail}_${d.negeri.replace(/\s+/g, '_')}_${tarikh}`
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
export async function muatTurunPosterPng(data: DataPoster, jenis: JenisPoster = 'awal') {
  const kanvas = await lukisPosterInsiden(data, jenis)
  const blob = await new Promise<Blob | null>((resolve) => kanvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Gagal menjana PNG')
  const url = URL.createObjectURL(blob)
  muatTurun(url, `${namaAsas(data, jenis)}.png`)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// A4 PDF: the poster as one full-page image (JPEG keeps the file small for e-mail)
export async function binaPosterPdf(data: DataPoster, jenis: JenisPoster = 'awal') {
  const kanvas = await lukisPosterInsiden(data, jenis)
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addImage(kanvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297)
  return { doc, namaFail: `${namaAsas(data, jenis)}.pdf` }
}

export async function muatTurunPosterPdf(data: DataPoster, jenis: JenisPoster = 'awal') {
  const { doc, namaFail } = await binaPosterPdf(data, jenis)
  doc.save(namaFail)
}

// Base64 (no "data:" prefix), for the e-mail attachment
export async function posterPdfBase64(data: DataPoster, jenis: JenisPoster = 'awal') {
  const { doc, namaFail } = await binaPosterPdf(data, jenis)
  const uri = doc.output('datauristring')
  return { base64: uri.slice(uri.indexOf(',') + 1), namaFail }
}
