import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { JENIS_KENDERAAN, JENIS_DEFAULT_PHOTO } from '../lib/kenderaanVisual'

type TambahKenderaanModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TambahKenderaanModal({ open, onClose, onSuccess }: TambahKenderaanModalProps) {
  const [namaKenderaan, setNamaKenderaan] = useState('')
  const [nomborPlat, setNomborPlat] = useState('')
  const [jenisKenderaan, setJenisKenderaan] = useState('')
  const [keadaan, setKeadaan] = useState<'baik' | 'rosak' | ''>('')
  const [keteranganKerosakan, setKeteranganKerosakan] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [menghantar, setMenghantar] = useState(false)
  const [ralat, setRalat] = useState('')
  const fotoInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setNamaKenderaan('')
    setNomborPlat('')
    setJenisKenderaan('')
    setKeadaan('')
    setKeteranganKerosakan('')
    setFoto(null)
    setFotoPreview(null)
    setRalat('')
  }

  function handleClose() {
    if (menghantar) return
    reset()
    onClose()
  }

  function handleFotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleHantar() {
    setRalat('')

    if (!namaKenderaan || !nomborPlat || !jenisKenderaan || !keadaan) {
      setRalat('Sila lengkapkan semua medan.')
      return
    }
    if (keadaan === 'rosak' && !keteranganKerosakan.trim()) {
      setRalat('Sila nyatakan jenis/sebab kerosakan.')
      return
    }

    setMenghantar(true)

    let fotoUrl: string | null = null
    if (foto) {
      const path = `${crypto.randomUUID()}-${foto.name}`
      const { error: uploadError } = await supabase.storage.from('kenderaan-foto').upload(path, foto)
      if (uploadError) {
        setRalat('Gagal memuat naik foto. Sila cuba lagi.')
        setMenghantar(false)
        return
      }
      const { data } = supabase.storage.from('kenderaan-foto').getPublicUrl(path)
      fotoUrl = data.publicUrl
    }

    const { error } = await supabase.from('logistik_kenderaan').insert({
      nama_kenderaan: namaKenderaan,
      nombor_plat: nomborPlat,
      jenis_kenderaan: jenisKenderaan,
      keadaan,
      keterangan_kerosakan: keadaan === 'rosak' ? keteranganKerosakan : null,
      foto_url: fotoUrl,
    })

    setMenghantar(false)

    if (error) {
      setRalat('Gagal menyimpan rekod. Sila cuba lagi.')
      return
    }

    reset()
    onSuccess()
  }

  const gambarPratonton = fotoPreview ?? (jenisKenderaan ? JENIS_DEFAULT_PHOTO[jenisKenderaan] : null)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-white/60 bg-white/95 p-6 shadow-xl backdrop-blur-md"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            <h2 className="mb-5 text-base font-semibold text-neutral-900">Tambah Kenderaan</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Foto <span className="font-normal text-neutral-400">(Pilihan)</span>
                </label>
                <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                  {gambarPratonton ? (
                    <img
                      src={gambarPratonton}
                      alt="Pratonton"
                      className={`h-full w-full ${fotoPreview ? 'object-contain' : 'object-cover'}`}
                    />
                  ) : (
                    <Camera size={32} className="text-neutral-400" />
                  )}
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-md hover:bg-white"
                  >
                    <Camera size={14} />
                    {fotoPreview ? 'Tukar' : 'Muat naik'}
                  </button>
                </div>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  Jika tiada foto, ilustrasi lalai mengikut jenis kenderaan akan digunakan.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nama kenderaan
                </label>
                <input
                  value={namaKenderaan}
                  onChange={(e) => setNamaKenderaan(e.target.value)}
                  placeholder="Contoh: Toyota Hilux"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nombor plat
                </label>
                <input
                  value={nomborPlat}
                  onChange={(e) => setNomborPlat(e.target.value)}
                  placeholder="Contoh: JKA 1234"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Jenis kenderaan
                </label>
                <div className="flex flex-wrap gap-2">
                  {JENIS_KENDERAAN.map(({ value, label }) => {
                    const active = jenisKenderaan === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setJenisKenderaan(value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
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

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Keadaan
                </label>
                <div className="flex gap-2">
                  {(['baik', 'rosak'] as const).map((k) => {
                    const active = keadaan === k
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKeadaan(k)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? k === 'baik'
                              ? 'border-emerald-700 bg-emerald-700 text-white'
                              : 'border-red-600 bg-red-600 text-white'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {k === 'baik' ? 'BAIK' : 'ROSAK'}
                      </button>
                    )
                  })}
                </div>

                {keadaan === 'rosak' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.15 }}
                    className="mt-2 overflow-hidden"
                  >
                    <textarea
                      value={keteranganKerosakan}
                      onChange={(e) => setKeteranganKerosakan(e.target.value)}
                      placeholder="Nyatakan jenis kerosakan / sebab (contoh: enjin gagal semasa operasi)"
                      rows={3}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-600"
                    />
                  </motion.div>
                )}
              </div>

              {ralat && <p className="text-sm text-red-600">{ralat}</p>}

              <motion.button
                type="button"
                onClick={handleHantar}
                disabled={menghantar}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {menghantar ? 'Menyimpan...' : 'SIMPAN'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
