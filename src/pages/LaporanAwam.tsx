import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  MapPinned,
  FileText,
  Upload,
  AlertTriangle,
  Trash2,
  PenLine,
  Sparkles,
  Megaphone,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ambilKod, padamKod } from '../lib/accessCode'
import apmLogo from '../assets/apm-logo.png'
import {
  JENIS_LAPORAN,
  TARIKH_MASA_FIELD,
  KEJADIAN_FIELDS,
  HAL_LAIN_FIELD,
  PENYEDIA_FIELDS,
  PERHATIAN_FIELDS,
  SEMASA_MAKLUMAT_FIELDS,
  SEMASA_PENYEDIA_FIELDS,
  SEMASA_PERHATIAN_FIELDS,
  RINGKASAN_STATUS,
  cariZon,
} from '../lib/laporanBencana'
import type { FieldDef } from '../lib/laporanBencana'
import { SenaraiPpsInput } from '../components/SenaraiPpsInput'
import { PilihLokasiModal } from '../components/PilihLokasiModal'
import { bacaLaporanAwal } from '../lib/bacaLaporanAwal'
import { bacaLaporanSemasa } from '../lib/bacaLaporanSemasa'
import type { PpsExcel } from '../lib/bacaLaporanSemasa'
import { lampiranUntukHantar, pilihanAsal } from '../lib/bacaLampiranSemasa'
import type { KunciLampiran, Lampiran } from '../lib/bacaLampiranSemasa'
import { SemakLampiran } from '../components/SemakLampiran'
import { StatusNamaBencana } from '../components/StatusNamaBencana'
import { ConfirmModal } from '../components/ConfirmModal'
import { hurufBesar, kemasNamaTempat, kunci, normalNamaBencana } from '../lib/normalisasi'
import { keNilaiTempatan } from '../lib/tarikhBebas'
import { NEGERI_LIST } from '../lib/negeriVisual'
import { semakPps } from '../lib/ppsPusat'
import { useJenisBencana } from '../lib/jenisBencana'
import type { PpsInput } from '../lib/ppsPusat'
import { useKawasan, parlimenNegeri, dunNegeri } from '../lib/kawasanPilihanRaya'

type JenisPilihan = '' | 'insiden' | 'awal' | 'semasa'

// Laporan Insiden comes first: an event that may (or may not) become a disaster, assessed by PKOP
const JENIS_PILIHAN = [{ value: 'insiden', label: 'Laporan Insiden' }, ...JENIS_LAPORAN] as const

// Laporan Insiden: form only (no file), printed later on the "Makluman Awal Insiden" poster
const INSIDEN_MASA_FIELD: FieldDef = { key: 'tarikh_masa', label: 'Tarikh & Masa Berlaku', type: 'datetime', required: true }
const INSIDEN_RINGKASAN_FIELD: FieldDef = {
  key: 'ringkasan',
  label: 'Ringkasan Insiden',
  type: 'textarea',
  wide: true,
  required: true,
  hint: 'Contoh: BANJIR DI BEBERAPA KAWASAN AKIBAT HUJAN LEBAT',
}
const INSIDEN_LOKASI_FIELDS: FieldDef[] = [
  { key: 'tempat', label: 'Lokasi (Tempat)', wide: true, required: true, hint: 'Contoh: PULAU PANGKOR' },
  { key: 'daerah', label: 'Daerah', required: true },
  { key: 'negeri', label: 'Negeri', type: 'select', options: NEGERI_LIST, required: true },
]
const INSIDEN_SUMBER_FIELD: FieldDef = {
  key: 'sumber_laporan',
  label: 'Sumber Laporan',
  wide: true,
  required: true,
  hint: 'Contoh: PKOD MANJUNG, orang awam, Balai Bomba',
}
const INSIDEN_FIELD: FieldDef[] = [INSIDEN_MASA_FIELD, INSIDEN_RINGKASAN_FIELD, ...INSIDEN_LOKASI_FIELDS, INSIDEN_SUMBER_FIELD]

// Laporan Awal: the date and the disaster name are often missed, so both are required here
// (only for Laporan Awal: the shared field definitions stay unchanged for Laporan Semasa)
const AWAL_TARIKH_FIELD: FieldDef = { ...TARIKH_MASA_FIELD, required: true }
const AWAL_KEJADIAN_FIELDS: FieldDef[] = KEJADIAN_FIELDS.map((f) =>
  f.key === 'nama_bencana'
    ? {
        ...f,
        required: true,
        hint:
          'Format: (Jenis Bencana) (Lokaliti) (Bulan) (Tahun) — contoh: BANJIR DUNGUN OKTOBER 2026.\n' +
          'Nama bencana ini perlu sama dengan nama dalam Laporan Semasa yang akan dihantar.',
      }
    : f,
)

// "Telah Diberi Perhatian": required for every Laporan Awal (Nama + Masa & Tarikh)
const AWAL_PERHATIAN_FIELDS: FieldDef[] = PERHATIAN_FIELDS.map((f) =>
  f.key === 'perhatian_nama' || f.key === 'perhatian_masa' ? { ...f, required: true } : f,
)

const AWAL_FIELD: FieldDef[] = [
  AWAL_TARIKH_FIELD,
  ...AWAL_KEJADIAN_FIELDS,
  HAL_LAIN_FIELD,
  ...PENYEDIA_FIELDS,
  ...AWAL_PERHATIAN_FIELDS,
]

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

// Suggested Nama Bencana: (Jenis Bencana) (Lokaliti) (Bulan) (Tahun), e.g. "BANJIR DUNGUN OKTOBER 2026".
// Lokaliti = district, or the state when no district is given. Empty until enough is filled in.
function binaNamaBencana(n: Record<string, string>) {
  const jenis = (n.jenis_bencana ?? '').trim()
  const lokaliti = (n.daerah || n.negeri || '').trim()
  const masa = n.tarikh_masa ? new Date(n.tarikh_masa) : null
  if (!jenis || !lokaliti || !masa || Number.isNaN(masa.getTime())) return ''
  return normalNamaBencana(`${jenis} ${lokaliti} ${BULAN[masa.getMonth()]} ${masa.getFullYear()}`)
}

// Free-text summary written by the state ("Ringkasan Laporan" in the Excel)
const RINGKASAN_TEKS_FIELD: FieldDef = { key: 'kandungan', label: 'Ringkasan Laporan', type: 'textarea', wide: true }

const SEMASA_FIELD: FieldDef[] = [
  ...SEMASA_MAKLUMAT_FIELDS,
  TARIKH_MASA_FIELD,
  RINGKASAN_TEKS_FIELD,
  HAL_LAIN_FIELD,
  ...SEMASA_PENYEDIA_FIELDS,
  ...SEMASA_PERHATIAN_FIELDS,
]

// Accepted file per report type
const FAIL_LAPORAN = {
  awal: {
    tajuk: 'Muat Naik Laporan Awal',
    nama: 'Laporan Awal NDCC',
    jenisFail: 'Fail Word (.docx) sahaja · maksimum 5 MB',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  semasa: {
    tajuk: 'Muat Naik Laporan Semasa',
    nama: 'Laporan Situasi Bencana NDCC',
    jenisFail: 'Fail Excel (.xlsx) sahaja · maksimum 10 MB',
    accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
} as const

const SENARAI_NAMA_ID = 'senarai-nama-bencana'

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

// PPS read from the Excel, grouped by district (one RPC group per district)
type KumpulanPps = { kunci: string; daerah: string; rows: PpsInput[] }
// Excel details kept per PPS row (by PpsInput.kunci), sent with the counts
type MetaPps = Pick<
  PpsExcel,
  | 'mukim'
  | 'dibukaPada'
  | 'ditutup'
  | 'tutupPada'
  | 'pengurusNama'
  | 'pengurusJawatan'
  | 'pengurusTelefon'
  | 'mangsa'
  | 'dewasaLelaki'
  | 'dewasaPerempuan'
  | 'kanakLelaki'
  | 'kanakPerempuan'
>

type MedanProps = {
  def: FieldDef
  value: string
  onChange: (v: string) => void
  amaran?: string
  tambahan?: ReactNode // extra content under the field (e.g. the name suggestion)
}

function Medan({ def, value, onChange, amaran, tambahan }: MedanProps) {
  return (
    <div className={def.wide ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        {def.no && <span className="mr-1 text-neutral-400">{def.no}</span>}
        {def.label}
        {def.en && <span className="ml-1 text-xs font-normal text-neutral-400">({def.en})</span>}
        {def.required && <span className="text-red-500"> *</span>}
      </label>

      {def.type === 'textarea' ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      ) : def.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">— Pilih —</option>
          {def.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={def.type === 'datetime' ? 'datetime-local' : def.type === 'number' ? 'number' : 'text'}
          // Nama Bencana: suggest existing disasters so reporters reuse the same name
          list={def.key === 'nama_bencana' ? SENARAI_NAMA_ID : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
      {def.hint && <p className="mt-1 whitespace-pre-line text-xs text-neutral-500">{def.hint}</p>}
      {tambahan}
      {amaran && (
        <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {amaran}
        </p>
      )}
    </div>
  )
}

function Bahagian({ tajuk, anak, children }: { tajuk: string; anak?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{tajuk}</h2>
        {anak}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

type ZonMuatNaikProps = {
  jenis: 'awal' | 'semasa'
  membaca: boolean
  ralat: string
  onPilih: (fail: File) => void
}

// Step 1 of both report types: drop or choose the NDCC file
function ZonMuatNaik({ jenis, membaca, ralat, onPilih }: ZonMuatNaikProps) {
  const f = FAIL_LAPORAN[jenis]
  return (
    <Bahagian tajuk={f.tajuk}>
      <div className="space-y-3 sm:col-span-2">
        <p className="text-sm text-neutral-600">
          Muat naik fail <span className="font-medium">{f.nama}</span> yang telah diisi. Maklumat dalam fail akan dibaca
          secara automatik untuk anda semak sebelum dihantar.
        </p>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const fail = e.dataTransfer.files[0]
            if (fail && !membaca) onPilih(fail)
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 px-6 py-10 text-center transition-colors hover:bg-emerald-50 ${
            membaca ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {membaca ? (
            <Loader2 size={28} className="animate-spin text-emerald-700" />
          ) : (
            <Upload size={28} className="text-emerald-700" />
          )}
          <span className="text-sm font-medium text-neutral-800">
            {membaca ? 'Membaca fail...' : 'Klik untuk pilih fail, atau seret fail ke sini'}
          </span>
          <span className="text-xs text-neutral-500">{f.jenisFail}</span>
          <input
            type="file"
            accept={f.accept}
            className="hidden"
            onChange={(e) => {
              const fail = e.target.files?.[0]
              if (fail) onPilih(fail)
              e.target.value = ''
            }}
          />
        </label>
        {ralat && <p className="text-sm text-red-600">{ralat}</p>}
      </div>
    </Bahagian>
  )
}

type CaraAwal = '' | 'borang' | 'fail'

// Laporan Awal step 1: fill the form directly, or upload the NDCC Word file
function PilihCara({ onPilih }: { onPilih: (c: 'borang' | 'fail') => void }) {
  const kelasKad =
    'flex flex-col items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-4 py-6 text-center shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50/60'
  return (
    <Bahagian tajuk="Cara Mengisi Laporan Awal">
      <button type="button" onClick={() => onPilih('borang')} className={kelasKad}>
        <PenLine size={26} className="text-emerald-700" />
        <span className="text-sm font-semibold text-neutral-800">Isi Borang</span>
        <span className="text-xs text-neutral-500">Isi maklumat terus di sini. Tiada fail Word diperlukan.</span>
      </button>
      <button type="button" onClick={() => onPilih('fail')} className={kelasKad}>
        <Upload size={26} className="text-emerald-700" />
        <span className="text-sm font-semibold text-neutral-800">Muat Naik Fail</span>
        <span className="text-xs text-neutral-500">Muat naik Laporan Awal NDCC (.docx) yang telah diisi.</span>
      </button>
    </Bahagian>
  )
}

// Laporan Awal in form mode: reminder + way to switch to the upload
function BannerBorang({ onTukar }: { onTukar: () => void }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
      <p className="flex items-center gap-2 font-semibold">
        <PenLine size={16} className="shrink-0" />
        Isi borang Laporan Awal
      </p>
      <p className="mt-1 text-emerald-800">
        Ruangan bertanda <span className="text-red-500">*</span> wajib diisi. Pastikan Tarikh/Masa dan Nama Bencana
        betul sebelum menghantar.
      </p>
      <button
        type="button"
        onClick={onTukar}
        className="mt-2 text-xs font-medium text-emerald-900 underline underline-offset-2"
      >
        Ada fail .docx? Muat naik fail
      </button>
    </div>
  )
}

type BannerSemakProps = { fail: File; bilAmaran: number; nota: string[]; onTukar: () => void }

// Step 2 of both report types: reminder to check what was read
function BannerSemak({ fail, bilAmaran, nota, onTukar }: BannerSemakProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} className="shrink-0" />
        Sila periksa maklumat sebelum menghantar
      </p>
      <p className="mt-1 text-amber-800">
        Maklumat di bawah telah dibaca secara automatik daripada fail. Semak setiap ruangan dan betulkan jika ada
        kesilapan.
      </p>
      {(bilAmaran > 0 || nota.length > 0) && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-amber-800">
          {bilAmaran > 0 && <li>{bilAmaran} ruangan bertanda amaran perlu diperiksa.</li>}
          {nota.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 font-medium text-neutral-700 ring-1 ring-amber-200">
          <FileText size={13} className="shrink-0" />
          <span className="truncate">{fail.name}</span>
        </span>
        <button type="button" onClick={onTukar} className="font-medium text-amber-900 underline underline-offset-2">
          Tukar fail
        </button>
      </div>
    </div>
  )
}

type Berjaya = { jenis: string; nama: string; masa: Date }

type KejayaanHantarProps = { berjaya: Berjaya; onLagi: () => void; onKeluar: () => void }

// Shown in place of the form after a successful submit, until the user
// chooses what to do next (no auto-dismiss).
function KejayaanHantar({ berjaya, onLagi, onKeluar }: KejayaanHantarProps) {
  const labelJenis = JENIS_PILIHAN.find((j) => j.value === berjaya.jenis)?.label ?? 'Laporan'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      role="status"
      aria-live="polite"
      className="flex flex-col items-center py-6 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
        <CheckCircle2 size={28} />
      </span>

      <h2 className="mt-5 text-lg font-semibold text-neutral-900">Laporan berjaya dihantar</h2>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Terima kasih. Laporan anda telah diterima dan boleh dilihat oleh Sekretariat.
      </p>

      <dl className="mt-5 w-full max-w-sm divide-y divide-neutral-900/5 rounded-xl border border-white/70 bg-white/60 text-left text-sm">
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-neutral-500">Jenis laporan</dt>
          <dd className="font-medium text-neutral-800">{labelJenis}</dd>
        </div>
        {berjaya.nama && (
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-neutral-500">{berjaya.jenis === 'insiden' ? 'Insiden' : 'Nama bencana'}</dt>
            <dd className="text-right font-medium text-neutral-800">{berjaya.nama}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-neutral-500">Masa dihantar</dt>
          <dd className="font-medium text-neutral-800">
            {berjaya.masa.toLocaleString('ms-MY', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onLagi}
          className="flex-1 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Hantar laporan lain
        </button>
        <button
          type="button"
          onClick={onKeluar}
          className="flex-1 rounded-lg border border-neutral-200 bg-white/70 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-white"
        >
          Keluar
        </button>
      </div>
    </motion.div>
  )
}

// `dalaman`: opened from inside the dashboard by logged-in staff (no access code)
export function LaporanAwam({ dalaman = false }: { dalaman?: boolean } = {}) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const jenisAwal = params.get('jenis')
  const [jenis, setJenis] = useState<JenisPilihan>(() => {
    if (jenisAwal === 'awal' || jenisAwal === 'semasa') return jenisAwal
    return ''
  })
  const [nilai, setNilai] = useState<Record<string, string>>({})
  const [ringkasan, setRingkasan] = useState<string>('')
  const [menghantar, setMenghantar] = useState(false)
  const [berjaya, setBerjaya] = useState<Berjaya | null>(null)
  const [ralat, setRalat] = useState('')
  const [lokasiBencana, setLokasiBencana] = useState<[number, number] | null>(null)
  const [petaBuka, setPetaBuka] = useState(false)
  // Uploaded NDCC file (Word for Awal, Excel for Semasa) + what to check
  const [fail, setFail] = useState<File | null>(null)
  const [amaran, setAmaran] = useState<Record<string, string>>({})
  const [membacaFail, setMembacaFail] = useState(false)
  const [ralatFail, setRalatFail] = useState('')
  // Laporan Semasa: PPS read from the Excel
  const [kumpulanPps, setKumpulanPps] = useState<KumpulanPps[]>([])
  const [metaPps, setMetaPps] = useState<Record<string, MetaPps>>({})
  // Laporan Semasa: other Excel sheets + which ones to include
  const [lampiran, setLampiran] = useState<Lampiran | null>(null)
  const [pilihanLampiran, setPilihanLampiran] = useState<Record<KunciLampiran, boolean> | null>(null)
  const [cadanganNama, setCadanganNama] = useState<string[]>([])
  // Laporan Awal: fill the form directly or upload the Word file
  const [cara, setCara] = useState<CaraAwal>('')
  // Laporan Semasa: does the name match a Laporan Awal? (null = unknown, never blocks)
  const [adaLaporanAwal, setAdaLaporanAwal] = useState<boolean | null>(null)
  const [sahkanTanpaAwal, setSahkanTanpaAwal] = useState(false)
  // Jenis Bencana choices = the categories of the Bencana map (Urus Kategori)
  const senaraiJenis = useJenisBencana().map((j) => j.label)

  // Existing disaster names (last 90 days) for the Nama Bencana suggestions
  useEffect(() => {
    let batal = false
    supabase.rpc('senarai_nama_bencana', { p_code: ambilKod('laporan') }).then(({ data }) => {
      if (!batal && data) setCadanganNama((data as { nama_bencana: string }[]).map((d) => d.nama_bencana))
    })
    return () => {
      batal = true
    }
  }, [])

  // The form is shown once a file has been read, or straight away for Laporan Awal in form mode
  const adaBorang = jenis === 'insiden' || !!fail || (jenis === 'awal' && cara === 'borang')

  function ubahNilai(key: string, v: string) {
    setNilai((prev) => ({ ...prev, [key]: v }))
    // Once the operator edits a field, its "please check" hint has served its purpose
    setAmaran((a) => {
      if (!(key in a)) return a
      const baru = { ...a }
      delete baru[key]
      return baru
    })
  }

  // Laporan Awal, 1.3: one-click name in the official format
  function cadanganNamaAwal() {
    const cadangan = binaNamaBencana(nilai)
    if (!cadangan || kunci(cadangan) === kunci(nilai.nama_bencana ?? '')) return null
    return (
      <button
        type="button"
        onClick={() => ubahNilai('nama_bencana', cadangan)}
        className="mt-1.5 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
      >
        <Sparkles size={13} className="shrink-0" />
        Guna cadangan: {cadangan}
      </button>
    )
  }

  function renderMedan(medan: FieldDef) {
    const def = medan.key === 'jenis_bencana' ? { ...medan, options: senaraiJenis } : medan
    return (
      <Medan
        key={def.key}
        def={def}
        value={nilai[def.key] ?? ''}
        onChange={(v) => ubahNilai(def.key, v)}
        amaran={fail ? amaranUntuk(def) : undefined}
        tambahan={jenis === 'awal' && def.key === 'nama_bencana' ? cadanganNamaAwal() : undefined}
      />
    )
  }

  function kosongkanFail() {
    setFail(null)
    setNilai({})
    setAmaran({})
    setRalatFail('')
    setRingkasan('')
    setKumpulanPps([])
    setMetaPps({})
    setLampiran(null)
    setPilihanLampiran(null)
  }

  function pilihJenis(v: JenisPilihan) {
    setJenis(v)
    setRalat('')
    setLokasiBencana(null)
    setCara('')
    setAdaLaporanAwal(null)
    kosongkanFail()
    // Laporan Insiden: Tarikh & Masa Berlaku starts at "now" (still editable)
    if (v === 'insiden') setNilai({ tarikh_masa: keNilaiTempatan(new Date()) })
  }

  // Laporan Awal: switch between the form and the upload
  function pilihCara(c: 'borang' | 'fail') {
    setCara(c)
    setRalat('')
    setRalatFail('')
    // Form mode: Tarikh/Masa starts at "now" so it's never left empty (still editable)
    if (c === 'borang') setNilai((prev) => ({ ...prev, tarikh_masa: prev.tarikh_masa || keNilaiTempatan(new Date()) }))
  }

  // Hint for a field: a reading note, or "not found" for an empty required field
  function amaranUntuk(def: FieldDef) {
    if (amaran[def.key]) return amaran[def.key]
    if (def.required && !nilai[def.key]?.trim()) return 'Tidak dijumpai dalam fail. Sila isi.'
    return undefined
  }

  async function muatNaikFail(f: File) {
    setRalatFail('')
    setMembacaFail(true)

    if (jenis === 'awal') {
      const hasil = await bacaLaporanAwal(f, senaraiJenis)
      setMembacaFail(false)
      if ('ralat' in hasil) {
        setRalatFail(hasil.ralat)
        return
      }
      setFail(f)
      setNilai(hasil.nilai)
      setAmaran(hasil.amaran)
      return
    }

    const hasil = await bacaLaporanSemasa(f, senaraiJenis)
    setMembacaFail(false)
    if ('ralat' in hasil) {
      setRalatFail(hasil.ralat)
      return
    }

    // Group the PPS by district ("KUALA NERUS" and "Kuala Nerus" together)
    const ikutDaerah = new Map<string, KumpulanPps>()
    const meta: Record<string, MetaPps> = {}
    for (const p of hasil.pps) {
      const k = kunci(p.daerah)
      if (!ikutDaerah.has(k)) ikutDaerah.set(k, { kunci: crypto.randomUUID(), daerah: p.daerah, rows: [] })
      const id = crypto.randomUUID()
      ikutDaerah.get(k)!.rows.push({
        kunci: id,
        nama: p.nama,
        mangsa: String(p.mangsa),
        keluarga: String(p.keluarga),
        latitude: null,
        longitude: null,
        sedia: false,
      })
      meta[id] = {
        mukim: p.mukim,
        dibukaPada: p.dibukaPada,
        ditutup: p.ditutup,
        tutupPada: p.tutupPada,
        pengurusNama: p.pengurusNama,
        pengurusJawatan: p.pengurusJawatan,
        pengurusTelefon: p.pengurusTelefon,
        mangsa: p.mangsa,
        dewasaLelaki: p.dewasaLelaki,
        dewasaPerempuan: p.dewasaPerempuan,
        kanakLelaki: p.kanakLelaki,
        kanakPerempuan: p.kanakPerempuan,
      }
    }

    // PPS already known for this disaster keep their location: only new ones need one
    const kumpulan = [...ikutDaerah.values()]
    const senaraiRata = kumpulan.flatMap((g) => g.rows.map((r) => ({ g, r })))
    if (senaraiRata.length > 0 && hasil.nilai.nama_bencana && hasil.nilai.negeri) {
      const { data: lokasiSedia } = await supabase.rpc('lokasi_pps_sedia', {
        p_code: ambilKod('laporan'),
        p_nama_bencana: hasil.nilai.nama_bencana,
        p_negeri: hasil.nilai.negeri,
        p_pps: senaraiRata.map(({ g, r }) => ({ daerah: g.daerah, nama: r.nama })),
      })
      for (const x of (lokasiSedia as { i: number; latitude: number; longitude: number }[]) ?? []) {
        const sasaran = senaraiRata[x.i]
        if (sasaran) {
          sasaran.r.latitude = x.latitude
          sasaran.r.longitude = x.longitude
        }
      }

      // Same for the constituency: only new PPS ask for a Parlimen / ADUN
      const { data: kawasanSedia } = await supabase.rpc('kawasan_pps_sedia', {
        p_code: ambilKod('laporan'),
        p_nama_bencana: hasil.nilai.nama_bencana,
        p_negeri: hasil.nilai.negeri,
        p_pps: senaraiRata.map(({ g, r }) => ({ daerah: g.daerah, nama: r.nama })),
      })
      for (const x of (kawasanSedia as { i: number; parlimen: string; dun: string | null }[]) ?? []) {
        const sasaran = senaraiRata[x.i]
        if (sasaran) {
          sasaran.r.parlimen = x.parlimen
          sasaran.r.dun = x.dun
          sasaran.r.kawasanSedia = true
        }
      }
    }

    setFail(f)
    setNilai(hasil.nilai)
    setAmaran(hasil.amaran)
    setRingkasan(hasil.ringkasan)
    setKumpulanPps(kumpulan)
    setMetaPps(meta)
    setLampiran(hasil.lampiran)
    setPilihanLampiran(pilihanAsal(hasil.lampiran))
  }

  function ubahKumpulan(k: string, ubah: Partial<KumpulanPps>) {
    setKumpulanPps((prev) => prev.map((g) => (g.kunci === k ? { ...g, ...ubah } : g)))
  }

  const medanSemak = jenis === 'awal' ? AWAL_FIELD : SEMASA_FIELD
  const bilAmaran = fail ? medanSemak.filter((f) => amaranUntuk(f)).length : 0
  const bilPps = kumpulanPps.reduce((n, g) => n + g.rows.length, 0)
  // PPS that still need a location before sending (PPS marked "Tutup" in the file are exempt)
  const perluLokasi = (r: PpsInput) => (r.latitude == null || r.longitude == null) && !metaPps[r.kunci]?.ditutup
  const ppsTanpaLokasi = kumpulanPps.flatMap((g) => g.rows.filter(perluLokasi))
  const bilTanpaLokasi = ppsTanpaLokasi.length
  // Parlimen + ADUN are required for every new PPS (same exemption as the location: PPS marked "Tutup").
  // Only enforced once the official list has loaded, so a network hiccup never blocks a report.
  const kawasan = useKawasan()
  const adaSenaraiKawasan = !!nilai.negeri && parlimenNegeri(kawasan, nilai.negeri).length > 0
  const perluKawasan = (r: PpsInput) => {
    if (!adaSenaraiKawasan || r.kawasanSedia || metaPps[r.kunci]?.ditutup) return false
    if (!r.parlimen) return true
    // KL, Putrajaya and Labuan have no ADUN
    return !r.dun && dunNegeri(kawasan, nilai.negeri!, r.parlimen).length > 0
  }
  const ppsTanpaKawasan = kumpulanPps.flatMap((g) => g.rows.filter(perluKawasan))
  const bilTanpaKawasan = ppsTanpaKawasan.length

  // Laporan Insiden: its own table and RPC, assessed later by PKOP
  async function hantarInsiden() {
    const tiadaIsi = INSIDEN_FIELD.find((f) => f.required && !nilai[f.key]?.trim())
    if (tiadaIsi) {
      setRalat(`Sila isi ruangan "${tiadaIsi.label}".`)
      return
    }
    const masa = new Date(nilai.tarikh_masa)
    if (Number.isNaN(masa.getTime())) {
      setRalat('Tarikh & Masa Berlaku tidak sah.')
      return
    }

    setMenghantar(true)
    const { error } = await supabase.rpc('submit_laporan_insiden', {
      p_code: ambilKod('laporan'),
      p_data: {
        tarikh_masa: masa.toISOString(),
        // Printed in capitals on the poster: stored the same way
        ringkasan: normalNamaBencana(nilai.ringkasan),
        tempat: normalNamaBencana(nilai.tempat),
        daerah: kemasNamaTempat(nilai.daerah),
        negeri: nilai.negeri,
        sumber_laporan: normalNamaBencana(nilai.sumber_laporan),
      },
    })
    setMenghantar(false)

    if (error?.code === '42501') {
      if (dalaman) {
        setRalat('Anda tiada kebenaran untuk menghantar laporan.')
        return
      }
      padamKod('laporan')
      window.location.reload()
      return
    }
    if (error) {
      setRalat('Gagal menghantar laporan. Sila cuba lagi.')
      return
    }

    setBerjaya({ jenis: 'insiden', nama: normalNamaBencana(nilai.ringkasan), masa: new Date() })
    pilihJenis('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // `abaikanNama`: the operator confirmed sending a Laporan Semasa with no matching Laporan Awal
  async function handleHantar(abaikanNama = false) {
    setRalat('')

    if (!jenis) {
      setRalat('Sila pilih jenis laporan.')
      return
    }
    if (!adaBorang) {
      setRalat(jenis === 'awal' ? 'Sila isi borang atau muat naik fail laporan.' : 'Sila muat naik fail laporan.')
      return
    }

    if (jenis === 'insiden') {
      await hantarInsiden()
      return
    }

    const rekod: Record<string, string | null> = { jenis_laporan: jenis }
    let pps: Record<string, unknown>[] = []

    if (jenis === 'awal') {
      const tiadaIsi = AWAL_FIELD.find((f) => f.required && !nilai[f.key]?.trim())
      if (tiadaIsi) {
        setRalat(`Sila isi ruangan "${tiadaIsi.label}".`)
        return
      }
      if (!lokasiBencana) {
        setRalat('Sila pilih lokasi bencana di peta.')
        return
      }
      for (const f of AWAL_FIELD) {
        const v = (nilai[f.key] ?? '').trim()
        rekod[f.key] = !v ? null : f.type === 'datetime' ? new Date(v).toISOString() : v
      }
      rekod.latitude = String(lokasiBencana[0])
      rekod.longitude = String(lokasiBencana[1])
    } else {
      const tiadaIsi = SEMASA_FIELD.find((f) => f.required && !nilai[f.key]?.trim())
      if (tiadaIsi) {
        setRalat(`Sila isi ruangan "${tiadaIsi.label}".`)
        return
      }
      if (!ringkasan) {
        setRalat('Sila pilih status Ringkasan Laporan.')
        return
      }

      if (ringkasan === 'ada_perubahan') {
        const kumpulan = kumpulanPps.filter((g) => g.rows.length > 0)
        if (kumpulan.length === 0) {
          setRalat('Tiada PPS untuk dihantar. Pilih "Tiada Perubahan" atau tambah PPS.')
          return
        }
        for (const g of kumpulan) {
          if (!g.daerah.trim()) {
            setRalat('Sila isi Daerah bagi setiap kumpulan PPS.')
            return
          }
          const ralatPps = semakPps(g.rows)
          if (ralatPps) {
            setRalat(`${g.daerah}: ${ralatPps}`)
            return
          }
        }
        // Every open PPS must be on the Peta Bencana
        if (bilTanpaLokasi > 0) {
          const nama = ppsTanpaLokasi.slice(0, 3).map((r) => r.nama.trim() || 'PPS tanpa nama')
          setRalat(
            `Sila tetapkan lokasi bagi ${bilTanpaLokasi} PPS sebelum menghantar: ${nama.join(', ')}` +
              (bilTanpaLokasi > 3 ? ` dan ${bilTanpaLokasi - 3} lagi.` : '.'),
          )
          return
        }
        // Every new PPS must have its Parlimen and ADUN (reports per YB constituency)
        if (bilTanpaKawasan > 0) {
          const nama = ppsTanpaKawasan.slice(0, 3).map((r) => r.nama.trim() || 'PPS tanpa nama')
          setRalat(
            `Sila pilih Parlimen dan ADUN bagi ${bilTanpaKawasan} PPS sebelum menghantar: ${nama.join(', ')}` +
              (bilTanpaKawasan > 3 ? ` dan ${bilTanpaKawasan - 3} lagi.` : '.'),
          )
          return
        }

        pps = kumpulan.map((g) => {
          const items = g.rows.map((r) => {
            const m = metaPps[r.kunci]
            // Sex/age breakdown only while the victim count is still the one read from the Excel
            const pecahanSah = !!m && Number(r.mangsa) === m.mangsa
            return {
              nama: hurufBesar(r.nama),
              jumlah_mangsa: Number(r.mangsa),
              jumlah_keluarga: Number(r.keluarga),
              latitude: r.latitude,
              longitude: r.longitude,
              // Constituency chosen for a new PPS (already-known PPS keep theirs on the server)
              parlimen: r.kawasanSedia ? null : (r.parlimen ?? null),
              dun: r.kawasanSedia ? null : (r.dun ?? null),
              // Excel details (absent for PPS added by hand here)
              mukim: m?.mukim ? hurufBesar(m.mukim) : null,
              pengurus_nama: m?.pengurusNama ? hurufBesar(m.pengurusNama) : null,
              pengurus_jawatan: m?.pengurusJawatan ? hurufBesar(m.pengurusJawatan) : null,
              pengurus_telefon: m?.pengurusTelefon || null,
              dibuka_pada: m?.dibukaPada ?? null,
              ditutup: m?.ditutup ?? false,
              tutup_pada: m?.tutupPada ?? null,
              dewasa_lelaki: pecahanSah ? m.dewasaLelaki : null,
              dewasa_perempuan: pecahanSah ? m.dewasaPerempuan : null,
              kanak_lelaki: pecahanSah ? m.kanakLelaki : null,
              kanak_perempuan: pecahanSah ? m.kanakPerempuan : null,
            }
          })
          return {
            negeri: nilai.negeri,
            daerah: kemasNamaTempat(g.daerah),
            zon: cariZon(nilai.negeri),
            // Legacy group fields, still read by older views
            pps: items.map((i) => i.nama).join('\n'),
            jumlah_mangsa: items.reduce((n, i) => n + i.jumlah_mangsa, 0),
            jumlah_keluarga: items.reduce((n, i) => n + i.jumlah_keluarga, 0),
            items,
          }
        })
      }

      rekod.ringkasan_status = ringkasan
      for (const f of SEMASA_FIELD) {
        const v = (nilai[f.key] ?? '').trim()
        rekod[f.key] = !v ? null : f.type === 'datetime' ? new Date(v).toISOString() : v
      }
      // Verified by the state officer in the Excel ("Disahkan Oleh")
      if (rekod.perhatian_nama) rekod.perhatian_masa = rekod.tarikh_masa
    }

    // Same district spelling in every report ("labuan" -> "Labuan")
    if (rekod.daerah) rekod.daerah = kemasNamaTempat(rekod.daerah)
    // Same name format in every report (UPPERCASE, single spaces), typed or read from a file
    if (rekod.nama_bencana) rekod.nama_bencana = normalNamaBencana(rekod.nama_bencana)

    // Laporan Semasa must use its Laporan Awal's name: warn, but let the operator send anyway
    if (jenis === 'semasa' && adaLaporanAwal === false && !abaikanNama) {
      setSahkanTanpaAwal(true)
      return
    }
    setSahkanTanpaAwal(false)

    setMenghantar(true)
    const { error } = await supabase.rpc('submit_laporan_bencana', {
      p_code: ambilKod('laporan'),
      p_data: rekod,
      p_pps: pps,
      p_lampiran: jenis === 'semasa' && lampiran && pilihanLampiran ? lampiranUntukHantar(lampiran, pilihanLampiran) : {},
    })
    setMenghantar(false)

    if (error?.code === '42501') {
      if (dalaman) {
        setRalat('Anda tiada kebenaran untuk menghantar laporan.')
        return
      }
      padamKod('laporan')
      window.location.reload()
      return
    }

    if (error) {
      setRalat('Gagal menghantar laporan. Sila cuba lagi.')
      return
    }

    setBerjaya({ jenis, nama: (nilai.nama_bencana ?? '').trim(), masa: new Date() })
    pilihJenis('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const zonPps = nilai.negeri ? cariZon(nilai.negeri) : ''

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-xl font-semibold leading-tight text-neutral-900">Laporan Bencana</h1>
              <p className="text-xs text-neutral-500">Appendix B-1 · National Disaster Command Centre</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            <ArrowLeft size={14} />
            Keluar
          </button>
        </div>

        <datalist id={SENARAI_NAMA_ID}>
          {cadanganNama.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <div className="mt-6 rounded-2xl border border-white/60 bg-white/40 p-6 shadow-lg backdrop-blur-md">
          {berjaya ? (
            <KejayaanHantar berjaya={berjaya} onLagi={() => setBerjaya(null)} onKeluar={() => navigate('/')} />
          ) : (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Jenis Laporan <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {JENIS_PILIHAN.map(({ value, label }) => {
                    const active = jenis === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => pilihJenis(value)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Laporan Insiden: form only */}
              {jenis === 'insiden' && (
                <>
                  <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 text-sm text-orange-900">
                    <p className="flex items-center gap-2 font-semibold">
                      <Megaphone size={16} className="shrink-0" />
                      Laporan Insiden
                    </p>
                    <p className="mt-1 text-orange-800">
                      Untuk kejadian yang mungkin menjadi bencana (contoh: banjir kilat). PKOP akan menilai sama ada
                      insiden ini diisytiharkan sebagai bencana.
                    </p>
                  </div>
                  <Bahagian tajuk="Masa / Tarikh">{renderMedan(INSIDEN_MASA_FIELD)}</Bahagian>
                  <Bahagian tajuk="Insiden">{renderMedan(INSIDEN_RINGKASAN_FIELD)}</Bahagian>
                  <Bahagian tajuk="Lokasi">{INSIDEN_LOKASI_FIELDS.map(renderMedan)}</Bahagian>
                  <Bahagian tajuk="Sumber Laporan">{renderMedan(INSIDEN_SUMBER_FIELD)}</Bahagian>
                </>
              )}

              {/* Laporan Awal step 1: fill the form or upload the Word file */}
              {jenis === 'awal' && !fail && cara === '' && <PilihCara onPilih={pilihCara} />}

              {/* Upload zone: Laporan Semasa always, Laporan Awal in upload mode */}
              {((jenis === 'semasa' && !fail) || (jenis === 'awal' && cara === 'fail' && !fail)) && (
                <>
                  <ZonMuatNaik jenis={jenis} membaca={membacaFail} ralat={ralatFail} onPilih={muatNaikFail} />
                  {jenis === 'awal' && (
                    <button
                      type="button"
                      onClick={() => pilihCara('borang')}
                      className="text-xs font-medium text-emerald-800 underline underline-offset-2"
                    >
                      Tiada fail? Isi borang sahaja
                    </button>
                  )}
                </>
              )}

              {/* Laporan Awal step 2: fill / check the values, then choose the location */}
              {jenis === 'awal' && adaBorang && (
                <>
                  {fail ? (
                    <BannerSemak
                      fail={fail}
                      bilAmaran={bilAmaran}
                      nota={
                        lokasiBencana
                          ? []
                          : ['Lokasi bencana tiada dalam fail. Sila pilih di peta (bahagian Lokasi Bencana).']
                      }
                      onTukar={kosongkanFail}
                    />
                  ) : (
                    <BannerBorang onTukar={() => pilihCara('fail')} />
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">{renderMedan(AWAL_TARIKH_FIELD)}</div>
                  <Bahagian tajuk="Maklumat Kejadian">{AWAL_KEJADIAN_FIELDS.map(renderMedan)}</Bahagian>

                  <Bahagian tajuk="Lokasi Bencana">
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-xs text-neutral-500">
                        Lokasi ini akan dipaparkan sebagai titik bencana pada Peta Bencana.{' '}
                        <span className="text-red-500">*</span>
                      </p>
                      {lokasiBencana ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                          <MapPin size={15} />
                          {lokasiBencana[0].toFixed(5)}, {lokasiBencana[1].toFixed(5)}
                          <button
                            type="button"
                            onClick={() => setPetaBuka(true)}
                            className="rounded-full border border-emerald-200 px-2.5 py-0.5 text-xs font-medium hover:bg-emerald-50"
                          >
                            Ubah
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPetaBuka(true)}
                          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
                        >
                          <MapPinned size={15} />
                          Pilih lokasi di peta
                        </button>
                      )}
                    </div>
                  </Bahagian>

                  <PilihLokasiModal
                    open={petaBuka}
                    tajuk="Pilih Lokasi Bencana"
                    negeri={nilai.negeri}
                    cadangan={nilai.alamat || nilai.mukim || nilai.daerah}
                    awal={lokasiBencana}
                    onClose={() => setPetaBuka(false)}
                    onSimpan={(lat, lng) => {
                      setLokasiBencana([lat, lng])
                      setPetaBuka(false)
                    }}
                  />
                  <Bahagian tajuk="Hal-hal Lain">{renderMedan(HAL_LAIN_FIELD)}</Bahagian>
                  <Bahagian tajuk="Disediakan Oleh">{PENYEDIA_FIELDS.map(renderMedan)}</Bahagian>
                  <Bahagian tajuk="Disahkan Oleh (Telah Diberi Perhatian)">
                    {AWAL_PERHATIAN_FIELDS.map(renderMedan)}
                  </Bahagian>
                </>
              )}

              {/* Laporan Semasa step 2: check the values and the PPS read from the Excel */}
              {jenis === 'semasa' && fail && (
                <>
                  <BannerSemak
                    fail={fail}
                    bilAmaran={bilAmaran}
                    nota={[
                      `${bilPps} PPS dibaca daripada helaian ShelterStatus (${kumpulanPps.length} daerah).`,
                      ...(bilTanpaLokasi > 0
                        ? [
                            `${bilTanpaLokasi} PPS belum ada lokasi. Lokasi wajib ditetapkan (butang "Pilih di peta") sebelum laporan boleh dihantar. PPS yang sudah diketahui lokasinya diisi secara automatik.`,
                          ]
                        : []),
                      'PPS yang ditanda "Tutup" dalam fail akan dicadangkan untuk ditutup. Sekretariat akan mengesahkan.',
                      ...(bilTanpaKawasan > 0
                        ? [
                            `${bilTanpaKawasan} PPS baharu belum dipilih Parlimen/ADUN. Parlimen dan ADUN wajib dipilih sebelum laporan boleh dihantar.`,
                          ]
                        : []),
                    ]}
                    onTukar={kosongkanFail}
                  />

                  <Bahagian tajuk="Maklumat Bencana">
                    {SEMASA_MAKLUMAT_FIELDS.map(renderMedan)}
                    {/* Same disaster as its Laporan Awal? Warns about new / ended / misspelt names */}
                    <StatusNamaBencana
                      kodAkses={ambilKod('laporan')}
                      nama={nilai.nama_bencana ?? ''}
                      negeri={nilai.negeri}
                      onPilih={(nama) => setNilai((prev) => ({ ...prev, nama_bencana: nama }))}
                      onStatus={setAdaLaporanAwal}
                    />
                    {renderMedan(TARIKH_MASA_FIELD)}
                    {renderMedan(RINGKASAN_TEKS_FIELD)}
                  </Bahagian>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Status Laporan <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {RINGKASAN_STATUS.map(({ value, label }) => {
                        const active = ringkasan === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRingkasan(value)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                              active
                                ? 'border-emerald-700 bg-emerald-700 text-white'
                                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    {ringkasan === 'tiada_perubahan' && bilPps > 0 && (
                      <p className="mt-2 flex items-start gap-1 text-xs text-amber-700">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        Fail mengandungi {bilPps} PPS. Dengan "Tiada Perubahan", senarai PPS tidak akan dikemaskini.
                        Sila periksa.
                      </p>
                    )}
                  </div>

                  {ringkasan === 'ada_perubahan' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Pusat Pemindahan Sementara
                        </h2>
                        {zonPps && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Zon {zonPps}
                          </span>
                        )}
                      </div>

                      {kumpulanPps.length === 0 && (
                        <p className="text-sm text-neutral-500">Tiada PPS dijumpai dalam fail.</p>
                      )}

                      {kumpulanPps.map((g) => {
                        const bilTutup = g.rows.filter((r) => metaPps[r.kunci]?.ditutup).length
                        return (
                          <div
                            key={g.kunci}
                            className="space-y-3 rounded-xl border border-white/70 bg-white/50 p-4 shadow-sm"
                          >
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="min-w-[12rem] flex-1">
                                <label className="mb-1 block text-sm font-medium text-neutral-700">
                                  Daerah <span className="text-red-500">*</span>
                                </label>
                                <input
                                  value={g.daerah}
                                  onChange={(e) => ubahKumpulan(g.kunci, { daerah: e.target.value })}
                                  className={inputClass}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setKumpulanPps((prev) => prev.filter((x) => x.kunci !== g.kunci))}
                                className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs font-medium text-neutral-600 hover:border-red-300 hover:text-red-600 sm:py-2"
                              >
                                <Trash2 size={13} />
                                Buang daerah
                              </button>
                            </div>
                            <p className="text-xs text-neutral-500">
                              {g.rows.length} PPS
                              {bilTutup > 0 && ` · ${bilTutup} ditanda "Tutup" dalam fail`}
                              {(() => {
                                const tiada = g.rows.filter(perluLokasi).length
                                return tiada > 0 ? <span className="font-medium text-red-600"> · {tiada} perlu lokasi</span> : null
                              })()}
                            </p>
                            <SenaraiPpsInput
                              rows={g.rows}
                              onChange={(rows) => ubahKumpulan(g.kunci, { rows })}
                              negeri={nilai.negeri}
                              perluLokasi={perluLokasi}
                              perluKawasan={perluKawasan}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {lampiran && pilihanLampiran && (
                    <SemakLampiran
                      lampiran={lampiran}
                      pilihan={pilihanLampiran}
                      onPilihan={(k, v) => setPilihanLampiran((p) => (p ? { ...p, [k]: v } : p))}
                    />
                  )}

                  <Bahagian tajuk="Hal-hal Lain">{renderMedan(HAL_LAIN_FIELD)}</Bahagian>
                  <Bahagian tajuk="Disediakan Oleh">{SEMASA_PENYEDIA_FIELDS.map(renderMedan)}</Bahagian>
                  <Bahagian tajuk="Disahkan Oleh">{SEMASA_PERHATIAN_FIELDS.map(renderMedan)}</Bahagian>
                </>
              )}

              {ralat && <p className="text-sm text-red-600">{ralat}</p>}

              {/* HANTAR only appears once the form is shown (file read, or Laporan Awal form mode) */}
              {jenis && adaBorang ? (
                <motion.button
                  type="button"
                  onClick={() => handleHantar()}
                  disabled={menghantar}
                  whileTap={{ scale: 0.97 }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {menghantar && <Loader2 size={16} className="animate-spin" />}
                  {menghantar ? 'Menghantar...' : 'HANTAR'}
                </motion.button>
              ) : !jenis ? (
                <p className="text-center text-xs text-neutral-400">Pilih jenis laporan untuk bermula.</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={sahkanTanpaAwal}
        title="Tiada Laporan Awal"
        message={`Tiada Laporan Awal dengan nama "${normalNamaBencana(nilai.nama_bencana ?? '')}". Nama Laporan Semasa perlu sama dengan Laporan Awal. Teruskan juga?`}
        confirmLabel="Hantar juga"
        cancelLabel="Semak semula"
        loading={menghantar}
        loadingLabel="Menghantar..."
        onConfirm={() => handleHantar(true)}
        onCancel={() => setSahkanTanpaAwal(false)}
      />
    </div>
  )
}