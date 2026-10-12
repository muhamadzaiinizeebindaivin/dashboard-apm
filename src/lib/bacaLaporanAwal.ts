import { NEGERI_LIST } from './negeriVisual'
import { JENIS_BENCANA } from './laporanBencana'

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const SAIZ_MAKS = 5 * 1024 * 1024

export type HasilBacaan = {
  nilai: Record<string, string> // form values, keyed like the Laporan Awal fields
  amaran: Record<string, string> // per field: what the operator should check
}

const kunci = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const pad = (n: number) => String(n).padStart(2, '0')

// ---------------------------------------------------------------------------
// Value normalisation
// ---------------------------------------------------------------------------

const NEGERI_IKUT_KUNCI = new Map(NEGERI_LIST.map((n) => [kunci(n), n]))
const ALIAS_NEGERI: Record<string, string> = {
  'p pinang': 'Pulau Pinang',
  penang: 'Pulau Pinang',
  'n sembilan': 'Negeri Sembilan',
  ns: 'Negeri Sembilan',
  kl: 'Kuala Lumpur',
  malacca: 'Melaka',
}

function normalNegeri(asal: string): string | null {
  const k = kunci(asal).replace(/^(wilayah persekutuan|w p|wp) /, '')
  return NEGERI_IKUT_KUNCI.get(k) ?? ALIAS_NEGERI[k] ?? null
}

// "Banjir kilat" -> "Banjir", "Kebakaran hutan" -> "Kebakaran"
function normalJenis(asal: string): string | null {
  const k = kunci(asal)
  return JENIS_BENCANA.find((j) => k.includes(kunci(j))) ?? null
}

const BULAN: Record<string, number> = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mac: 3, mar: 3, march: 3,
  apr: 4, april: 4, mei: 5, may: 5, jun: 6, june: 6, jul: 7, julai: 7, july: 7,
  ogo: 8, ogos: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, dis: 12, disember: 12, dec: 12, december: 12,
}
const PETANG = ['pm', 'ptg', 'petang', 'malam', 'mlm']
const PAGI = ['am', 'pg', 'pagi']

// Free-form "9/10/2026 1400H", "09-10-2026 2.30 ptg", "9 Okt 2026 14:00"
// -> "2026-10-09T14:00" (datetime-local format), or null
export function bacaTarikhMasa(asal: string): { nilai: string; adaMasa: boolean } | null {
  const t = asal.toLowerCase()
  let d: number, m: number, y: number
  let padanTarikh = t.match(/(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})/)
  if (padanTarikh) {
    d = +padanTarikh[1]
    m = +padanTarikh[2]
    y = +padanTarikh[3]
  } else {
    padanTarikh = t.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/)
    if (!padanTarikh || !BULAN[padanTarikh[2]]) return null
    d = +padanTarikh[1]
    m = BULAN[padanTarikh[2]]
    y = +padanTarikh[3]
  }
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31) return null

  const sisa = t.replace(padanTarikh[0], ' ')
  let jam = 0
  let minit = 0
  let adaMasa = false
  const masa =
    sisa.match(/(\d{1,2})[:.](\d{2})\s*(am|pm|pg|ptg|pagi|petang|malam|mlm)?/) ??
    sisa.match(/\b(\d{2})(\d{2})\s*(h|hrs|jam)\b/)
  if (masa) {
    jam = +masa[1]
    minit = +masa[2]
    const akhiran = masa[3] ?? ''
    if (PETANG.includes(akhiran) && jam < 12) jam += 12
    if (PAGI.includes(akhiran) && jam === 12) jam = 0
    if (jam > 23 || minit > 59) return null
    adaMasa = true
  }
  return { nilai: `${y}-${pad(m)}-${pad(d)}T${pad(jam)}:${pad(minit)}`, adaMasa }
}

// ---------------------------------------------------------------------------
// Reading the NDCC "Laporan Awal" Word template
// ---------------------------------------------------------------------------

// 1.x numbers in the template -> form keys
const NOMBOR_MEDAN: Record<string, string> = {
  '1': 'jenis_bencana',
  '2': 'level',
  '3': 'nama_bencana',
  '4': 'bidang_kuasa',
  '5': 'negeri',
  '6': 'daerah',
  '7': 'mukim',
  '8': 'alamat',
  '9': 'poskod',
  '10': 'radius',
  '11': 'sebab_kejadian',
  '12': 'kandungan',
  '13': 'catatan',
}
const MEDAN_PANJANG = new Set(['kandungan', 'catatan', 'hal_lain'])

// Remove the English subtitles of the template, e.g. "(TYPE OF DISASTER)"
const buangSubtajuk = (s: string) => s.replace(/\([A-Z][A-Z /&-]*\)/g, '').trim()

// "1.5 NEGERI: Kelantan (STATE)" -> { kunci: 'negeri', sisa: 'Kelantan' }
function labelKejadian(teks: string): { kunci: string; sisa: string } | null {
  const p = teks.match(/^1\.(\d{1,2})\b[^:]*:?\s*([\s\S]*)$/)
  if (!p || !NOMBOR_MEDAN[p[1]]) return null
  return { kunci: NOMBOR_MEDAN[p[1]], sisa: buangSubtajuk(p[2]) }
}

function labelPenyedia(teks: string): { kunci: string | null; sisa: string } | null {
  const k = kunci(teks)
  const selepasKolon = (s: string) => (s.includes(':') ? s.slice(s.indexOf(':') + 1).trim() : '')
  if (k === 'nama' || k.startsWith('nama ')) return { kunci: 'penyedia_nama', sisa: selepasKolon(teks) }
  if (k.startsWith('jawatan')) return { kunci: 'penyedia_jawatan', sisa: selepasKolon(teks) }
  if (k.startsWith('no tel')) return { kunci: 'penyedia_telefon', sisa: selepasKolon(teks) }
  if (k.startsWith('masa')) return { kunci: '_masa', sisa: selepasKolon(teks) }
  if (k.startsWith('tarikh')) return { kunci: '_tarikh', sisa: selepasKolon(teks) }
  if (k.startsWith('tandatangan')) return { kunci: null, sisa: '' } // signature/stamp: not readable
  return null
}

export async function bacaLaporanAwal(fail: File): Promise<HasilBacaan | { ralat: string }> {
  if (!/\.docx$/i.test(fail.name)) {
    return { ralat: 'Sila muat naik fail Word (.docx). Fail .doc lama perlu disimpan semula sebagai .docx.' }
  }
  if (fail.size > SAIZ_MAKS) return { ralat: 'Fail melebihi 5 MB.' }

  let html: string
  try {
    const modul = await import('mammoth/mammoth.browser')
    const mammoth = modul.default ?? modul
    html = (await mammoth.convertToHtml({ arrayBuffer: await fail.arrayBuffer() })).value
  } catch {
    return { ralat: 'Fail tidak dapat dibaca. Pastikan fail tidak rosak atau dilindungi kata laluan.' }
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const teksSel = (el: Element) => {
    const perenggan = Array.from(el.querySelectorAll('p'))
      .map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    return perenggan.length ? perenggan.join('\n') : (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  const kumpul: Record<string, string[]> = {}
  const tambah = (k: string, v: string) => {
    if (v) (kumpul[k] ??= []).push(v)
  }

  // "Tarikh/ Masa :" sits above the table, as a normal paragraph
  let teksTarikh = ''
  for (const p of Array.from(doc.querySelectorAll('body > p'))) {
    const t = (p.textContent ?? '').trim()
    const padan = t.match(/tarikh\s*\/?\s*masa\s*:?\s*(.*)$/i)
    if (padan) {
      teksTarikh = padan[1].trim()
      break
    }
  }

  type Bahagian = 'mula' | 'kejadian' | 'hal_lain' | 'penyedia' | 'perhatian'
  let bahagian: Bahagian = 'mula'
  let jumpaLabel = false

  for (const tr of Array.from(doc.querySelectorAll('tr'))) {
    const sel = Array.from(tr.children)
    const teksBaris = kunci(sel.map(teksSel).join(' '))

    if (teksBaris.startsWith('maklumat kejadian')) { bahagian = 'kejadian'; continue }
    if (teksBaris.startsWith('hal hal lain')) { bahagian = 'hal_lain'; continue }
    if (teksBaris.startsWith('disediakan oleh')) { bahagian = 'penyedia'; continue }
    if (teksBaris.startsWith('telah diberi perhatian')) { bahagian = 'perhatian'; continue }

    // The verification block is filled later by the Sekretariat (Sahkan)
    if (bahagian === 'perhatian') continue

    if (bahagian === 'hal_lain') {
      tambah('hal_lain', sel.map(teksSel).filter(Boolean).join('\n'))
      continue
    }

    // Date sometimes typed in the empty first row of the table
    if (bahagian === 'mula' && !teksTarikh && bacaTarikhMasa(teksBaris)) {
      teksTarikh = sel.map(teksSel).join(' ')
    }

    // Label cell sets the current field; following cells are its value
    let semasa: string | null = null
    for (const td of sel) {
      const t = teksSel(td)
      const satuBaris = t.replace(/\n/g, ' ').trim()
      if (!satuBaris || satuBaris === ':') continue

      const label = bahagian === 'penyedia' ? labelPenyedia(satuBaris) : labelKejadian(satuBaris)
      if (label) {
        jumpaLabel = true
        semasa = label.kunci
        if (semasa) tambah(semasa, label.sisa)
        continue
      }
      if (semasa) tambah(semasa, t.replace(/^:\s*/, ''))
    }
  }

  if (!jumpaLabel) {
    return { ralat: 'Fail ini bukan templat Laporan Awal NDCC. Sila gunakan templat rasmi.' }
  }

  const nilai: Record<string, string> = {}
  for (const [k, v] of Object.entries(kumpul)) {
    nilai[k] = v.join(MEDAN_PANJANG.has(k) ? '\n' : ' ').trim()
  }

  // --- Normalise + collect what the operator must check ---
  const amaran: Record<string, string> = {}

  if (nilai.jenis_bencana) {
    const asal = nilai.jenis_bencana
    const jenis = normalJenis(asal)
    if (!jenis) {
      amaran.jenis_bencana = `Dalam fail: "${asal}". Sila pilih jenis bencana daripada senarai.`
      nilai.jenis_bencana = ''
    } else {
      if (kunci(jenis) !== kunci(asal)) amaran.jenis_bencana = `Dibaca daripada "${asal}". Sila periksa.`
      nilai.jenis_bencana = jenis
    }
  }

  if (nilai.level) {
    const tahap = nilai.level.match(/[123]/)?.[0]
    if (!tahap) amaran.level = `Dalam fail: "${nilai.level}". Sila pilih level 1, 2 atau 3.`
    nilai.level = tahap ?? ''
  }

  if (nilai.negeri) {
    const asal = nilai.negeri
    const negeri = normalNegeri(asal)
    if (!negeri) amaran.negeri = `Negeri "${asal}" tidak dikenali. Sila pilih daripada senarai.`
    // Only flag a real change ("W.P. Labuan" -> Labuan), not capitals/spaces ("SABAH" -> Sabah)
    else if (kunci(negeri) !== kunci(asal)) amaran.negeri = `Dibaca daripada "${asal}". Sila periksa.`
    nilai.negeri = negeri ?? ''
  }

  // Disaster names are saved in one canonical form (UPPERCASE, single spaces):
  // show it that way already, so the operator sees exactly what will be stored
  if (nilai.nama_bencana) nilai.nama_bencana = nilai.nama_bencana.replace(/\s+/g, ' ').trim().toUpperCase()

  const tetapkanMasa = (kunciMedan: string, teks: string, label: string) => {
    if (!teks.trim()) return
    const hasil = bacaTarikhMasa(teks)
    if (!hasil) {
      amaran[kunciMedan] = `${label} dalam fail: "${teks}" tidak dapat dibaca. Sila isi semula.`
      return
    }
    nilai[kunciMedan] = hasil.nilai
    amaran[kunciMedan] = hasil.adaMasa
      ? `Dibaca daripada "${teks}". Sila periksa.`
      : `Masa tidak dinyatakan dalam fail ("${teks}"). Sila periksa.`
  }
  tetapkanMasa('tarikh_masa', teksTarikh, 'Tarikh/Masa')
  tetapkanMasa('penyedia_masa', `${nilai._tarikh ?? ''} ${nilai._masa ?? ''}`.trim(), 'Masa & Tarikh')
  delete nilai._tarikh
  delete nilai._masa

  return { nilai, amaran }
}