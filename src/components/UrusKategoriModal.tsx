import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Trash2, Loader2, Plus } from 'lucide-react'
import {
  ikonKategori,
  kemaskiniKategori,
  kiraPenggunaanKategori,
  padamKategori,
  tambahKategori,
  PILIHAN_IKON,
  PILIHAN_WARNA,
  warnaSelamat,
} from '../lib/titikBencana'
import type { KategoriBencana } from '../lib/titikBencana'
import { ConfirmModal } from './ConfirmModal'

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

type UrusKategoriModalProps = {
  open: boolean
  kategori: KategoriBencana[]
  onClose: () => void
  onDipadam?: (key: string) => void
}

// "Urus Kategori" on the Bencana page: every disaster category in one place,
// to rename it, change its colour/icon, or delete one that no map point uses.
export function UrusKategoriModal({ open, kategori, onClose, onDipadam }: UrusKategoriModalProps) {
  // Map points (active or finished) per category; null while loading
  const [kiraan, setKiraan] = useState<Record<string, number> | null>(null)
  const [ralatKiraan, setRalatKiraan] = useState(false)

  const [disunting, setDisunting] = useState<KategoriBencana | null>(null)
  const [menambah, setMenambah] = useState(false) // "Tambah Kategori" form open
  const [label, setLabel] = useState('')
  const [warna, setWarna] = useState(PILIHAN_WARNA[0])
  const [ikon, setIkon] = useState('MapPin')
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')

  const [hendakPadam, setHendakPadam] = useState<KategoriBencana | null>(null)
  const [memadam, setMemadam] = useState(false)
  const [ralatPadam, setRalatPadam] = useState('')

  useEffect(() => {
    if (!open) return
    let batal = false
    setDisunting(null)
    setMenambah(false)
    setKiraan(null)
    setRalatKiraan(false)
    kiraPenggunaanKategori()
      .then((k) => {
        if (!batal) setKiraan(k)
      })
      .catch(() => {
        if (!batal) setRalatKiraan(true)
      })
    return () => {
      batal = true
    }
  }, [open])

  if (!open) return null

  function bukaSunting(k: KategoriBencana) {
    setMenambah(false)
    setDisunting(k)
    setLabel(k.label)
    setWarna(warnaSelamat(k.warna))
    setIkon(k.ikon)
    setRalat('')
  }

  function bukaTambah() {
    setDisunting(null)
    setMenambah(true)
    setLabel('')
    setWarna(PILIHAN_WARNA[0])
    setIkon('MapPin')
    setRalat('')
  }

  // New category (also created automatically when a Laporan Awal uses a new disaster type)
  async function tambah() {
    if (!label.trim()) {
      setRalat('Sila isi nama kategori.')
      return
    }
    if (kategori.some((k) => k.label.trim().toLowerCase() === label.trim().toLowerCase())) {
      setRalat('Kategori ini sudah wujud.')
      return
    }
    setMenyimpan(true)
    setRalat('')
    const { error } = await tambahKategori(label, warna, ikon, kategori.length + 1)
    setMenyimpan(false)
    if (error) {
      setRalat(error.code === '42501' ? 'Anda tiada kebenaran untuk menambah kategori.' : 'Gagal menambah kategori.')
      return
    }
    setMenambah(false)
  }

  async function simpan() {
    if (!disunting) return
    if (!label.trim()) {
      setRalat('Sila isi nama kategori.')
      return
    }
    // Another category already uses this name (case and spaces ignored)
    const sama = kategori.find(
      (k) => k.key !== disunting.key && k.label.trim().toLowerCase() === label.trim().toLowerCase(),
    )
    if (sama) {
      setRalat('Kategori ini sudah wujud.')
      return
    }
    setMenyimpan(true)
    setRalat('')
    const { error } = await kemaskiniKategori(disunting.key, label, warna, ikon)
    setMenyimpan(false)
    if (error) {
      setRalat(error.code === '42501' ? 'Anda tiada kebenaran untuk menyunting kategori.' : 'Gagal menyimpan kategori.')
      return
    }
    setDisunting(null)
  }

  async function padam() {
    if (!hendakPadam) return
    setMemadam(true)
    setRalatPadam('')
    const { error } = await padamKategori(hendakPadam.key)
    setMemadam(false)
    if (error) {
      setRalatPadam(
        error.code === 'DIGUNAKAN'
          ? 'Kategori ini masih digunakan oleh titik bencana, jadi tidak boleh dipadam.'
          : error.code === '42501'
            ? 'Anda tiada kebenaran untuk memadam kategori.'
            : 'Gagal memadam kategori. Sila cuba lagi.',
      )
      return
    }
    onDipadam?.(hendakPadam.key)
    setHendakPadam(null)
  }

  // Name / icon / colour form, shared by "edit" (inside a row) and "add" (at the bottom)
  function borang(onSimpan: () => void, teks: string, onBatal: () => void) {
    return (
      <div className="space-y-3 border-t border-emerald-100 bg-emerald-50/50 p-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nama kategori" className={inputClass} />
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-600">Ikon</p>
          <div className="flex flex-wrap gap-1.5">
            {PILIHAN_IKON.map((nama) => {
              const IkonPilihan = ikonKategori(nama)
              return (
                <button
                  key={nama}
                  type="button"
                  onClick={() => setIkon(nama)}
                  title={nama}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                    ikon === nama ? 'border-emerald-600 bg-white text-emerald-700' : 'border-neutral-200 bg-white text-neutral-500'
                  }`}
                >
                  <IkonPilihan size={15} />
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-600">Warna</p>
          <div className="flex flex-wrap gap-1.5">
            {PILIHAN_WARNA.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWarna(w)}
                title={w}
                className={`h-7 w-7 rounded-full border-2 ${warna === w ? 'border-neutral-900' : 'border-white'}`}
                style={{ background: w }}
              />
            ))}
          </div>
        </div>
        {ralat && <p className="text-xs text-red-600">{ralat}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onBatal}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSimpan}
            disabled={menyimpan}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {menyimpan && <Loader2 size={13} className="animate-spin" />}
            {menyimpan ? 'Menyimpan...' : teks}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Urus Kategori</h2>
                <p className="text-xs text-neutral-500">Tambah, tukar nama, warna atau ikon. Titik sedia ada ikut berubah.</p>
              </div>
              <button
                onClick={onClose}
                title="Tutup"
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
              {ralatKiraan && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Gagal mengira penggunaan kategori. Butang padam dimatikan buat sementara.
                </p>
              )}

              {kategori.length === 0 && <p className="text-sm text-neutral-500">Tiada kategori.</p>}

              {kategori.map((k) => {
                const Ikon = ikonKategori(k.ikon)
                const bil = kiraan?.[k.key] ?? 0
                const bolehPadam = kiraan !== null && bil === 0
                const sedangSunting = disunting?.key === k.key

                return (
                  <div key={k.key} className="rounded-xl border border-neutral-200 bg-white">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: warnaSelamat(k.warna) }}
                      >
                        <Ikon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">{k.label}</p>
                        <p className="text-xs text-neutral-500">
                          {kiraan === null && !ralatKiraan ? 'Mengira...' : ralatKiraan ? '—' : `${bil} titik`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => (sedangSunting ? setDisunting(null) : bukaSunting(k))}
                        title="Sunting"
                        className={`rounded-lg p-2 transition-colors ${
                          sedangSunting
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-neutral-500 hover:bg-neutral-100 hover:text-emerald-700'
                        }`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRalatPadam('')
                          setHendakPadam(k)
                        }}
                        disabled={!bolehPadam}
                        title={
                          bolehPadam
                            ? 'Padam'
                            : kiraan === null
                              ? 'Sedang mengira penggunaan'
                              : `Digunakan oleh ${bil} titik — tidak boleh dipadam`
                        }
                        className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {sedangSunting && borang(simpan, 'Simpan Perubahan', () => setDisunting(null))}
                  </div>
                )
              })}
            </div>

            {/* Add a category directly (also created automatically from a Laporan Awal) */}
            <div className="border-t border-neutral-100 px-5 py-3">
              {menambah ? (
                <div className="overflow-hidden rounded-xl border border-emerald-200">
                  {borang(tambah, 'Tambah Kategori', () => setMenambah(false))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={bukaTambah}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-400 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  <Plus size={15} />
                  Tambah Kategori
                </button>
              )}
              <p className="mt-2 text-center text-xs text-neutral-400">
                Kategori baharu juga dicipta secara automatik apabila Laporan Awal menggunakan jenis bencana baharu.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Outside the portal above, so a click on its backdrop doesn't also close this panel */}
      <ConfirmModal
        open={!!hendakPadam}
        title="Padam Kategori"
        message={`Padam kategori "${hendakPadam?.label ?? ''}"? Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel="Padam"
        loadingLabel="Memadam..."
        danger
        loading={memadam}
        error={ralatPadam}
        onConfirm={padam}
        onCancel={() => setHendakPadam(null)}
      />
    </>
  )
}