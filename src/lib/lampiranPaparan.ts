import { supabase } from './supabase'
import { pastikan } from './pastikan'
import type { DataLampiran, KunciLampiran } from './bacaLampiranSemasa'

// How each extra Excel sheet is summarised and tabulated. Shared by the
// review step (upload) and the Sekretariat view of a stored report.

export type Nilai = string | number | null
export type DefBahagian<K extends KunciLampiran> = {
  tajuk: string
  peribadi?: boolean // personal data (victims)
  ringkasan: (rows: DataLampiran[K]) => string
  lajur: { label: string; nilai: (r: DataLampiran[K][number]) => Nilai }[]
}

const jumlah = <T,>(rows: T[], f: (r: T) => number | null) => rows.reduce((n, r) => n + (f(r) ?? 0), 0)
const aset = (jenis: string | null, kuantiti: number | null) =>
  jenis ? `${jenis}${kuantiti ? ` × ${kuantiti}` : ''}` : null
const tarikh = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ms-MY') : null)

const LAJUR_KEROSAKAN: DefBahagian<'kerosakanKerajaan'>['lajur'] = [
  { label: 'Daerah', nilai: (r) => r.daerah },
  { label: 'Kategori', nilai: (r) => r.kategori },
  { label: 'Rosak', nilai: (r) => r.rosak },
  { label: 'Musnah', nilai: (r) => r.musnah },
  { label: 'Hak milik', nilai: (r) => r.hak_milik },
  { label: 'Perincian', nilai: (r) => r.perincian },
]
const ringkasanKerosakan = (rows: DataLampiran['kerosakanKerajaan']) =>
  `${rows.length} rekod · ${jumlah(rows, (r) => r.rosak)} rosak · ${jumlah(rows, (r) => r.musnah)} musnah`

export const DEF_LAMPIRAN: { [K in KunciLampiran]: DefBahagian<K> } = {
  mobilisasi: {
    tajuk: 'Mobilisasi Agensi',
    ringkasan: (rows) =>
      `${rows.length} agensi · ${jumlah(rows, (r) => r.kekuatan)} anggota · ${jumlah(
        rows,
        (r) => (r.darat_kuantiti ?? 0) + (r.air_kuantiti ?? 0) + (r.udara_kuantiti ?? 0),
      )} aset`,
    lajur: [
      { label: 'Agensi', nilai: (r) => r.agensi },
      { label: 'Tindakan', nilai: (r) => r.tindakan },
      { label: 'Anggota', nilai: (r) => r.kekuatan },
      { label: 'Darat', nilai: (r) => aset(r.darat_jenis, r.darat_kuantiti) },
      { label: 'Air', nilai: (r) => aset(r.air_jenis, r.air_kuantiti) },
      { label: 'Udara', nilai: (r) => aset(r.udara_jenis, r.udara_kuantiti) },
      { label: 'Mula', nilai: (r) => tarikh(r.tarikh_mula) },
    ],
  },
  korban: {
    tajuk: 'Kematian / Kecederaan / Hilang',
    ringkasan: (rows) => {
      const ikut = new Map<string, number>()
      for (const r of rows) ikut.set(r.kategori ?? '—', (ikut.get(r.kategori ?? '—') ?? 0) + r.jumlah)
      return Array.from(ikut, ([k, n]) => `${k} ${n}`).join(' · ') || '—'
    },
    lajur: [
      { label: 'Daerah', nilai: (r) => r.daerah },
      { label: 'Kategori', nilai: (r) => r.kategori },
      { label: 'Lelaki', nilai: (r) => r.lelaki },
      { label: 'Perempuan', nilai: (r) => r.perempuan },
      { label: 'Jumlah', nilai: (r) => r.jumlah },
    ],
  },
  korbanButiran: {
    tajuk: 'Butiran Mangsa',
    peribadi: true,
    ringkasan: (rows) => `${rows.length} mangsa`,
    lajur: [
      { label: 'Nama', nilai: (r) => r.nama },
      { label: 'Kategori', nilai: (r) => r.kategori },
      { label: 'Umur', nilai: (r) => r.umur },
      { label: 'Jantina', nilai: (r) => r.jantina },
      { label: 'Bangsa', nilai: (r) => r.bangsa },
      { label: 'Sebab kematian', nilai: (r) => r.sebab_kematian },
    ],
  },
  kerosakanKerajaan: { tajuk: 'Kerosakan Infrastruktur (Kerajaan)', ringkasan: ringkasanKerosakan, lajur: LAJUR_KEROSAKAN },
  kerosakanSwasta: { tajuk: 'Kerosakan Infrastruktur (Swasta)', ringkasan: ringkasanKerosakan, lajur: LAJUR_KEROSAKAN },
  pertanian: {
    tajuk: 'Pertanian, Penternakan & Perikanan',
    ringkasan: (rows) =>
      `${rows.length} rekod · ${jumlah(rows, (r) => r.bil_terlibat)} petani/penternak · ${jumlah(
        rows,
        (r) => r.kawasan_ha,
      )} ha`,
    lajur: [
      { label: 'Daerah', nilai: (r) => r.daerah },
      { label: 'Kategori', nilai: (r) => r.kategori },
      { label: 'Sub-kategori', nilai: (r) => r.sub_kategori },
      { label: 'Petani', nilai: (r) => r.bil_terlibat },
      { label: 'Kawasan (ha)', nilai: (r) => r.kawasan_ha },
      { label: 'Terjejas', nilai: (r) => r.jumlah_terjejas },
    ],
  },
  jalanDitutup: {
    tajuk: 'Jalan Ditutup',
    ringkasan: (rows) =>
      `${rows.length} jalan · ${rows.filter((r) => r.latitude !== null).length} dengan koordinat (dipapar di peta)`,
    lajur: [
      { label: 'Daerah', nilai: (r) => r.daerah },
      { label: 'Laluan', nilai: (r) => r.nama_laluan },
      { label: 'Lokasi', nilai: (r) => r.lokasi },
      { label: 'Alternatif', nilai: (r) => r.laluan_alternatif },
      { label: 'Koordinat', nilai: (r) => (r.latitude !== null ? `${r.latitude}, ${r.longitude}` : null) },
      { label: 'Mula', nilai: (r) => tarikh(r.mula) },
      { label: 'Punca', nilai: (r) => r.punca },
    ],
  },
}

export const SUSUNAN_LAMPIRAN: KunciLampiran[] = [
  'mobilisasi',
  'korban',
  'korbanButiran',
  'kerosakanKerajaan',
  'kerosakanSwasta',
  'pertanian',
  'jalanDitutup',
]

// The sheets stored with one report (staff only, enforced by RLS)
export async function ambilLampiranLaporan(laporanId: string): Promise<DataLampiran> {
  const dari = (jadual: string) => supabase.from(jadual).select('*').eq('laporan_id', laporanId).order('id')
  const [mob, kor, but, ker, per, jal] = await Promise.all([
    dari('laporan_mobilisasi'),
    dari('laporan_korban'),
    dari('laporan_korban_butiran'),
    dari('laporan_kerosakan'),
    dari('laporan_pertanian'),
    dari('laporan_jalan_ditutup'),
  ])
  // A missing sheet would read as "no casualties": fail instead
  for (const r of [mob, kor, but, ker, per, jal]) pastikan(r)
  const kerosakan = (ker.data ?? []) as (DataLampiran['kerosakanKerajaan'][number] & { jenis: string })[]
  return {
    mobilisasi: (mob.data ?? []) as DataLampiran['mobilisasi'],
    korban: (kor.data ?? []) as DataLampiran['korban'],
    korbanButiran: (but.data ?? []) as DataLampiran['korbanButiran'],
    kerosakanKerajaan: kerosakan.filter((k) => k.jenis === 'kerajaan'),
    kerosakanSwasta: kerosakan.filter((k) => k.jenis === 'swasta'),
    pertanian: (per.data ?? []) as DataLampiran['pertanian'],
    jalanDitutup: (jal.data ?? []) as DataLampiran['jalanDitutup'],
  }
}