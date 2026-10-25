import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, Copy, Check, KeyRound, Loader2, Pencil, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Admin: the access codes of the public pages protected by a code (Laporan, PARAS…).
// PKOP only (checked on the server). A hashed code can't be shown, only replaced.

type KodAkses = {
  page: string
  code: string | null // null when stored hashed
  bercincang: boolean
  dikemaskini_pada: string | null
  dikemaskini_oleh: string | null
}

const LABEL_HALAMAN: Record<string, string> = {
  laporan: 'Laporan Bencana (/laporan)',
  paras: 'PARAS (/paras)',
}

const tarikhMasa = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function TukarKodModal({
  kod,
  onClose,
  onSelesai,
}: {
  kod: KodAkses
  onClose: () => void
  onSelesai: (baru: string) => void
}) {
  const [baru, setBaru] = useState('')
  const [sahkan, setSahkan] = useState('')
  const [lihat, setLihat] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')

  async function simpan() {
    setRalat('')
    if (baru.trim().length < 6) return setRalat('Kod mesti sekurang-kurangnya 6 aksara.')
    if (baru.trim() !== sahkan.trim()) return setRalat('Kod tidak sepadan.')
    setMenyimpan(true)
    const { error } = await supabase.rpc('tukar_kod_akses', { p_page: kod.page, p_code: baru.trim() })
    setMenyimpan(false)
    if (error) {
      setRalat(error.code === '42501' ? 'Anda tiada kebenaran untuk tindakan ini.' : 'Gagal menukar kod. Sila cuba lagi.')
      return
    }
    onSelesai(baru.trim())
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-emerald-600'

  return createPortal(
    <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Tukar Kod Akses</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-neutral-500">{LABEL_HALAMAN[kod.page] ?? kod.page}</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Kod baharu</label>
            <div className="relative">
              <input
                type={lihat ? 'text' : 'password'}
                value={baru}
                onChange={(e) => setBaru(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setLihat((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
              >
                {lihat ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Sahkan kod baharu</label>
            <input
              type={lihat ? 'text' : 'password'}
              value={sahkan}
              onChange={(e) => setSahkan(e.target.value)}
              className={inputClass}
            />
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Selepas ditukar, pengguna halaman ini perlu memasukkan kod baharu. Maklumkan kod baharu kepada mereka.
          </p>
        </div>

        {ralat && <p className="mt-3 text-sm text-red-600">{ralat}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Batal
          </button>
          <button
            onClick={simpan}
            disabled={menyimpan}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {menyimpan && <Loader2 size={15} className="animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function KodAksesSection() {
  const [senarai, setSenarai] = useState<KodAkses[]>([])
  const [memuat, setMemuat] = useState(true)
  const [ralat, setRalat] = useState('')
  const [dilihat, setDilihat] = useState<Set<string>>(new Set())
  const [disalin, setDisalin] = useState<string | null>(null)
  const [ditukar, setDitukar] = useState<KodAkses | null>(null)
  // A hashed code can't be read back: the new one is shown once after a change
  const [kodBaharu, setKodBaharu] = useState<{ page: string; code: string } | null>(null)

  const muat = useCallback(async () => {
    const { data, error } = await supabase.rpc('senarai_kod_akses')
    setMemuat(false)
    if (error) {
      setRalat('Gagal memuatkan kod akses.')
      return
    }
    setRalat('')
    setSenarai((data as KodAkses[]) ?? [])
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  function togol(page: string) {
    setDilihat((prev) => {
      const s = new Set(prev)
      if (s.has(page)) s.delete(page)
      else s.add(page)
      return s
    })
  }

  async function salin(page: string, code: string) {
    await navigator.clipboard.writeText(code)
    setDisalin(page)
    setTimeout(() => setDisalin(null), 1500)
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/60 bg-white/40 p-5 shadow-lg backdrop-blur-md">
      <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
        <KeyRound size={17} className="text-emerald-700" />
        Kod Akses Halaman
      </h2>
      <p className="mt-1 text-xs text-neutral-500">Kod yang diperlukan untuk membuka halaman awam yang dilindungi.</p>

      {memuat ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 size={15} className="animate-spin" /> Memuatkan…
        </p>
      ) : ralat ? (
        <p className="mt-4 text-sm text-red-600">{ralat}</p>
      ) : (
        <div className="mt-4 divide-y divide-white/60">
          {senarai.map((k) => {
            const nampak = dilihat.has(k.page)
            const baruDitukar = kodBaharu?.page === k.page ? kodBaharu.code : null
            const kodPapar = k.code ?? baruDitukar
            return (
              <div key={k.page} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{LABEL_HALAMAN[k.page] ?? k.page}</p>
                  <p className="text-xs text-neutral-500">
                    {k.dikemaskini_pada
                      ? `Ditukar ${tarikhMasa(k.dikemaskini_pada)}${k.dikemaskini_oleh ? ` oleh ${k.dikemaskini_oleh}` : ''}`
                      : 'Belum pernah ditukar melalui sistem'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {kodPapar ? (
                    <>
                      <code className="rounded-lg bg-white/80 px-3 py-1.5 font-mono text-sm text-neutral-800">
                        {nampak || baruDitukar ? kodPapar : '••••••••'}
                      </code>
                      {!baruDitukar && (
                        <button
                          onClick={() => togol(k.page)}
                          title={nampak ? 'Sembunyi' : 'Lihat'}
                          className="rounded-full p-2 text-neutral-500 hover:bg-white/80 hover:text-neutral-800"
                        >
                          {nampak ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => salin(k.page, kodPapar)}
                        title="Salin"
                        className="rounded-full p-2 text-neutral-500 hover:bg-white/80 hover:text-neutral-800"
                      >
                        {disalin === k.page ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                    </>
                  ) : (
                    <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500">
                      Tersembunyi (disulitkan)
                    </span>
                  )}
                  <button
                    onClick={() => setDitukar(k)}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-emerald-500 hover:text-emerald-700"
                  >
                    <Pencil size={13} />
                    Tukar
                  </button>
                </div>
              </div>
            )
          })}
          {senarai.length === 0 && <p className="py-3 text-sm text-neutral-500">Tiada kod akses.</p>}
        </div>
      )}

      {ditukar && (
        <TukarKodModal
          kod={ditukar}
          onClose={() => setDitukar(null)}
          onSelesai={(baru) => {
            if (ditukar.bercincang) setKodBaharu({ page: ditukar.page, code: baru })
            setDitukar(null)
            muat()
          }}
        />
      )}
    </div>
  )
}