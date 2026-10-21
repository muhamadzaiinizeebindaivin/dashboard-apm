import type { LucideIcon } from 'lucide-react'
import { Home, Users, AlertTriangle, ClipboardList, Truck, HandCoins, MapPin, UserCog } from 'lucide-react'
import type { UserRole } from '../hooks/useAuth'

export type NavTab = {
  to: string
  label: string
  allow: UserRole[]
  icon: LucideIcon // shown alone when the sidebar is collapsed
}

export const NAV_TABS: NavTab[] = [
  { to: '/', label: 'Laman Utama', allow: ['pkop', 'pkon'], icon: Home },
  { to: '/bencana', label: 'Bencana', allow: ['pkop', 'pkon'], icon: AlertTriangle },
  { to: '/sekretariat', label: 'Sekretariat', allow: ['pkop', 'pkon'], icon: ClipboardList },
  { to: '/logistik', label: 'Logistik', allow: ['pkop', 'pkon'], icon: Truck },
  { to: '/senarai-paras', label: 'PARAS', allow: ['pkop'], icon: MapPin },
  { to: '/senarai-sumbangan', label: 'Sumbangan', allow: ['pkop'], icon: HandCoins },
  { to: '/ngo', label: 'NGO', allow: ['pkop'], icon: Users },
  { to: '/admin', label: 'Admin', allow: ['pkop'], icon: UserCog },
]