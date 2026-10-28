import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  FileDown,
  Trash2,
  Home,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  MapPin,
  Clock3,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Inbox,
  AlertTriangle,
  Search,
  Loader2,
} from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import { ConfirmModal } from './ConfirmModal'
import { Toast } from './Toast'
import type { ToastState } from './Toast'
import { supabase } from '../lib/supabase'
import { saluranUnik } from '../lib/realtime'
import { ambilSemua } from '../lib/ambilSemua'
import { pastikan } from '../lib/pastikan'
import { TARIKH_MASA_FIELD, KEJADIAN_FIELDS, HAL_LAIN_FIELD, PENYEDIA_FIELDS } from '../lib/laporanBencana'
import { SEMASA_MAKLUMAT_FIELDS, SEMASA_PENYEDIA_FIELDS, TREND_LABEL } from '../lib/laporanBencana'
import type { FieldDef, LaporanBencanaRow } from '../lib/laporanBencana'
import { SENARAI_KUMPULAN_NEGERI, ahliKumpulan } from '../lib/kumpulanNegeri'
import { useNegeriTetap } from '../hooks/useNegeriTetap'
import { janaRekodKejadian } from '../lib/janaRekodKejadian'
import { useBencanaTamat } from '../lib/bencanaTamat'
import { useJenisBencana } from '../lib/jenisBencana'
import { Memuat, PemuatSebaris, SkeletonBaris } from './Memuatkan'
import { PaparanLampiran } from './PaparanLampiran'
import { ambilLampiranLaporan } from '../lib/lampiranPaparan'
import type { DataLampiran } from '../lib/bacaLampiranSemasa'

type SenaraiLaporanAwamProps = {
  jenis: 'awal' | 'semasa'
  label: string
}

// Reports per batch ("Muat lagi" loads the next one)
const SAIZ_KUMPULAN = 50

// Filters other than Negeri (applied on the server: list, count, "Muat lagi" and PDF)
type Tapisan = {
  cari: string
  jenisBencana: string
  dari: string // YYYY-MM-DD, date received
  hingga: string
  pengesahan: '' | 'disahkan' | 'belum'
  ringkasanStatus: '' | 'ada_perubahan' | 'tiada_perubahan' // Laporan Semasa only
}
const TAPISAN_KOSONG: Tapisan = {
  cari: '',
  jenisBencana: '',
  dari: '',
  hingga: '',
  pengesahan: '',
  ringkasanStatus: '',
}

const kelasPilih =
  'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600'

// Characters with a meaning in PostgREST's or() / ilike syntax are replaced by spaces
const bersihCari = (s: string) => s.replace(/[%,()*\\:"_]/g, ' ').trim()

// Does a report (e.g. one arriving by realtime) match the active filters?
function padanTapisan(r: LaporanBencanaRow, negeri: string, t: Tapisan) {
  if (negeri && !ahliKumpulan(negeri).includes(r.negeri ?? '')) return false
  if (t.jenisBencana && r.jenis_bencana !== t.jenisBencana) return false
  const diterima = new Date(r.created_at).getTime()
  if (t.dari && diterima < new Date(`${t.dari}T00:00:00`).getTime()) return false
  if (t.hingga && diterima > new Date(`${t.hingga}T23:59:59.999`).getTime()) return false
  if (t.pengesahan === 'disahkan' && !r.perhatian_nama) return false
  if (t.pengesahan === 'belum' && r.perhatian_nama) return false
  if (t.ringkasanStatus && r.ringkasan_status !== t.ringkasanStatus) return false
  const c = bersihCari(t.cari).toLowerCase()
  if (c && ![r.nama_bencana, r.daerah, r.penyedia_nama].some((v) => (v ?? '').toLowerCase().includes(c))) return false
  return true
}

function formatNilai(def: FieldDef, v: string | null) {
  if (!v) return '—'
  return def.type === 'datetime' ? new Date(v).toLocaleString('ms-MY') : v
}

type PpsRow = {
  id: string
  zon: string | null
  negeri: string | null
  daerah: string | null
  pps: string | null
  jumlah_mangsa: number | null
  jumlah_keluarga: number | null
}

function Seksyen({ tajuk, aksi, children }: { tajuk: string; aksi?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{tajuk}</h3>
        {aksi}
      </div>
      {children}
    </div>
  )
}

function Bahagian({ tajuk, fields, row }: { tajuk: string; fields: FieldDef[]; row: LaporanBencanaRow }) {
  return (
    <Seksyen tajuk={tajuk}>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
            <dt className="text-xs text-neutral-500">
              {f.no} {f.label}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-800">{formatNilai(f, row[f.key])}</dd>
          </div>
        ))}
      </dl>
    </Seksyen>
  )
}

export function SenaraiLaporanAwam({ jenis, label }: SenaraiLaporanAwamProps) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LaporanBencanaRow[]>([])
  // Total matching the filter (from the server); null while unknown
  const [jumlah, setJumlah] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [ralatSenarai, setRalatSenarai] = useState(false)
  // true once a batch came back shorter than SAIZ_KUMPULAN: nothing older left
  const [habis, setHabis] = useState(false)
  const [memuatLagi, setMemuatLagi] = useState(false)
  const [terbuka, setTerbuka] = useState<string | null>(null)
  const [ppsMap, setPpsMap] = useState<Record<string, PpsRow[]>>({})
  const [loadingPps, setLoadingPps] = useState<Record<string, boolean>>({})
  // Details (PPS + sheets) that failed to load: reopening the report retries
  const [ralatButiran, setRalatButiran] = useState<Record<string, boolean>>({})
  // Other Excel sheets stored with each Laporan Semasa (loaded on expand)
  const [lampiranMap, setLampiranMap] = useState<Record<string, DataLampiran>>({})
  const [tapisNegeri, setTapisNegeri] = useState('')
  const [tapisan, setTapisan] = useState<Tapisan>(TAPISAN_KOSONG)
  const [cariInput, setCariInput] = useState('') // typed text, applied after a short pause
  const senaraiJenis = useJenisBencana()
  const negeriTetap = useNegeriTetap()
  const [pendingDelete, setPendingDelete] = useState<LaporanBencanaRow | null>(null)
  const [sahkanId, setSahkanId] = useState<string | null>(null)
  const [sahkanNilai, setSahkanNilai] = useState({ nama: '', jawatan: '', telefon: '' })
  const [menyahkan, setMenyahkan] = useState(false)
  const [sahkanRalat, setSahkanRalat] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  // Laporan Awal: id of the report whose PDF is being generated
  const [menjanaSatu, setMenjanaSatu] = useState<string | null>(null)
  const namaTamat = new Set(useBencanaTamat().map((t) => t.nama_bencana))

  // Answers that arrive after the filter changed are ignored
  const permintaan = useRef(0)

  // Search: applied after a short pause in typing
  useEffect(() => {
    const t = setTimeout(
      () => setTapisan((f) => (f.cari === cariInput.trim() ? f : { ...f, cari: cariInput.trim() })),
      300,
    )
    return () => clearTimeout(t)
  }, [cariInput])

  const adaTapisan = !!(
    (!negeriTetap && tapisNegeri) ||
    cariInput ||
    tapisan.cari ||
    tapisan.jenisBencana ||
    tapisan.dari ||
    tapisan.hingga ||
    tapisan.pengesahan ||
    tapisan.ringkasanStatus
  )

  // All filters, added to any laporan_bencana query (list, count, "Muat lagi", PDF)
  const terapkan = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (q: any) => {
      // "Wilayah Persekutuan" = KL, Putrajaya and Labuan
      if (tapisNegeri) q = q.in('negeri', ahliKumpulan(tapisNegeri))
      if (tapisan.jenisBencana) q = q.eq('jenis_bencana', tapisan.jenisBencana)
      if (tapisan.dari) q = q.gte('created_at', new Date(`${tapisan.dari}T00:00:00`).toISOString())
      if (tapisan.hingga) q = q.lte('created_at', new Date(`${tapisan.hingga}T23:59:59.999`).toISOString())
      if (tapisan.pengesahan === 'disahkan') q = q.not('perhatian_nama', 'is', null)
      if (tapisan.pengesahan === 'belum') q = q.is('perhatian_nama', null)
      if (jenis === 'semasa' && tapisan.ringkasanStatus) q = q.eq('ringkasan_status', tapisan.ringkasanStatus)
      const c = bersihCari(tapisan.cari)
      if (c) q = q.or(`nama_bencana.ilike.%${c}%,daerah.ilike.%${c}%,penyedia_nama.ilike.%${c}%`)
      return q
    },
    [jenis, tapisNegeri, tapisan],
  )

  // Same type + filters for the list, "Muat lagi" and the PDF
  const asas = useCallback(
    () => terapkan(supabase.from('laporan_bencana').select('*').eq('jenis_laporan', jenis)),
    [jenis, terapkan],
  )

  const kiraJumlah = useCallback(async () => {
    const id = permintaan.current
    const q = terapkan(
      supabase.from('laporan_bencana').select('id', { count: 'exact', head: true }).eq('jenis_laporan', jenis),
    )
    const { count, error } = await q
    if (id !== permintaan.current) return
    if (!error && count !== null) setJumlah(count)
  }, [jenis, terapkan])

  // First batch: on opening the page and whenever the filter changes
  const muatPertama = useCallback(async () => {
    const id = ++permintaan.current
    setLoading(true)
    setRalatSenarai(false)
    setJumlah(null)
    kiraJumlah()
    const { data, error } = await asas()
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(SAIZ_KUMPULAN)
    if (id !== permintaan.current) return
    setLoading(false)
    if (error) {
      // Never show the previous filter's reports under the new filter
      setRows([])
      setRalatSenarai(true)
      return
    }
    const baru = (data as LaporanBencanaRow[]) ?? []
    setRows(baru)
    setHabis(baru.length < SAIZ_KUMPULAN)
  }, [asas, kiraJumlah])

  useEffect(() => {
    muatPertama()
  }, [muatPertama])

  // Next batch: reports older than the last one shown (a cursor, not a page
  // number, so reports arriving or deleted meanwhile never cause a duplicate or a gap)
  async function handleMuatLagi() {
    const akhir = rows[rows.length - 1]
    if (!akhir || memuatLagi) return
    const id = permintaan.current
    setMemuatLagi(true)
    const { data, error } = await asas()
      .or(`created_at.lt."${akhir.created_at}",and(created_at.eq."${akhir.created_at}",id.lt.${akhir.id})`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(SAIZ_KUMPULAN)
    setMemuatLagi(false)
    if (id !== permintaan.current) return
    if (error) {
      setToast({ type: 'error', message: 'Gagal memuatkan laporan seterusnya. Sila cuba lagi.' })
      return
    }
    const baru = (data as LaporanBencanaRow[]) ?? []
    setRows((prev) => [...prev, ...baru.filter((b) => !prev.some((r) => r.id === b.id))])
    setHabis(baru.length < SAIZ_KUMPULAN)
  }

  // Latest filter and counter for the realtime handlers (subscribed once per type)
  const tapisRef = useRef(tapisNegeri)
  const tapisanRef = useRef(tapisan)
  const kiraRef = useRef(kiraJumlah)
  useEffect(() => {
    tapisRef.current = tapisNegeri
    tapisanRef.current = tapisan
    kiraRef.current = kiraJumlah
  })

  useEffect(() => {
    const channel = supabase
      .channel(saluranUnik(`laporan-bencana-${jenis}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'laporan_bencana', filter: `jenis_laporan=eq.${jenis}` },
        (payload) => {
          const baru = payload.new as LaporanBencanaRow
          setToast({ type: 'success', message: 'Laporan baru diterima.' })
          kiraRef.current()
          // Added to the list only if it matches the active filters
          if (!padanTapisan(baru, tapisRef.current, tapisanRef.current)) return
          setRows((prev) => (prev.some((r) => r.id === baru.id) ? prev : [baru, ...prev]))
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'laporan_bencana' }, (payload) => {
        const id = (payload.old as { id?: string }).id
        if (!id) return
        setRows((prev) => prev.filter((r) => r.id !== id))
        kiraRef.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jenis])

  const [menjanaPdf, setMenjanaPdf] = useState(false)

  async function handleJanaPdf() {
    setMenjanaPdf(true)
    try {
      // Every report matching the filter, not only the batches on screen
      const semua = await ambilSemua<LaporanBencanaRow>(() =>
        asas().order('created_at', { ascending: false }).order('id', { ascending: false }),
      )
      await janaRekodKejadian(semua, jenis, label, tapisNegeri)
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana PDF. Sila cuba lagi.' })
    } finally {
      setMenjanaPdf(false)
    }
  }

  // Laporan Awal: one report as a PDF in the NDCC Appendix B-1 layout (module loaded on first use)
  async function janaPdfSatu(row: LaporanBencanaRow) {
    setMenjanaSatu(row.id)
    try {
      const { janaLaporanAwalPdf } = await import('../lib/janaLaporanAwalPdf')
      await janaLaporanAwalPdf(row)
    } catch {
      setToast({ type: 'error', message: 'Gagal menjana PDF. Sila cuba lagi.' })
    } finally {
      setMenjanaSatu(null)
    }
  }

  function pengesahanBlok(row: LaporanBencanaRow) {
    if (row.perhatian_nama) {
      return (
        <Seksyen tajuk="Disahkan Oleh">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-neutral-500">Nama</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">{row.perhatian_nama}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Jawatan</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">{row.perhatian_jawatan || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">No. Telefon</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">{row.perhatian_telefon || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Masa Pengesahan</dt>
              <dd className="mt-0.5 text-sm text-neutral-800">
                {row.perhatian_masa ? new Date(row.perhatian_masa).toLocaleString('ms-MY') : '—'}
              </dd>
            </div>
          </dl>
          <button
            onClick={() => bukaSahkan(row)}
            className="mt-4 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-600 hover:text-emerald-700"
          >
            Kemaskini Pengesahan
          </button>
        </Seksyen>
      )
    }

    return (
      <Seksyen tajuk="Pengesahan">
        <p className="text-sm text-neutral-500">Laporan ini belum disahkan.</p>
        <button
          onClick={() => bukaSahkan(row)}
          className="mt-3 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-800"
        >
          Sahkan
        </button>
      </Seksyen>
    )
  }

  async function bukaTutup(id: string) {
    const akanBuka = terbuka !== id
    setTerbuka(akanBuka ? id : null)

    if (akanBuka && jenis === 'semasa' && !ppsMap[id]) {
      setLoadingPps((p) => ({ ...p, [id]: true }))
      setRalatButiran((p) => ({ ...p, [id]: false }))
      try {
        const [pps, lampiran] = await Promise.all([
          supabase.from('laporan_pps').select('*').eq('laporan_id', id).order('created_at').then(pastikan),
          ambilLampiranLaporan(id),
        ])
        setPpsMap((p) => ({ ...p, [id]: (pps as PpsRow[]) ?? [] }))
        setLampiranMap((p) => ({ ...p, [id]: lampiran }))
      } catch {
        // Nothing cached, so closing and reopening the report tries again
        setRalatButiran((p) => ({ ...p, [id]: true }))
      } finally {
        setLoadingPps((p) => ({ ...p, [id]: false }))
      }
    }
  }

  function bukaSahkan(row: LaporanBencanaRow) {
    setSahkanId(row.id)
    setSahkanNilai({
      nama: row.perhatian_nama ?? '',
      jawatan: row.perhatian_jawatan ?? '',
      telefon: row.perhatian_telefon ?? '',
    })
    setSahkanRalat('')
  }

  async function hantarSahkan() {
    if (!sahkanId) return
    if (!sahkanNilai.nama.trim()) {
      setSahkanRalat('Sila isi Nama.')
      return
    }

    setMenyahkan(true)
    const { error } = await supabase.rpc('sahkan_laporan', {
      p_id: sahkanId,
      p_nama: sahkanNilai.nama.trim(),
      p_jawatan: sahkanNilai.jawatan.trim(),
      p_telefon: sahkanNilai.telefon.trim(),
    })
    setMenyahkan(false)

    if (error) {
      setSahkanRalat('Gagal mengesahkan. Sila cuba lagi.')
      return
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === sahkanId
          ? {
              ...r,
              perhatian_nama: sahkanNilai.nama.trim(),
              perhatian_jawatan: sahkanNilai.jawatan.trim(),
              perhatian_telefon: sahkanNilai.telefon.trim(),
              perhatian_masa: new Date().toISOString(),
            }
          : r,
      ),
    )
    setSahkanId(null)
    setToast({ type: 'success', message: 'Laporan disahkan.' })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleteError('')
    setDeleting(true)

    const { error } = await supabase.from('laporan_bencana').delete().eq('id', pendingDelete.id)
    setDeleting(false)

    if (error) {
      setDeleteError('Gagal memadam. Sila cuba lagi.')
      return
    }

    const id = pendingDelete.id
    setPendingDelete(null)
    setToast({ type: 'success', message: 'Laporan berjaya dipadam.' })
    kiraJumlah()

    setFadingId(id)
    setTimeout(() => {
      setRows((prev) => prev.filter((r) => r.id !== id))
      setFadingId(null)
    }, 300)
  }

  const adaLagi = !habis && (jumlah === null || rows.length < jumlah)

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-emerald-700"
            >
              <Home size={13} />
              Portal
            </button>
            <ChevronRight size={13} className="text-neutral-300" />
            <button
              onClick={() => navigate('/sekretariat')}
              className="text-neutral-400 transition-colors hover:text-emerald-700"
            >
              Sekretariat
            </button>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">{label}</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">{label}</h1>
        </div>

        <button
          onClick={() => navigate('/sekretariat')}
          className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
      </div>

      <DashboardCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Laporan Diterima</h2>
            {!loading && !ralatSenarai && (
              <p className="text-xs text-neutral-400">
                {jumlah !== null && jumlah > rows.length
                  ? `${rows.length} / ${jumlah} laporan`
                  : `${jumlah ?? rows.length} laporan`}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleJanaPdf}
              disabled={menjanaPdf || loading || rows.length === 0}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              <FileDown size={15} />
              {menjanaPdf ? 'Menjana...' : 'Jana PDF'}
            </button>
          </div>
        </div>

        {/* Filters: server-side, also used by "Muat lagi" and Jana PDF */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 py-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              value={cariInput}
              onChange={(e) => setCariInput(e.target.value)}
              placeholder="Cari laporan..."
              aria-label="Cari nama bencana, daerah atau penyedia"
              className={`${kelasPilih} w-48 pl-9`}
            />
          </div>
          {/* PKON: no state choice, the database only returns their state */}
          {!negeriTetap && (
            <select
              value={tapisNegeri}
              onChange={(e) => setTapisNegeri(e.target.value)}
              aria-label="Negeri"
              className={kelasPilih}
            >
              <option value="">Semua negeri</option>
              {SENARAI_KUMPULAN_NEGERI.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
          <select
            value={tapisan.jenisBencana}
            onChange={(e) => setTapisan((f) => ({ ...f, jenisBencana: e.target.value }))}
            aria-label="Jenis bencana"
            className={kelasPilih}
          >
            <option value="">Semua jenis bencana</option>
            {senaraiJenis.map((j) => (
              <option key={j.key} value={j.label}>
                {j.label}
              </option>
            ))}
          </select>
          <select
            value={tapisan.pengesahan}
            onChange={(e) => setTapisan((f) => ({ ...f, pengesahan: e.target.value as Tapisan['pengesahan'] }))}
            aria-label="Pengesahan"
            className={kelasPilih}
          >
            <option value="">Semua pengesahan</option>
            <option value="disahkan">Disahkan</option>
            <option value="belum">Belum Disahkan</option>
          </select>
          {jenis === 'semasa' && (
            <select
              value={tapisan.ringkasanStatus}
              onChange={(e) =>
                setTapisan((f) => ({ ...f, ringkasanStatus: e.target.value as Tapisan['ringkasanStatus'] }))
              }
              aria-label="Status laporan"
              className={kelasPilih}
            >
              <option value="">Semua status laporan</option>
              <option value="ada_perubahan">Ada Perubahan</option>
              <option value="tiada_perubahan">Tiada Perubahan</option>
            </select>
          )}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={tapisan.dari}
              max={tapisan.hingga || undefined}
              onChange={(e) => setTapisan((f) => ({ ...f, dari: e.target.value }))}
              title="Diterima dari tarikh"
              aria-label="Diterima dari tarikh"
              className={`${kelasPilih} px-2`}
            />
            <span className="text-sm text-neutral-400">–</span>
            <input
              type="date"
              value={tapisan.hingga}
              min={tapisan.dari || undefined}
              onChange={(e) => setTapisan((f) => ({ ...f, hingga: e.target.value }))}
              title="Diterima hingga tarikh"
              aria-label="Diterima hingga tarikh"
              className={`${kelasPilih} px-2`}
            />
          </div>
          {adaTapisan && (
            <button
              type="button"
              onClick={() => {
                setCariInput('')
                setTapisan(TAPISAN_KOSONG)
                if (!negeriTetap) setTapisNegeri('')
              }}
              className="text-sm font-medium text-neutral-500 hover:text-emerald-700"
            >
              Kosongkan tapisan
            </button>
          )}
        </div>

        {loading ? (
          <Memuat label="Memuatkan laporan" className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <SkeletonBaris key={i} />
            ))}
          </Memuat>
        ) : ralatSenarai ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle size={28} className="text-red-300" />
            <p className="text-sm text-neutral-500">Gagal memuatkan laporan. Semak sambungan internet anda.</p>
            <button
              onClick={muatPertama}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-700"
            >
              Cuba lagi
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Inbox size={28} className="text-neutral-300" />
            <p className="text-sm text-neutral-400">
              {adaTapisan ? 'Tiada laporan yang sepadan dengan tapisan.' : 'Tiada laporan diterima lagi.'}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {rows.map((row) => {
                const buka = terbuka === row.id
                const tajuk = row.nama_bencana || row.jenis_bencana || 'Laporan'
                const lokasi = [row.negeri, row.daerah].filter(Boolean).join(' · ')
                return (
                  <div
                    key={row.id}
                    className={`rounded-xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-emerald-400 ${
                      fadingId === row.id ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    {/* Phone: badge / button and delete wrap to their own line under the text */}
                    <div className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                        <FileText size={18} />
                      </div>

                      <button
                        onClick={() => bukaTutup(row.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                            <span className="truncate">{tajuk}</span>
                            {row.nama_bencana && namaTamat.has(row.nama_bencana.trim()) && (
                              <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                                TAMAT
                              </span>
                            )}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
                            {lokasi && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {lokasi}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock3 size={12} />
                              {new Date(row.created_at).toLocaleString('ms-MY')}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`ml-auto shrink-0 text-neutral-400 transition-transform ${buka ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <div className="flex w-full items-center justify-between gap-2 pl-[52px] sm:w-auto sm:justify-end sm:pl-0">
                        {jenis === 'awal' ? (
                          // Laporan Awal is verified on sending: the PDF replaces the status here
                          // (older unverified reports can still be verified in the expanded view)
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              janaPdfSatu(row)
                            }}
                            disabled={menjanaSatu === row.id}
                            className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 disabled:opacity-60"
                          >
                            {menjanaSatu === row.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <FileDown size={12} />
                            )}
                            {menjanaSatu === row.id ? 'Menjana...' : 'Jana PDF'}
                          </button>
                        ) : row.perhatian_nama ? (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={12} />
                            Disahkan
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              bukaSahkan(row)
                            }}
                            className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200"
                          >
                            <Clock3 size={12} />
                            Belum Disahkan
                          </button>
                        )}

                        <button
                          onClick={() => setPendingDelete(row)}
                          title="Padam"
                          aria-label="Padam"
                          className="shrink-0 rounded-lg border border-transparent p-2 text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {buka && jenis === 'semasa' && (
                      <div className="space-y-3 border-t border-neutral-100 p-4">
                        {ralatButiran[row.id] && (
                          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                            <AlertTriangle size={14} className="shrink-0" />
                            Gagal memuatkan PPS dan lampiran laporan ini. Tutup dan buka semula untuk cuba lagi.
                          </p>
                        )}

                        <Bahagian
                          tajuk="Maklumat Bencana"
                          fields={[...SEMASA_MAKLUMAT_FIELDS, TARIKH_MASA_FIELD]}
                          row={row}
                        />
                        {row.kandungan && (
                          <Bahagian
                            tajuk="Ringkasan Laporan"
                            fields={[{ key: 'kandungan', label: 'Ringkasan', wide: true }]}
                            row={row}
                          />
                        )}

                        {row.trend && (
                          <Seksyen tajuk="Trend">
                            {(() => {
                              const t = TREND_LABEL[row.trend] ?? TREND_LABEL.kekal
                              const Ikon =
                                row.trend === 'naik' ? TrendingUp : row.trend === 'turun' ? TrendingDown : Minus
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${t.className}`}
                                >
                                  <Ikon size={12} />
                                  {t.label}
                                </span>
                              )
                            })()}
                          </Seksyen>
                        )}

                        <Seksyen tajuk="Ringkasan Laporan">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              row.ringkasan_status === 'ada_perubahan'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {row.ringkasan_status === 'ada_perubahan' ? 'Ada Perubahan' : 'Tiada Perubahan'}
                          </span>
                        </Seksyen>

                        {row.ringkasan_status === 'ada_perubahan' && !ralatButiran[row.id] && (
                          <Seksyen tajuk="Pusat Pemindahan Sementara">
                            {loadingPps[row.id] ? (
                              <PemuatSebaris teks="Memuatkan PPS" />
                            ) : (ppsMap[row.id]?.length ?? 0) === 0 ? (
                              <p className="text-xs text-neutral-400">Tiada rekod PPS.</p>
                            ) : (
                              <div className="space-y-2">
                                {ppsMap[row.id].map((p) => (
                                  <div
                                    key={p.id}
                                    className="rounded-lg border border-white/60 bg-white/50 p-3 text-sm backdrop-blur-sm"
                                  >
                                    <p className="whitespace-pre-wrap font-medium text-neutral-800">
                                      {p.pps} <span className="text-xs text-neutral-400">({p.zon})</span>
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                                      <MapPin size={12} />
                                      {p.negeri} · {p.daerah}
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-600">
                                      Mangsa: {p.jumlah_mangsa ?? '—'} · Keluarga: {p.jumlah_keluarga ?? '—'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Seksyen>
                        )}

                        {lampiranMap[row.id] && <PaparanLampiran data={lampiranMap[row.id]} />}

                        <Bahagian tajuk="Hal-hal Lain" fields={[HAL_LAIN_FIELD]} row={row} />
                        <Bahagian tajuk="Disediakan Oleh" fields={SEMASA_PENYEDIA_FIELDS} row={row} />
                        {pengesahanBlok(row)}
                      </div>
                    )}

                    {buka && jenis === 'awal' && (
                      <div className="space-y-3 border-t border-neutral-100 p-4">
                        <Bahagian tajuk="Tarikh / Masa" fields={[TARIKH_MASA_FIELD]} row={row} />
                        <Bahagian tajuk="Maklumat Kejadian" fields={KEJADIAN_FIELDS} row={row} />
                        <Bahagian tajuk="Hal-hal Lain" fields={[HAL_LAIN_FIELD]} row={row} />
                        <Bahagian tajuk="Disediakan Oleh" fields={PENYEDIA_FIELDS} row={row} />
                        {pengesahanBlok(row)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {adaLagi && (
              <button
                onClick={handleMuatLagi}
                disabled={memuatLagi}
                className="mx-auto mt-4 flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-60"
              >
                <ChevronDown size={15} />
                {memuatLagi
                  ? 'Memuatkan...'
                  : jumlah !== null
                    ? `Muat lagi (${jumlah - rows.length} lagi)`
                    : 'Muat lagi'}
              </button>
            )}
          </>
        )}
      </DashboardCard>

      <ConfirmModal
        open={!!pendingDelete}
        title="Padam Laporan"
        message={`Padam laporan "${pendingDelete?.nama_bencana || pendingDelete?.jenis_bencana || ''}"? Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel="Padam"
        loadingLabel="Memadam..."
        danger
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null)
          setDeleteError('')
        }}
      />

      {sahkanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">Sahkan Laporan</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  value={sahkanNilai.nama}
                  onChange={(e) => setSahkanNilai((p) => ({ ...p, nama: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Jawatan</label>
                <input
                  value={sahkanNilai.jawatan}
                  onChange={(e) => setSahkanNilai((p) => ({ ...p, jawatan: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">No. Telefon</label>
                <input
                  value={sahkanNilai.telefon}
                  onChange={(e) => setSahkanNilai((p) => ({ ...p, telefon: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
              {sahkanRalat && <p className="text-sm text-red-600">{sahkanRalat}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSahkanId(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Batal
              </button>
              <button
                onClick={hantarSahkan}
                disabled={menyahkan}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {menyahkan ? 'Menyahkan...' : 'Sahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
