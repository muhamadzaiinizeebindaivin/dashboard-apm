import { useCallback, useEffect, useState } from 'react'
import {
  Home,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  X,
  Tent,
  AlertTriangle,
  Tags,
} from 'lucide-react'
import { NEGERI_FLAG, NEGERI_LIST } from '../lib/negeriVisual'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { PetaBencana } from '../components/PetaBencana'
import type { JalanPeta, Lapisan, ParasPeta, PpsPeta, TindakanTitik } from '../components/PetaBencana'
import { TitikBencanaModal } from '../components/TitikBencanaModal'
import type { ModTitik } from '../components/TitikBencanaModal'
import { RingkasanBencanaPanel } from '../components/RingkasanBencanaPanel'
import { UrusKategoriModal } from '../components/UrusKategoriModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { Memuat, Skeleton } from '../components/Memuatkan'
import {
  borangDaripada,
  denganDataTerkini,
  ikonKategori,
  keRekod,
  useKategoriBencana,
  useTitikAktif,
  useRingkasanBencana,
  dataTerkiniTitik,
  warnaSelamat,
} from '../lib/titikBencana'
import type { BorangTitik, TitikBencana } from '../lib/titikBencana'

const DUA_MINIT = 2 * 60 * 1000
const TIGA_PULUH_MINIT = 30 * 60 * 1000

function singkatan(negeri: string) {
  const perkataan = negeri.split(' ')
  return perkataan.length > 1 ? perkataan.map((p) => p[0]).join('').slice(0, 2) : negeri[0]
}

type BukaModal = { mod: ModTitik; koordinat: [number, number]; titik?: TitikBencana; awal: BorangTitik }

export function Bencana() {
  const kategori = useKategoriBencana()
  const petaKategori = Object.fromEntries(kategori.map((k) => [k.key, k]))
  const { titik, loading, ralat: ralatTitik } = useTitikAktif()
  // Live figures from Laporan Semasa, so a point follows its disaster's reports
  const ringkasan = useRingkasanBencana()

  const [pps, setPps] = useState<PpsPeta[]>([])
  const [paras, setParas] = useState<(ParasPeta & { created_at: string })[]>([])

  const [negeriFokus, setNegeriFokus] = useState('')
  const [tapisKategori, setTapisKategori] = useState('')
  const [lapisan, setLapisan] = useState<Lapisan>({ titik: true, pps: true, paras: true, jalan: true })
  const [jalan, setJalan] = useState<JalanPeta[]>([])

  // Legend open by default on desktop, collapsed on phones (it covers the map)
  const [legendBuka, setLegendBuka] = useState(() => window.innerWidth >= 640)
  const [modal, setModal] = useState<BukaModal | null>(null)
  const [hendakPadam, setHendakPadam] = useState<TitikBencana | null>(null)
  const [memadam, setMemadam] = useState(false)
  const [panelRingkasan, setPanelRingkasan] = useState(false)
  const [urusKategori, setUrusKategori] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  // One error toast at a time (not one per failed refresh); the map keeps its last data
  const laporRalat = useCallback(() => {
    setToast((t) =>
      t?.type === 'error' ? t : { type: 'error', message: 'Gagal memuatkan data peta. Semak sambungan internet anda.' },
    )
  }, [])

  useEffect(() => {
    if (ralatTitik) laporRalat()
  }, [ralatTitik, laporRalat])

  // Open PPS with a location (pps_pusat)
  const muatPps = useCallback(async () => {
    const { data, error } = await supabase
      .from('pps_pusat')
      .select('id, nama, nama_bencana, negeri, daerah, latitude, longitude, status, jumlah_mangsa')
      .neq('status', 'ditutup')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (error) return laporRalat()
    setPps((data as PpsPeta[]) ?? [])
  }, [laporRalat])

  // Active PARAS sessions (same freshness rules as the PARAS page)
  const muatParas = useCallback(async () => {
    const { data, error } = await supabase
      .from('paras_lokasi')
      .select('id, negeri, latitude, longitude, nama, pangkat, keadaan, created_at')
      .eq('status', 'aktif')
    if (error) return laporRalat()
    setParas((data as (ParasPeta & { created_at: string })[]) ?? [])
  }, [laporRalat])

  // Closed roads still in force with coordinates (view jalan_ditutup_semasa)
  const muatJalan = useCallback(async () => {
    const { data, error } = await supabase
      .from('jalan_ditutup_semasa')
      .select('id, nama_bencana, negeri, daerah, nama_laluan, lokasi, laluan_alternatif, punca, latitude, longitude, mula')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (error) return laporRalat()
    setJalan((data as JalanPeta[]) ?? [])
  }, [laporRalat])

  useEffect(() => {
    muatPps()
    muatParas()
    muatJalan()
  }, [muatPps, muatParas, muatJalan])

  useRealtime('peta-bencana-pps', ['pps_pusat'], muatPps)
  useRealtime('peta-bencana-paras', ['paras_lokasi'], muatParas)
  useRealtime('peta-bencana-jalan', [{ jadual: 'laporan_bencana', peristiwa: 'INSERT' }], muatJalan)

  const parasSegar = paras.filter((p) => {
    const umur = Date.now() - new Date(p.created_at).getTime()
    return umur < (p.keadaan === 'kecemasan' ? TIGA_PULUH_MINIT : DUA_MINIT)
  })

  // What the map shows
  const titikPapar = titik.filter(
    (t) => (!negeriFokus || t.negeri === negeriFokus) && (!tapisKategori || t.kategori === tapisKategori),
  )
  const terkini = Object.fromEntries(
    titikPapar.flatMap((t) => {
      const d = dataTerkiniTitik(t, ringkasan)
      return d ? [[t.id, d] as const] : []
    }),
  )
  const ppsPapar = pps.filter((p) => !negeriFokus || p.negeri === negeriFokus)
  const parasPapar = parasSegar.filter((p) => !negeriFokus || p.negeri === negeriFokus)
  const jalanPapar = jalan.filter((j) => !negeriFokus || j.negeri === negeriFokus)

  // Per-state activity for the cards (not affected by the category filter)
  const bilTitik = (n: string) => titik.filter((t) => t.negeri === n).length
  const bilPps = (n: string) => pps.filter((p) => p.negeri === n).length

  function tindakan(t: TitikBencana, jenis: TindakanTitik) {
    if (jenis === 'padam') {
      setHendakPadam(t)
      return
    }
    // "Lengkapkan" keeps the final figures: start from the latest Laporan Semasa ones
    const d = dataTerkiniTitik(t, ringkasan)
    const awal = jenis === 'lengkapkan' && d ? denganDataTerkini(borangDaripada(t), d) : borangDaripada(t)
    setModal({ mod: jenis, koordinat: [t.latitude, t.longitude], titik: t, awal })
  }

  const mesejRalat = (code?: string) =>
    code === '42501' ? 'Anda tiada kebenaran untuk tindakan ini.' : 'Gagal menyimpan. Sila cuba lagi.'

  async function simpan(borang: BorangTitik): Promise<string | null> {
    if (!modal) return null
    // A point that follows its Laporan Semasa stores the live figures, so the
    // database matches what the map shows (old hand-typed numbers are replaced)
    const d = modal.mod === 'kemaskini' && modal.titik ? dataTerkiniTitik(modal.titik, ringkasan) : null
    const rekod = keRekod(d ? denganDataTerkini(borang, d) : borang)

    // New disasters only come from Laporan Awal / Semasa: here a point is only edited or completed
    const { error } =
      modal.mod === 'kemaskini'
        ? await supabase.from('titik_bencana').update(rekod).eq('id', modal.titik!.id)
        : await supabase
            .from('titik_bencana')
            .update({ ...rekod, status: 'selesai', tarikh_selesai: new Date().toISOString() })
            .eq('id', modal.titik!.id)

    if (error) return mesejRalat(error.code)

    setToast({
      type: 'success',
      message: modal.mod === 'kemaskini' ? 'Titik bencana dikemaskini.' : 'Titik bencana ditanda selesai.',
    })
    setModal(null)
    return null
  }

  async function padam() {
    if (!hendakPadam) return
    setMemadam(true)
    const { error } = await supabase.from('titik_bencana').delete().eq('id', hendakPadam.id)
    setMemadam(false)
    setHendakPadam(null)
    setToast(error ? { type: 'error', message: mesejRalat(error.code) } : { type: 'success', message: 'Titik bencana dipadam.' })
  }

  const chipLapisan: { kunci: keyof Lapisan; label: string; bil: number; warna: string }[] = [
    { kunci: 'titik', label: 'Titik Bencana', bil: titikPapar.length, warna: 'bg-red-500' },
    { kunci: 'pps', label: 'PPS', bil: ppsPapar.length, warna: 'bg-emerald-600' },
    { kunci: 'paras', label: 'PARAS', bil: parasPapar.length, warna: 'bg-blue-600' },
    { kunci: 'jalan', label: 'Jalan Ditutup', bil: jalanPapar.length, warna: 'bg-orange-600' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <Home size={13} className="text-neutral-400" />
            <span className="text-neutral-400">Portal</span>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">Bencana</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Bencana</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPanelRingkasan(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/60 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            <ClipboardList size={16} />
            Ringkasan Bencana
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {chipLapisan.map((c) => (
          <button
            key={c.kunci}
            onClick={() => setLapisan((l) => ({ ...l, [c.kunci]: !l[c.kunci] }))}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors ${
              lapisan[c.kunci]
                ? 'border-white/70 bg-white/70 text-neutral-800 shadow-sm'
                : 'border-transparent bg-white/30 text-neutral-400'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${lapisan[c.kunci] ? c.warna : 'bg-neutral-300'}`} />
            {c.label}
            <span className="tabular-nums text-neutral-500">{c.bil}</span>
          </button>
        ))}

        <select
          value={tapisKategori}
          onChange={(e) => setTapisKategori(e.target.value)}
          className="h-8 rounded-full border border-white/70 bg-white/70 px-3 text-xs text-neutral-700 outline-none focus:border-emerald-600"
        >
          <option value="">Semua Kategori</option>
          {kategori.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setUrusKategori(true)}
          className="flex h-8 items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 text-xs font-medium text-neutral-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
        >
          <Tags size={13} />
          Urus Kategori
        </button>

        {negeriFokus && (
          <button
            onClick={() => setNegeriFokus('')}
            className="flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white"
          >
            {negeriFokus}
            <X size={13} />
          </button>
        )}
      </div>

      {/* Map — `isolate` keeps Leaflet's internal z-indexes inside this box,
          so modals and the side panel always render above the map controls */}
      <div className="relative isolate mt-3 h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border border-white/60 shadow-lg">
        {loading ? (
          <Memuat label="Memuatkan peta" className="h-full">
            <Skeleton className="h-full rounded-none" />
          </Memuat>
        ) : (
          <PetaBencana
            titik={titikPapar}
            terkini={terkini}
            kategori={petaKategori}
            pps={ppsPapar}
            paras={parasPapar}
            jalan={jalanPapar}
            lapisan={lapisan}
            negeriFokus={negeriFokus}
            onTindakan={tindakan}
          />
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] max-w-[220px] rounded-xl border border-white/70 bg-white/85 p-2.5 text-xs shadow-lg backdrop-blur-md sm:p-3">
          <button
            type="button"
            onClick={() => setLegendBuka((b) => !b)}
            aria-expanded={legendBuka}
            className="flex w-full items-center justify-between gap-3 font-semibold text-neutral-700"
          >
            Petunjuk
            <ChevronDown size={14} className={`transition-transform ${legendBuka ? 'rotate-180' : ''}`} />
          </button>
          <ul className={`mt-1.5 space-y-1 ${legendBuka ? '' : 'hidden'}`}>
            {kategori.map((k) => {
              const Ikon = ikonKategori(k.ikon)
              return (
                <li key={k.key} className="flex items-center gap-2 text-neutral-600">
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-white"
                    style={{ background: warnaSelamat(k.warna) }}
                  >
                    <Ikon size={10} />
                  </span>
                  {k.label}
                </li>
              )
            })}
            <li className="flex items-center gap-2 pt-1 text-neutral-600">
              <span className="h-3 w-3 rounded-full border-2 border-white bg-emerald-600 shadow" /> PPS dibuka
            </li>
            <li className="flex items-center gap-2 text-neutral-600">
              <span className="h-3 w-3 rounded-full border-2 border-white bg-amber-500 shadow" /> PPS cadangan tutup
            </li>
            <li className="flex items-center gap-2 text-neutral-600">
              <span className="h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow" /> PARAS
            </li>
            <li className="flex items-center gap-2 text-neutral-600">
              <span className="h-3 w-3 rounded-[3px] border-2 border-white bg-orange-600 shadow" /> Jalan ditutup
            </li>
          </ul>
        </div>
      </div>

      {/* States — two glass levels: active states raised, quiet states recede */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {NEGERI_LIST.map((n) => {
          const t = bilTitik(n)
          const p = bilPps(n)
          const dipilih = negeriFokus === n
          const senyap = t === 0 && p === 0
          const bendera = NEGERI_FLAG[n]
          return (
            <button
              key={n}
              onClick={() => setNegeriFokus(dipilih ? '' : n)}
              aria-pressed={dipilih}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-colors ${
                dipilih
                  ? 'border-emerald-400 bg-white/75 ring-2 ring-emerald-500/30'
                  : senyap
                    ? 'border-white/50 bg-white/25 hover:border-white/80 hover:bg-white/40'
                    : 'border-white/70 bg-white/55 hover:border-emerald-300'
              }`}
            >
              <span
                className={`flex h-7 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/80 bg-white/70 shadow-sm ${
                  senyap ? 'opacity-60 grayscale' : ''
                }`}
              >
                {bendera ? (
                  <img src={bendera} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs font-semibold text-neutral-500">{singkatan(n)}</span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${senyap ? 'text-neutral-500' : 'text-neutral-900'}`}>{n}</p>
                {senyap ? (
                  <p className="text-xs text-neutral-400">Tiada aktiviti</p>
                ) : (
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    {t > 0 && (
                      <span className="flex items-center gap-1 font-medium text-red-600">
                        <AlertTriangle size={12} />
                        {t} bencana
                      </span>
                    )}
                    {p > 0 && (
                      <span className="flex items-center gap-1 font-medium text-emerald-700">
                        <Tent size={12} />
                        {p} PPS
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {modal && (
        <TitikBencanaModal
          key={`${modal.mod}-${modal.titik?.id ?? 'baru'}`}
          mod={modal.mod}
          awal={modal.awal}
          koordinat={modal.koordinat}
          kategori={kategori}
          terkini={modal.titik ? dataTerkiniTitik(modal.titik, ringkasan) : null}
          onSimpan={simpan}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!hendakPadam}
        title="Padam Titik Bencana"
        message={`Padam titik "${hendakPadam?.lokasi || petaKategori[hendakPadam?.kategori ?? '']?.label || 'bencana'}"? Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel="Padam"
        loadingLabel="Memadam..."
        danger
        loading={memadam}
        onConfirm={padam}
        onCancel={() => setHendakPadam(null)}
      />

      <RingkasanBencanaPanel open={panelRingkasan} onClose={() => setPanelRingkasan(false)} kategori={kategori} />

      <UrusKategoriModal
        open={urusKategori}
        kategori={kategori}
        onClose={() => setUrusKategori(false)}
        onDipadam={(key) => {
          if (tapisKategori === key) setTapisKategori('')
          setToast({ type: 'success', message: 'Kategori dipadam.' })
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}