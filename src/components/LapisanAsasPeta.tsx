import { useEffect, useId, useRef, useState } from 'react'
import { LayerGroup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { motion } from 'framer-motion'
import { Map as IkonPeta, Satellite, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Base map switcher shared by every map: Jalan / Satelit / Hibrid.
// Glass pill in the app's style; the choice is remembered in the browser,
// so every map opens in the same mode.

type Mod = 'jalan' | 'satelit' | 'hibrid'

const PILIHAN: { mod: Mod; label: string; Ikon: LucideIcon }[] = [
  { mod: 'jalan', label: 'Jalan', Ikon: IkonPeta },
  { mod: 'satelit', label: 'Satelit', Ikon: Satellite },
  { mod: 'hibrid', label: 'Hibrid', Ikon: Layers },
]

const KUNCI = 'apm-bo:lapisan-peta'
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const ATR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const ATR_ESRI = 'Imej &copy; Esri, Maxar, Earthstar Geographics'

function bacaMod(): Mod {
  try {
    const v = localStorage.getItem(KUNCI)
    if (v === 'jalan' || v === 'satelit' || v === 'hibrid') return v
  } catch {
    // storage blocked: fall back to the street map
  }
  return 'jalan'
}

const Imej = () => (
  <TileLayer
    attribution={ATR_ESRI}
    url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`}
    maxNativeZoom={18}
    maxZoom={19}
  />
)

function LapisanAktif({ mod }: { mod: Mod }) {
  if (mod === 'satelit') return <Imej key="satelit" />
  if (mod === 'hibrid')
    return (
      // Satellite + road and place names
      <LayerGroup key="hibrid">
        <Imej />
        <TileLayer
          url={`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`}
          maxNativeZoom={18}
          maxZoom={19}
        />
        <TileLayer
          url={`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`}
          maxNativeZoom={18}
          maxZoom={19}
        />
      </LayerGroup>
    )
  return (
    <TileLayer
      key="jalan"
      attribution={ATR_OSM}
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  )
}

export function LapisanAsasPeta() {
  const [mod, setMod] = useState<Mod>(bacaMod)
  const kotak = useRef<HTMLDivElement>(null)
  // Unique per map, so two maps on screen don't share the sliding pill
  const id = useId()

  // Clicks / scrolls on the switcher must not drop a pin or zoom the map
  useEffect(() => {
    if (!kotak.current) return
    L.DomEvent.disableClickPropagation(kotak.current)
    L.DomEvent.disableScrollPropagation(kotak.current)
  }, [])

  const tukar = (m: Mod) => {
    setMod(m)
    try {
      localStorage.setItem(KUNCI, m)
    } catch {
      // storage blocked: the choice just won't be remembered
    }
  }

  return (
    <>
      <LapisanAktif mod={mod} />

      <div
        ref={kotak}
        role="radiogroup"
        aria-label="Jenis peta"
        className="absolute right-3 top-3 z-[1000] flex items-center gap-0.5 rounded-full border border-white/70 bg-white/60 p-1 shadow-[0_10px_30px_rgba(11,42,92,0.18)] backdrop-blur-md"
      >
        {PILIHAN.map(({ mod: m, label, Ikon }) => {
          const aktif = m === mod
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={aktif}
              title={label}
              onClick={() => tukar(m)}
              className={`relative flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                aktif ? 'text-white' : 'text-neutral-700 hover:bg-white/60 hover:text-neutral-900'
              }`}
            >
              {aktif && (
                <motion.span
                  layoutId={`lapisan-peta-${id}`}
                  className="absolute inset-0 rounded-full bg-emerald-700 shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Ikon size={15} className="relative shrink-0" />
              <span className="relative hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}