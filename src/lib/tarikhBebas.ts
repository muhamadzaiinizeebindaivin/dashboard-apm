// Reads the free-form dates people type in NDCC reports:
//   "9/10/2026 1400H", "30/11/2025 @ 2000HRS", "12.10.2026 / 1600HRS",
//   "12/10/2026 / JAM 1600", "11/30/2025 22:00 PM", "9 Okt 2026, 2.30 ptg"
// Returns a datetime-local value ("2026-10-09T14:00") or null.

const pad = (n: number) => String(n).padStart(2, '0')

const BULAN: Record<string, number> = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mac: 3, mar: 3, march: 3,
  apr: 4, april: 4, mei: 5, may: 5, jun: 6, june: 6, jul: 7, julai: 7, july: 7,
  ogo: 8, ogos: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, dis: 12, disember: 12, dec: 12, december: 12,
}
const PETANG = ['pm', 'ptg', 'petang', 'malam', 'mlm']
const PAGI = ['am', 'pg', 'pagi']

export type HasilTarikh = {
  nilai: string // datetime-local
  adaMasa: boolean // a time was found
  ditukar: boolean // read as month/day because the day/month order was impossible
}

export function keNilaiTempatan(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function bacaTarikhMasa(asal: unknown): HasilTarikh | null {
  if (asal instanceof Date) {
    if (Number.isNaN(asal.getTime())) return null
    return { nilai: keNilaiTempatan(asal), adaMasa: asal.getHours() + asal.getMinutes() > 0, ditukar: false }
  }

  const t = String(asal ?? '').toLowerCase()
  if (!t.trim()) return null

  let d: number
  let m: number
  let y: number
  let ditukar = false

  let padan = t.match(/(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})/)
  if (padan) {
    const a = +padan[1]
    const b = +padan[2]
    y = +padan[3]
    // Templates say dd/mm/yyyy, but some states type mm/dd: swap only when
    // the dd/mm reading is impossible (e.g. "11/30/2025")
    if (b > 12 && a <= 12) {
      d = b
      m = a
      ditukar = true
    } else {
      d = a
      m = b
    }
  } else {
    padan = t.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/)
    if (!padan || !BULAN[padan[2]]) return null
    d = +padan[1]
    m = BULAN[padan[2]]
    y = +padan[3]
  }
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31) return null

  const sisa = t.replace(padan[0], ' ')
  let jam = 0
  let minit = 0
  let adaMasa = false
  const masa =
    sisa.match(/(\d{1,2})[:.](\d{2})\s*(am|pm|pg|ptg|pagi|petang|malam|mlm)?/) ??
    sisa.match(/(?:jam|pukul|@)\s*(\d{2})(\d{2})(?!\d)/) ??
    // "1400H", "2000HRS", "2209 MALAM"
    sisa.match(/(?<!\d)([01]\d|2[0-3])([0-5]\d)\s*(?:h|hr|hrs|jam|pagi|pg|petang|ptg|malam|mlm)\b/)
  if (masa) {
    jam = +masa[1]
    minit = +masa[2]
    const akhiran = masa[3] ?? ''
    if (PETANG.includes(akhiran) && jam < 12) jam += 12 // "22:00 PM" stays 22
    if (PAGI.includes(akhiran) && jam === 12) jam = 0
    if (jam > 23 || minit > 59) return null
    adaMasa = true
  }

  return { nilai: `${y}-${pad(m)}-${pad(d)}T${pad(jam)}:${pad(minit)}`, adaMasa, ditukar }
}