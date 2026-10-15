import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, MapPin, MapPinned } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PilihLokasiModal } from './PilihLokasiModal'
import type { PpsPusat } from '../lib/ppsPusat'
import { hurufBesar } from '../lib/normalisasi'

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

type EditPpsModalProps = {
  pps: PpsPusat
  onClose: () => void
  onSaved: () => void
}

export function EditPpsModal({ pps, onClose, onSaved }: EditPpsModalProps) {
  const [nama, setNama] = useState(pps.nama)
  const [daerah, setDaerah] = useState(pps.daerah ?? '')
  const [mangsa, setMangsa] = useState(String(pps.jumlah_mangsa))
  const [keluarga, setKeluarga] = useState(String(pps.jumlah_keluarga))
  const [mukim, setMukim] = useState(pps.mukim ?? '')
  const [pengurusNama, setPengurusNama] = useState(pps.pengurus_nama ?? '')
  const [pengurusJawatan, setPengurusJawatan] = useState(pps.pengurus_jawatan ?? '')
  const [pengurusTelefon, setPengurusTelefon] = useState(pps.pengurus_telefon ?? '')
  const [lokasi, setLokasi] = useState<[number, number] | null>(
    pps.latitude != null && pps.longitude != null ? [pps.latitude, pps.longitude] : null,
  )
  const [petaBuka, setPetaBuka] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [ralat, setRalat] = useState('')

  const namaBerubah = hurufBesar(nama) !== hurufBesar(pps.nama) || hurufBesar(daerah) !== hurufBesar(pps.daerah ?? '')

  async function simpan() {
    setRalat('')
    if (!nama.trim()) {
      setRalat('Sila isi Nama PPS.')
      return
    }
    if (!/^\d+$/.test(mangsa.trim()) || !/^\d+$/.test(keluarga.trim())) {
      setRalat('Jumlah Mangsa dan Keluarga mesti nombor bulat (0 atau lebih).')
      return
    }

    setMenyimpan(true)
    const { error } = await supabase.rpc('kemaskini_pps', {
      p_id: pps.id,
      p_nama: hurufBesar(nama),
      p_daerah: hurufBesar(daerah),
      p_mangsa: Number(mangsa),
      p_keluarga: Number(keluarga),
      p_latitude: lokasi?.[0] ?? null,
      p_longitude: lokasi?.[1] ?? null,
      p_mukim: hurufBesar(mukim),
      p_pengurus_nama: hurufBesar(pengurusNama),
      p_pengurus_jawatan: hurufBesar(pengurusJawatan),
      p_pengurus_telefon: pengurusTelefon.trim(),
    })
    setMenyimpan(false)

    if (error) {
      setRalat(
        error.code === '23505'
          ? 'PPS dengan nama ini sudah wujud dalam daerah yang sama bagi bencana ini.'
          : error.code === '42501'
            ? 'Anda tiada kebenaran untuk tindakan ini.'
            : error.code === '22023'
              ? error.message
              : 'Gagal menyimpan. Sila cuba lagi.',
      )
      return
    }
    onSaved()
  }

  return createPortal(
    <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-neutral-900">Kemaskini PPS</h2>
            <p className="truncate text-xs text-neutral-500">
              {pps.nama_bencana} · {pps.negeri}
            </p>
          </div>
          <button onClick={onClose} title="Tutup" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Nama PPS <span className="text-red-500">*</span>
              </label>
              <input value={nama} onChange={(e) => setNama(e.target.value)} className={`${inputClass} uppercase`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Daerah</label>
              <input value={daerah} onChange={(e) => setDaerah(e.target.value)} className={`${inputClass} uppercase`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Mukim</label>
              <input value={mukim} onChange={(e) => setMukim(e.target.value)} className={`${inputClass} uppercase`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Jumlah Mangsa <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={mangsa}
                onChange={(e) => setMangsa(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Jumlah Keluarga <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={keluarga}
                onChange={(e) => setKeluarga(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Pengurus PPS</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-neutral-700">Nama</label>
                <input value={pengurusNama} onChange={(e) => setPengurusNama(e.target.value)} className={`${inputClass} uppercase`} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Jawatan</label>
                <input
                  value={pengurusJawatan}
                  onChange={(e) => setPengurusJawatan(e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">No. Telefon</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={pengurusTelefon}
                  onChange={(e) => setPengurusTelefon(e.target.value)}
                  placeholder="cth. 013-7567487"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-700">Lokasi</p>
            {lokasi ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                <MapPin size={15} />
                {lokasi[0].toFixed(5)}, {lokasi[1].toFixed(5)}
                <button
                  type="button"
                  onClick={() => setPetaBuka(true)}
                  className="rounded-full border border-emerald-200 px-2.5 py-0.5 text-xs font-medium hover:bg-emerald-50"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => setLokasi(null)}
                  className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
                >
                  Buang
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPetaBuka(true)}
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-500 hover:text-emerald-700"
              >
                <MapPinned size={13} />
                Pilih di peta
              </button>
            )}
          </div>

          {namaBerubah && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
              Laporan seterusnya akan menggunakan nama dan daerah baharu ini untuk memadankan PPS.
            </p>
          )}
          <p className="text-xs text-neutral-400">
            Status PPS tidak berubah. Gunakan butang Tutup / Kekalkan / Buka Semula untuk menukar status.
          </p>
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
              Simpan
            </button>
          </div>
        </div>
      </div>

      <PilihLokasiModal
        open={petaBuka}
        tajuk="Pilih Lokasi PPS"
        negeri={pps.negeri}
        cadangan={nama}
        awal={lokasi}
        onClose={() => setPetaBuka(false)}
        onSimpan={(lat, lng) => {
          setLokasi([lat, lng])
          setPetaBuka(false)
        }}
      />
    </div>,
    document.body,
  )
}