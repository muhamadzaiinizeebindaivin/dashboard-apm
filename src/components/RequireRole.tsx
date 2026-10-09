import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../hooks/useAuth'
import { PemuatHalaman } from './Memuatkan'

type RequireRoleProps = {
  allow: UserRole[]
}

export function RequireRole({ allow }: RequireRoleProps) {
  const { profile } = useAuth()

  // Right after login there's a brief window where session is known but
  // the profile (and therefore the role) hasn't arrived yet — wait for it
  // instead of bouncing the user out before we actually know their role.
  if (!profile) {
    // Rendered inside the AppShell, so not full-screen
    return <PemuatHalaman penuh={false} />
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to="/sekretariat" replace />
  }

  return <Outlet />
}