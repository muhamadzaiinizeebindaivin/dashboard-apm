import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Loader2, MapPin, MapPinned } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ambilKod, padamKod } from '../lib/accessCode'
import apmLogo from '../assets/apm-logo.png'
import {
  JENIS_LAPORAN,
  TARIKH_MASA_FIELD,
  KEJADIAN_FIELDS,
  HAL_LAIN_FIELD,
  PENYEDIA_FIELDS,
  SEMASA_MAKLUMAT_FIELDS,
  SEMASA_PENYEDIA_FIELDS,
  RINGKASAN_STATUS,
  PPS_FIELDS,
  cariZon,
} from '../lib/laporanBencana'
import type { FieldDef } from '../lib/laporanBencana'
import { SenaraiPpsInput } from '../components/SenaraiPpsInput'
import { PilihLokasiModal } from '../components/PilihLokasiModal'
import { normalNamaPps, ppsKosong, semakPps } from '../lib/ppsPusat'
import type { PpsInput, PpsSediaAda } from '../lib/ppsPusat'

const AWAL_FIELD: FieldDef[] = [
  TARIKH_MASA_FIELD,
  ...KEJADIAN_FIELDS,
  HAL_LAIN_FIELD,
  ...PENYEDIA_FIELDS,
]

const SEMASA_FIELD: FieldDef[] = [
  ...SEMASA_MAKLUMAT_FIELDS,
  TARIKH_MASA_FIELD,
  HAL_LAIN_FIELD,
  ...SEMASA_PENYEDIA_FIELDS,
]

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

type MedanProps = { def: FieldDef; value: string; onChange: (v: string) => void }

function Medan({ def, value, onChange }: MedanProps) {
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
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

type Berjaya = { jenis: string; nama: string; masa: Date }

type KejayaanHantarProps = { berjaya: Berjaya; onLagi: () => void; onKeluar: () => void }

// Shown in place of the form after a successful submit, until the user
// chooses what to do next (no auto-dismiss).
function KejayaanHantar({ berjaya, onLagi, onKeluar }: KejayaanHantarProps) {
  const labelJenis = JENIS_LAPORAN.find((j) => j.value === berjaya.jenis)?.label ?? 'Laporan'

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
            <dt className="text-neutral-500">Nama bencana</dt>
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

export function LaporanAwam() {
  const navigate = useNavigate()
  const [jenis, setJenis] = useState<string>('')
  const [nilai, setNilai] = useState<Record<string, string>>({})
  const [ringkasan, setRingkasan] = useState<string>('')
  const [menghantar, setMenghantar] = useState(false)
  const [berjaya, setBerjaya] = useState<Berjaya | null>(null)
  const [ralat, setRalat] = useState('')
  const [senaraiPps, setSenaraiPps] = useState<PpsInput[]>(() => [ppsKosong()])
  const [lokasiBencana, setLokasiBencana] = useState<[number, number] | null>(null)
  const [petaBuka, setPetaBuka] = useState(false)
  const [memuatPps, setMemuatPps] = useState(false)

  // Prefill the PPS still open for this disaster + negeri, so the reporter
  // updates their numbers instead of retyping names (avoids duplicates and
  // false "cadangan tutup" flags for PPS they forgot to list).
  const namaBencana = (nilai.nama_bencana ?? '').trim()
  const negeriPps = nilai.pps_negeri ?? ''
  const daerahPps = (nilai.pps_daerah ?? '').trim()

  useEffect(() => {
    if (jenis !== 'semasa' || ringkasan !== 'ada_perubahan' || !namaBencana || !negeriPps || !daerahPps) return

    let batal = false
    const t = setTimeout(async () => {
      setMemuatPps(true)
      const { data, error } = await supabase.rpc('senarai_pps_bencana', {
        p_code: ambilKod('laporan'),
        p_nama_bencana: namaBencana,
        p_negeri: negeriPps,
        p_daerah: daerahPps,
      })
      setMemuatPps(false)
      if (batal || error || !data) return

      const sedia: PpsInput[] = (data as PpsSediaAda[]).map((p) => ({
        kunci: crypto.randomUUID(),
        nama: p.nama,
        mangsa: String(p.jumlah_mangsa ?? 0),
        keluarga: String(p.jumlah_keluarga ?? 0),
        latitude: p.latitude,
        longitude: p.longitude,
        sedia: true,
      }))

      setSenaraiPps((prev) => {
        // Keep PPS the reporter added by hand, replace previously prefilled ones
        const tambahan = prev.filter(
          (r) => !r.sedia && r.nama.trim() && !sedia.some((s) => normalNamaPps(s.nama) === normalNamaPps(r.nama)),
        )
        const gabung = [...sedia, ...tambahan]
        return gabung.length > 0 ? gabung : [ppsKosong()]
      })
    }, 500)

    return () => {
      batal = true
      clearTimeout(t)
    }
  }, [jenis, ringkasan, namaBencana, negeriPps, daerahPps])

  function renderMedan(def: FieldDef) {
    return (
      <Medan
        key={def.key}
        def={def}
        value={nilai[def.key] ?? ''}
        onChange={(v) => setNilai((prev) => ({ ...prev, [def.key]: v }))}
      />
    )
  }

  function pilihJenis(v: string) {
    setJenis(v)
    setNilai({})
    setRingkasan('')
    setRalat('')
    setSenaraiPps([ppsKosong()])
    setLokasiBencana(null)
  }

  async function handleHantar() {
    setRalat('')

    if (!jenis) {
      setRalat('Sila pilih jenis laporan.')
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
        const tiadaPps = PPS_FIELDS.find((f) => f.required && !nilai[f.key]?.trim())
        if (tiadaPps) {
          setRalat(`Sila isi ruangan "${tiadaPps.label}".`)
          return
        }
        const ralatPps = semakPps(senaraiPps)
        if (ralatPps) {
          setRalat(ralatPps)
          return
        }

        const items = senaraiPps.map((r) => ({
          nama: r.nama.trim().replace(/\s+/g, ' '),
          jumlah_mangsa: Number(r.mangsa),
          jumlah_keluarga: Number(r.keluarga),
          latitude: r.latitude,
          longitude: r.longitude,
        }))

        pps = [
          {
            negeri: nilai.pps_negeri,
            daerah: nilai.pps_daerah,
            zon: cariZon(nilai.pps_negeri),
            // Legacy group fields, still read by the daily report until phase 3
            pps: items.map((i) => i.nama).join('\n'),
            jumlah_mangsa: items.reduce((n, i) => n + i.jumlah_mangsa, 0),
            jumlah_keluarga: items.reduce((n, i) => n + i.jumlah_keluarga, 0),
            // New: one entry per PPS
            items,
          },
        ]
      }

      rekod.ringkasan_status = ringkasan
      for (const f of SEMASA_FIELD) {
        const v = (nilai[f.key] ?? '').trim()
        rekod[f.key] = !v ? null : f.type === 'datetime' ? new Date(v).toISOString() : v
      }
    }

    setMenghantar(true)
    const { error } = await supabase.rpc('submit_laporan_bencana', {
      p_code: ambilKod('laporan'),
      p_data: rekod,
      p_pps: pps,
    })
    setMenghantar(false)

    if (error?.code === '42501') {
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

  const zonPps = nilai.pps_negeri ? cariZon(nilai.pps_negeri) : ''

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4 py-10">
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
                {JENIS_LAPORAN.map(({ value, label }) => {
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

            {jenis === 'awal' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">{renderMedan(TARIKH_MASA_FIELD)}</div>
                <Bahagian tajuk="Maklumat Kejadian">{KEJADIAN_FIELDS.map(renderMedan)}</Bahagian>

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
              </>
            )}

            {jenis === 'semasa' && (
              <>
                <Bahagian tajuk="Maklumat Bencana">
                  {SEMASA_MAKLUMAT_FIELDS.map(renderMedan)}
                  {renderMedan(TARIKH_MASA_FIELD)}
                </Bahagian>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Ringkasan Laporan <span className="text-red-500">*</span>
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
                </div>

                {ringkasan === 'ada_perubahan' && (
                  <Bahagian
                    tajuk="Pusat Pemindahan Sementara"
                    anak={
                      zonPps && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Zon {zonPps}
                        </span>
                      )
                    }
                  >
                    {PPS_FIELDS.map(renderMedan)}
                    <SenaraiPpsInput
                      rows={senaraiPps}
                      onChange={setSenaraiPps}
                      memuat={memuatPps}
                      negeri={nilai.pps_negeri}
                    />
                  </Bahagian>
                )}

                <Bahagian tajuk="Hal-hal Lain">{renderMedan(HAL_LAIN_FIELD)}</Bahagian>
                <Bahagian tajuk="Disediakan Oleh">{SEMASA_PENYEDIA_FIELDS.map(renderMedan)}</Bahagian>
              </>
            )}

            {ralat && <p className="text-sm text-red-600">{ralat}</p>}

            {jenis ? (
              <motion.button
                type="button"
                onClick={handleHantar}
                disabled={menghantar}
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {menghantar && <Loader2 size={16} className="animate-spin" />}
                {menghantar ? 'Menghantar...' : 'HANTAR'}
              </motion.button>
            ) : (
              <p className="text-center text-xs text-neutral-400">Pilih jenis laporan untuk bermula.</p>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
