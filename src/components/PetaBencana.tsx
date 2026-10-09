import { useEffect } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { NEGERI_PUSAT } from '../lib/negeriVisual'
import { formatTarikh, ikonKategori, warnaSelamat } from '../lib/titikBencana'
import type { KategoriBencana, TitikBencana } from '../lib/titikBencana'

export type PpsPeta = {
  id: string
  nama: string
  nama_bencana: string
  negeri: string
  daerah: string | null
  latitude: number
  longitude: number
  status: string
  jumlah_mangsa: number
}

export type ParasPeta = {
  id: string
  negeri: string
  latitude: number
  longitude: number
  nama: string | null
  pangkat: string | null
  keadaan: string | null
}

export type Lapisan = { titik: boolean; pps: boolean; paras: boolean }
export type TindakanTitik = 'kemaskini' | 'lengkapkan' | 'padam'

// Peninsular Malaysia + Sabah/Sarawak/Labuan. Fitting to bounds (rather than a
// fixed centre + zoom) makes the default view adapt to the map's width.
const BATAS_MALAYSIA: L.LatLngBoundsExpression = [
  [0.85, 99.6],
  [7.4, 119.3],
]

// One DivIcon per (category, colour, icon), built once — the Lucide icon is
// rendered to static SVG so the marker matches the rest of the UI.
const cacheIkon = new Map<string, L.DivIcon>()

function ikonTitik(k?: KategoriBencana): L.DivIcon {
  const warna = warnaSelamat(k?.warna)
  const kunci = `${k?.key}|${warna}|${k?.ikon}`
  const sedia = cacheIkon.get(kunci)
  if (sedia) return sedia

  const Ikon = ikonKategori(k?.ikon)
  const svg = renderToStaticMarkup(<Ikon size={16} color="#ffffff" strokeWidth={2.25} />)
  const ikon = L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${warna};border:2px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.35)">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
  cacheIkon.set(kunci, ikon)
  return ikon
}

function Fokus({ negeri }: { negeri: string }) {
  const map = useMap()
  useEffect(() => {
    const s = negeri ? NEGERI_PUSAT[negeri] : undefined
    if (s) map.flyTo(s.pusat, s.zoom, { duration: 0.8 })
    else map.flyToBounds(BATAS_MALAYSIA, { padding: [20, 20], duration: 0.8 })
  }, [negeri, map])
  return null
}

function KlikLetak({ aktif, onLetak }: { aktif: boolean; onLetak: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      if (aktif) onLetak(e.latlng.lat, e.latlng.lng)
    },
  })
  useEffect(() => {
    map.getContainer().style.cursor = aktif ? 'crosshair' : ''
  }, [aktif, map])
  return null
}

function BetulkanSaiz() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

type PopupTitikProps = {
  t: TitikBencana
  k?: KategoriBencana
  onTindakan: (t: TitikBencana, jenis: TindakanTitik) => void
}

function KandunganPopupTitik({ t, k, onTindakan }: PopupTitikProps) {
  const map = useMap()
  const klik = (jenis: TindakanTitik) => {
    map.closePopup()
    onTindakan(t, jenis)
  }
  const angka = (n: number | null) => (n == null ? '—' : n)

  return (
    <div className="w-60 space-y-2 text-sm">
      <div>
        <div className="font-semibold" style={{ color: warnaSelamat(k?.warna) }}>
          {k?.label ?? t.kategori}
        </div>
        <div className="text-neutral-800">{t.lokasi || 'Tiada nama kawasan'}</div>
        <div className="text-xs text-neutral-500">{[t.daerah, t.negeri].filter(Boolean).join(', ')}</div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-center text-xs">
        <div className="rounded-md bg-neutral-100 py-1">
          <div className="font-semibold text-neutral-800">{angka(t.jumlah_mangsa)}</div>
          <div className="text-neutral-500">Mangsa</div>
        </div>
        <div className="rounded-md bg-neutral-100 py-1">
          <div className="font-semibold text-neutral-800">{angka(t.jumlah_kir)}</div>
          <div className="text-neutral-500">KIR</div>
        </div>
        <div className="rounded-md bg-neutral-100 py-1">
          <div className="font-semibold text-neutral-800">{angka(t.jumlah_rumah_terjejas)}</div>
          <div className="text-neutral-500">Rumah</div>
        </div>
      </div>

      {t.pps && <div className="text-xs text-neutral-600">PPS: {t.pps}</div>}
      {t.catatan && <div className="text-xs italic text-neutral-500">{t.catatan}</div>}
      <div className="text-xs text-neutral-400">Mula: {formatTarikh(t.tarikh_mula)}</div>

      <div className="flex gap-1.5 border-t border-neutral-100 pt-2">
        <button
          onClick={() => klik('kemaskini')}
          className="flex-1 rounded-md border border-neutral-200 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Kemaskini
        </button>
        <button
          onClick={() => klik('lengkapkan')}
          className="flex-1 rounded-md bg-emerald-700 py-1 text-xs font-medium text-white hover:bg-emerald-800"
        >
          Lengkapkan
        </button>
        <button
          onClick={() => klik('padam')}
          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Padam
        </button>
      </div>
    </div>
  )
}

type PetaBencanaProps = {
  titik: TitikBencana[]
  kategori: Record<string, KategoriBencana>
  pps: PpsPeta[]
  paras: ParasPeta[]
  lapisan: Lapisan
  negeriFokus: string
  meletak: boolean
  onLetak: (lat: number, lng: number) => void
  onTindakan: (t: TitikBencana, jenis: TindakanTitik) => void
}

export function PetaBencana({
  titik,
  kategori,
  pps,
  paras,
  lapisan,
  negeriFokus,
  meletak,
  onLetak,
  onTindakan,
}: PetaBencanaProps) {
  return (
    <MapContainer bounds={BATAS_MALAYSIA} boundsOptions={{ padding: [20, 20] }} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BetulkanSaiz />
      <Fokus negeri={negeriFokus} />
      <KlikLetak aktif={meletak} onLetak={onLetak} />

      {lapisan.pps &&
        pps.map((p) => (
          <CircleMarker
            key={`pps-${p.id}`}
            center={[p.latitude, p.longitude]}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: p.status === 'cadangan_tutup' ? '#f59e0b' : '#16a34a',
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="space-y-0.5 text-sm">
                <div className="font-semibold text-neutral-900">{p.nama}</div>
                <div className="text-xs text-neutral-500">{[p.daerah, p.negeri].filter(Boolean).join(', ')}</div>
                <div className="text-xs text-neutral-600">
                  {p.nama_bencana} · {p.jumlah_mangsa} mangsa
                </div>
                <div className={`text-xs font-medium ${p.status === 'cadangan_tutup' ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {p.status === 'cadangan_tutup' ? 'Cadangan Tutup' : 'Dibuka'}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {lapisan.paras &&
        paras.map((p) => (
          <CircleMarker
            key={`paras-${p.id}`}
            center={[p.latitude, p.longitude]}
            radius={6}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: p.keadaan === 'kecemasan' ? '#dc2626' : p.keadaan === 'rehat' ? '#f59e0b' : '#2563eb',
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="space-y-0.5 text-sm">
                <div className="font-semibold text-neutral-900">
                  {[p.pangkat, p.nama].filter(Boolean).join(' ') || 'Petugas PARAS'}
                </div>
                <div className="text-xs text-neutral-500">PARAS · {p.negeri}</div>
                {p.keadaan && p.keadaan !== 'biasa' && (
                  <div className={`text-xs font-semibold ${p.keadaan === 'kecemasan' ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.keadaan === 'kecemasan' ? 'KECEMASAN' : 'REHAT'}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {lapisan.titik &&
        titik.map((t) => (
          <Marker key={t.id} position={[t.latitude, t.longitude]} icon={ikonTitik(kategori[t.kategori])}>
            <Popup>
              <KandunganPopupTitik t={t} k={kategori[t.kategori]} onTindakan={onTindakan} />
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}