import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
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
} from '../lib/laporanBencana'
import type { FieldDef } from '../lib/laporanBencana'

const SEMUA_FIELD: FieldDef[] = [
  TARIKH_MASA_FIELD,
  ...KEJADIAN_FIELDS,
  HAL_LAIN_FIELD,
  ...PENYEDIA_FIELDS,
  ...PERHATIAN_FIELDS,
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
          type={def.type === 'datetime' ? 'datetime-local' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  )
}

function Bahagian({ tajuk, children }: { tajuk: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">{tajuk}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export function LaporanAwam() {
  const navigate = useNavigate()
  const [jenis, setJenis] = useState<string>('')
  const [nilai, setNilai] = useState<Record<string, string>>({})
  const [menghantar, setMenghantar] = useState(false)
  const [dihantar, setDihantar] = useState(false)
  const [ralat, setRalat] = useState('')

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

  async function handleHantar() {
    setRalat('')

    if (!jenis) {
      setRalat('Sila pilih jenis laporan.')
      return
    }
    const tiadaIsi = SEMUA_FIELD.find((f) => f.required && !nilai[f.key]?.trim())
    if (tiadaIsi) {
      setRalat(`Sila isi ruangan "${tiadaIsi.label}".`)
      return
    }

    const rekod: Record<string, string | null> = {}
    for (const f of SEMUA_FIELD) {
      const v = (nilai[f.key] ?? '').trim()
      rekod[f.key] = !v ? null : f.type === 'datetime' ? new Date(v).toISOString() : v
    }

    setMenghantar(true)
    const { error } = await supabase.rpc('submit_laporan_bencana', {
      p_code: ambilKod('laporan'),
      p_data: { jenis_laporan: jenis, ...rekod },
    })
    setMenghantar(false)

    if (error?.code === '42501') {
      // code is no longer valid: clear it and ask again
      padamKod('laporan')
      window.location.reload()
      return
    }

    if (error) {
      setRalat('Gagal menghantar laporan. Sila cuba lagi.')
      return
    }

    setNilai({})
    setJenis('')
    setDihantar(true)
    setTimeout(() => setDihantar(false), 4000)
  }

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
                      onClick={() => setJenis(value)}
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

            <div className="grid gap-4 sm:grid-cols-2">{renderMedan(TARIKH_MASA_FIELD)}</div>

            <Bahagian tajuk="Maklumat Kejadian">{KEJADIAN_FIELDS.map(renderMedan)}</Bahagian>

            <Bahagian tajuk="Hal-hal Lain">{renderMedan(HAL_LAIN_FIELD)}</Bahagian>

            <Bahagian tajuk="Disediakan Oleh">{PENYEDIA_FIELDS.map(renderMedan)}</Bahagian>

            <Bahagian tajuk="Telah Diberi Perhatian">{PERHATIAN_FIELDS.map(renderMedan)}</Bahagian>

            {ralat && <p className="text-sm text-red-600">{ralat}</p>}

            {dihantar && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                Laporan anda berjaya dihantar. Terima kasih!
              </motion.div>
            )}

            <motion.button
              type="button"
              onClick={handleHantar}
              disabled={menghantar}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {menghantar ? 'Menghantar...' : dihantar ? 'Berjaya dihantar ✓' : 'HANTAR'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}