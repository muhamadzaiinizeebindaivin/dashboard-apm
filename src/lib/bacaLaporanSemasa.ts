import { bacaTarikhMasa } from './tarikhBebas'
import { kunci, normalJenis, normalNegeri, normalNamaBencana } from './normalisasi'
import { bacaLampiran, NAMA_HELAIAN_LAMPIRAN } from './bacaLampiranSemasa'
import type { Lampiran } from './bacaLampiranSemasa'

// Reads the NDCC "Laporan Situasi Bencana" Excel template (Appendix A):
// sheet General_Info (labels in one column, values to their right) and
// sheet ShelterStatus (one row per PPS, columns found by their header).

export type PpsExcel = {
  baris: number // row number as shown in Excel
  daerah: string
  mukim: string
  nama: string
  mangsa: number
  keluarga: number
  // Victims by sex and age (Dewasa / Kanak-kanak), null when the columns are empty
  dewasaLelaki: number | null
  dewasaPerempuan: number | null
  kanakLelaki: number | null
  kanakPerempuan: number | null
  dibukaPada: string | null // ISO
  ditutup: boolean // "Tutup" column filled
  tutupPada: string | null // ISO, when the Tutup value could be read
  pengurusNama: string
  pengurusJawatan: string
  pengurusTelefon: string
}

export type HasilSemasa = {
  nilai: Record<string, string> // form values (Laporan Semasa keys)
  amaran: Record<string, string> // per field: what the operator should check
  pps: PpsExcel[]
  ringkasan: 'ada_perubahan' | 'tiada_perubahan'
  lampiran: Lampiran // other sheets (mobilisation, casualties, damage, closed roads...)
}

const SAIZ_MAKS = 10 * 1024 * 1024 // templates carry large reference sheets

const teks = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const teksPanjang = (v: unknown) => String(v ?? '').trim()
const ada = (v: unknown) => teks(v) !== ''
const nombor = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))
const nomborAtauNull = (v: unknown) => (teks(v) === '' ? null : nombor(v))
const keIso = (nilai: string) => new Date(nilai).toISOString()
const bersihTelefon = (v: unknown) => teks(v).replace(/^\*+/, '')

// "KUALA NERUS" and "Kuala Nerus" are the same district: one display form
function rapiDaerah(s: string) {
  if (s !== s.toUpperCase() || s.length <= 4) return s // keep mixed case and codes like "WPKL"
  return s.toLowerCase().replace(/\b\p{L}/gu, (h) => h.toUpperCase())
}

// Notes typed inside PPS names would make the same PPS look like a new one:
// "SK TOK JIRING (TIADA MANGSA TAPI PPS BELUM DITUTUP)" -> "SK TOK JIRING"
// Other brackets are kept ("SRJK (C) ...").
function bersihNamaPps(s: string) {
  return s
    .replace(/\(([^()]*\b(mangsa|ditutup|dibuka|belum|kapasiti)\b[^()]*)\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// General_Info labels -> form keys, per block of the sheet
const LABEL_UMUM: Record<string, string> = {
  'nama bencana': 'nama_bencana',
  negeri: 'negeri',
  'tarikh masa': '_tarikh',
  'ringkasan laporan': 'kandungan',
  'hal hal lain': 'hal_lain',
}
const LABEL_ORANG: Record<string, string> = {
  nama: 'nama',
  jawatan: 'jawatan',
  'no tel': 'telefon',
  'no telefon': 'telefon',
}

export async function bacaLaporanSemasa(fail: File): Promise<HasilSemasa | { ralat: string }> {
  if (!/\.xlsx?$/i.test(fail.name)) return { ralat: 'Sila muat naik fail Excel (.xlsx).' }
  if (fail.size > SAIZ_MAKS) return { ralat: 'Fail melebihi 10 MB.' }

  // Same object whether the bundler exposes xlsx as ESM or CommonJS
  const modul: typeof import('xlsx') & { default?: typeof import('xlsx') } = await import('xlsx')
  const XLSX = modul.default ?? modul
  let wb: ReturnType<typeof XLSX.read>
  try {
    // Only the sheets we use (the reference sheets are large), and at most
    // 3000 rows each (some templates declare 65536 empty rows)
    wb = XLSX.read(await fail.arrayBuffer(), {
      type: 'array',
      // Dates stay as Excel serial numbers: converted below without any time-zone shift
      sheets: ['General_Info', 'ShelterStatus', ...Object.values(NAMA_HELAIAN_LAMPIRAN)],
      sheetRows: 3000,
    })
  } catch {
    return { ralat: 'Fail tidak dapat dibaca. Pastikan fail tidak rosak atau dilindungi kata laluan.' }
  }

  const cariHelaian = (nama: string) => wb.SheetNames.find((n) => kunci(n) === kunci(nama))
  const helaianInfo = cariHelaian('General_Info')
  if (!helaianInfo || !wb.Sheets[helaianInfo]) {
    return { ralat: 'Fail ini bukan templat Laporan Situasi Bencana NDCC (helaian General_Info tiada).' }
  }
  // Keep blank rows so each index maps to a real Excel row number
  const barisHelaian = (nama: string) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nama], { header: 1, raw: true, defval: null, blankrows: true })
  const barisPertama = (nama: string) => {
    const ref = wb.Sheets[nama]['!ref']
    return ref ? XLSX.utils.decode_range(ref).s.r + 1 : 1
  }

  // Date cells arrive as serial numbers (e.g. 46022.5): read their parts directly
  const tarikhSel = (v: unknown) => {
    if (typeof v === 'number' && v > 20000 && v < 80000) {
      const t = XLSX.SSF.parse_date_code(v)
      if (t) return bacaTarikhMasa(`${t.d}/${t.m}/${t.y} ${t.H}:${String(t.M).padStart(2, '0')}`)
    }
    return bacaTarikhMasa(v)
  }
  const paparSel = (v: unknown) => {
    const t = typeof v === 'number' ? tarikhSel(v) : null
    return t ? t.nilai.replace('T', ' ') : teks(v)
  }

  // ---------- General_Info ----------
  const info: Record<string, unknown> = {}
  let blok: 'umum' | 'penyedia' | 'perhatian' = 'umum'
  for (const r of barisHelaian(helaianInfo)) {
    for (let i = 0; i < r.length; i++) {
      const k = kunci(teks(r[i]))
      if (!k) continue
      if (k === 'disediakan oleh') { blok = 'penyedia'; break }
      if (k === 'disahkan oleh') { blok = 'perhatian'; break }

      const medan = blok === 'umum' ? LABEL_UMUM[k] : LABEL_ORANG[k] && `${blok}_${LABEL_ORANG[k]}`
      if (!medan) break // first text of the row is not a known label
      for (let j = i + 1; j < r.length; j++) {
        if (ada(r[j])) {
          info[medan] = r[j]
          break
        }
      }
      break
    }
  }
  if (!('nama_bencana' in info) && !('negeri' in info)) {
    return { ralat: 'Fail ini bukan templat Laporan Situasi Bencana NDCC (Nama Bencana / Negeri tidak dijumpai).' }
  }

  // ---------- ShelterStatus ----------
  const pps: PpsExcel[] = []
  const helaianPps = cariHelaian('ShelterStatus')
  if (helaianPps && wb.Sheets[helaianPps]) {
    const rows = barisHelaian(helaianPps)
    const offset = barisPertama(helaianPps)
    const hi = rows.findIndex((r) => r.some((c) => kunci(teks(c)) === 'nama pusat pemindahan'))
    if (hi >= 0) {
      const tajuk = rows[hi].map((c) => kunci(teks(c)))
      const lajur = (...nama: string[]) => tajuk.findIndex((x) => nama.includes(x))
      const cDaerah = lajur('daerah') // Sarawak: "Bahagian | Daerah"; others: "Daerah | Mukim"
      const cMukim = lajur('mukim')
      const cNama = lajur('nama pusat pemindahan')
      const cOperasi = lajur('waktu operasi tarikh masa')
      const cMangsa = lajur('jumlah mangsa pemindahan')
      const cKeluarga = tajuk.findIndex((x) => x.startsWith('jumlah keluarga'))
      const cPengurus = lajur('pengurus pusat pemindahan')
      const cJawatan = lajur('jawatan')
      const cTelefon = lajur('nombor telefon', 'no telefon', 'no tel')
      // "Dewasa" / "Kanak-Kanak" sit on the sub-header row, each over Lelaki | Perempuan
      const cariSubtajuk = (label: string) => {
        for (let i = hi; i <= hi + 3 && i < rows.length; i++) {
          const x = rows[i].map((c) => kunci(teks(c))).indexOf(label)
          if (x >= 0) return x
        }
        return -1
      }
      const cDewasa = cariSubtajuk('dewasa')
      const cKanak = cariSubtajuk('kanak kanak')

      // "Buka | Tutup" sub-headers sit one or two rows below the header
      let cBuka = cOperasi
      let cTutup = cOperasi >= 0 ? cOperasi + 1 : -1
      let mula = hi + 1
      for (let i = hi + 1; i <= hi + 3 && i < rows.length; i++) {
        const sub = rows[i].map((c) => kunci(teks(c)))
        const b = sub.indexOf('buka')
        if (b >= 0) {
          cBuka = b
          const t = sub.indexOf('tutup')
          if (t >= 0) cTutup = t
          mula = i + 1
        }
      }

      const sel = (r: unknown[], c: number) => (c >= 0 ? r[c] : null)
      let daerahTerakhir = ''
      for (let i = mula; i < rows.length; i++) {
        const r = rows[i]
        const nama = bersihNamaPps(teks(sel(r, cNama)))
        // Skip empty rows and the "JUMLAH" subtotal rows
        if (!nama || kunci(teks(r[0])).startsWith('jumlah') || kunci(nama).startsWith('jumlah')) continue

        const daerah = rapiDaerah(teks(sel(r, cDaerah))) || daerahTerakhir
        daerahTerakhir = daerah
        const buka = tarikhSel(sel(r, cBuka))
        const tutupMentah = sel(r, cTutup)
        const tutup = tarikhSel(tutupMentah)

        pps.push({
          baris: i + offset,
          daerah,
          mukim: teks(sel(r, cMukim)),
          nama,
          mangsa: nombor(sel(r, cMangsa)),
          keluarga: nombor(sel(r, cKeluarga)),
          dewasaLelaki: nomborAtauNull(sel(r, cDewasa)),
          dewasaPerempuan: nomborAtauNull(sel(r, cDewasa >= 0 ? cDewasa + 1 : -1)),
          kanakLelaki: nomborAtauNull(sel(r, cKanak)),
          kanakPerempuan: nomborAtauNull(sel(r, cKanak >= 0 ? cKanak + 1 : -1)),
          dibukaPada: buka ? keIso(buka.nilai) : null,
          ditutup: ada(tutupMentah),
          tutupPada: tutup ? keIso(tutup.nilai) : null,
          pengurusNama: teks(sel(r, cPengurus)),
          pengurusJawatan: teks(sel(r, cJawatan)),
          pengurusTelefon: bersihTelefon(sel(r, cTelefon)),
        })
      }
    }
  }

  // ---------- Values + what to check ----------
  const nilai: Record<string, string> = {}
  const amaran: Record<string, string> = {}

  const namaAsal = teks(info.nama_bencana)
  nilai.nama_bencana = normalNamaBencana(namaAsal)

  const negeriAsal = teks(info.negeri)
  if (negeriAsal) {
    const negeri = normalNegeri(negeriAsal)
    nilai.negeri = negeri ?? ''
    if (!negeri) amaran.negeri = `Negeri "${negeriAsal}" tidak dikenali. Sila pilih daripada senarai.`
    else if (kunci(negeri) !== kunci(negeriAsal)) amaran.negeri = `Dibaca daripada "${negeriAsal}". Sila periksa.`
  }

  // No "Jenis Bencana" in the template: guess from the name, then the file name
  const daripadaNama = normalJenis(namaAsal)
  const daripadaFail = normalJenis(fail.name.replace(/\.[^.]+$/, ''))
  nilai.jenis_bencana = daripadaNama ?? daripadaFail ?? ''
  amaran.jenis_bencana = daripadaNama
    ? `Diteka daripada nama bencana. Sila periksa.`
    : daripadaFail
      ? `Diteka daripada nama fail "${fail.name}". Sila periksa.`
      : 'Jenis bencana tiada dalam fail. Sila pilih daripada senarai.'

  const tarikhAsal = info._tarikh
  const tarikh = tarikhSel(tarikhAsal)
  const tarikhPapar = paparSel(tarikhAsal)
  if (tarikh) {
    nilai.tarikh_masa = tarikh.nilai
    amaran.tarikh_masa = tarikh.ditukar
      ? `Dibaca daripada "${tarikhPapar}" sebagai bulan/hari. Sila periksa.`
      : tarikh.adaMasa
        ? `Dibaca daripada "${tarikhPapar}". Sila periksa.`
        : `Masa tidak dinyatakan dalam fail ("${tarikhPapar}"). Sila periksa.`
  } else if (tarikhPapar) {
    amaran.tarikh_masa = `Tarikh & Masa dalam fail: "${tarikhPapar}" tidak dapat dibaca. Sila isi semula.`
  }

  nilai.kandungan = teksPanjang(info.kandungan)
  nilai.hal_lain = teksPanjang(info.hal_lain)
  for (const orang of ['penyedia', 'perhatian']) {
    nilai[`${orang}_nama`] = teks(info[`${orang}_nama`])
    nilai[`${orang}_jawatan`] = teks(info[`${orang}_jawatan`])
    nilai[`${orang}_telefon`] = bersihTelefon(info[`${orang}_telefon`])
  }

  // "TIADA PERUBAHAN" in the summary -> suggest Tiada Perubahan
  const ringkasan = /tiada\s*perubahan/i.test(nilai.kandungan) || pps.length === 0 ? 'tiada_perubahan' : 'ada_perubahan'

  const lampiran = bacaLampiran({ barisHelaian, barisPertama, cariHelaian, tarikhSel }, nilai.tarikh_masa)

  return { nilai, amaran, pps, ringkasan, lampiran }
}