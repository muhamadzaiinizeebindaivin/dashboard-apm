import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Home, ChevronRight, ClipboardList, FileDown, Loader2, AlertTriangle, CloudRain, Users, Truck, HandHeart } from 'lucide-react'
import type { ReactNode } from 'react'
import { DashboardCard } from '../components/DashboardCard'
import { useAuth } from '../hooks/useAuth'
import { useNegeriTetap } from '../hooks/useNegeriTetap'
import { SENARAI_KUMPULAN_NEGERI } from '../lib/kumpulanNegeri'
import { useKawasan, parlimenNegeri, dunNegeri, parlimenBagiDun } from '../lib/kawasanPilihanRaya'
import { SENARAI_POKET, ambilPilihanDaerah, ambilPocketData, labelSkop, notaSkop, peratus } from '../lib/pocketData'
import type { DataPoket, Kiraan, PoketId, TapisanPoket } from '../lib/pocketData'
import { janaPocketDataPdf } from '../lib/janaPocketData'

// Jana Pocket Data: PKON (own state only) feeds PPAN, PKOP feeds the Pengarah BO.
// Filters narrow the scope (state, district, Parlimen/ADUN); preview first, then the PDF.

const selectClass =
  'h-9 w-full rounded-full border border-white/60 bg-white/60 px-3 text-sm text-neutral-700 outline-none backdrop-blur-md focus:border-emerald-600 disabled:opacity-50'

const IKON_POKET: Record<PoketId, typeof Users> = {
  bencana: CloudRain,
  personel: Users,
  logistik: Truck,
  bantuan: HandHeart,
}

const n = (x: number) => x.toLocaleString('ms-MY')

function Petak({ label, nilai, sub, warna = 'text-neutral-900' }: { label: string; nilai: string; sub?: string; warna?: string }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warna}`}>{nilai}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  )
}

function BarKeadaan({ c }: { c: Kiraan }) {
  if (!c.jumlah) return <div className="h-4 rounded-full bg-neutral-100" />
  const bahagian = [
    ['baik', 'bg-emerald-600'],
    ['selenggara', 'bg-amber-500'],
    ['rosak', 'bg-red-600'],
  ] as const
  return (
    <div className="flex h-4 overflow-hidden rounded-full bg-neutral-100">
      {bahagian.map(([k, cls]) =>
        c[k] > 0 ? <div key={k} className={cls} style={{ width: `${(c[k] / c.jumlah) * 100}%` }} title={`${c[k]}`} /> : null,
      )}
    </div>
  )
}

function Seksyen({ id, children }: { id: PoketId; children: ReactNode }) {
  const p = SENARAI_POKET.find((x) => x.id === id)!
  const Ikon = IKON_POKET[id]
  return (
    <DashboardCard>
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-[#0b2a5c] p-2 text-white">
          <Ikon size={16} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-neutral-900">{p.label}</h2>
          <p className="text-xs text-neutral-500">{p.huraian}</p>
        </div>
      </div>
      {children}
    </DashboardCard>
  )
}

export function JanaPocketData() {
  const { profile } = useAuth()
  const negeriTetap = useNegeriTetap()
  const kawasan = useKawasan()

  const [tapisNegeri, setTapisNegeri] = useState('')
  const negeri = negeriTetap ?? tapisNegeri
  const [daerah, setDaerah] = useState('')
  const [parlimen, setParlimen] = useState('')
  const [dun, setDun] = useState('')
  const [poket, setPoket] = useState<PoketId[]>(SENARAI_POKET.map((p) => p.id))
  const [pilihanDaerah, setPilihanDaerah] = useState<string[]>([])
  const [data, setData] = useState<DataPoket | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [menjana, setMenjana] = useState(false)
  const [ralat, setRalat] = useState('')

  // A new state: its districts, and the narrower filters start again
  useEffect(() => {
    setDaerah('')
    setParlimen('')
    setDun('')
    let aktif = true
    ambilPilihanDaerah(negeri)
      .then((d) => aktif && setPilihanDaerah(d))
      .catch(() => aktif && setPilihanDaerah([]))
    return () => {
      aktif = false
    }
  }, [negeri])

  const tapisan: TapisanPoket = useMemo(
    () => ({
      negeri,
      daerah,
      parlimen,
      dun,
      poket: SENARAI_POKET.map((p) => p.id).filter((id) => poket.includes(id)),
    }),
    [negeri, daerah, parlimen, dun, poket],
  )

  // The preview always matches the filters on screen: changing one clears it
  useEffect(() => {
    setData(null)
  }, [tapisan])

  const oleh = `${profile?.full_name || 'Pengguna'} (${profile?.role === 'pkop' ? 'PKOP' : `PKON ${negeriTetap ?? ''}`.trim()})`

  function togolPoket(id: PoketId) {
    setPoket((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function jana() {
    if (tapisan.poket.length === 0) {
      setRalat('Pilih sekurang-kurangnya satu poket data.')
      return
    }
    setRalat('')
    setMemuat(true)
    try {
      setData(await ambilPocketData(tapisan))
    } catch {
      setRalat('Gagal mengumpul data. Semak sambungan internet anda.')
    } finally {
      setMemuat(false)
    }
  }

  async function muatTurun() {
    if (!data) return
    setMenjana(true)
    try {
      await janaPocketDataPdf(data, oleh)
    } catch {
      setRalat('Gagal menjana PDF. Sila cuba lagi.')
    } finally {
      setMenjana(false)
    }
  }

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <Home size={13} className="text-neutral-400" />
            <span className="text-neutral-400">Portal</span>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">Pocket Data</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Jana Pocket Data</h1>
          <p className="text-xs text-neutral-500">
            {negeriTetap ? `Data Negeri ${negeriTetap} untuk PPAN` : 'Ringkasan untuk Pengarah BO dan pengurusan atasan'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 space-y-4 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-md">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Negeri</label>
            {negeriTetap ? (
              <p className="flex h-9 items-center rounded-full border border-white/60 bg-white/60 px-3 text-sm text-neutral-700">
                {negeriTetap}
              </p>
            ) : (
              <select value={tapisNegeri} onChange={(e) => setTapisNegeri(e.target.value)} className={selectClass}>
                <option value="">Seluruh Malaysia</option>
                {SENARAI_KUMPULAN_NEGERI.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Daerah</label>
            <select value={daerah} onChange={(e) => setDaerah(e.target.value)} disabled={!negeri} className={selectClass}>
              <option value="">{negeri ? 'Semua daerah' : 'Pilih negeri dahulu'}</option>
              {pilihanDaerah.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Parlimen</label>
            <select
              value={parlimen}
              onChange={(e) => {
                setParlimen(e.target.value)
                setDun('')
              }}
              disabled={!negeri}
              className={selectClass}
            >
              <option value="">{negeri ? 'Semua Parlimen' : 'Pilih negeri dahulu'}</option>
              {negeri &&
                parlimenNegeri(kawasan, negeri).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">ADUN</label>
            <select
              value={dun}
              onChange={(e) => {
                const d = e.target.value
                setDun(d)
                if (d && !parlimen) setParlimen(parlimenBagiDun(kawasan, negeri, d) ?? '')
              }}
              disabled={!negeri}
              className={selectClass}
            >
              <option value="">{negeri ? 'Semua ADUN' : 'Pilih negeri dahulu'}</option>
              {negeri &&
                dunNegeri(kawasan, negeri, parlimen || undefined).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Poket:</span>
          {SENARAI_POKET.map((p) => {
            const aktif = poket.includes(p.id)
            const Ikon = IKON_POKET[p.id]
            return (
              <button
                key={p.id}
                onClick={() => togolPoket(p.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                  aktif
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
                }`}
              >
                <Ikon size={13} />
                {p.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={jana}
            disabled={memuat}
            className="flex items-center gap-1.5 rounded-full bg-[#0b2a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123a7a] disabled:opacity-60"
          >
            {memuat ? <Loader2 size={15} className="animate-spin" /> : <ClipboardList size={15} />}
            {memuat ? 'Mengumpul data...' : 'Jana Pratonton'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={muatTurun}
            disabled={!data || menjana}
            title={data ? undefined : 'Jana pratonton dahulu'}
            className="flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {menjana ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {menjana ? 'Menjana PDF...' : 'Muat Turun PDF'}
          </motion.button>
        </div>

        {ralat && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle size={14} />
            {ralat}
          </p>
        )}
      </div>

      {/* Preview */}
      {data && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-[#0b2a5c] px-5 py-4 text-white shadow-lg">
            <p className="text-xs font-semibold tracking-wide text-orange-300">POCKET DATA</p>
            <p className="text-lg font-semibold">{labelSkop(data.tapisan)}</p>
            <p className="text-xs text-white/70">Setakat {new Date(data.dijanaPada).toLocaleString('ms-MY')}</p>
          </div>

          {data.bencana && (
            <Seksyen id="bencana">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Petak label="Bencana aktif" nilai={n(data.bencana.bencanaAktif)} warna="text-orange-600" />
                <Petak label="PPS dibuka" nilai={n(data.bencana.pps)} />
                <Petak label="Mangsa" nilai={n(data.bencana.mangsa)} warna="text-red-600" />
                <Petak label="Keluarga" nilai={n(data.bencana.keluarga)} warna="text-sky-700" />
                <Petak label="Daerah terjejas" nilai={n(data.bencana.daerahTerjejas)} />
              </div>
              {data.bencana.ikutDaerah.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Daerah paling terjejas
                  </p>
                  <div className="divide-y divide-neutral-100 rounded-xl border border-white/60 bg-white/60">
                    {data.bencana.ikutDaerah.slice(0, 5).map((d) => (
                      <div key={`${d.negeri}|${d.daerah}`} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium text-neutral-800">
                          {d.daerah}
                          {!data.tapisan.negeri && <span className="text-neutral-400"> · {d.negeri}</span>}
                        </span>
                        <span className="text-neutral-600">
                          {n(d.pps)} PPS · {n(d.mangsa)} mangsa
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Seksyen>
          )}

          {data.tapisan.poket.includes('personel') && (
            <Seksyen id="personel">
              <p className="text-sm italic text-neutral-500">
                Akan datang: bilangan anggota Aktif dan Simpanan yang boleh dikerahkan.
              </p>
            </Seksyen>
          )}

          {data.logistik && (
            <Seksyen id="logistik">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Petak
                  label="Jumlah aset"
                  nilai={n(data.logistik.jumlah.jumlah)}
                  sub={`${peratus(data.logistik.jumlah.baik, data.logistik.jumlah.jumlah)}% sedia digunakan`}
                />
                <Petak
                  label="Baik"
                  nilai={n(data.logistik.jumlah.baik)}
                  warna="text-emerald-700"
                  sub={`${peratus(data.logistik.jumlah.baik, data.logistik.jumlah.jumlah)}%`}
                />
                <Petak
                  label="Selenggara"
                  nilai={n(data.logistik.jumlah.selenggara)}
                  warna="text-amber-600"
                  sub={`${peratus(data.logistik.jumlah.selenggara, data.logistik.jumlah.jumlah)}%`}
                />
                <Petak
                  label="Rosak"
                  nilai={n(data.logistik.jumlah.rosak)}
                  warna="text-red-600"
                  sub={`${peratus(data.logistik.jumlah.rosak, data.logistik.jumlah.jumlah)}%`}
                />
              </div>
              <div className="mt-4 space-y-2">
                {data.logistik.ikutJenis.map((j) => (
                  <div key={j.nama} className="grid grid-cols-[90px_1fr_60px] items-center gap-3 text-sm">
                    <span className="font-medium text-neutral-800">{j.nama}</span>
                    <BarKeadaan c={j} />
                    <span className="text-right text-neutral-500">{n(j.jumlah)} unit</span>
                  </div>
                ))}
              </div>
            </Seksyen>
          )}

          {data.tapisan.poket.includes('bantuan') && (
            <Seksyen id="bantuan">
              {!data.bantuan ? (
                <p className="text-sm italic text-neutral-500">Data bantuan tidak dapat dibaca untuk akaun ini.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Petak label="Jumlah sumbangan" nilai={n(data.bantuan.jumlah)} />
                    <Petak label="Diterima" nilai={n(data.bantuan.ikutStatus.TERIMA)} warna="text-emerald-700" />
                    <Petak label="Dalam proses" nilai={n(data.bantuan.ikutStatus.DALAM_PROSES)} warna="text-amber-600" />
                    <Petak label="Pendaftaran NGO" nilai={n(data.bantuan.jumlahNgo)} warna="text-sky-700" />
                  </div>
                  {data.bantuan.ikutKumpulan.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {data.bantuan.ikutKumpulan.map((k) => (
                        <span key={k.nama} className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700">
                          {k.nama}: {n(k.jumlah)}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Seksyen>
          )}

          <div className="rounded-xl border border-white/60 bg-white/40 p-3 text-xs text-neutral-500">
            {notaSkop(data.tapisan).map((x) => (
              <p key={x}>• {x}</p>
            ))}
            <p>• Jadual penuh (senarai bencana, PPS mengikut daerah, aset selenggara/rosak) ada dalam PDF.</p>
          </div>
        </div>
      )}
    </div>
  )
}