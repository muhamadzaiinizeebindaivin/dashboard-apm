import { kunci } from './normalisasi'
import type { HasilTarikh } from './tarikhBebas'

// Reads the extra sheets of the NDCC "Laporan Situasi Bencana" Excel:
// Mobilization, Damage_Casualties, CasualtiesDetail, Damage_Infrastructure
// (Govt / Private), Aqua,Agri,LivestockDamage and ClosedRoad.
//
// States often leave old rows in their template (e.g. 2014 closed roads in a
// 2026 report) and the "Lampiran Yang Dikemaskini" checklist is not filled in
// reliably, so each row is checked here and doubtful rows are set aside
// (`abai`) for the operator to review, instead of trusting the checklist.

export type Mobilisasi = {
  agensi: string
  tindakan: string | null
  kekuatan: number | null
  darat_jenis: string | null
  darat_kuantiti: number | null
  air_jenis: string | null
  air_kuantiti: number | null
  udara_jenis: string | null
  udara_kuantiti: number | null
  tarikh_mula: string | null // YYYY-MM-DD
  tarikh_tamat: string | null
  catatan: string | null
}

export type Korban = {
  daerah: string | null
  kategori: string | null // Kematian / Kecederaan / Hilang
  lelaki: number
  perempuan: number
  dewasa_lelaki: number
  dewasa_perempuan: number
  kanak_lelaki: number
  kanak_perempuan: number
  jumlah: number
}

export type KorbanButiran = {
  nama: string
  alamat: string | null
  kategori: string | null
  umur: string | null
  jantina: string | null
  bangsa: string | null
  catatan: string | null
  sebab_kematian: string | null
}

export type Kerosakan = {
  daerah: string | null
  kategori: string | null
  rosak: number
  musnah: number
  hak_milik: string | null
  perincian: string | null
}

export type Pertanian = {
  daerah: string | null
  alamat: string | null
  kategori: string | null
  sub_kategori: string | null
  punca: string | null
  bil_terlibat: number | null
  kawasan_ha: number | null
  jumlah_terjejas: number | null
  catatan: string | null
}

export type JalanDitutup = {
  daerah: string | null
  mukim: string | null
  nama_laluan: string | null
  lokasi: string | null
  laluan_alternatif: string | null
  latitude: number | null
  longitude: number | null
  mula: string | null // ISO
  tamat: string | null // ISO
  url: string | null
  punca: string | null
}

// One sheet row: data + Excel row number + why it is set aside (null = kept)
export type Baris<T> = T & { _baris: number; _abai: string | null }

export type Lampiran = {
  mobilisasi: Baris<Mobilisasi>[]
  korban: Baris<Korban>[]
  korbanButiran: Baris<KorbanButiran>[]
  kerosakanKerajaan: Baris<Kerosakan>[]
  kerosakanSwasta: Baris<Kerosakan>[]
  pertanian: Baris<Pertanian>[]
  jalanDitutup: Baris<JalanDitutup>[]
}

export type KunciLampiran = keyof Lampiran

export const NAMA_HELAIAN_LAMPIRAN: Record<KunciLampiran, string> = {
  mobilisasi: 'Mobilization',
  korban: 'Damage_Casualties',
  korbanButiran: 'CasualtiesDetail',
  kerosakanKerajaan: 'Damage_Infrastructure(Govt)',
  kerosakanSwasta: 'Damage_Infrastructure(Private)',
  pertanian: 'Aqua,Agri,LivestockDamage',
  jalanDitutup: 'ClosedRoad',
}

// Rows dated this long before the report are treated as template leftovers
const HARI_DATA_LAMA = 30

export type AlatBaca = {
  barisHelaian: (nama: string) => unknown[][]
  barisPertama: (nama: string) => number
  cariHelaian: (nama: string) => string | undefined
  tarikhSel: (v: unknown) => HasilTarikh | null
}

const teks = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const teksAtauNull = (v: unknown) => teks(v) || null
const nomborAtauNull = (v: unknown) => {
  if (teks(v) === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
const kiraan = (v: unknown) => Math.round(nomborAtauNull(v) ?? 0)

// Sub-header labels that sit under the main header (rows 4-5 of the template)
const SUBTAJUK = new Set([
  'lelaki', 'perempuan', 'dewasa', 'kanak kanak', 'darat', 'air', 'udara', 'jenis',
  'kuantiti unit', 'rosak', 'musnah', 'latitude', 'longitude',
])

type Jadual = {
  rows: unknown[][]
  mula: number // first data row index
  offset: number // Excel row number of rows[0]
  // column of a header label, searched in the header row then the sub-header rows
  lajur: (...label: string[]) => number
  lajurMula: (awalan: string) => number
}

// Header row = first row containing `labelPertama`; data starts after the sub-headers
function bacaJadual(alat: AlatBaca, helaian: string, labelPertama: string): Jadual | null {
  const nama = alat.cariHelaian(helaian)
  if (!nama) return null
  const rows = alat.barisHelaian(nama)
  const hi = rows.slice(0, 15).findIndex((r) => r.some((c) => kunci(teks(c)) === labelPertama))
  if (hi < 0) return null

  let mula = hi + 1
  while (mula <= hi + 3 && mula < rows.length && rows[mula].some((c) => SUBTAJUK.has(kunci(teks(c))))) mula++

  const tajuk = rows.slice(hi, mula).map((r) => r.map((c) => kunci(teks(c))))
  return {
    rows,
    mula,
    offset: alat.barisPertama(nama),
    lajur: (...label) => {
      for (const t of tajuk) {
        const i = t.findIndex((x) => label.includes(x))
        if (i >= 0) return i
      }
      return -1
    },
    lajurMula: (awalan) => {
      for (const t of tajuk) {
        const i = t.findIndex((x) => x.startsWith(awalan))
        if (i >= 0) return i
      }
      return -1
    },
  }
}

const sel = (r: unknown[], c: number) => (c >= 0 ? r[c] : null)

export function bacaLampiran(alat: AlatBaca, tarikhLaporan: string | undefined): Lampiran {
  const rujukan = tarikhLaporan ? new Date(tarikhLaporan).getTime() : NaN
  // "Data lama?" when a row's own date is far before the report date
  const lama = (iso: string | null) =>
    !!iso && !Number.isNaN(rujukan) && rujukan - new Date(iso).getTime() > HARI_DATA_LAMA * 86_400_000
      ? `Data lama (${new Date(iso).toLocaleDateString('ms-MY')})`
      : null
  const keIso = (v: unknown) => {
    const t = alat.tarikhSel(v)
    return t ? new Date(t.nilai).toISOString() : null
  }
  const keTarikh = (v: unknown) => alat.tarikhSel(v)?.nilai.slice(0, 10) ?? null

  const lampiran: Lampiran = {
    mobilisasi: [],
    korban: [],
    korbanButiran: [],
    kerosakanKerajaan: [],
    kerosakanSwasta: [],
    pertanian: [],
    jalanDitutup: [],
  }

  // ---------- Mobilization ----------
  const mob = bacaJadual(alat, NAMA_HELAIAN_LAMPIRAN.mobilisasi, 'agensi ngo')
  if (mob) {
    const cAgensi = mob.lajur('agensi ngo')
    const cTindakan = mob.lajur('tindakan', 'jenis tindak balas')
    const cKekuatan = mob.lajurMula('kekuatan ahli')
    const cDarat = mob.lajur('darat')
    const cAir = mob.lajur('air')
    const cUdara = mob.lajur('udara')
    const cMula = mob.lajurMula('tarikh mula operasi')
    const cTamat = mob.lajurMula('tarikh tamat operasi')
    const cCatatan = mob.lajur('catatan')
    for (let i = mob.mula; i < mob.rows.length; i++) {
      const r = mob.rows[i]
      const agensi = teks(sel(r, cAgensi))
      if (!agensi) continue // empty rows and the total row
      const tarikhMula = keTarikh(sel(r, cMula))
      lampiran.mobilisasi.push({
        agensi,
        tindakan: teksAtauNull(sel(r, cTindakan)),
        kekuatan: nomborAtauNull(sel(r, cKekuatan)),
        darat_jenis: teksAtauNull(sel(r, cDarat)),
        darat_kuantiti: nomborAtauNull(sel(r, cDarat >= 0 ? cDarat + 1 : -1)),
        air_jenis: teksAtauNull(sel(r, cAir)),
        air_kuantiti: nomborAtauNull(sel(r, cAir >= 0 ? cAir + 1 : -1)),
        udara_jenis: teksAtauNull(sel(r, cUdara)),
        udara_kuantiti: nomborAtauNull(sel(r, cUdara >= 0 ? cUdara + 1 : -1)),
        tarikh_mula: tarikhMula,
        tarikh_tamat: keTarikh(sel(r, cTamat)),
        catatan: teksAtauNull(sel(r, cCatatan)),
        _baris: i + mob.offset,
        _abai: lama(tarikhMula),
      })
    }
  }

  // ---------- Damage_Casualties ----------
  const kor = bacaJadual(alat, NAMA_HELAIAN_LAMPIRAN.korban, 'daerah')
  if (kor) {
    const cDaerah = kor.lajur('daerah')
    const cKategori = kor.lajur('kategori')
    const cLelaki = kor.lajur('lelaki') // first "Lelaki" = Jantina block
    const cDewasa = kor.lajur('dewasa')
    const cKanak = kor.lajur('kanak kanak')
    const cJumlah = kor.lajurMula('jumlah keseluruhan')
    for (let i = kor.mula; i < kor.rows.length; i++) {
      const r = kor.rows[i]
      const daerah = teksAtauNull(sel(r, cDaerah))
      const kategori = teksAtauNull(sel(r, cKategori))
      if (!daerah && !kategori) continue // template rows only hold formula zeros
      const lelaki = kiraan(sel(r, cLelaki))
      const perempuan = kiraan(sel(r, cLelaki >= 0 ? cLelaki + 1 : -1))
      const jumlah = nomborAtauNull(sel(r, cJumlah)) ?? lelaki + perempuan
      lampiran.korban.push({
        daerah,
        kategori,
        lelaki,
        perempuan,
        dewasa_lelaki: kiraan(sel(r, cDewasa)),
        dewasa_perempuan: kiraan(sel(r, cDewasa >= 0 ? cDewasa + 1 : -1)),
        kanak_lelaki: kiraan(sel(r, cKanak)),
        kanak_perempuan: kiraan(sel(r, cKanak >= 0 ? cKanak + 1 : -1)),
        jumlah: Math.round(jumlah),
        _baris: i + kor.offset,
        // Without a category the numbers could be mistaken for deaths
        _abai: kategori ? null : 'Kategori kosong (Kematian / Kecederaan / Hilang?)',
      })
    }
  }

  // ---------- CasualtiesDetail ----------
  const but = bacaJadual(alat, NAMA_HELAIAN_LAMPIRAN.korbanButiran, 'nama mangsa')
  if (but) {
    const c = {
      nama: but.lajur('nama mangsa'),
      alamat: but.lajur('alamat'),
      kategori: but.lajur('kategori'),
      umur: but.lajur('umur'),
      jantina: but.lajur('jantina'),
      bangsa: but.lajur('bangsa'),
      catatan: but.lajur('catatan'),
      sebab: but.lajurMula('sebab kematian'),
    }
    for (let i = but.mula; i < but.rows.length; i++) {
      const r = but.rows[i]
      const nama = teks(sel(r, c.nama))
      if (!nama) continue
      lampiran.korbanButiran.push({
        nama,
        alamat: teksAtauNull(sel(r, c.alamat)),
        kategori: teksAtauNull(sel(r, c.kategori)),
        umur: teksAtauNull(sel(r, c.umur)),
        jantina: teksAtauNull(sel(r, c.jantina)),
        bangsa: teksAtauNull(sel(r, c.bangsa)),
        catatan: teksAtauNull(sel(r, c.catatan)),
        sebab_kematian: teksAtauNull(sel(r, c.sebab)),
        _baris: i + but.offset,
        _abai: null,
      })
    }
  }

  // ---------- Damage_Infrastructure (Govt / Private) ----------
  for (const kunciBahagian of ['kerosakanKerajaan', 'kerosakanSwasta'] as const) {
    const ker = bacaJadual(alat, NAMA_HELAIAN_LAMPIRAN[kunciBahagian], 'daerah')
    if (!ker) continue
    const cDaerah = ker.lajur('daerah')
    const cKategori = ker.lajur('kategori')
    const cRosak = ker.lajur('rosak')
    const cMusnah = ker.lajur('musnah')
    const cHakMilik = ker.lajur('hak milik')
    const cPerincian = ker.lajurMula('perincian kerosakan')
    for (let i = ker.mula; i < ker.rows.length; i++) {
      const r = ker.rows[i]
      const daerah = teksAtauNull(sel(r, cDaerah))
      const kategori = teksAtauNull(sel(r, cKategori))
      if (!daerah && !kategori) continue
      lampiran[kunciBahagian].push({
        daerah,
        kategori,
        rosak: kiraan(sel(r, cRosak)),
        musnah: kiraan(sel(r, cMusnah)),
        hak_milik: teksAtauNull(sel(r, cHakMilik)),
        perincian: teksAtauNull(sel(r, cPerincian)),
        _baris: i + ker.offset,
        _abai: null,
      })
    }
  }

  // ---------- Aqua, Agri, Livestock ----------
  const per = bacaJadual(alat, NAMA_HELAIAN_LAMPIRAN.pertanian, 'daerah')
  if (per) {
    const c = {
      daerah: per.lajur('daerah'),
      alamat: per.lajur('alamat'),
      kategori: per.lajur('kategori'),
      sub: per.lajur('sub kategori'),
      punca: per.lajurMula('punca kerosakan'),
      bil: per.lajurMula('bilangan petani'),
      kawasan: per.lajurMula('anggaran kawasan'),
      jumlah: per.lajurMula('jumlah terjejas'),
      catatan: per.lajur('catatan'),
    }
    for (let i = per.mula; i < per.rows.length; i++) {
      const r = per.rows[i]
      const daerah = teksAtauNull(sel(r, c.daerah))
      const kategori = teksAtauNull(sel(r, c.kategori))
      if (!daerah && !kategori) continue
      lampiran.pertanian.push({
        daerah,
        alamat: teksAtauNull(sel(r, c.alamat)),
        kategori,
        sub_kategori: teksAtauNull(sel(r, c.sub)),
        punca: teksAtauNull(sel(r, c.punca)),
        bil_terlibat: nomborAtauNull(sel(r, c.bil)),
        kawasan_ha: nomborAtauNull(sel(r, c.kawasan)),
        jumlah_terjejas: nomborAtauNull(sel(r, c.jumlah)),
        catatan: teksAtauNull(sel(r, c.catatan)),
        _baris: i + per.offset,
        _abai: null,
      })
    }
  }

  // ---------- ClosedRoad ----------
  const jal = bacaJadual(alat, NAMA_HELAIAN_LAMPIRAN.jalanDitutup, 'daerah')
  if (jal) {
    const c = {
      daerah: jal.lajur('daerah'),
      mukim: jal.lajur('mukim'),
      laluan: jal.lajurMula('nama laluan'),
      lokasi: jal.lajurMula('lokasi penutupan'),
      alternatif: jal.lajur('laluan alternatif'),
      lat: jal.lajur('latitude'),
      lng: jal.lajur('longitude'),
      mula: jal.lajurMula('tarikh masa penutupan bermula'),
      tamat: jal.lajurMula('tarikh masa penutupan berakhir'),
      url: jal.lajur('url'),
      punca: jal.lajurMula('punca penutupan'),
    }
    for (let i = jal.mula; i < jal.rows.length; i++) {
      const r = jal.rows[i]
      const namaLaluan = teksAtauNull(sel(r, c.laluan))
      const lokasi = teksAtauNull(sel(r, c.lokasi))
      if (!namaLaluan && !lokasi) continue
      // Keep coordinates only when they fall inside Malaysia
      let lat = nomborAtauNull(sel(r, c.lat))
      let lng = nomborAtauNull(sel(r, c.lng))
      if (lat === null || lng === null || lat < 0.5 || lat > 7.6 || lng < 99 || lng > 119.5) {
        lat = null
        lng = null
      }
      const mula = keIso(sel(r, c.mula))
      lampiran.jalanDitutup.push({
        daerah: teksAtauNull(sel(r, c.daerah)),
        mukim: teksAtauNull(sel(r, c.mukim)),
        nama_laluan: namaLaluan,
        lokasi,
        laluan_alternatif: teksAtauNull(sel(r, c.alternatif)),
        latitude: lat,
        longitude: lng,
        mula,
        tamat: keIso(sel(r, c.tamat)),
        url: teksAtauNull(sel(r, c.url)),
        punca: teksAtauNull(sel(r, c.punca)),
        _baris: i + jal.offset,
        _abai: lama(mula),
      })
    }
  }

  return lampiran
}

// Sections included by default: those with at least one row that is not set aside
export function pilihanAsal(l: Lampiran): Record<KunciLampiran, boolean> {
  const p = {} as Record<KunciLampiran, boolean>
  for (const k of Object.keys(l) as KunciLampiran[]) p[k] = l[k].some((b) => !b._abai)
  return p
}

// Payload for submit_laporan_bencana(p_lampiran): included sections, kept rows only
export function lampiranUntukHantar(l: Lampiran, pilihan: Record<KunciLampiran, boolean>) {
  const simpan = <T,>(rows: Baris<T>[], ikut: boolean) =>
    ikut
      ? rows
          .filter((b) => !b._abai)
          .map((b) => {
            const salinan = { ...b } as Partial<Baris<T>>
            delete salinan._baris
            delete salinan._abai
            return salinan as T
          })
      : []
  return {
    mobilisasi: simpan(l.mobilisasi, pilihan.mobilisasi),
    korban: simpan(l.korban, pilihan.korban),
    korban_butiran: simpan(l.korbanButiran, pilihan.korbanButiran),
    kerosakan: [
      ...simpan(l.kerosakanKerajaan, pilihan.kerosakanKerajaan).map((x) => ({ ...x, jenis: 'kerajaan' })),
      ...simpan(l.kerosakanSwasta, pilihan.kerosakanSwasta).map((x) => ({ ...x, jenis: 'swasta' })),
    ],
    pertanian: simpan(l.pertanian, pilihan.pertanian),
    jalan_ditutup: simpan(l.jalanDitutup, pilihan.jalanDitutup),
  }
}