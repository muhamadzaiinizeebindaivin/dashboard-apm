import { ShieldAlert } from 'lucide-react'
import type { DataLampiran, KunciLampiran } from '../lib/bacaLampiranSemasa'
import { DEF_LAMPIRAN, SUSUNAN_LAMPIRAN } from '../lib/lampiranPaparan'
import type { DefBahagian } from '../lib/lampiranPaparan'

// Sekretariat view of the extra Excel sheets stored with a Laporan Semasa.

type BahagianProps<K extends KunciLampiran> = { def: DefBahagian<K>; rows: DataLampiran[K] }

function BahagianLampiran<K extends KunciLampiran>({ def, rows }: BahagianProps<K>) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{def.tajuk}</h3>
        <span className="text-xs text-neutral-500">{def.ringkasan(rows)}</span>
      </div>
      {def.peribadi && (
        <p className="mb-2 flex items-start gap-1 text-xs text-sky-800">
          <ShieldAlert size={12} className="mt-0.5 shrink-0" />
          Maklumat peribadi mangsa. Jangan kongsi di luar urusan rasmi.
        </p>
      )}
      <div className="max-h-72 overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="sticky top-0 bg-neutral-50 text-neutral-500">
            <tr>
              {def.lajur.map((l) => (
                <th key={l.label} className="px-2.5 py-2 font-medium">
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-neutral-100 text-neutral-700">
                {def.lajur.map((l) => (
                  <td key={l.label} className="px-2.5 py-1.5">
                    {l.nilai(r) ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PaparanLampiran({ data }: { data: DataLampiran }) {
  const ada = SUSUNAN_LAMPIRAN.filter((k) => data[k].length > 0)
  if (ada.length === 0) return null

  function bahagian<K extends KunciLampiran>(k: K) {
    return <BahagianLampiran key={k} def={DEF_LAMPIRAN[k]} rows={data[k]} />
  }

  return <div className="space-y-3">{ada.map((k) => bahagian(k))}</div>
}