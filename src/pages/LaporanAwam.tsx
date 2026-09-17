import { useState, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, UploadCloud, FileText, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import apmLogo from '../assets/apm-logo.png'

const JENIS_LAPORAN = [
  { value: 'awal', label: 'Laporan Awal' },
  { value: 'semasa', label: 'Laporan Semasa' },
] as const

const JENIS_DIBENARKAN = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export function LaporanAwam() {
  const navigate = useNavigate()
  const [fail, setFail] = useState<File | null>(null)
  const [jenis, setJenis] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const [menghantar, setMenghantar] = useState(false)
  const [dihantar, setDihantar] = useState(false)
  const [ralat, setRalat] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function terimaFail(file: File) {
    if (!JENIS_DIBENARKAN.includes(file.type)) {
      setRalat('Hanya fail PDF, Word (.docx) atau Excel (.xlsx) dibenarkan.')
      return
    }
    setRalat('')
    setFail(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) terimaFail(dropped)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) terimaFail(picked)
  }

  async function handleHantar() {
    setRalat('')

    if (!fail) {
      setRalat('Sila muat naik fail terlebih dahulu.')
      return
    }
    if (!JENIS_DIBENARKAN.includes(fail.type)) {
      setRalat('Hanya fail PDF, Word (.docx) atau Excel (.xlsx) dibenarkan.')
      return
    }
    if (!jenis) {
      setRalat('Sila pilih jenis laporan.')
      return
    }

    setMenghantar(true)

    const filePath = `${crypto.randomUUID()}-${fail.name}`

    const { error: uploadError } = await supabase.storage
      .from('laporan-awam')
      .upload(filePath, fail)

    if (uploadError) {
      setRalat('Gagal memuat naik fail. Sila cuba lagi.')
      setMenghantar(false)
      return
    }

    const { error: insertError } = await supabase.from('laporan_awam').insert({
      jenis_laporan: jenis,
      file_path: filePath,
      file_name: fail.name,
    })

    if (insertError) {
      setRalat('Fail dimuat naik, tetapi rekod gagal disimpan.')
      setMenghantar(false)
      return
    }

    setFail(null)
    setJenis('')
    setMenghantar(false)
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
            <h1 className="text-xl font-semibold text-neutral-900">Laporan</h1>
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
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Muat naik fail
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
                  dragging
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-neutral-300 bg-white/60 hover:border-neutral-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.docx,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {fail ? (
                  <div className="flex items-center gap-2 text-sm text-neutral-800">
                    <FileText size={18} className="text-emerald-700" />
                    <span className="max-w-xs truncate">{fail.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFail(null)
                      }}
                      className="ml-1 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={28} className="text-neutral-400" />
                    <p className="text-sm text-neutral-600">
                      Seret &amp; lepas fail di sini, atau <span className="font-medium text-emerald-700">klik untuk pilih</span>
                    </p>
                    <p className="text-xs text-neutral-400">Format PDF, Word (.docx) atau Excel (.xlsx) sahaja</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Jenis Laporan
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
