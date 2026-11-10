import { Car, Truck, Bike, Ship, Siren } from 'lucide-react'
import photo4wd from '../assets/kenderaan/4wd.jpeg'
import photoAmbulans from '../assets/kenderaan/ambulans.jpeg'
import photoLori from '../assets/kenderaan/lori.jpeg'
import photoMotorsikal from '../assets/kenderaan/motorsikal.jpeg'
import photoMarin from '../assets/kenderaan/marin.jpeg'

export const JENIS_KENDERAAN = [
  { value: '4wd', label: '4WD' },
  { value: 'ambulans', label: 'Ambulans' },
  { value: 'lori', label: 'Lori' },
  { value: 'motorsikal', label: 'Motorsikal' },
  { value: 'marin', label: 'Marin' },
] as const

// Vehicle condition: Baik (ready), Selenggara (under maintenance), Rosak (out of service)
export type Keadaan = 'baik' | 'selenggara' | 'rosak'

export const KEADAAN_LIST: { value: Keadaan; label: string }[] = [
  { value: 'baik', label: 'Baik' },
  { value: 'selenggara', label: 'Selenggara' },
  { value: 'rosak', label: 'Rosak' },
]

export const KEADAAN_LABEL: Record<Keadaan, string> = {
  baik: 'Baik',
  selenggara: 'Selenggara',
  rosak: 'Rosak',
}

// Badge (card, detail panel)
export const KEADAAN_BADGE: Record<Keadaan, string> = {
  baik: 'bg-emerald-100 text-emerald-800',
  selenggara: 'bg-amber-100 text-amber-800',
  rosak: 'bg-red-100 text-red-800',
}

export const KEADAAN_TITIK: Record<Keadaan, string> = {
  baik: 'bg-emerald-600',
  selenggara: 'bg-amber-500',
  rosak: 'bg-red-600',
}

// Selected choice button
export const KEADAAN_AKTIF: Record<Keadaan, string> = {
  baik: 'border-emerald-700 bg-emerald-700 text-white',
  selenggara: 'border-amber-500 bg-amber-500 text-white',
  rosak: 'border-red-600 bg-red-600 text-white',
}

export function normalKeadaan(s: string | null | undefined): Keadaan {
  return s === 'baik' || s === 'selenggara' ? s : 'rosak'
}

export const JENIS_ICON: Record<string, typeof Car> = {
  '4wd': Car,
  ambulans: Siren,
  lori: Truck,
  motorsikal: Bike,
  marin: Ship,
}

export const JENIS_LABEL: Record<string, string> = {
  '4wd': '4WD',
  ambulans: 'Ambulans',
  lori: 'Lori',
  motorsikal: 'Motorsikal',
  marin: 'Marin',
}

// Background gradient — used only as a fallback behind the default photo
// (e.g. while it loads), not as the primary illustration anymore.
export const JENIS_GRADIENT: Record<string, string> = {
  '4wd': 'from-emerald-400 to-emerald-600',
  ambulans: 'from-red-400 to-red-600',
  lori: 'from-amber-400 to-amber-600',
  motorsikal: 'from-sky-400 to-sky-600',
  marin: 'from-cyan-400 to-cyan-600',
}

// Default photo shown when no 3D model is available for this type either.
export const JENIS_DEFAULT_PHOTO: Record<string, string> = {
  '4wd': photo4wd,
  ambulans: photoAmbulans,
  lori: photoLori,
  motorsikal: photoMotorsikal,
  marin: photoMarin,
}

// Auto-detect whichever .glb model files exist in this folder — so the
// app works fine even if you only have some of the 5 types so far. To add
// one, just drop a file named exactly `<jenis>.glb` in here, e.g.
// src/assets/kenderaan-model/4wd.glb
const modelModules = import.meta.glob('../assets/kenderaan-model/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const JENIS_DEFAULT_MODEL: Record<string, string> = {}
for (const path in modelModules) {
  const match = path.match(/([^/]+)\.glb$/)
  if (match) JENIS_DEFAULT_MODEL[match[1]] = modelModules[path] as string
}
