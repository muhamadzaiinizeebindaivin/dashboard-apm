import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import { LocateFixed } from 'lucide-react'
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
import logoKualaLumpur from '../assets/negeri/kuala_lumpur.png'
import logoPutrajaya from '../assets/negeri/putrajaya.png'
import logoLabuan from '../assets/negeri/labuan.png'

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
  'Kuala Lumpur': logoKualaLumpur,
  Putrajaya: logoPutrajaya,
  Labuan: logoLabuan,
}

const NEGERI_ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(NEGERI_LOGOS).map(([negeri, logo]) => [
    negeri,
    L.divIcon({
      className: '',
      html: `<div style="width:32px;height:22px;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.4);">
        <img src="${logo}" style="width:100%;height:100%;object-fit:cover;" />
      </div>`,
      iconSize: [32, 22],
      iconAnchor: [16, 11],
      popupAnchor: [0, -11],
    }),
  ]),
)

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

// Google Maps-style "recenter on me" button. Only pans when clicked —
// never automatically, so it doesn't fight the user's own scrolling/panning
// while a live position keeps updating in the background.
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

// Mounting inside a lazy-loaded route can leave Leaflet with a stale/
// incorrect initial container size, which causes the map to overflow its
// box — recalculate shortly after mount and again on any resize.
function ResizeHandler() {
  const map = useMap()

  useEffect(() => {
    const mountTimeout = setTimeout(() => map.invalidateSize(), 100)

    function handleResize() {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      clearTimeout(mountTimeout)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [map])

  return null
}

export function ParasMap({ points, center }: ParasMapProps) {
  const initialCenter: [number, number] =
    center ?? (points.length > 0 ? [points[0].latitude, points[0].longitude] : [4.2105, 101.9758]) // tengah Malaysia

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-2xl border border-neutral-200">
      <MapContainer center={initialCenter} zoom={center ? 14 : points.length > 0 ? 8 : 6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={NEGERI_ICONS[p.negeri]}>
            <Popup>
              <span className="font-medium">{p.negeri}</span>
            </Popup>
          </Marker>
        ))}
        {center && <LocateButton center={center} />}
        <ResizeHandler />
      </MapContainer>
    </div>
  )
}
