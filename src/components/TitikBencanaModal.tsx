import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Loader2, MapPin, Pencil, ChevronDown, Search, Check } from 'lucide-react'
// KL, Putrajaya and Labuan: one "Wilayah Persekutuan" choice
import { SENARAI_KUMPULAN_NEGERI, kumpulanNegeri } from '../lib/kumpulanNegeri'
import {
  ikonKategori,
  kemaskiniKategori,
  PILIHAN_IKON,
  PILIHAN_WARNA,
  formatTarikh,
  semakBorang,
  tambahKategori,
  warnaSelamat,
} from '../lib/titikBencana'
import type { BorangTitik, DataTerkini, KategoriBencana } from '../lib/titikBencana'

export type ModTitik = 'tambah' | 'kemaskini' | 'lengkapkan'

const TAJUK: Record<ModTitik, { tajuk: string; butang: string }> = {
  tambah: { tajuk: 'Tambah Titik Bencana', butang: 'Simpan Titik' },
  kemaskini: { tajuk: 'Kemaskini Titik Bencana', butang: 'Simpan' },
  lengkapkan: { tajuk: 'Lengkapkan Titik Bencana', butang: 'Simpan & Tandakan Selesai' },
}

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

type PilihKategoriProps = {
  kategori: KategoriBencana[]
  nilai: string
  onPilih: (key: string) => void
}

// Category picker: one field that opens a searchable list (icon + colour + name),
// so the form stays compact however many categories there are
function PilihKategori({ kategori, nilai, onPilih }: PilihKategoriProps) {
  const [buka, setBuka] = useState(false)
  const [carian, setCarian] = useState('')
  const kotak = useRef<HTMLDivElement>(null)
  const dipilih = kategori.find((k) => k.key === nilai)
  const IkonDipilih = dipilih ? ikonKategori(dipilih.ikon) : null
  const ditapis = kategori.filter((k) => k.label.toLowerCase().includes(carian.trim().toLowerCase()))

  // Close on a click/tap outside, or on Esc
  useEffect(() => {
    if (!buka) return
    function luar(e: MouseEvent | TouchEvent) {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false)
    }
    function kekunci(e: KeyboardEvent) {
      if (e.key === 'Escape') setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    document.addEventListener('touchstart', luar)
    document.addEventListener('keydown', kekunci)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('touchstart', luar)
      document.removeEventListener('keydown', kekunci)
    }
  }, [buka])

  function pilih(key: string) {
    onPilih(key)
    setBuka(false)
  }

  return (
    <div ref={kotak} className="relative">
      <button
        type="button"
        onClick={() => {
          setCarian('')
          setBuka((b) => !b)
        }}
        aria-haspopup="listbox"
        aria-expanded={buka}
        className={`${inputClass} flex items-center gap-2 text-left`}
      >
        {dipilih && IkonDipilih ? (
          <>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: warnaSelamat(dipilih.warna) }}
            >
              <IkonDipilih size={13} />
            </span>
            <span className="flex-1 truncate">{dipilih.label}</span>
          </>
        ) : (
          <span className="flex-1 text-neutral-400">— Pilih kategori —</span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition-transform ${buka ? 'rotate-180' : ''}`} />
      </button>

      {buka && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-100 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 focus-within:border-emerald-600">
              <Search size={14} className="shrink-0 text-neutral-400" />
              <input
                // Focus the search on desktop only: on phones the keyboard would cover the list
                autoFocus={window.matchMedia('(pointer: fine)').matches}
                value={carian}
                onChange={(e) => setCarian(e.target.value)}
                onKeyDown={(e) => {
                  // Enter picks the first match
                  if (e.key === 'Enter' && ditapis[0]) {
                    e.preventDefault()
                    pilih(ditapis[0].key)
                  }
                }}
                placeholder="Cari kategori"
                className="w-full bg-transparent py-1.5 text-sm text-neutral-800 outline-none"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {ditapis.length === 0 && <li className="px-3 py-2 text-sm text-neutral-400">Tiada kategori sepadan.</li>}
            {ditapis.map((k) => {
              const Ikon = ikonKategori(k.ikon)
              const aktif = k.key === nilai
              return (
                <li key={k.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={aktif}
                    onClick={() => pilih(k.key)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50 ${
                      aktif ? 'bg-emerald-50 font-medium text-emerald-800' : 'text-neutral-700'
                    }`}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: warnaSelamat(k.warna) }}
                    >
                      <Ikon size={13} />
                    </span>
                    <span className="flex-1 truncate">{k.label}</span>
                    {aktif && <Check size={15} className="shrink-0 text-emerald-700" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

type TitikBencanaModalProps = {
  mod: ModTitik
  awal: BorangTitik
  koordinat: [number, number]
  kategori: KategoriBencana[]
  // Live figures from Laporan Semasa (same as the map popup), when the point has them
  terkini?: DataTerkini | null
  onSimpan: (borang: BorangTitik) => Promise<string | null> // returns an error message or null
  onClose: () => void
}

export function TitikBencanaModal({ mod, awal, koordinat, kategori, terkini, onSimpan, onClose }: TitikBencanaModalProps) {
  // Editing a point that follows its Laporan Semasa: its figures are read-only here
  const ikutLaporan = mod === 'kemaskini' && !!terkini
  // Older points may say "Labuan" / "Kuala Lumpur": shown (and saved) as Wilayah Persekutuan
  const [borang, setBorang] = useState<BorangTitik>(() => ({ ...awal, negeri: kumpulanNegeri(awal.negeri) || awal.negeri }))
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')

  // Inline category sub-form: add a new one, or edit an existing one
  const [bentukKategori, setBentukKategori] = useState<null | 'baru' | 'sunting'>(null)
  const [labelBaru, setLabelBaru] = useState('')
  const [warnaBaru, setWarnaBaru] = useState(PILIHAN_WARNA[0])
  const [ikonBaru, setIkonBaru] = useState('MapPin')
  const [menambahKategori, setMenambahKategori] = useState(false)

  const set = (kunci: keyof BorangTitik, nilai: string) => setBorang((b) => ({ ...b, [kunci]: nilai }))

  const kategoriDipilih = kategori.find((k) => k.key === borang.kategori)

  function bukaKategoriBaru() {
    setLabelBaru('')
    setWarnaBaru(PILIHAN_WARNA[0])
    setIkonBaru('MapPin')
    setRalat('')
    setBentukKategori('baru')
  }

  function bukaSuntingKategori(k: KategoriBencana) {
    setLabelBaru(k.label)
    setWarnaBaru(warnaSelamat(k.warna))
    setIkonBaru(k.ikon)
    setRalat('')
    setBentukKategori('sunting')
  }

  async function simpanKategori() {
    if (!labelBaru.trim()) {
      setRalat('Sila isi nama kategori.')
      return
    }
    // Another category already uses this name (case and spaces ignored)
    const sama = kategori.find(
      (k) =>
        k.label.trim().toLowerCase() === labelBaru.trim().toLowerCase() &&
        (bentukKategori === 'baru' || k.key !== borang.kategori),
    )
    if (sama) {
      setRalat('Kategori ini sudah wujud.')
      return
    }
    setMenambahKategori(true)
    setRalat('')
    if (bentukKategori === 'sunting' && kategoriDipilih) {
      const { error } = await kemaskiniKategori(kategoriDipilih.key, labelBaru, warnaBaru, ikonBaru)
      setMenambahKategori(false)
      if (error) {
        setRalat(error.code === '42501' ? 'Anda tiada kebenaran untuk menyunting kategori.' : 'Gagal menyimpan kategori.')
        return
      }
    } else {
      const { key, error } = await tambahKategori(labelBaru, warnaBaru, ikonBaru, kategori.length + 1)
      setMenambahKategori(false)
      if (error) {
        setRalat(error.code === '23505' ? 'Kategori ini sudah wujud.' : 'Gagal menambah kategori.')
        return
      }
      set('kategori', key)
    }
    setBentukKategori(null)
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
            <PilihKategori kategori={kategori} nilai={borang.kategori} onPilih={(key) => set('kategori', key)} />

            {!bentukKategori && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={bukaKategoriBaru}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <Plus size={12} />
                  Kategori baharu
                </button>
                {kategoriDipilih && (
                  <button
                    type="button"
                    onClick={() => bukaSuntingKategori(kategoriDipilih)}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-emerald-700"
                  >
                    <Pencil size={12} />
                    Sunting kategori "{kategoriDipilih.label}"
                  </button>
                )}
              </div>
            )}

            {bentukKategori && (
              <div className="mt-3 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs font-semibold text-emerald-800">
                  {bentukKategori === 'sunting' ? `Sunting kategori "${kategoriDipilih?.label ?? ''}"` : 'Kategori baharu'}
                </p>
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
                    onClick={() => setBentukKategori(null)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={simpanKategori}
                    disabled={menambahKategori}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {menambahKategori ? 'Menyimpan...' : bentukKategori === 'sunting' ? 'Simpan Perubahan' : 'Tambah Kategori'}
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
                {SENARAI_KUMPULAN_NEGERI.map((n) => (
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
            {ikutLaporan && terkini ? (
              // Figures follow the Laporan Semasa: shown, not typed (same numbers as the map popup)
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Data Terkini (daripada Laporan Semasa){terkini.seluruhBencana && ' · seluruh bencana'}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  {(
                    [
                      ['Mangsa', terkini.mangsa],
                      ['KIR', terkini.keluarga],
                      ['PPS dibuka', terkini.ppsDibuka],
                      ['Rumah terjejas', terkini.rumahTerjejas ?? '—'],
                    ] as const
                  ).map(([label, nilai]) => (
                    <div key={label} className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-sm font-semibold text-neutral-800">{nilai}</div>
                      <div className="text-[11px] text-neutral-500">{label}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-emerald-800">
                  Angka ini dikemaskini secara automatik melalui Laporan Semasa
                  {terkini.laporanTerakhir && ` (terakhir: ${formatTarikh(terkini.laporanTerakhir)})`}.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
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
              {terkini && ' Angka di atas diisi daripada Laporan Semasa terakhir. Sila semak sebelum menyimpan.'}
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