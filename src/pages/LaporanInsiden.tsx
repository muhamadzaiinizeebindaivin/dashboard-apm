import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Megaphone,
  MapPin,
  Clock3,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ImageDown,
  FileDown,
  Mail,
  Loader2,
  Pencil,
  Trash2,
  Search,
  Inbox,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { DashboardCard } from '../components/DashboardCard'
import { Memuat, SkeletonBaris } from '../components/Memuatkan'
import { EditInsidenModal } from '../components/EditInsidenModal'
import { muatTurunPosterPng, muatTurunPosterPdf, posterPdfBase64 } from '../lib/posterInsiden'
import { SENARAI_KUMPULAN_NEGERI, ahliKumpulan } from '../lib/kumpulanNegeri'

// PKOP only: incidents sent by PKOD (Laporan Insiden), assessed here —
// declared a disaster or not, turned into a "Makluman Awal Insiden" poster (PNG / PDF),
// and e-mailed to the PKON of the state. Same look as the Laporan Awal / Semasa lists.

export type StatusInsiden = 'baharu' | 'disahkan_bencana' | 'bukan_bencana'

export type LaporanInsidenRow = {
  id: string
  created_at: string
  tarikh_masa: string
  ringkasan: string
  tempat: string
  daerah: string
  negeri: string
  sumber_laporan: string
  status: StatusInsiden
  diputuskan_nama: string | null
  diputuskan_pada: string | null
  emel_dihantar_pada: string | null
  emel_bil_penerima: number | null
  dikemaskini_nama: string | null
  dikemaskini_pada: string | null
}

const STATUS_LABEL: Record<StatusInsiden, { label: string; className: string }> = {
  baharu: { label: 'Baharu', className: 'bg-amber-100 text-amber-700' },
  disahkan_bencana: { label: 'Disahkan Bencana', className: 'bg-red-100 text-red-700' },
  bukan_bencana: { label: 'Bukan Bencana', className: 'bg-neutral-200 text-neutral-700' },
}

const TEKS_KEPUTUSAN: Record<StatusInsiden, { title: string; message: string; label: string; danger: boolean }> = {
  disahkan_bencana: {
    title: 'Sahkan sebagai Bencana',
    message: 'Insiden ini akan direkodkan sebagai bencana. PKOD masih perlu menghantar Laporan Awal seperti biasa.',
    label: 'Sahkan Bencana',
    danger: true,
  },
  bukan_bencana: {
    title: 'Bukan Bencana',
    message: 'Insiden ini akan direkodkan sebagai bukan bencana.',
    label: 'Sahkan',
    danger: false,
  },
  baharu: {
    title: 'Batal Keputusan',
    message: 'Keputusan akan dibatalkan dan insiden kembali berstatus Baharu.',
    label: 'Batal Keputusan',
    danger: false,
  },
}

type TapisStatus = StatusInsiden | 'semua'
type Tapisan = { negeri: string; dari: string; hingga: string; cari: string }
const TAPISAN_KOSONG: Tapisan = { negeri: '', dari: '', hingga: '', cari: '' }
const SAIZ_HALAMAN = 20

type Hasil = { baris: LaporanInsidenRow[]; jumlah: number; kiraan: Record<StatusInsiden, number> }
type Tindakan = 'png' | 'pdf' | 'emel'

// Results already seen (page + filters), kept while the app is open: going back to a page,
// a filter or this screen shows it at once, then refreshes quietly
const simpanan = new Map<string, Hasil>()

function kunciSimpanan(status: TapisStatus, t: Tapisan, halaman: number) {
  return JSON.stringify([status, t.negeri, t.dari, t.hingga, t.cari, halaman])
}

// One request: the page, the total and the count per status
async function ambilHalaman(status: TapisStatus, t: Tapisan, halaman: number): Promise<Hasil> {
  const { data, error } = await supabase.rpc('senarai_laporan_insiden', {
    p_status: status,
    p_negeri: t.negeri ? ahliKumpulan(t.negeri) : null,
    p_dari: t.dari ? new Date(`${t.dari}T00:00:00`).toISOString() : null,
    p_hingga: t.hingga ? new Date(`${t.hingga}T23:59:59.999`).toISOString() : null,
    p_cari: t.cari || null,
    p_had: SAIZ_HALAMAN,
    p_ofset: (halaman - 1) * SAIZ_HALAMAN,
  })
  if (error) throw error
  const d = data as Hasil
  return { baris: d.baris ?? [], jumlah: d.jumlah ?? 0, kiraan: d.kiraan }
}

// Kuala Lumpur, Putrajaya and Labuan share one PKON group
const ANGGOTA_WP = ['Kuala Lumpur', 'Putrajaya', 'Labuan']
const kumpulanPkon = (negeri: string) => (ANGGOTA_WP.includes(negeri) ? 'Wilayah Persekutuan' : negeri)

async function mesejFungsi(error: { message: string; context?: { json?: () => Promise<unknown> } }) {
  const body = (await error.context?.json?.().catch(() => null)) as { error?: string } | null
  return body?.error ?? error.message
}

const masaPenuh = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const kelasPilih =
  'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600'

type Keputusan = { insiden: LaporanInsidenRow; status: StatusInsiden }

export function LaporanInsiden() {
  const navigate = useNavigate()
  const [tapisStatus, setTapisStatus] = useState<TapisStatus>('baharu')
  const [tapisan, setTapisan] = useState<Tapisan>(TAPISAN_KOSONG)
  const [cariInput, setCariInput] = useState('')
  const [halaman, setHalaman] = useState(1)

  const kunciAwal = kunciSimpanan('baharu', TAPISAN_KOSONG, 1)
  const [hasil, setHasil] = useState<Hasil | null>(() => simpanan.get(kunciAwal) ?? null)
  const [ralatMuat, setRalatMuat] = useState(false)
  // A page / filter not seen yet is loading: skeleton, same as the Laporan Awal / Semasa lists
  const [memuat, setMemuat] = useState(false)

  const [dibuka, setDibuka] = useState<string | null>(null)
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const [keputusan, setKeputusan] = useState<Keputusan | null>(null)
  const [memproses, setMemproses] = useState(false)
  const [ralatKeputusan, setRalatKeputusan] = useState('')

  const [sedang, setSedang] = useState<{ id: string; tindakan: Tindakan } | null>(null)
  const [sahkanEmel, setSahkanEmel] = useState<LaporanInsidenRow | null>(null)
  const [ralatEmel, setRalatEmel] = useState('')

  const [diedit, setDiedit] = useState<LaporanInsidenRow | null>(null)
  const [dipadam, setDipadam] = useState<LaporanInsidenRow | null>(null)
  const [memadam, setMemadam] = useState(false)
  const [ralatPadam, setRalatPadam] = useState('')

  // Search: applied after a short pause in typing
  useEffect(() => {
    const t = setTimeout(
      () => setTapisan((f) => (f.cari === cariInput.trim() ? f : { ...f, cari: cariInput.trim() })),
      300,
    )
    return () => clearTimeout(t)
  }, [cariInput])

  // Any filter change goes back to page 1
  useEffect(() => {
    setHalaman(1)
    setDibuka(null)
  }, [tapisStatus, tapisan])

  // Only the latest request may update the screen
  const nomborPermintaan = useRef(0)

  const muatSemula = useCallback(async () => {
    const nombor = ++nomborPermintaan.current
    const kunci = kunciSimpanan(tapisStatus, tapisan, halaman)

    // Seen before: show it now, refresh below
    const lama = simpanan.get(kunci)
    if (lama) setHasil(lama)
    setMemuat(!lama)

    try {
      const baru = await ambilHalaman(tapisStatus, tapisan, halaman)
      simpanan.set(kunci, baru)
      if (nombor !== nomborPermintaan.current) return

      // Page past the end (e.g. its last insiden was deleted): go back one
      if (baru.baris.length === 0 && halaman > 1) {
        setHalaman((h) => Math.max(1, h - 1))
        return
      }
      setMemuat(false)
      setRalatMuat(false)
      setHasil(baru)

      // Next page fetched in the background, so "Seterusnya" is instant
      if (baru.jumlah > halaman * SAIZ_HALAMAN) {
        const kunciSeterusnya = kunciSimpanan(tapisStatus, tapisan, halaman + 1)
        if (!simpanan.has(kunciSeterusnya)) {
          ambilHalaman(tapisStatus, tapisan, halaman + 1)
            .then((h) => simpanan.set(kunciSeterusnya, h))
            .catch(() => {})
        }
      }
    } catch {
      if (nombor !== nomborPermintaan.current) return
      setMemuat(false)
      // Keep what is already on screen; only an empty screen shows the error
      if (!lama) setRalatMuat(true)
    }
  }, [tapisStatus, tapisan, halaman])

  useEffect(() => {
    muatSemula()
  }, [muatSemula])

  // Something changed in the table: every kept page may be out of date
  const segarkan = useCallback(() => {
    simpanan.clear()
    muatSemula()
  }, [muatSemula])

  useRealtime('laporan-insiden', ['laporan_insiden'], segarkan)

  const baris = hasil?.baris ?? []
  const jumlah = hasil?.jumlah ?? 0
  const kiraan = hasil?.kiraan ?? { baharu: 0, disahkan_bencana: 0, bukan_bencana: 0 }
  const jumlahSemua = kiraan.baharu + kiraan.disahkan_bencana + kiraan.bukan_bencana
  const bilHalaman = Math.max(1, Math.ceil(jumlah / SAIZ_HALAMAN))
  const adaTapisan = !!(tapisan.negeri || tapisan.dari || tapisan.hingga || tapisan.cari || cariInput)

  function tukarHalaman(baru: number) {
    setHalaman(baru)
    setDibuka(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function janaPoster(i: LaporanInsidenRow, jenis: 'png' | 'pdf') {
    setSedang({ id: i.id, tindakan: jenis })
    try {
      if (jenis === 'png') await muatTurunPosterPng(i)
      else await muatTurunPosterPdf(i)
    } catch {
      setToast({ type: 'error', message: `Gagal menjana ${jenis === 'png' ? 'poster' : 'PDF'}. Sila cuba lagi.` })
    } finally {
      setSedang(null)
    }
  }

  async function hantarEmel() {
    if (!sahkanEmel) return
    const i = sahkanEmel
    setRalatEmel('')
    setSedang({ id: i.id, tindakan: 'emel' })
    try {
      const { base64, namaFail } = await posterPdfBase64(i)
      const { data, error } = await supabase.functions.invoke('emel-insiden', {
        body: { insiden_id: i.id, pdf_base64: base64, nama_fail: namaFail },
      })
      if (error) {
        // Dead login session: back to the login page (same as Admin)
        if ((error as { context?: { status?: number } }).context?.status === 401) {
          setSahkanEmel(null)
          await supabase.auth.signOut({ scope: 'local' })
          return
        }
        setRalatEmel(await mesejFungsi(error))
        return
      }
      const bil = (data as { bil?: number } | null)?.bil ?? 0
      setSahkanEmel(null)
      setToast({ type: 'success', message: `Emel dihantar kepada ${bil} akaun PKON ${kumpulanPkon(i.negeri)}.` })
      segarkan()
    } catch {
      setRalatEmel('Gagal menjana PDF untuk lampiran. Sila cuba lagi.')
    } finally {
      setSedang(null)
    }
  }

  async function sahkanKeputusan() {
    if (!keputusan) return
    setMemproses(true)
    setRalatKeputusan('')
    const { error } = await supabase.rpc('putuskan_laporan_insiden', {
      p_id: keputusan.insiden.id,
      p_status: keputusan.status,
    })
    setMemproses(false)
    if (error) {
      setRalatKeputusan('Gagal menyimpan keputusan. Sila cuba lagi.')
      return
    }
    setToast({ type: 'success', message: `Keputusan disimpan: ${STATUS_LABEL[keputusan.status].label}.` })
    setKeputusan(null)
    segarkan()
  }

  async function padam() {
    if (!dipadam) return
    const sasaran = dipadam
    setMemadam(true)
    setRalatPadam('')
    const { error } = await supabase.rpc('padam_laporan_insiden', { p_id: sasaran.id })
    setMemadam(false)
    if (error && error.code !== 'P0002') {
      setRalatPadam('Gagal memadam. Sila cuba lagi.')
      return
    }
    setDipadam(null)
    setToast({ type: 'success', message: 'Laporan insiden dipadam.' })
    // Same fade-out as the other lists, then reload
    setFadingId(sasaran.id)
    setTimeout(() => {
      setFadingId(null)
      setDibuka((d) => (d === sasaran.id ? null : d))
      segarkan()
    }, 300)
  }

  return (
    <div>
      <div className="mt-2 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
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
          <span className="font-medium text-emerald-700">Laporan Insiden</span>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">Laporan Insiden</h1>
      </div>

      <DashboardCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Laporan Insiden Diterima</h2>
            {hasil && <p className="text-xs text-neutral-400">{jumlah} insiden</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="search"
                value={cariInput}
                onChange={(e) => setCariInput(e.target.value)}
                placeholder="Cari insiden..."
                aria-label="Cari ringkasan, lokasi, daerah atau sumber"
                className={`${kelasPilih} w-48 pl-9`}
              />
            </div>
            <select
              value={tapisan.negeri}
              onChange={(e) => setTapisan((f) => ({ ...f, negeri: e.target.value }))}
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
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={tapisan.dari}
                max={tapisan.hingga || undefined}
                onChange={(e) => setTapisan((f) => ({ ...f, dari: e.target.value }))}
                title="Dari tarikh"
                aria-label="Dari tarikh"
                className={`${kelasPilih} px-2`}
              />
              <span className="text-sm text-neutral-400">–</span>
              <input
                type="date"
                value={tapisan.hingga}
                min={tapisan.dari || undefined}
                onChange={(e) => setTapisan((f) => ({ ...f, hingga: e.target.value }))}
                title="Hingga tarikh"
                aria-label="Hingga tarikh"
                className={`${kelasPilih} px-2`}
              />
            </div>
            {adaTapisan && (
              <button
                type="button"
                onClick={() => {
                  setCariInput('')
                  setTapisan(TAPISAN_KOSONG)
                }}
                className="text-sm font-medium text-neutral-500 hover:text-emerald-700"
              >
                Kosongkan tapisan
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-100 py-3">
          {(
            [
              ['baharu', 'Baharu', kiraan.baharu],
              ['disahkan_bencana', 'Disahkan Bencana', kiraan.disahkan_bencana],
              ['bukan_bencana', 'Bukan Bencana', kiraan.bukan_bencana],
              ['semua', 'Semua', jumlahSemua],
            ] as const
          ).map(([nilai, label, bil]) => (
            <button
              key={nilai}
              type="button"
              onClick={() => setTapisStatus(nilai)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                tapisStatus === nilai
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
              }`}
            >
              {label}
              {hasil && <span className="ml-1.5 opacity-70">{bil}</span>}
            </button>
          ))}
        </div>

        {(!hasil || memuat) && !ralatMuat ? (
          <Memuat label="Memuatkan laporan insiden" className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <SkeletonBaris key={i} />
            ))}
          </Memuat>
        ) : ralatMuat ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle size={28} className="text-red-300" />
            <p className="text-sm text-neutral-500">Gagal memuatkan laporan insiden. Semak sambungan internet anda.</p>
            <button
              onClick={() => {
                setRalatMuat(false)
                muatSemula()
              }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-700"
            >
              Cuba lagi
            </button>
          </div>
        ) : baris.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Inbox size={28} className="text-neutral-300" />
            <p className="text-sm text-neutral-400">
              {adaTapisan
                ? 'Tiada laporan insiden yang sepadan dengan tapisan.'
                : tapisStatus === 'baharu'
                  ? 'Tiada laporan insiden baharu.'
                  : tapisStatus === 'semua'
                    ? 'Belum ada laporan insiden.'
                    : `Tiada laporan insiden berstatus ${STATUS_LABEL[tapisStatus].label}.`}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {baris.map((i) => {
                const buka = dibuka === i.id
                const st = STATUS_LABEL[i.status]
                return (
                  <div
                    key={i.id}
                    className={`rounded-xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-emerald-400 ${
                      fadingId === i.id ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                        <Megaphone size={18} />
                      </div>

                      <button
                        onClick={() => setDibuka(buka ? null : i.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-900">{i.ringkasan}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {[i.tempat, i.daerah, i.negeri].join(' · ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock3 size={12} />
                              {new Date(i.tarikh_masa).toLocaleString('ms-MY')}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`ml-auto shrink-0 text-neutral-400 transition-transform ${buka ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </div>

                    {buka && (
                      <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs text-neutral-500">Tarikh & Masa Berlaku</dt>
                            <dd className="font-medium text-neutral-800">{masaPenuh(i.tarikh_masa)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-neutral-500">Sumber Laporan</dt>
                            <dd className="font-medium text-neutral-800">{i.sumber_laporan}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs text-neutral-500">Ringkasan Insiden</dt>
                            <dd className="whitespace-pre-line font-medium text-neutral-800">{i.ringkasan}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-neutral-500">Lokasi</dt>
                            <dd className="font-medium text-neutral-800">{i.tempat}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-neutral-500">Daerah / Negeri</dt>
                            <dd className="font-medium text-neutral-800">
                              {i.daerah} / {i.negeri}
                            </dd>
                          </div>
                          <div className="sm:col-span-2 space-y-0.5 text-xs text-neutral-500">
                            <p>Dihantar {masaPenuh(i.created_at)}</p>
                            {i.dikemaskini_pada && (
                              <p>
                                Dikemas kini oleh {i.dikemaskini_nama ?? '—'} pada {masaPenuh(i.dikemaskini_pada)}
                              </p>
                            )}
                            {i.status !== 'baharu' && i.diputuskan_pada && (
                              <p>
                                {st.label} oleh {i.diputuskan_nama ?? '—'} pada {masaPenuh(i.diputuskan_pada)}
                              </p>
                            )}
                            {i.emel_dihantar_pada && (
                              <p>
                                Emel kepada PKON dihantar {masaPenuh(i.emel_dihantar_pada)}
                                {i.emel_bil_penerima != null && ` (${i.emel_bil_penerima} penerima)`}
                              </p>
                            )}
                          </div>
                        </dl>

                        {/* Poster / PDF / e-mail */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(
                            [
                              ['png', 'Jana Poster', ImageDown],
                              ['pdf', 'Jana PDF', FileDown],
                            ] as const
                          ).map(([jenis, label, Ikon]) => {
                            const aktif = sedang?.id === i.id && sedang.tindakan === jenis
                            return (
                              <button
                                key={jenis}
                                type="button"
                                disabled={!!sedang}
                                onClick={() => janaPoster(i, jenis)}
                                className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                              >
                                {aktif ? <Loader2 size={15} className="animate-spin" /> : <Ikon size={15} />}
                                {aktif ? 'Menjana...' : label}
                              </button>
                            )
                          })}
                          <button
                            type="button"
                            disabled={!!sedang}
                            onClick={() => {
                              setRalatEmel('')
                              setSahkanEmel(i)
                            }}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-60"
                          >
                            <Mail size={15} />
                            {i.emel_dihantar_pada ? 'Hantar Semula Emel' : 'Emel ke PKON'}
                          </button>
                        </div>

                        {/* Decision + edit / delete */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {i.status === 'baharu' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setKeputusan({ insiden: i, status: 'disahkan_bencana' })}
                                className="flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
                              >
                                <CheckCircle2 size={15} />
                                Sahkan sebagai Bencana
                              </button>
                              <button
                                type="button"
                                onClick={() => setKeputusan({ insiden: i, status: 'bukan_bencana' })}
                                className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                              >
                                <XCircle size={15} />
                                Bukan Bencana
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setKeputusan({ insiden: i, status: 'baharu' })}
                              className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <RotateCcw size={15} />
                              Batal Keputusan
                            </button>
                          )}
                          <span className="ml-auto flex gap-2">
                            <button
                              type="button"
                              disabled={!!sedang}
                              onClick={() => setDiedit(i)}
                              className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={!!sedang}
                              onClick={() => {
                                setRalatPadam('')
                                setDipadam(i)
                              }}
                              className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                              Padam
                            </button>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {bilHalaman > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-sm text-neutral-500">
                <span>
                  Halaman {halaman} daripada {bilHalaman}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={halaman <= 1}
                    onClick={() => tukarHalaman(halaman - 1)}
                    className="flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 font-medium text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={halaman >= bilHalaman}
                    onClick={() => tukarHalaman(halaman + 1)}
                    className="flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 font-medium text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                  >
                    Seterusnya
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </DashboardCard>

      <EditInsidenModal
        insiden={diedit}
        onClose={() => setDiedit(null)}
        onSaved={() => {
          setDiedit(null)
          setToast({ type: 'success', message: 'Laporan insiden dikemas kini.' })
          segarkan()
        }}
      />

      <ConfirmModal
        open={!!dipadam}
        title="Padam Laporan Insiden"
        message={dipadam ? `Padam laporan insiden "${dipadam.ringkasan}"? Tindakan ini tidak boleh dibatalkan.` : ''}
        confirmLabel="Padam"
        danger
        loading={memadam}
        loadingLabel="Memadam..."
        error={ralatPadam}
        onConfirm={padam}
        onCancel={() => {
          if (memadam) return
          setDipadam(null)
          setRalatPadam('')
        }}
      />

      <ConfirmModal
        open={!!keputusan}
        title={keputusan ? TEKS_KEPUTUSAN[keputusan.status].title : ''}
        message={keputusan ? `"${keputusan.insiden.ringkasan}" — ${TEKS_KEPUTUSAN[keputusan.status].message}` : ''}
        confirmLabel={keputusan ? TEKS_KEPUTUSAN[keputusan.status].label : 'Sahkan'}
        danger={keputusan ? TEKS_KEPUTUSAN[keputusan.status].danger : false}
        loading={memproses}
        loadingLabel="Menyimpan..."
        error={ralatKeputusan}
        onConfirm={sahkanKeputusan}
        onCancel={() => {
          setKeputusan(null)
          setRalatKeputusan('')
        }}
      />

      <ConfirmModal
        open={!!sahkanEmel}
        title="Emel ke PKON"
        message={
          sahkanEmel
            ? `Hantar Makluman Awal Insiden "${sahkanEmel.ringkasan}" kepada semua akaun PKON ${kumpulanPkon(sahkanEmel.negeri)} yang aktif? Poster PDF akan dilampirkan.` +
              (sahkanEmel.emel_dihantar_pada
                ? ` Emel ini telah dihantar pada ${masaPenuh(sahkanEmel.emel_dihantar_pada)}.`
                : '')
            : ''
        }
        confirmLabel="Hantar Emel"
        loading={sedang?.tindakan === 'emel'}
        loadingLabel="Menghantar..."
        error={ralatEmel}
        onConfirm={hantarEmel}
        onCancel={() => {
          if (sedang?.tindakan === 'emel') return
          setSahkanEmel(null)
          setRalatEmel('')
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
