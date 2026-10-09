import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Search, LocateFixed, Loader2, MapPin } from 'lucide-react'
import { NEGERI_PUSAT, PUSAT_MALAYSIA } from '../lib/negeriVisual'

type Koordinat = [number, number]

type HasilCarian = { place_id: number; display_name: string; lat: string; lon: string }

type PilihLokasiModalProps = {
  open: boolean
  awal: Koordinat | null
  negeri?: string
  cadangan?: string // prefills the search box (the PPS name)
  tajuk?: string
  onSimpan: (lat: number, lng: number) => void
  onClose: () => void
}

// Custom pin (Leaflet's default marker images break under Vite)
const ikonPin = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#047857;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 34],
})

function KlikPeta({ onPilih }: { onPilih: (k: Koordinat) => void }) {
  useMapEvents({ click: (e) => onPilih([e.latlng.lat, e.latlng.lng]) })
  return null
}

function TerbangKe({ tujuan }: { tujuan: { pusat: Koordinat; zoom: number; n: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (tujuan) map.flyTo(tujuan.pusat, tujuan.zoom, { duration: 0.8 })
  }, [tujuan, map])
  return null
}

// The map mounts while the modal is still laying out — recompute its size once
function BetulkanSaiz() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(t)
  }, [map])
  return null
}

export function PilihLokasiModal(props: PilihLokasiModalProps) {
  if (!props.open) return null
  // Portal so no ancestor style can trap the fixed overlay (same issue as Rekod PARAS)
  return createPortal(<Kandungan {...props} />, document.body)
}

function Kandungan({ awal, negeri, cadangan, tajuk = 'Pilih Lokasi PPS', onSimpan, onClose }: PilihLokasiModalProps) {
  const [pin, setPin] = useState<Koordinat | null>(awal)
  const [tujuan, setTujuan] = useState<{ pusat: Koordinat; zoom: number; n: number } | null>(null)
  const [carian, setCarian] = useState(cadangan?.trim() ?? '')
  const [hasil, setHasil] = useState<HasilCarian[]>([])
  const [mencari, setMencari] = useState(false)
  const [mengesan, setMengesan] = useState(false)
  const [ralat, setRalat] = useState('')
  const [teksLat, setTeksLat] = useState(awal ? awal[0].toFixed(6) : '')
  const [teksLng, setTeksLng] = useState(awal ? awal[1].toFixed(6) : '')

  const permulaan = awal ? { pusat: awal, zoom: 16 } : (negeri ? NEGERI_PUSAT[negeri] : undefined) ?? PUSAT_MALAYSIA

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', tekan)
    return () => window.removeEventListener('keydown', tekan)
  }, [onClose])

  // Single place that moves the pin, so the lat/long fields always match it
  function letakPin(k: Koordinat) {
    setPin(k)
    setTeksLat(k[0].toFixed(6))
    setTeksLng(k[1].toFixed(6))
  }

  function pergi(k: Koordinat, zoom = 17) {
    letakPin(k)
    setTujuan({ pusat: k, zoom, n: Date.now() })
  }

  function gunaKoordinat() {
    setRalat('')
    let a = teksLat
    let b = teksLng
    // Accept a pasted pair "6.1254, 102.2381" in the latitude field
    if (a.includes(',') && !b.trim()) {
      const bahagian = a.split(',')
      a = bahagian[0]
      b = bahagian[1] ?? ''
    }
    const lat = Number(a.trim())
    const lng = Number(b.trim())
    if (!a.trim() || !b.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setRalat('Sila masukkan latitud dan longitud yang sah (cth. 6.1254 dan 102.2381).')
      return
    }
    if (lat < 0.5 || lat > 7.6 || lng < 99 || lng > 119.5) {
      setRalat('Koordinat di luar kawasan Malaysia.')
      return
    }
    pergi([lat, lng])
  }

  function pilihHasil(h: HasilCarian) {
    setHasil([])
    pergi([Number(h.lat), Number(h.lon)])
  }

  // Nominatim (OpenStreetMap). Its usage policy allows ~1 request/second and
  // no search-as-you-type, so we only search on Enter / button click.
  async function cari() {
    const q = carian.trim()
    if (!q) return
    setMencari(true)
    setRalat('')
    setHasil([])
    try {
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        countrycodes: 'my',
        limit: '5',
        'accept-language': 'ms',
      })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as HasilCarian[]
      if (data.length === 0) setRalat('Tiada tempat dijumpai. Cuba tambah nama daerah, atau klik terus pada peta.')
      else if (data.length === 1) pilihHasil(data[0])
      else setHasil(data)
    } catch {
      setRalat('Carian gagal. Sila cuba lagi.')
    } finally {
      setMencari(false)
    }
  }

  function lokasiSaya() {
    setRalat('')
    if (!navigator.geolocation) {
      setRalat('Peranti ini tidak menyokong GPS.')
      return
    }
    setMengesan(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pergi([pos.coords.latitude, pos.coords.longitude])
        setMengesan(false)
      },
      () => {
        setRalat('Gagal mendapatkan lokasi. Pastikan kebenaran lokasi diberikan.')
        setMengesan(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[85vh] sm:max-w-3xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{tajuk}</h2>
            <p className="text-xs text-neutral-500">
              Cari tempat atau klik pada peta, kemudian seret pin untuk melaraskan.
            </p>
          </div>
          <button onClick={onClose} title="Tutup" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative border-b border-neutral-100 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={carian}
                onChange={(e) => setCarian(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') cari()
                }}
                placeholder="cth. SK Bukit Besar Kota Bharu"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="button"
              onClick={cari}
              disabled={mencari || !carian.trim()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {mencari ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Cari
            </button>
            <button
              type="button"
              onClick={lokasiSaya}
              disabled={mengesan}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-60"
            >
              {mengesan ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
              Lokasi saya
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Koordinat:</span>
            <input
              value={teksLat}
              onChange={(e) => setTeksLat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') gunaKoordinat()
              }}
              inputMode="decimal"
              placeholder="Latitud, cth. 6.1254"
              className="h-9 w-40 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            />
            <input
              value={teksLng}
              onChange={(e) => setTeksLng(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') gunaKoordinat()
              }}
              inputMode="decimal"
              placeholder="Longitud, cth. 102.2381"
              className="h-9 w-40 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={gunaKoordinat}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 hover:border-emerald-500 hover:text-emerald-700"
            >
              Guna koordinat
            </button>
          </div>

          {ralat && <p className="mt-2 text-xs text-red-600">{ralat}</p>}

          {/* Results — z-index above Leaflet controls (1000) */}
          {hasil.length > 0 && (
            <ul className="absolute left-5 right-5 top-full z-[1100] mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
              {hasil.map((h) => (
                <li key={h.place_id}>
                  <button
                    type="button"
                    onClick={() => pilihHasil(h)}
                    className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-emerald-50"
                  >
                    <MapPin size={15} className="mt-0.5 shrink-0 text-emerald-700" />
                    <span className="line-clamp-2">{h.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Map */}
        <div className="relative min-h-0 flex-1">
          <MapContainer center={permulaan.pusat} zoom={permulaan.zoom} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <BetulkanSaiz />
            <TerbangKe tujuan={tujuan} />
            <KlikPeta
              onPilih={(k) => {
                setHasil([])
                letakPin(k)
              }}
            />
            {pin && (
              <Marker
                position={pin}
                icon={ikonPin}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const ll = (e.target as L.Marker).getLatLng()
                    letakPin([ll.lat, ll.lng])
                  },
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
          <span className={`flex items-center gap-1.5 text-sm ${pin ? 'text-emerald-700' : 'text-neutral-400'}`}>
            <MapPin size={15} />
            {pin ? `${pin[0].toFixed(5)}, ${pin[1].toFixed(5)}` : 'Belum dipilih — klik pada peta'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => pin && onSimpan(pin[0], pin[1])}
              disabled={!pin}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Simpan lokasi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}