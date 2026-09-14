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

// Default photo shown when a specific vehicle has no foto_url of its own.
export const JENIS_DEFAULT_PHOTO: Record<string, string> = {
  '4wd': photo4wd,
  ambulans: photoAmbulans,
  lori: photoLori,
  motorsikal: photoMotorsikal,
  marin: photoMarin,
}
