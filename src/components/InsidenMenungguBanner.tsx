import { BellRing, FileText, MapPin } from 'lucide-react'
import type { InsidenMenunggu } from '../lib/insidenMenunggu'
import { namaInsiden } from '../lib/insidenMenunggu'

// Report page: confirmed insiden still waiting for their Laporan Awal
export function InsidenMenungguBanner({
  senarai,
  onPilih,
}: {
  senarai: InsidenMenunggu[]
  onPilih: (i: InsidenMenunggu) => void
}) {
  if (senarai.length === 0) return null

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 text-sm text-orange-900">
      <p className="flex items-center gap-2 font-semibold">
        <BellRing size={16} className="shrink-0" />
        {senarai.length === 1
          ? 'Insiden disahkan bencana menunggu Laporan Awal'
          : `${senarai.length} insiden disahkan bencana menunggu Laporan Awal`}
      </p>
      <ul className="mt-2 space-y-2">
        {senarai.map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-100 bg-white/70 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-neutral-900">{namaInsiden(i)}</p>
              <p className="flex items-center gap-1 text-xs text-neutral-500">
                <MapPin size={12} className="shrink-0" />
                {[i.tempat, i.daerah, i.negeri].filter(Boolean).join(' · ')}
                {i.diputuskan_pada &&
                  ` · disahkan ${new Date(i.diputuskan_pada).toLocaleString('ms-MY', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPilih(i)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
            >
              <FileText size={13} />
              Hantar Laporan Awal
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
