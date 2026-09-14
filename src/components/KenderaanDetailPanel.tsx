import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pencil, Trash2, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { JENIS_KENDERAAN, JENIS_LABEL, JENIS_DEFAULT_PHOTO } from '../lib/kenderaanVisual'

export type KenderaanRow = {
  id: string
  nama_kenderaan: string
  nombor_plat: string
  jenis_kenderaan: string
  keadaan: string
  keterangan_kerosakan: string | null
  foto_url: string | null
  created_at: string
}

type KenderaanDetailPanelProps = {
  kenderaan: KenderaanRow | null
  onClose: () => void
  onUpdated: () => void
  onRequestDelete: (row: KenderaanRow) => void
}

export function KenderaanDetailPanel({
  kenderaan,
  onClose,
  onUpdated,
  onRequestDelete,
}: KenderaanDetailPanelProps) {
  const [editing, setEditing] = useState(false)
  const [namaKenderaan, setNamaKenderaan] = useState('')
  const [nomborPlat, setNomborPlat] = useState('')
  const [jenisKenderaan, setJenisKenderaan] = useState('')
  const [keadaan, setKeadaan] = useState<'baik' | 'rosak' | ''>('')
  const [keteranganKerosakan, setKeteranganKerosakan] = useState('')
  const [fotoBaru, setFotoBaru] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoDipadam, setFotoDipadam] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')
  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!kenderaan) return
    setEditing(false)
    setRalat('')
    setNamaKenderaan(kenderaan.nama_kenderaan)
    setNomborPlat(kenderaan.nombor_plat)
    setJenisKenderaan(kenderaan.jenis_kenderaan)
    setKeadaan(kenderaan.keadaan as 'baik' | 'rosak')
    setKeteranganKerosakan(kenderaan.keterangan_kerosakan ?? '')
    setFotoBaru(null)
    setFotoPreview(null)
    setFotoDipadam(false)
  }, [kenderaan])

  function handleFotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoBaru(file)
    setFotoPreview(URL.createObjectURL(file))
    setFotoDipadam(false)
  }

  function handlePadamFoto() {
    setFotoBaru(null)
    setFotoPreview(null)
    setFotoDipadam(true)
  }

  async function handleSimpan() {
    if (!kenderaan) return
    setRalat('')

    if (!namaKenderaan || !nomborPlat || !jenisKenderaan || !keadaan) {
      setRalat('Sila lengkapkan semua medan.')
      return
    }
    if (keadaan === 'rosak' && !keteranganKerosakan.trim()) {
      setRalat('Sila nyatakan jenis/sebab kerosakan.')
      return
    }

    setMenyimpan(true)

    let fotoUrl = kenderaan.foto_url
    if (fotoBaru) {
      const path = `${crypto.randomUUID()}-${fotoBaru.name}`
      const { error: uploadError } = await supabase.storage
        .from('kenderaan-foto')
        .upload(path, fotoBaru)
      if (uploadError) {
        setRalat('Gagal memuat naik foto. Sila cuba lagi.')
        setMenyimpan(false)
        return
      }
      const { data } = supabase.storage.from('kenderaan-foto').getPublicUrl(path)
      fotoUrl = data.publicUrl
    } else if (fotoDipadam) {
      fotoUrl = null
    }

    const { error } = await supabase
      .from('logistik_kenderaan')
      .update({
        nama_kenderaan: namaKenderaan,
        nombor_plat: nomborPlat,
        jenis_kenderaan: jenisKenderaan,
        keadaan,
        keterangan_kerosakan: keadaan === 'rosak' ? keteranganKerosakan : null,
        foto_url: fotoUrl,
      })
      .eq('id', kenderaan.id)

    setMenyimpan(false)

    if (error) {
      setRalat('Gagal kemas kini rekod. Sila cuba lagi.')
      return
    }

    setEditing(false)
    onUpdated()
  }

  const gambarDefault = kenderaan
    ? JENIS_DEFAULT_PHOTO[kenderaan.jenis_kenderaan] ?? JENIS_DEFAULT_PHOTO['4wd']
    : JENIS_DEFAULT_PHOTO['4wd']
  const baik = kenderaan?.keadaan === 'baik'
  const fotoTunjuk = fotoDipadam
    ? gambarDefault
    : fotoPreview ?? kenderaan?.foto_url ?? gambarDefault
  const adaFotoUntukDipadam = !fotoDipadam && (fotoPreview || kenderaan?.foto_url)

  return (
    <AnimatePresence>
      {kenderaan && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-white/60 bg-white/95 shadow-2xl backdrop-blur-md"
          >
            {/* Header: name, plate, status badge */}
            <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {kenderaan.nombor_plat}
                  </h2>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      baik ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${baik ? 'bg-emerald-600' : 'bg-red-600'}`}
                    />
                    {baik ? 'Baik' : 'Rosak'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">{kenderaan.nama_kenderaan}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {/* Large photo / default illustration */}
              <div className="relative">
                <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-100">
                  <img
                    src={fotoTunjuk}
                    alt={kenderaan.nama_kenderaan}
                    className={`h-full w-full ${fotoPreview && !fotoDipadam ? 'object-contain' : 'object-cover'}`}
                  />
                </div>

                {editing && (
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    {adaFotoUntukDipadam && (
                      <button
                        onClick={handlePadamFoto}
                        className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-red-600 shadow-md backdrop-blur-md hover:bg-white"
                      >
                        <Trash2 size={14} />
                        Padam foto
                      </button>
                    )}
                    <button
                      onClick={() => fotoInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-md backdrop-blur-md hover:bg-white"
                    >
                      <Camera size={14} />
                      Tukar foto
                    </button>
                  </div>
                )}
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
              </div>

              {!editing ? (
                <>
                  <div className="mt-5 flex items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                      {JENIS_LABEL[kenderaan.jenis_kenderaan] ?? kenderaan.jenis_kenderaan}
                    </span>
                  </div>

                  {!baik && kenderaan.keterangan_kerosakan && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-700">Sebab kerosakan</p>
                      <p className="mt-1 text-sm text-red-800">{kenderaan.keterangan_kerosakan}</p>
                    </div>
                  )}

                  <p className="mt-5 text-xs text-neutral-400">
                    Direkodkan: {new Date(kenderaan.created_at).toLocaleString('ms-MY')}
                  </p>

                  <div className="mt-8 flex gap-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-300"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => onRequestDelete(kenderaan)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Padam
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Nama kenderaan
                    </label>
                    <input
                      value={namaKenderaan}
                      onChange={(e) => setNamaKenderaan(e.target.value)}
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
                      <textarea
                        value={keteranganKerosakan}
                        onChange={(e) => setKeteranganKerosakan(e.target.value)}
                        placeholder="Nyatakan jenis kerosakan / sebab"
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-600"
                      />
                    )}
                  </div>

                  {ralat && <p className="text-sm text-red-600">{ralat}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setEditing(false)}
                      disabled={menyimpan}
                      className="flex-1 rounded-full border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-300 disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSimpan}
                      disabled={menyimpan}
                      className="flex-1 rounded-full bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {menyimpan ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
