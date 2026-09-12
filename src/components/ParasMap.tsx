import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Vite/bundler fix — Leaflet's default marker icon paths break without this
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = defaultIcon

// Blue "you are here" marker, distinct from the standard pins
const posisiSayaIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb66;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

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

// react-leaflet's MapContainer `center` prop only sets the INITIAL view —
// it won't re-pan the map when the prop changes later. This helper uses
// the map instance directly to fly to a new center whenever it updates.
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.8 })
  }, [center, map])
  return null
}

export function ParasMap({ points, center }: ParasMapProps) {
  const initialCenter: [number, number] =
    center ?? (points.length > 0 ? [points[0].latitude, points[0].longitude] : [4.2105, 101.9758]) // tengah Malaysia

  return (
    <div className="h-96 w-full overflow-hidden rounded-2xl border border-neutral-200">
      <MapContainer center={initialCenter} zoom={center ? 14 : points.length > 0 ? 8 : 6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {center && <RecenterMap center={center} />}
        {center && (
          <Marker position={center} icon={posisiSayaIcon}>
            <Popup>Lokasi anda sekarang</Popup>
          </Marker>
        )}
        {points.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <span className="font-medium">{p.negeri}</span>
              <br />
              {new Date(p.created_at).toLocaleString('ms-MY')}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}