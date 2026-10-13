import { useState } from 'react'
import { ChevronDown, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { Baris, DataLampiran, KunciLampiran, Lampiran } from '../lib/bacaLampiranSemasa'
import { DEF_LAMPIRAN, SUSUNAN_LAMPIRAN } from '../lib/lampiranPaparan'
import type { DefBahagian } from '../lib/lampiranPaparan'

// Review step of Laporan Semasa: the other Excel sheets, one card per sheet
// with an "include" checkbox and a detail table. Read-only: to fix the data,
// correct the Excel and upload it again.

type KadBahagianProps<K extends KunciLampiran> = {
  def: DefBahagian<K>
  rows: Lampiran[K]
  disertakan: boolean
  onTukar: (v: boolean) => void
}

function KadBahagian<K extends KunciLampiran>({ def, rows, disertakan, onTukar }: KadBahagianProps<K>) {
  const [buka, setBuka] = useState(false)
  // Excel rows carry two extra fields; the shared definitions only read the data
  const disimpan = rows.filter((r) => !r._abai) as unknown as DataLampiran[K]
  const diabai = rows.length - disimpan.length

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-colors ${
        disertakan ? 'border-emerald-200 bg-white/60' : 'border-white/70 bg-white/30'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex min-w-0 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={disertakan}
            disabled={disimpan.length === 0}
            onChange={(e) => onTukar(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-neutral-900">{def.tajuk}</span>
            <span className="block text-xs text-neutral-500">
              {disimpan.length > 0 ? def.ringkasan(disimpan) : 'Tiada baris yang boleh disertakan'}
            </span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 px-3 py-2.5 text-xs font-medium text-neutral-600 hover:bg-white sm:py-1.5"
        >
          Butiran ({rows.length})
          <ChevronDown size={13} className={`transition-transform ${buka ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {diabai > 0 && (
        <p className="mt-2 flex items-start gap-1 text-xs text-amber-700">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {diabai} baris diketepikan secara automatik (lihat Butiran). Betulkan dalam fail Excel jika data ini sah.
        </p>
      )}
      {def.peribadi && (
        <p className="mt-2 flex items-start gap-1 text-xs text-sky-800">
          <ShieldAlert size={12} className="mt-0.5 shrink-0" />
          Maklumat peribadi mangsa. Hanya boleh dilihat oleh staf APM selepas dihantar.
        </p>
      )}

      {buka && (
        <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="sticky top-0 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-2.5 py-2 font-medium">Baris</th>
                {def.lajur.map((l) => (
                  <th key={l.label} className="px-2.5 py-2 font-medium">
                    {l.label}
                  </th>
                ))}
                <th className="px-2.5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(rows as Baris<object>[]).map((r) => (
                <tr
                  key={r._baris}
                  className={`border-t border-neutral-100 ${r._abai ? 'bg-amber-50/60 text-neutral-400' : 'text-neutral-700'}`}
                >
                  <td className="px-2.5 py-1.5 tabular-nums text-neutral-400">{r._baris}</td>
                  {def.lajur.map((l) => (
                    <td key={l.label} className="px-2.5 py-1.5">
                      {l.nilai(r as unknown as DataLampiran[K][number]) ?? '—'}
                    </td>
                  ))}
                  <td className="px-2.5 py-1.5">
                    {r._abai ? (
                      <span className="text-amber-700">{r._abai}</span>
                    ) : (
                      <span className="text-emerald-700">Disertakan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type SemakLampiranProps = {
  lampiran: Lampiran
  pilihan: Record<KunciLampiran, boolean>
  onPilihan: (k: KunciLampiran, v: boolean) => void
}

export function SemakLampiran({ lampiran, pilihan, onPilihan }: SemakLampiranProps) {
  const ada = SUSUNAN_LAMPIRAN.filter((k) => lampiran[k].length > 0)
  if (ada.length === 0) return null

  // Generic helper keeps each sheet's definition and rows correlated for TypeScript
  function kad<K extends KunciLampiran>(k: K) {
    return (
      <KadBahagian
        key={k}
        def={DEF_LAMPIRAN[k]}
        rows={lampiran[k]}
        disertakan={pilihan[k]}
        onTukar={(v) => onPilihan(k, v)}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Lampiran Laporan</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Helaian lain dalam fail Excel. Tandakan helaian yang ingin disertakan. Baris yang diragui (data lama,
          kategori kosong) diketepikan secara automatik.
        </p>
      </div>
      {ada.map((k) => kad(k))}
    </div>
  )
}