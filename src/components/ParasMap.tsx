import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Maximize2, Minimize2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import logoJohor from '../assets/negeri/johor.png'
import logoKedah from '../assets/negeri/kedah.png'
import logoKelantan from '../assets/negeri/kelantan.png'
import logoMelaka from '../assets/negeri/melaka.png'
import logoNegeriSembilan from '../assets/negeri/negeri_sembilan.png'
import logoPahang from '../assets/negeri/pahang.png'
import logoPulauPinang from '../assets/negeri/pulau_pinang.png'
import logoPerak from '../assets/negeri/perak.png'
import logoPerlis from '../assets/negeri/perlis.png'
import logoSabah from '../assets/negeri/sabah.png'
import logoSarawak from '../assets/negeri/sarawak.png'
import logoSelangor from '../assets/negeri/selangor.png'
import logoTerengganu from '../assets/negeri/terengganu.png'
import logoWilayahPersekutuan from '../assets/negeri/wilayah_persekutuan.png'

const NEGERI_LOGOS: Record<string, string> = {
  Johor: logoJohor,
  Kedah: logoKedah,
  Kelantan: logoKelantan,
  Melaka: logoMelaka,
  'Negeri Sembilan': logoNegeriSembilan,
  Pahang: logoPahang,
  'Pulau Pinang': logoPulauPinang,
  Perak: logoPerak,
  Perlis: logoPerlis,
  Sabah: logoSabah,
  Sarawak: logoSarawak,
  Selangor: logoSelangor,
  Terengganu: logoTerengganu,
  'Wilayah Persekutuan': logoWilayahPersekutuan,
}

function negeriIcon(negeri: string) {
  const logo = NEGERI_LOGOS[negeri]
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:22px;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.4);">
      <img src="${logo}" style="width:100%;height:100%;object-fit:cover;" />
    </div>`,
    iconSize: [32, 22],
    iconAnchor: [16, 11],
    popupAnchor: [0, -11],
  })
}

export type LokasiPoint = {
  id: string
  negeri: string
  latitude: number
  longitude: number
  created_at: string
  status: string
}

type ParasMapProps = {
  points: LokasiPoint[]
  center?: [number, number]
}

function LocateButton({ center }: { center: [number, number] }) {
  const map = useMap()

  return (
    <button
      type="button"
      onClick={() => map.flyTo(center, 15, { duration: 0.8 })}
      title="Pusatkan pada lokasi saya"
      className="absolute bottom-4 right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-emerald-700 shadow-md hover:bg-neutral-50"
    >
      <LocateFixed size={18} />
    </button>
  )
}

function FullscreenResizeHandler() {
  const map = useMap()

  useEffect(() => {
    function handleChange() {
      setTimeout(() => map.invalidateSize(), 100)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [map])

  return null
}

export function ParasMap({ points, center }: ParasMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      wrapperRef.current?.requestFullscreen()
    }
  }

  const initialCenter: [number, number] =
    center ?? (points.length > 0 ? [points[0].latitude, points[0].longitude] : [4.2105, 101.9758])

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden border border-neutral-200 ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'h-96 w-full rounded-2xl'
      }`}
    >
      <MapContainer center={initialCenter} zoom={center ? 14 : points.length > 0 ? 8 : 6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={negeriIcon(p.negeri)}>
            <Popup>
              <span className="font-medium">{p.negeri}</span>
            </Popup>
          </Marker>
        ))}
        {center && <LocateButton center={center} />}
        <FullscreenResizeHandler />
      </MapContainer>

      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Keluar skrin penuh' : 'Skrin penuh'}
        className="absolute right-4 top-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md hover:bg-neutral-50"
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
    </div>
  )
}