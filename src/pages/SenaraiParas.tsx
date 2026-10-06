import { useEffect, useState } from 'react'
import { Home, ChevronRight, AlertTriangle, BellOff, Bell, History, MapPinOff } from 'lucide-react'
import { RekodParasPanel } from '../components/RekodParasPanel'
import { supabase } from '../lib/supabase'
import { ParasMap } from '../components/ParasMap'
import type { LokasiPoint } from '../components/ParasMap'

// Alarm generated with Web Audio — no sound file needed.
let audioCtx: AudioContext | null = null

function ambilAudio(): AudioContext | null {
  try {
    audioCtx ??= new AudioContext()
    return audioCtx
  } catch {
    return null
  }
}

function bunyiAmaran() {
  const ctx = ambilAudio()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()

  const t0 = ctx.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, t0 + i * 0.3)
    gain.gain.setValueAtTime(0, t0 + i * 0.3 + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0 + i * 0.3)
    osc.stop(t0 + i * 0.3 + 0.2)
  }
}

const kunciAmaran = (p: LokasiPoint) => `${p.id}|${p.keadaan_masa ?? ''}`

export function SenaraiParas() {
  const [lokasi, setLokasi] = useState<LokasiPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [diakui, setDiakui] = useState<Set<string>>(() => new Set())
  const [panelBuka, setPanelBuka] = useState(false)

  useEffect(() => {
    supabase
      .from('paras_lokasi')
      .select('id, negeri, latitude, longitude, created_at, status, nama, pangkat, no_tel, keadaan, keadaan_masa')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLokasi((data as LokasiPoint[]) ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel('senarai-paras-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paras_lokasi' },
        (payload) => {
          setLokasi((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((p) => p.id !== (payload.old as LokasiPoint).id)
            }
            const updated = payload.new as LokasiPoint
            const withoutOld = prev.filter((p) => p.id !== updated.id)
            return [updated, ...withoutOld]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Normal/REHAT sessions: one marker per negeri, as before. KECEMASAN
  // sessions: every one gets its own marker, so an emergency is never hidden
  // behind a newer session in the same negeri — and they stay visible for
  // 30 min after the last GPS update, since signal loss is likely in a real one.
  const DUA_MINIT = 2 * 60 * 1000
  const TIGA_PULUH_MINIT = 30 * 60 * 1000
  const umur = (p: LokasiPoint) => Date.now() - new Date(p.created_at).getTime()

  const kecemasan = lokasi.filter(
    (p) => p.status === 'aktif' && p.keadaan === 'kecemasan' && umur(p) < TIGA_PULUH_MINIT,
  )
  const belumDiakui = kecemasan.filter((p) => !diakui.has(kunciAmaran(p)))

  // Repeat the alarm every 8s while any emergency hasn't been acknowledged.
  useEffect(() => {
    if (belumDiakui.length === 0) return
    bunyiAmaran()
    const t = setInterval(bunyiAmaran, 8000)
    return () => clearInterval(t)
  }, [belumDiakui.length])

  // Browsers block audio until the user interacts with the page — unlock
  // it on the first click/tap so the alarm can play.
  useEffect(() => {
    const buka = () => ambilAudio()?.resume()
    window.addEventListener('pointerdown', buka)
    return () => window.removeEventListener('pointerdown', buka)
  }, [])

  const lainLain = Array.from(
    lokasi
      .filter((p) => p.status === 'aktif' && p.keadaan !== 'kecemasan' && umur(p) < DUA_MINIT)
      .reduce((map, p) => {
        const existing = map.get(p.negeri)
        if (!existing || new Date(p.created_at) > new Date(existing.created_at)) {
          map.set(p.negeri, p)
        }
        return map
      }, new Map<string, LokasiPoint>())
      .values(),
  )

  const negeriAktif = [...kecemasan, ...lainLain]

  return (
    <div className="flex h-[calc(100dvh-6.25rem)] flex-col lg:h-[calc(100dvh-2rem)]">
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
        <div className="flex items-center gap-1.5 text-sm">
          <Home size={13} className="text-neutral-400" />
          <span className="text-neutral-400">Portal</span>
          <ChevronRight size={13} className="text-neutral-300" />
          <span className="font-medium text-emerald-700">Paras</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Paras — Negeri Aktif</h1>
        </div>

        <button
          onClick={() => setPanelBuka(true)}
          className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-emerald-800"
        >
          <History size={16} />
          Rekod PARAS
        </button>

        <RekodParasPanel open={panelBuka} onClose={() => setPanelBuka(false)} />
      </div>

      {kecemasan.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <AlertTriangle size={18} className="animate-pulse" />
              KECEMASAN ({kecemasan.length})
            </div>
            {belumDiakui.length > 0 ? (
              <button
                onClick={() => setDiakui((prev) => new Set([...prev, ...belumDiakui.map(kunciAmaran)]))}
                className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                <BellOff size={14} />
                Senyapkan
              </button>
            ) : (
              <button
                onClick={() =>
                  setDiakui((prev) => {
                    const baru = new Set(prev)
                    kecemasan.forEach((p) => baru.delete(kunciAmaran(p)))
                    return baru
                  })
                }
                className="flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <Bell size={14} />
                Bunyikan Semula
              </button>
            )}
          </div>

          <ul className="mt-3 space-y-1.5 text-sm text-red-900">
            {kecemasan.map((p) => (
              <li key={p.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{[p.pangkat, p.nama].filter(Boolean).join(' ') || 'Tanpa nama'}</span>
                <span>· {p.negeri}</span>
                {p.no_tel && (
                  <a href={`tel:${p.no_tel}`} className="font-medium underline">
                    · {p.no_tel}
                  </a>
                )}
                {p.keadaan_masa && (
                  <span className="text-red-700/80">
                    · sejak{' '}
                    {new Date(p.keadaan_masa).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 min-h-[24rem] flex-1">
        {loading ? (
          <div className="h-full animate-pulse rounded-2xl border border-white/60 bg-white/40 shadow-lg" />
        ) : (
          <div className="relative h-full">
            <ParasMap points={negeriAktif} className="h-full" />

            {negeriAktif.length === 0 && (
              // pointer-events-none on the layer so the map stays pannable;
              // the card itself re-enables clicks for its button.
              <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center rounded-2xl bg-white/30 p-4">
                <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/85 px-6 py-7 text-center shadow-xl backdrop-blur-md">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-700 shadow-inner">
                    <MapPinOff size={24} />
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-neutral-900">Tiada PARAS aktif</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Tiada pasukan sedang dijejak buat masa ini. Lokasi akan muncul di peta secara automatik sebaik
                    sahaja penjejakan bermula.
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                    </span>
                    Memantau secara langsung
                  </div>

                  <button
                    onClick={() => setPanelBuka(true)}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50"
                  >
                    <History size={15} />
                    Lihat Rekod PARAS
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
