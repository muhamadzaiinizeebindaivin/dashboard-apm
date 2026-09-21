import { NEGERI_LIST } from './negeriVisual'

export type JenisLaporan = 'awal' | 'semasa'

export const JENIS_LAPORAN = [
  { value: 'awal', label: 'Laporan Awal' },
  { value: 'semasa', label: 'Laporan Semasa' },
] as const

export type FieldDef = {
  key: string
  no?: string
  label: string
  en?: string
  type?: 'text' | 'textarea' | 'select' | 'datetime'
  options?: string[]
  required?: boolean
  wide?: boolean
}

export type LaporanBencanaRow = {
  id: string
  created_at: string
  jenis_laporan: JenisLaporan
  [key: string]: string | null
}

export const TARIKH_MASA_FIELD: FieldDef = {
  key: 'tarikh_masa',
  label: 'Tarikh/ Masa',
  type: 'datetime',
}

export const KEJADIAN_FIELDS: FieldDef[] = [
  { key: 'jenis_bencana', no: '1.1', label: 'Jenis Bencana', en: 'Type of Disaster', required: true },
  { key: 'level', no: '1.2', label: 'Level', en: 'Level', type: 'select', options: ['1', '2', '3'] },
  { key: 'nama_bencana', no: '1.3', label: 'Nama Bencana', en: 'Disaster Name' },
  { key: 'bidang_kuasa', no: '1.4', label: 'Bidang Kuasa', en: 'Jurisdiction' },
  { key: 'negeri', no: '1.5', label: 'Negeri', en: 'State', type: 'select', options: NEGERI_LIST, required: true },
  { key: 'daerah', no: '1.6', label: 'Daerah/Bahagian', en: 'District' },
  { key: 'mukim', no: '1.7', label: 'Mukim/Daerah', en: 'Subdistrict' },
  { key: 'alamat', no: '1.8', label: 'Alamat', en: 'Address', wide: true },
  { key: 'poskod', no: '1.9', label: 'Poskod', en: 'Post Code' },
  { key: 'radius', no: '1.10', label: 'Radius', en: 'Radius' },
  { key: 'sebab_kejadian', no: '1.11', label: 'Sebab Kejadian', en: 'Cause', wide: true },
  { key: 'kandungan', no: '1.12', label: 'Kandungan', en: 'Content', type: 'textarea', wide: true },
  { key: 'catatan', no: '1.13', label: 'Catatan', en: 'Remark', type: 'textarea', wide: true },
]

export const HAL_LAIN_FIELD: FieldDef = {
  key: 'hal_lain',
  label: 'Hal-hal Lain',
  en: 'aktiviti/perkara selain di atas yang perlukan perhatian',
  type: 'textarea',
  wide: true,
}

export const PENYEDIA_FIELDS: FieldDef[] = [
  { key: 'penyedia_nama', label: 'Nama', required: true },
  { key: 'penyedia_jawatan', label: 'Jawatan' },
  { key: 'penyedia_telefon', label: 'No. Telefon' },
  { key: 'penyedia_masa', label: 'Masa & Tarikh', type: 'datetime' },
]

export const PERHATIAN_FIELDS: FieldDef[] = [
  { key: 'perhatian_nama', label: 'Nama' },
  { key: 'perhatian_jawatan', label: 'Jawatan' },
  { key: 'perhatian_telefon', label: 'No. Telefon' },
  { key: 'perhatian_masa', label: 'Masa & Tarikh', type: 'datetime' },
]