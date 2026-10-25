import { Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTema } from '../lib/tema'
import type { Tema } from '../lib/tema'

const PILIHAN: { tema: Tema; label: string; Ikon: LucideIcon }[] = [
  { tema: 'terang', label: 'Terang', Ikon: Sun },
  { tema: 'gelap', label: 'Gelap', Ikon: Moon },
  { tema: 'sistem', label: 'Ikut sistem', Ikon: Monitor },
]

// Light / dark / follow the device. `padat`: one button that cycles (collapsed sidebar).
export function PemilihTema({ padat = false }: { padat?: boolean }) {
  const { tema, setTema } = useTema()

  if (padat) {
    const i = PILIHAN.findIndex((p) => p.tema === tema)
    const { Ikon, label } = PILIHAN[i]
    const seterusnya = PILIHAN[(i + 1) % PILIHAN.length]
    return (
      <button
        onClick={() => setTema(seterusnya.tema)}
        title={`Tema: ${label} (klik untuk ${seterusnya.label})`}
        aria-label={`Tema: ${label}`}
        className="flex w-full items-center justify-center rounded-xl py-2.5 text-neutral-700 hover:bg-white/60"
      >
        <Ikon size={18} />
      </button>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center gap-0.5 rounded-full border border-white/60 bg-white/40 p-0.5 backdrop-blur-md"
    >
      {PILIHAN.map(({ tema: t, label, Ikon }) => (
        <button
          key={t}
          role="radio"
          aria-checked={tema === t}
          onClick={() => setTema(t)}
          title={label}
          aria-label={label}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            tema === t ? 'bg-emerald-700 text-white' : 'text-neutral-600 hover:bg-white/70'
          }`}
        >
          <Ikon size={15} />
        </button>
      ))}
    </div>
  )
}