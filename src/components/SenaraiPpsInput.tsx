import { useState } from 'react'
import { Plus, Trash2, MapPin, MapPinned, Loader2, X } from 'lucide-react'
import { PilihLokasiModal } from './PilihLokasiModal'
import { ppsKosong } from '../lib/ppsPusat'
import type { PpsInput } from '../lib/ppsPusat'

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-emerald-600'

type SenaraiPpsInputProps = {
  rows: PpsInput[]
  onChange: (rows: PpsInput[]) => void
  memuat?: boolean
  negeri?: string
}

export function SenaraiPpsInput({ rows, onChange, memuat = false, negeri }: SenaraiPpsInputProps) {
  const [mencariLokasi, setMencariLokasi] = useState<string | null>(null)
  const [petaUntuk, setPetaUntuk] = useState<string | null>(null) // kunci of the PPS being located
  const barisPeta = rows.find((r) => r.kunci === petaUntuk)
  const [ralatLokasi, setRalatLokasi] = useState<Record<string, string>>({})

  function kemaskini(kunci: string, ubah: Partial<PpsInput>) {
    onChange(rows.map((r) => (r.kunci === kunci ? { ...r, ...ubah } : r)))
  }

  function buang(kunci: string) {
    onChange(rows.filter((r) => r.kunci !== kunci))
  }

  function ambilLokasi(kunci: string) {
    setRalatLokasi((p) => ({ ...p, [kunci]: '' }))
    if (!navigator.geolocation) {
      setRalatLokasi((p) => ({ ...p, [kunci]: 'Peranti ini tidak menyokong GPS.' }))
      return
    }
    setMencariLokasi(kunci)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        kemaskini(kunci, { latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setMencariLokasi(null)
      },
      () => {
        setRalatLokasi((p) => ({
          ...p,
          [kunci]: 'Gagal mendapatkan lokasi. Pastikan kebenaran lokasi diberikan.',
        }))
        setMencariLokasi(null)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const jumlahMangsa = rows.reduce((n, r) => n + (Number(r.mangsa) || 0), 0)
  const jumlahKeluarga = rows.reduce((n, r) => n + (Number(r.keluarga) || 0), 0)

  return (
    <div className="space-y-3 sm:col-span-2">
      {memuat && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Loader2 size={13} className="animate-spin" />
          Memuatkan PPS sedia ada...
        </p>
      )}

      {rows.some((r) => r.sedia) && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          PPS yang masih dibuka untuk bencana ini telah dimuatkan. Kemas kini jumlah, atau isi 0 jika PPS telah
          dikosongkan.
        </p>
      )}

      {rows.map((r, i) => (
        <div key={r.kunci} className="rounded-xl border border-neutral-200 bg-white/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">
              PPS {i + 1}
              {r.sedia && (
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  Sedia ada
                </span>
              )}
            </span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => buang(r.kunci)}
                title="Buang PPS"
                className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Nama PPS <span className="text-red-500">*</span>
              </label>
              <input
                value={r.nama}
                onChange={(e) => kemaskini(r.kunci, { nama: e.target.value })}
                placeholder="cth. SK Bukit Besar"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Jumlah Mangsa <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={r.mangsa}
                onChange={(e) => kemaskini(r.kunci, { mangsa: e.target.value })}
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
                value={r.keluarga}
                onChange={(e) => kemaskini(r.kunci, { keluarga: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              {r.latitude != null && r.longitude != null ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700">
                  <MapPin size={14} />
                  {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                  <button
                    type="button"
                    onClick={() => setPetaUntuk(r.kunci)}
                    className="rounded-full border border-emerald-200 px-2 py-0.5 font-medium transition-colors hover:bg-emerald-50"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => kemaskini(r.kunci, { latitude: null, longitude: null })}
                    title="Buang lokasi"
                    className="rounded-full p-0.5 text-neutral-400 hover:text-red-600"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ambilLokasi(r.kunci)}
                    disabled={mencariLokasi === r.kunci}
                    className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-60"
                  >
                    {mencariLokasi === r.kunci ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                    Guna lokasi semasa
                    <span className="font-normal text-neutral-400">(ketika berada di PPS)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPetaUntuk(r.kunci)}
                    className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-500 hover:text-emerald-700"
                  >
                    <MapPinned size={13} />
                    Pilih di peta
                  </button>
                </div>
              )}
              {ralatLokasi[r.kunci] && <p className="mt-1 text-xs text-red-600">{ralatLokasi[r.kunci]}</p>}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rows, ppsKosong()])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-300 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
      >
        <Plus size={16} />
        Tambah PPS
      </button>

      <p className="text-right text-xs text-neutral-500">
        Jumlah keseluruhan: <span className="font-semibold text-neutral-800">{jumlahMangsa}</span> mangsa ·{' '}
        <span className="font-semibold text-neutral-800">{jumlahKeluarga}</span> keluarga
      </p>

      <PilihLokasiModal
        open={petaUntuk !== null}
        negeri={negeri}
        cadangan={barisPeta?.nama}
        awal={
          barisPeta && barisPeta.latitude != null && barisPeta.longitude != null
            ? [barisPeta.latitude, barisPeta.longitude]
            : null
        }
        onClose={() => setPetaUntuk(null)}
        onSimpan={(lat, lng) => {
          if (petaUntuk) kemaskini(petaUntuk, { latitude: lat, longitude: lng })
          setPetaUntuk(null)
        }}
      />
    </div>
  )
}