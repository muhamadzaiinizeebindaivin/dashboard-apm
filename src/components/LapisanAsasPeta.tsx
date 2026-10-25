import { useState } from 'react'
import { LayersControl, LayerGroup, TileLayer, useMapEvents } from 'react-leaflet'

// Base map switcher shared by every map: Jalan / Satelit / Hibrid.
// The choice is remembered in the browser, so every map opens in the same mode.

const KUNCI = 'apm-bo:lapisan-peta'
const NAMA = { jalan: 'Jalan', satelit: 'Satelit', hibrid: 'Hibrid' } as const
type Mod = keyof typeof NAMA

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

// Saves the mode each time the user switches it in the control
function SimpanPilihan() {
  useMapEvents({
    baselayerchange(e) {
      const mod = (Object.keys(NAMA) as Mod[]).find((k) => NAMA[k] === e.name)
      if (!mod) return
      try {
        localStorage.setItem(KUNCI, mod)
      } catch {
        // storage blocked: the choice just won't be remembered
      }
    },
  })
  return null
}

const Imej = () => (
  <TileLayer
    attribution={ATR_ESRI}
    url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`}
    maxNativeZoom={18}
    maxZoom={19}
  />
)

export function LapisanAsasPeta() {
  // Read once: the control owns the active layer after mount
  const [awal] = useState(bacaMod)

  return (
    <>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked={awal === 'jalan'} name={NAMA.jalan}>
          <TileLayer
            attribution={ATR_OSM}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer checked={awal === 'satelit'} name={NAMA.satelit}>
          <Imej />
        </LayersControl.BaseLayer>

        {/* Satellite + road and place names */}
        <LayersControl.BaseLayer checked={awal === 'hibrid'} name={NAMA.hibrid}>
          <LayerGroup>
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
        </LayersControl.BaseLayer>
      </LayersControl>
      <SimpanPilihan />
    </>
  )
}