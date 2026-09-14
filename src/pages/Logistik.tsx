import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
} from 'lucide-react'
import { DashboardCard } from '../components/DashboardCard'
import { TambahKenderaanModal } from '../components/TambahKenderaanModal'
import { KenderaanDetailPanel } from '../components/KenderaanDetailPanel'
import type { KenderaanRow } from '../components/KenderaanDetailPanel'
import { JENIS_KENDERAAN, JENIS_LABEL, JENIS_DEFAULT_PHOTO } from '../lib/kenderaanVisual'
import { supabase } from '../lib/supabase'

type DokumenRow = {
  id: string
  file_name: string
  file_path: string
  created_at: string
}

export function Logistik() {
  const [dokumen, setDokumen] = useState<DokumenRow | null>(null)
  const [dokumenUrl, setDokumenUrl] = useState('')
  const [loadingDokumen, setLoadingDokumen] = useState(true)
  const [memuatNaik, setMemuatNaik] = useState(false)
  const [ralat, setRalat] = useState('')
  const [pendingDeleteDokumen, setPendingDeleteDokumen] = useState(false)
  const [memadamDokumen, setMemadamDokumen] = useState(false)
  const [notifikasi, setNotifikasi] = useState<{ jenis: 'success' | 'error'; mesej: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [kenderaan, setKenderaan] = useState<KenderaanRow[]>([])
  const [loadingKenderaan, setLoadingKenderaan] = useState(true)
  const [modalKenderaanOpen, setModalKenderaanOpen] = useState(false)
  const [selectedKenderaan, setSelectedKenderaan] = useState<KenderaanRow | null>(null)
  const [pendingDeleteKenderaan, setPendingDeleteKenderaan] = useState<KenderaanRow | null>(null)
  const [carian, setCarian] = useState('')
  const [tapisJenis, setTapisJenis] = useState('')
  const [tapisKeadaan, setTapisKeadaan] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [arah, setArah] = useState(1)
  const SAIZ_HALAMAN = 9

  function beriNotifikasi(jenis: 'success' | 'error', mesej: string) {
    setNotifikasi({ jenis, mesej })
    setTimeout(() => setNotifikasi(null), 3000)
  }

  async function muatSemulaDokumen() {
    setLoadingDokumen(true)
    const { data } = await supabase
      .from('logistik_dokumen')
      .select('id, file_name, file_path, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const row = (data as DokumenRow | null) ?? null
    setDokumen(row)

    if (row) {
      const result = await supabase.storage
        .from('logistik-dokumen')
        .createSignedUrl(row.file_path, 3600)
      setDokumenUrl(result.data ? result.data.signedUrl : '')
    } else {
      setDokumenUrl('')
    }
    setLoadingDokumen(false)
  }

  async function muatSemulaKenderaan() {
    setLoadingKenderaan(true)
    const { data } = await supabase
      .from('logistik_kenderaan')
      .select('id, nama_kenderaan, nombor_plat, jenis_kenderaan, keadaan, keterangan_kerosakan, foto_url, created_at')
      .order('created_at', { ascending: false })

    setKenderaan((data as KenderaanRow[]) ?? [])
    setLoadingKenderaan(false)
  }

  useEffect(() => {
    setHalaman(1)
  }, [carian, tapisJenis, tapisKeadaan])

  useEffect(() => {
    muatSemulaDokumen()
    muatSemulaKenderaan()
  }, [])

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const fail = e.target.files?.[0]
    if (!fail) return

    setRalat('')
    setMemuatNaik(true)

    // Single-slot model: remove the previous file (storage + row) before
    // uploading the new one, since only one current document is kept.
    if (dokumen) {
      await supabase.storage.from('logistik-dokumen').remove([dokumen.file_path])
      await supabase.from('logistik_dokumen').delete().eq('id', dokumen.id)
    }

    const filePath = `${crypto.randomUUID()}-${fail.name}`

    const { error: uploadError } = await supabase.storage
      .from('logistik-dokumen')
      .upload(filePath, fail)

    if (uploadError) {
      setRalat('Gagal memuat naik dokumen. Sila cuba lagi.')
      setMemuatNaik(false)
      return
    }

    const { error: insertError } = await supabase.from('logistik_dokumen').insert({
      file_name: fail.name,
      file_path: filePath,
    })

    if (insertError) {
      setRalat('Dokumen dimuat naik, tetapi rekod gagal disimpan.')
      setMemuatNaik(false)
      return
    }

    setMemuatNaik(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    muatSemulaDokumen()
  }

  async function handleDeleteDokumen() {
    if (!dokumen) return
    const row = dokumen
    setMemadamDokumen(true)

    const { error: storageError } = await supabase.storage
      .from('logistik-dokumen')
      .remove([row.file_path])
    const { error: dbError } = await supabase
      .from('logistik_dokumen')
      .delete()
      .eq('id', row.id)

    setMemadamDokumen(false)
    setPendingDeleteDokumen(false)

    if (storageError || dbError) {
      beriNotifikasi('error', `Gagal memadam "${row.file_name}". Sila cuba lagi.`)
      muatSemulaDokumen()
    } else {
      setDokumen(null)
      setDokumenUrl('')
      beriNotifikasi('success', `"${row.file_name}" berjaya dipadam.`)
    }
  }

  async function handleDeleteKenderaan() {
    if (!pendingDeleteKenderaan) return
    const row = pendingDeleteKenderaan
    setPendingDeleteKenderaan(null)
    setSelectedKenderaan(null)

    const { error } = await supabase.from('logistik_kenderaan').delete().eq('id', row.id)

    if (error) {
      beriNotifikasi('error', `Gagal memadam "${row.nama_kenderaan}".`)
    } else {
      setKenderaan((prev) => prev.filter((k) => k.id !== row.id))
      beriNotifikasi('success', `"${row.nama_kenderaan}" berjaya dipadam.`)
    }
  }

  const kenderaanTertapis = kenderaan.filter((k) => {
    const cocokCarian =
      carian.trim() === '' ||
      k.nama_kenderaan.toLowerCase().includes(carian.toLowerCase()) ||
      k.nombor_plat.toLowerCase().includes(carian.toLowerCase())
    const cocokJenis = tapisJenis === '' || k.jenis_kenderaan === tapisJenis
    const cocokKeadaan = tapisKeadaan === '' || k.keadaan === tapisKeadaan
    return cocokCarian && cocokJenis && cocokKeadaan
  })

  const jumlahHalaman = Math.max(1, Math.ceil(kenderaanTertapis.length / SAIZ_HALAMAN))
  const kenderaanHalamanIni = kenderaanTertapis.slice(
    (halaman - 1) * SAIZ_HALAMAN,
    halaman * SAIZ_HALAMAN,
  )

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-1.5 text-sm">
            <Home size={13} className="text-neutral-400" />
            <span className="text-neutral-400">Portal</span>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="font-medium text-emerald-700">Logistik</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Logistik</h1>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setModalKenderaanOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Plus size={16} />
          Tambah Kenderaan
        </motion.button>
      </div>

      <AnimatePresence>
        {notifikasi && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`mt-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              notifikasi.jenis === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {notifikasi.jenis === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            ) : (
              <XCircle size={18} className="shrink-0 text-red-600" />
            )}
            {notifikasi.mesej}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rekod logistik (dokumen) — on top */}
      <DashboardCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-neutral-900">Rekod logistik</h2>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={memuatNaik}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-300 disabled:opacity-60"
            >
              <UploadCloud size={16} />
              {memuatNaik ? 'Memuat naik...' : 'Muat Naik Dokumen'}
            </motion.button>
          </div>
        </div>

        <p className="mt-2 text-xs text-neutral-400">
          Nota: memuat naik fail baru akan menggantikan fail sedia ada.
        </p>

        {ralat && <p className="mt-2 text-sm text-red-600">{ralat}</p>}

        <div className="mt-4">
          {loadingDokumen ? (
            <p className="text-sm text-neutral-400">Memuatkan...</p>
          ) : !dokumen ? (
            <p className="text-sm text-neutral-500">Tiada dokumen dimuat naik lagi.</p>
          ) : (
            <AnimatePresence>
              <motion.div
                key={dokumen.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -16, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-neutral-100 bg-white/60 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={18} className="shrink-0 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-800">{dokumen.file_name}</p>
                    <p className="text-xs text-neutral-400">
                      {new Date(dokumen.created_at).toLocaleString('ms-MY')}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {dokumenUrl ? (
                    <a
                      href={dokumenUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                    >
                      <Download size={14} />
                      Muat turun
                    </a>
                  ) : (
                    <span className="text-xs font-medium text-red-500">Tidak tersedia</span>
                  )}

                  <button
                    onClick={() => setPendingDeleteDokumen(true)}
                    title="Padam dokumen"
                    className="rounded-full border border-neutral-200 p-1.5 text-neutral-400 hover:border-red-300 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </DashboardCard>

      {/* Kenderaan */}
      <div className="mt-6">
        <h2 className="mb-3 text-base font-medium text-neutral-900">Kenderaan</h2>

        <div className="mb-4 space-y-3 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-md">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={carian}
              onChange={(e) => setCarian(e.target.value)}
              placeholder="Cari nama atau nombor plat..."
              className="w-full rounded-full border border-white/60 bg-white/60 py-2.5 pl-9 pr-4 text-sm text-neutral-900 outline-none backdrop-blur-md focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Jenis:</span>
            <button
              onClick={() => setTapisJenis('')}
              className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                tapisJenis === ''
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
              }`}
            >
              Semua
            </button>
            {JENIS_KENDERAAN.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTapisJenis(tapisJenis === value ? '' : value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                  tapisJenis === value
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Keadaan:</span>
            {[
              { value: '', label: 'Semua' },
              { value: 'baik', label: 'Baik' },
              { value: 'rosak', label: 'Rosak' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTapisKeadaan(value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                  tapisKeadaan === value
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-white/60 bg-white/40 text-neutral-600 hover:border-emerald-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadingKenderaan ? (
          <p className="text-sm text-neutral-400">Memuatkan...</p>
        ) : kenderaan.length === 0 ? (
          <DashboardCard>
            <p className="text-sm text-neutral-500">Tiada kenderaan direkodkan lagi.</p>
          </DashboardCard>
        ) : kenderaanTertapis.length === 0 ? (
          <DashboardCard>
            <p className="text-sm text-neutral-500">Tiada kenderaan sepadan dengan carian/tapisan.</p>
          </DashboardCard>
        ) : (
          <AnimatePresence mode="wait" custom={arah}>
            <motion.div
              key={halaman}
              custom={arah}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
                center: { opacity: 1, x: 0 },
                exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {kenderaanHalamanIni.map((k) => {
                const gambar = k.foto_url ?? JENIS_DEFAULT_PHOTO[k.jenis_kenderaan] ?? JENIS_DEFAULT_PHOTO['4wd']
                const baik = k.keadaan === 'baik'
                return (
                  <motion.button
                    key={k.id}
                    layout
                    onClick={() => setSelectedKenderaan(k)}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 text-left shadow-lg backdrop-blur-md transition-colors hover:border-emerald-500"
                  >
                    <div className="h-48 w-full bg-neutral-100">
                      <img
                        src={gambar}
                        alt={k.nama_kenderaan}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="p-4">
                      <p className="truncate font-medium text-neutral-900">{k.nama_kenderaan}</p>
                      <p className="text-xs text-neutral-500">{k.nombor_plat}</p>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                          {JENIS_LABEL[k.jenis_kenderaan] ?? k.jenis_kenderaan}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            baik ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {baik ? 'BAIK' : 'ROSAK'}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {kenderaanTertapis.length > SAIZ_HALAMAN && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setArah(-1)
                setHalaman((h) => Math.max(1, h - 1))
              }}
              disabled={halaman === 1}
              className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-600 backdrop-blur-md hover:border-emerald-400 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Sebelum
            </button>

            <span className="text-xs font-medium text-neutral-500">
              Halaman {halaman} / {jumlahHalaman}
            </span>

            <button
              onClick={() => {
                setArah(1)
                setHalaman((h) => Math.min(jumlahHalaman, h + 1))
              }}
              disabled={halaman === jumlahHalaman}
              className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-600 backdrop-blur-md hover:border-emerald-400 disabled:opacity-40"
            >
              Seterusnya
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <TambahKenderaanModal
        open={modalKenderaanOpen}
        onClose={() => setModalKenderaanOpen(false)}
        onSuccess={() => {
          setModalKenderaanOpen(false)
          muatSemulaKenderaan()
          beriNotifikasi('success', 'Kenderaan berjaya ditambah.')
        }}
      />

      <KenderaanDetailPanel
        kenderaan={selectedKenderaan}
        onClose={() => setSelectedKenderaan(null)}
        onUpdated={() => {
          muatSemulaKenderaan()
          setSelectedKenderaan(null)
          beriNotifikasi('success', 'Kenderaan berjaya dikemas kini.')
        }}
        onRequestDelete={(row) => setPendingDeleteKenderaan(row)}
      />

      {/* Confirm delete: dokumen */}
      <AnimatePresence>
        {pendingDeleteDokumen && dokumen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm"
            onClick={() => !memadamDokumen && setPendingDeleteDokumen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/95 p-6 text-center shadow-xl backdrop-blur-md"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-neutral-900">
                Padam dokumen ini?
              </h2>
              <p className="mt-1 truncate text-sm text-neutral-500">{dokumen.file_name}</p>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setPendingDeleteDokumen(false)}
                  disabled={memadamDokumen}
                  className="flex-1 rounded-full border border-neutral-200 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-300 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteDokumen}
                  disabled={memadamDokumen}
                  className="flex-1 rounded-full bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {memadamDokumen ? 'Memadam...' : 'Padam'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete: kenderaan */}
      <AnimatePresence>
        {pendingDeleteKenderaan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm"
            onClick={() => setPendingDeleteKenderaan(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/95 p-6 text-center shadow-xl backdrop-blur-md"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-neutral-900">
                Padam kenderaan ini?
              </h2>
              <p className="mt-1 truncate text-sm text-neutral-500">
                {pendingDeleteKenderaan.nama_kenderaan}
              </p>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setPendingDeleteKenderaan(null)}
                  className="flex-1 rounded-full border border-neutral-200 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-300"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteKenderaan}
                  className="flex-1 rounded-full bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Padam
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
