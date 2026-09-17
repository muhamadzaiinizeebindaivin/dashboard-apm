import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../hooks/useAuth'

type RequireRoleProps = {
  allow: UserRole[]
}

export function RequireRole({ allow }: RequireRoleProps) {
  const { profile } = useAuth()

  // Right after login there's a brief window where session is known but
  // the profile (and therefore the role) hasn't arrived yet — wait for it
  // instead of bouncing the user out before we actually know their role.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        Memuatkan...
      </div>
    )
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to="/sekretariat" replace />
  }

  return <Outlet />
}