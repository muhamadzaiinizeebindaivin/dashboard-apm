import { useCallback, useEffect, useState } from 'react'
import { Home, ChevronRight, Plus, ClipboardList, X, Tent, AlertTriangle, MousePointerClick } from 'lucide-react'
import { PilihLokasiModal } from '../components/PilihLokasiModal'
import { NEGERI_FLAG } from '../lib/negeriVisual'
import { supabase } from '../lib/supabase'
import { PetaBencana } from '../components/PetaBencana'
import type { Lapisan, ParasPeta, PpsPeta, TindakanTitik } from '../components/PetaBencana'
import { TitikBencanaModal } from '../components/TitikBencanaModal'
import type { ModTitik } from '../components/TitikBencanaModal'
import { RingkasanBencanaPanel } from '../components/RingkasanBencanaPanel'
import { ConfirmModal } from '../components/ConfirmModal'
import { Toast } from '../components/Toast'
import type { ToastState } from '../components/Toast'
import { Memuat, Skeleton } from '../components/Memuatkan'
import {
  borangDaripada,
  borangKosong,
  ikonKategori,
  keRekod,
  useKategoriBencana,
  useTitikAktif,
  warnaSelamat,
} from '../lib/titikBencana'
import type { BorangTitik, TitikBencana } from '../lib/titikBencana'

const NEGERI_LIST = [
  'Perlis',
  'Kedah',
  'Pulau Pinang',
  'Perak',
  'Selangor',
  'Negeri Sembilan',
  'Melaka',
  'Johor',
  'Pahang',
  'Terengganu',
  'Kelantan',
  'Sabah',
  'Sarawak',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya',
]

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
  const { titik, loading } = useTitikAktif()

  const [pps, setPps] = useState<PpsPeta[]>([])
  const [paras, setParas] = useState<(ParasPeta & { created_at: string })[]>([])

  const [negeriFokus, setNegeriFokus] = useState('')
  const [tapisKategori, setTapisKategori] = useState('')
  const [lapisan, setLapisan] = useState<Lapisan>({ titik: true, pps: true, paras: true })

  const [meletak, setMeletak] = useState(false)
  const [pilihLokasi, setPilihLokasi] = useState(false)
  const [modal, setModal] = useState<BukaModal | null>(null)
  const [hendakPadam, setHendakPadam] = useState<TitikBencana | null>(null)
  const [memadam, setMemadam] = useState(false)
  const [panelRingkasan, setPanelRingkasan] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  // Open PPS with a location (pps_pusat)
  const muatPps = useCallback(async () => {
    const { data } = await supabase
      .from('pps_pusat')
      .select('id, nama, nama_bencana, negeri, daerah, latitude, longitude, status, jumlah_mangsa')
      .neq('status', 'ditutup')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    setPps((data as PpsPeta[]) ?? [])
  }, [])

  // Active PARAS sessions (same freshness rules as the PARAS page)
  const muatParas = useCallback(async () => {
    const { data } = await supabase
      .from('paras_lokasi')
      .select('id, negeri, latitude, longitude, nama, pangkat, keadaan, created_at')
      .eq('status', 'aktif')
    setParas((data as (ParasPeta & { created_at: string })[]) ?? [])
  }, [])

  useEffect(() => {
    muatPps()
    muatParas()
    const channel = supabase
      .channel('peta-bencana-lapisan')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pps_pusat' }, () => muatPps())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paras_lokasi' }, () => muatParas())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [muatPps, muatParas])

  const parasSegar = paras.filter((p) => {
    const umur = Date.now() - new Date(p.created_at).getTime()
    return umur < (p.keadaan === 'kecemasan' ? TIGA_PULUH_MINIT : DUA_MINIT)
  })

  // What the map shows
  const titikPapar = titik.filter(
    (t) => (!negeriFokus || t.negeri === negeriFokus) && (!tapisKategori || t.kategori === tapisKategori),
  )
  const ppsPapar = pps.filter((p) => !negeriFokus || p.negeri === negeriFokus)
  const parasPapar = parasSegar.filter((p) => !negeriFokus || p.negeri === negeriFokus)

  // Per-state activity for the cards (not affected by the category filter)
  const bilTitik = (n: string) => titik.filter((t) => t.negeri === n).length
  const bilPps = (n: string) => pps.filter((p) => p.negeri === n).length

  function letakTitik(lat: number, lng: number) {
    setMeletak(false)
    setModal({ mod: 'tambah', koordinat: [lat, lng], awal: borangKosong(negeriFokus) })
  }

  function tindakan(t: TitikBencana, jenis: TindakanTitik) {
    if (jenis === 'padam') {
      setHendakPadam(t)
      return
    }
    setModal({ mod: jenis, koordinat: [t.latitude, t.longitude], titik: t, awal: borangDaripada(t) })
  }

  const mesejRalat = (code?: string) =>
    code === '42501' ? 'Anda tiada kebenaran untuk tindakan ini.' : 'Gagal menyimpan. Sila cuba lagi.'

  async function simpan(borang: BorangTitik): Promise<string | null> {
    if (!modal) return null
    const rekod = keRekod(borang)

    const { error } =
      modal.mod === 'tambah'
        ? await supabase
            .from('titik_bencana')
            .insert({ ...rekod, latitude: modal.koordinat[0], longitude: modal.koordinat[1] })
        : modal.mod === 'kemaskini'
          ? await supabase.from('titik_bencana').update(rekod).eq('id', modal.titik!.id)
          : await supabase
              .from('titik_bencana')
              .update({ ...rekod, status: 'selesai', tarikh_selesai: new Date().toISOString() })
              .eq('id', modal.titik!.id)

    if (error) return mesejRalat(error.code)

    setToast({
      type: 'success',
      message:
        modal.mod === 'tambah'
          ? 'Titik bencana ditambah.'
          : modal.mod === 'kemaskini'
            ? 'Titik bencana dikemaskini.'
            : 'Titik bencana ditanda selesai.',
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
          {/* Quick mode: click directly on the map */}
          <button
            onClick={() => setMeletak((m) => !m)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-md transition-colors ${
              meletak
                ? 'border-neutral-700 bg-neutral-700 text-white hover:bg-neutral-800'
                : 'border-white/60 bg-white/60 text-neutral-700 hover:border-emerald-500 hover:text-emerald-700'
            }`}
          >
            {meletak ? <X size={16} /> : <MousePointerClick size={16} />}
            {meletak ? 'Batal' : 'Klik pada peta'}
          </button>

          {/* Main mode: search / coordinates / map */}
          <button
            onClick={() => {
              setMeletak(false)
              setPilihLokasi(true)
            }}
            className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-800"
          >
            <Plus size={16} />
            Tambah Bencana
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
            kategori={petaKategori}
            pps={ppsPapar}
            paras={parasPapar}
            lapisan={lapisan}
            negeriFokus={negeriFokus}
            meletak={meletak}
            onLetak={letakTitik}
            onTindakan={tindakan}
          />
        )}

        {meletak && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center">
            <span className="rounded-full bg-neutral-900/85 px-4 py-2 text-sm font-medium text-white shadow-lg">
              Klik pada peta untuk letak titik
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] max-w-[220px] rounded-xl border border-white/70 bg-white/85 p-3 text-xs shadow-lg backdrop-blur-md">
          <p className="mb-1.5 font-semibold text-neutral-700">Petunjuk</p>
          <ul className="space-y-1">
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

      <PilihLokasiModal
        open={pilihLokasi}
        tajuk="Pilih Lokasi Bencana"
        negeri={negeriFokus || undefined}
        awal={null}
        onClose={() => setPilihLokasi(false)}
        onSimpan={(lat, lng) => {
          setPilihLokasi(false)
          letakTitik(lat, lng)
        }}
      />

      <RingkasanBencanaPanel open={panelRingkasan} onClose={() => setPanelRingkasan(false)} kategori={kategori} />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}