import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Tent,
  Search,
  Clock,
  Landmark,
  UserRound,
  Phone,
  ChevronDown,
  ChevronRight,
  Inbox,
  Loader2,
  BellOff,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/realtime'
import { ambilSemua } from '../lib/ambilSemua'
import { usePetaAwam } from '../lib/petaAwam'
import type { PpsAwam } from '../lib/petaAwam'
import { kumpulanNegeri } from '../lib/kumpulanNegeri'
import { formatTarikhMasa, HAD_TIADA_KEMASKINI_JAM, pautanTelefon } from '../lib/ppsPusat'

// Laman Utama: open PPS (dibuka + cadangan_tutup) grouped by state, with victims and families.
// Public data comes from peta_awam (same cache as the map: no extra request).
// Logged in (`dalaman`): every PPS the user can read in pps_pusat (RLS: PKON = own state)
// also gets Parlimen/ADUN, zone, manager + call button, the "no update" badge and a link
// to Pengurusan PPS. PPS outside their scope keep the public view.

const NAVY = 'var(--warna-navy)'
const HAD_RINGKAS = 5 // rows per state before "Lihat semua", when no state / search is chosen
const SEMINIT = 60_000
const HAD_SENYAP = HAD_TIADA_KEMASKINI_JAM * 3_600_000

const kad = 'rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_10px_40px_rgba(11,42,92,0.08)] backdrop-blur-md'
const selectClass =
  'rounded-full border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-emerald-500'

type MaklumatStaf = {
  id: string
  zon: string | null
  parlimen: string | null
  dun: string | null
  pengurus_nama: string | null
  pengurus_jawatan: string | null
  pengurus_telefon: string | null
}

type TapisStatus = 'semua' | 'dibuka' | 'cadangan_tutup' | 'senyap'

const nombor = (n: number) => n.toLocaleString('ms-MY')

const masaLalu = (iso: string, kini: number) => {
  const minit = Math.max(0, Math.round((kini - new Date(iso).getTime()) / SEMINIT))
  if (minit < 1) return 'baru sahaja'
  if (minit < 60) return `${minit} minit lalu`
  const jam = Math.round(minit / 60)
  if (jam < 24) return `${jam} jam lalu`
  return `${Math.round(jam / 24)} hari lalu`
}

const terakhir = (p: PpsAwam) => p.dilapor_pada ?? p.dibuka_pada
const senyap = (p: PpsAwam, kini: number) => p.status === 'dibuka' && kini - new Date(terakhir(p)).getTime() > HAD_SENYAP

// Staff-only details, keyed by PPS id (empty for the public page)
function useMaklumatStaf(aktif: boolean) {
  const [peta, setPeta] = useState<Map<string, MaklumatStaf>>(() => new Map())

  const muat = useCallback(async () => {
    if (!aktif) return
    try {
      const data = await ambilSemua<MaklumatStaf>(() =>
        supabase
          .from('pps_pusat')
          .select('id, zon, parlimen, dun, pengurus_nama, pengurus_jawatan, pengurus_telefon')
          .in('status', ['dibuka', 'cadangan_tutup'])
          .order('id'),
      )
      setPeta(new Map(data.map((d) => [d.id, d])))
    } catch {
      // Keep the last details: the public view of the list still works
    }
  }, [aktif])

  useEffect(() => {
    muat()
  }, [muat])
  useRealtime('laman-utama-pps-staf', ['pps_pusat'], muat, { aktif })

  return peta
}

// ---------------------------------------------------------------------------
// One PPS row
// ---------------------------------------------------------------------------
function BarisPps({ pps, staf, kini }: { pps: PpsAwam; staf?: MaklumatStaf; kini: number }) {
  const cadangan = pps.status === 'cadangan_tutup'
  const tiadaKemaskini = staf && senyap(pps, kini)
  const telefon = staf ? pautanTelefon(staf.pengurus_telefon) : null
  const kawasan = staf ? [staf.parlimen, staf.dun].filter(Boolean).join(' · ') : ''

  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70">
        <Tent size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold uppercase leading-snug text-neutral-900">{pps.nama}</p>
          {cadangan && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Cadangan Tutup
            </span>
          )}
          {tiadaKemaskini && (
            <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
              <BellOff size={10} />
              Tiada kemas kini &gt; {HAD_TIADA_KEMASKINI_JAM} j
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {[pps.nama_bencana, pps.daerah, staf?.zon].filter(Boolean).join(' · ')}
        </p>

        {kawasan && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
            <Landmark size={12} className="shrink-0 text-neutral-400" />
            <span className="truncate">{kawasan}</span>
          </p>
        )}

        {staf?.pengurus_nama && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound size={12} className="shrink-0 text-neutral-400" />
              <span className="truncate">
                {staf.pengurus_nama}
                {staf.pengurus_jawatan && <span className="text-neutral-400"> · {staf.pengurus_jawatan}</span>}
              </span>
            </span>
            {telefon && (
              <a
                href={telefon}
                className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <Phone size={11} />
                {staf.pengurus_telefon}
              </a>
            )}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-400" title={formatTarikhMasa(terakhir(pps))}>
            <Clock size={11} />
            Laporan terakhir {masaLalu(terakhir(pps), kini)}
          </p>
          {staf && (
            <Link
              to={`/sekretariat/pps?id=${pps.id}`}
              className="flex items-center gap-0.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Buka
              <ChevronRight size={13} />
            </Link>
          )}
        </div>
      </div>

      <div className="w-[4.5rem] shrink-0 text-right">
        <p className="text-lg font-bold leading-none tabular-nums" style={{ color: NAVY }}>
          {nombor(pps.jumlah_mangsa ?? 0)}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-neutral-500">mangsa</p>
        <p className="mt-1.5 text-sm font-semibold leading-none tabular-nums text-neutral-700">
          {nombor(pps.jumlah_keluarga ?? 0)}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-neutral-500">keluarga</p>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------
export function SenaraiPpsAwam({ dalaman = false }: { dalaman?: boolean }) {
  const { pps, loading } = usePetaAwam()
  const staf = useMaklumatStaf(dalaman)
  const [tapisNegeri, setTapisNegeri] = useState('')
  const [tapisStatus, setTapisStatus] = useState<TapisStatus>('semua')
  const [carian, setCarian] = useState('')
  const [dikembang, setDikembang] = useState<Set<string>>(() => new Set())
  // "No update" depends on the clock, not only on data changes
  const [kini, setKini] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), SEMINIT)
    return () => clearInterval(t)
  }, [])

  const dibuka = useMemo(() => pps.filter((p) => p.status === 'dibuka' || p.status === 'cadangan_tutup'), [pps])

  // State choices: only states with an open PPS, with their count
  const pilihanNegeri = useMemo(() => {
    const bil = new Map<string, number>()
    for (const p of dibuka) {
      const n = kumpulanNegeri(p.negeri)
      bil.set(n, (bil.get(n) ?? 0) + 1)
    }
    return Array.from(bil.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [dibuka])

  const q = carian.trim().toLowerCase()
  const ditapis = dibuka.filter(
    (p) =>
      (!tapisNegeri || kumpulanNegeri(p.negeri) === tapisNegeri) &&
      (!q ||
        p.nama.toLowerCase().includes(q) ||
        (p.daerah ?? '').toLowerCase().includes(q) ||
        p.nama_bencana.toLowerCase().includes(q)) &&
      (tapisStatus === 'semua' ||
        (tapisStatus === 'senyap' ? senyap(p, kini) : p.status === tapisStatus)),
  )

  // Grouped by state; states and PPS sorted by victims, highest first
  const kumpulan = useMemo(() => {
    const m = new Map<string, PpsAwam[]>()
    for (const p of ditapis) {
      const n = kumpulanNegeri(p.negeri)
      if (!m.has(n)) m.set(n, [])
      m.get(n)!.push(p)
    }
    return Array.from(m.entries())
      .map(([negeri, arr]) => ({
        negeri,
        senarai: [...arr].sort((a, b) => (b.jumlah_mangsa ?? 0) - (a.jumlah_mangsa ?? 0)),
        mangsa: arr.reduce((n, p) => n + (p.jumlah_mangsa ?? 0), 0),
        keluarga: arr.reduce((n, p) => n + (p.jumlah_keluarga ?? 0), 0),
      }))
      .sort((a, b) => b.mangsa - a.mangsa)
  }, [ditapis])

  const jumlahMangsa = kumpulan.reduce((n, k) => n + k.mangsa, 0)
  const jumlahKeluarga = kumpulan.reduce((n, k) => n + k.keluarga, 0)
  const ringkas = !tapisNegeri && !q // long lists only when browsing everything
  const adaTapisan = !!(tapisNegeri || q || tapisStatus !== 'semua')

  function togol(negeri: string) {
    setDikembang((s) => {
      const baru = new Set(s)
      if (baru.has(negeri)) baru.delete(negeri)
      else baru.add(negeri)
      return baru
    })
  }

  return (
    <div className={kad}>
      {/* Title + totals for the current filter */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
            PPS Dibuka
          </h3>
          <p className="text-xs text-neutral-500">Pusat pemindahan sementara yang masih beroperasi, mengikut negeri</p>
        </div>
        <p className="text-xs text-neutral-500">
          <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
            {nombor(ditapis.length)}
          </span>{' '}
          PPS ·{' '}
          <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
            {nombor(jumlahMangsa)}
          </span>{' '}
          mangsa ·{' '}
          <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
            {nombor(jumlahKeluarga)}
          </span>{' '}
          keluarga
        </p>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
            placeholder="Cari PPS, daerah atau bencana..."
            className={`${selectClass} w-full pl-8`}
          />
        </div>
        <select value={tapisNegeri} onChange={(e) => setTapisNegeri(e.target.value)} className={selectClass}>
          <option value="">Semua Negeri</option>
          {pilihanNegeri.map(([n, bil]) => (
            <option key={n} value={n}>
              {n} ({bil})
            </option>
          ))}
        </select>
        {dalaman && (
          <select
            value={tapisStatus}
            onChange={(e) => setTapisStatus(e.target.value as TapisStatus)}
            className={selectClass}
          >
            <option value="semua">Dibuka + Cadangan Tutup</option>
            <option value="dibuka">Dibuka sahaja</option>
            <option value="cadangan_tutup">Cadangan Tutup sahaja</option>
            <option value="senyap">Tiada kemas kini (&gt; {HAD_TIADA_KEMASKINI_JAM} j)</option>
          </select>
        )}
        {adaTapisan && (
          <button
            onClick={() => {
              setTapisNegeri('')
              setCarian('')
              setTapisStatus('semua')
            }}
            className="px-1 text-xs font-medium text-neutral-500 hover:text-emerald-700"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* List */}
      {loading && dibuka.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400">
          <Loader2 size={16} className="animate-spin" />
          Memuatkan senarai PPS...
        </div>
      ) : kumpulan.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-sm text-neutral-400">
          <Inbox size={26} />
          {dibuka.length === 0 ? 'Tiada PPS dibuka buat masa ini.' : 'Tiada PPS sepadan dengan tapisan.'}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {kumpulan.map((k) => {
            const kembang = !ringkas || dikembang.has(k.negeri)
            const papar = kembang ? k.senarai : k.senarai.slice(0, HAD_RINGKAS)
            const baki = k.senarai.length - HAD_RINGKAS

            return (
              <section key={k.negeri} className="rounded-2xl border border-neutral-100 bg-white/60 px-4 pt-3">
                <h4 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-neutral-100 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    {k.negeri} <span className="font-normal text-neutral-400">· {k.senarai.length} PPS</span>
                  </span>
                  <span className="text-xs text-neutral-500">
                    <span className="font-semibold tabular-nums text-neutral-700">{nombor(k.mangsa)}</span> mangsa ·{' '}
                    <span className="font-semibold tabular-nums text-neutral-700">{nombor(k.keluarga)}</span> keluarga
                  </span>
                </h4>

                <ul className="divide-y divide-neutral-100">
                  {papar.map((p) => (
                    <BarisPps key={p.id} pps={p} staf={staf.get(p.id)} kini={kini} />
                  ))}
                </ul>

                {ringkas && baki > 0 && (
                  <button
                    onClick={() => togol(k.negeri)}
                    className="flex w-full items-center justify-center gap-1 border-t border-neutral-100 py-2.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <ChevronDown size={14} className={kembang ? 'rotate-180' : ''} />
                    {kembang ? 'Tunjuk kurang' : `Lihat semua (${baki} lagi)`}
                  </button>
                )}
                {!(ringkas && baki > 0) && <div className="pb-1" />}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
