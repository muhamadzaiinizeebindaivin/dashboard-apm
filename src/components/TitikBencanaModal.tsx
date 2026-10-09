import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Loader2, MapPin } from 'lucide-react'
import { NEGERI_LIST } from '../lib/negeriVisual'
import {
  ikonKategori,
  PILIHAN_IKON,
  PILIHAN_WARNA,
  semakBorang,
  tambahKategori,
  warnaSelamat,
} from '../lib/titikBencana'
import type { BorangTitik, KategoriBencana } from '../lib/titikBencana'

export type ModTitik = 'tambah' | 'kemaskini' | 'lengkapkan'

const TAJUK: Record<ModTitik, { tajuk: string; butang: string }> = {
  tambah: { tajuk: 'Tambah Titik Bencana', butang: 'Simpan Titik' },
  kemaskini: { tajuk: 'Kemaskini Titik Bencana', butang: 'Simpan' },
  lengkapkan: { tajuk: 'Lengkapkan Titik Bencana', butang: 'Simpan & Tandakan Selesai' },
}

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

type TitikBencanaModalProps = {
  mod: ModTitik
  awal: BorangTitik
  koordinat: [number, number]
  kategori: KategoriBencana[]
  onSimpan: (borang: BorangTitik) => Promise<string | null> // returns an error message or null
  onClose: () => void
}

export function TitikBencanaModal({ mod, awal, koordinat, kategori, onSimpan, onClose }: TitikBencanaModalProps) {
  const [borang, setBorang] = useState<BorangTitik>(awal)
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')

  // Inline "new category" sub-form
  const [kategoriBaru, setKategoriBaru] = useState(false)
  const [labelBaru, setLabelBaru] = useState('')
  const [warnaBaru, setWarnaBaru] = useState(PILIHAN_WARNA[0])
  const [ikonBaru, setIkonBaru] = useState('MapPin')
  const [menambahKategori, setMenambahKategori] = useState(false)

  const set = (kunci: keyof BorangTitik, nilai: string) => setBorang((b) => ({ ...b, [kunci]: nilai }))

  async function simpanKategoriBaru() {
    if (!labelBaru.trim()) {
      setRalat('Sila isi nama kategori.')
      return
    }
    setMenambahKategori(true)
    setRalat('')
    const { key, error } = await tambahKategori(labelBaru, warnaBaru, ikonBaru, kategori.length + 1)
    setMenambahKategori(false)
    if (error) {
      setRalat(error.code === '23505' ? 'Kategori ini sudah wujud.' : 'Gagal menambah kategori.')
      return
    }
    set('kategori', key)
    setKategoriBaru(false)
    setLabelBaru('')
  }

  async function simpan() {
    const r = semakBorang(borang)
    if (r) {
      setRalat(r)
      return
    }
    setMenyimpan(true)
    setRalat('')
    const hasil = await onSimpan(borang)
    setMenyimpan(false)
    if (hasil) setRalat(hasil)
  }

  const teks = TAJUK[mod]

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{teks.tajuk}</h2>
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              <MapPin size={12} />
              {koordinat[0].toFixed(5)}, {koordinat[1].toFixed(5)}
            </p>
          </div>
          <button onClick={onClose} title="Tutup" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Kategori <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {kategori.map((k) => {
                const Ikon = ikonKategori(k.ikon)
                const aktif = borang.kategori === k.key
                return (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => set('kategori', k.key)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      aktif ? 'border-transparent text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                    style={aktif ? { background: warnaSelamat(k.warna) } : undefined}
                  >
                    <Ikon size={13} style={aktif ? undefined : { color: warnaSelamat(k.warna) }} />
                    {k.label}
                  </button>
                )
              })}
              {!kategoriBaru && (
                <button
                  type="button"
                  onClick={() => setKategoriBaru(true)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  <Plus size={13} />
                  Kategori baharu
                </button>
              )}
            </div>

            {kategoriBaru && (
              <div className="mt-3 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <input
                  value={labelBaru}
                  onChange={(e) => setLabelBaru(e.target.value)}
                  placeholder="Nama kategori, cth. Kemarau"
                  className={inputClass}
                />
                <div>
                  <p className="mb-1 text-xs font-medium text-neutral-600">Ikon</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PILIHAN_IKON.map((nama) => {
                      const Ikon = ikonKategori(nama)
                      return (
                        <button
                          key={nama}
                          type="button"
                          onClick={() => setIkonBaru(nama)}
                          title={nama}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                            ikonBaru === nama ? 'border-emerald-600 bg-white text-emerald-700' : 'border-neutral-200 bg-white text-neutral-500'
                          }`}
                        >
                          <Ikon size={15} />
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
                        onClick={() => setWarnaBaru(w)}
                        title={w}
                        className={`h-7 w-7 rounded-full border-2 ${warnaBaru === w ? 'border-neutral-900' : 'border-white'}`}
                        style={{ background: w }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setKategoriBaru(false)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={simpanKategoriBaru}
                    disabled={menambahKategori}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {menambahKategori ? 'Menyimpan...' : 'Tambah Kategori'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Negeri <span className="text-red-500">*</span>
              </label>
              <select value={borang.negeri} onChange={(e) => set('negeri', e.target.value)} className={inputClass}>
                <option value="">— Pilih —</option>
                {NEGERI_LIST.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Daerah</label>
              <input value={borang.daerah} onChange={(e) => set('daerah', e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-neutral-700">Kawasan Terjejas</label>
              <input
                value={borang.lokasi}
                onChange={(e) => set('lokasi', e.target.value)}
                placeholder="cth. Kg. Sireh"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-neutral-700">PPS</label>
              <input value={borang.pps} onChange={(e) => set('pps', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Jumlah KIR</label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={borang.jumlah_kir}
                onChange={(e) => set('jumlah_kir', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Jumlah Mangsa</label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={borang.jumlah_mangsa}
                onChange={(e) => set('jumlah_mangsa', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Jumlah Rumah Terjejas</label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={borang.jumlah_rumah_terjejas}
                onChange={(e) => set('jumlah_rumah_terjejas', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-neutral-700">Catatan (pilihan)</label>
              <textarea
                rows={2}
                value={borang.catatan}
                onChange={(e) => set('catatan', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {mod === 'lengkapkan' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Titik ini akan ditanda selesai, dikeluarkan dari peta dan dimasukkan ke Ringkasan Bencana.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-neutral-100 px-5 py-3">
          {ralat && <p className="text-sm text-red-600">{ralat}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={simpan}
              disabled={menyimpan}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              {teks.butang}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}