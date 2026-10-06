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

// One icon per (negeri, keadaan) pair, built lazily and cached so the
// realtime updates don't recreate DivIcons on every render.
const cacheIkon = new Map<string, L.DivIcon>()

function ikonUntuk(negeri: string, keadaan: string = 'biasa'): L.DivIcon {
  const kunci = `${negeri}|${keadaan}`
  const sedia = cacheIkon.get(kunci)
  if (sedia) return sedia

  const bayang =
    keadaan === 'kecemasan'
      ? '0 0 0 3px #dc2626'
      : keadaan === 'rehat'
        ? '0 0 0 3px #f59e0b'
        : '0 1px 4px rgba(0,0,0,0.4)'
  const kelas = keadaan === 'kecemasan' ? 'paras-kecemasan' : ''

  const ikon = L.divIcon({
    className: '',
    html: `<div class="${kelas}" style="width:32px;height:22px;border-radius:4px;overflow:hidden;box-shadow:${bayang};">
      <img src="${NEGERI_LOGOS[negeri] ?? ''}" style="width:100%;height:100%;object-fit:cover;" />
    </div>`,
    iconSize: [32, 22],
    iconAnchor: [16, 11],
    popupAnchor: [0, -11],
  })
  cacheIkon.set(kunci, ikon)
  return ikon
}

export type LokasiPoint = {
  id: string
  negeri: string
  latitude: number
  longitude: number
  created_at: string
  status: string
  nama?: string | null
  pangkat?: string | null
  no_tel?: string | null
  keadaan?: 'biasa' | 'rehat' | 'kecemasan' | null
  keadaan_masa?: string | null
}

type ParasMapProps = {
  points: LokasiPoint[]
  center?: [number, number]
  className?: string
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

    // Also react when the container itself changes size without the window
    // resizing (e.g. the KECEMASAN banner appearing above a full-height map).
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())

    return () => {
      clearTimeout(mountTimeout)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      observer.disconnect()
    }
  }, [map])

  return null
}

export function ParasMap({ points, center, className }: ParasMapProps) {
  const initialCenter: [number, number] =
    center ?? (points.length > 0 ? [points[0].latitude, points[0].longitude] : [4.2105, 101.9758]) // tengah Malaysia

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-neutral-200 ${className ?? 'h-96'}`}>
      <MapContainer center={initialCenter} zoom={center ? 14 : points.length > 0 ? 8 : 6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={ikonUntuk(p.negeri, p.keadaan ?? 'biasa')}
            zIndexOffset={p.keadaan === 'kecemasan' ? 1000 : 0}
          >
            <Popup>
              <div className="space-y-0.5 text-sm">
                <div className="font-medium">{p.negeri}</div>
                {p.keadaan && p.keadaan !== 'biasa' && (
                  <div className={`font-semibold ${p.keadaan === 'kecemasan' ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.keadaan === 'kecemasan' ? 'KECEMASAN' : 'REHAT'}
                    {p.keadaan_masa &&
                      ` · sejak ${new Date(p.keadaan_masa).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                )}
                {p.nama && (
                  <div>
                    {p.pangkat ? `${p.pangkat} ` : ''}
                    {p.nama}
                  </div>
                )}
                {p.no_tel && (
                  <a href={`tel:${p.no_tel}`} className="text-emerald-700">
                    {p.no_tel}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {center && <LocateButton center={center} />}
        <ResizeHandler />
      </MapContainer>
    </div>
  )
}
