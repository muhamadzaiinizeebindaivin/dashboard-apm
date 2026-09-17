import type { UserRole } from '../hooks/useAuth'

export type NavTab = {
  to: string
  label: string
  allow: UserRole[]
}

export const NAV_TABS: NavTab[] = [
  { to: '/', label: 'Laman Utama', allow: ['pkop', 'pkon'] },
  { to: '/ngo', label: 'NGO', allow: ['pkop'] },
  { to: '/bencana', label: 'Bencana', allow: ['pkop'] },
  { to: '/sekretariat', label: 'Sekretariat', allow: ['pkop', 'pkon'] },
  { to: '/logistik', label: 'Logistik', allow: ['pkop', 'pkon'] },
  { to: '/senarai-sumbangan', label: 'Sumbangan', allow: ['pkop'] },
  { to: '/senarai-paras', label: 'PARAS', allow: ['pkop'] },
  { to: '/admin', label: 'Admin', allow: ['pkop'] },
]