import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PemuatHalaman } from './Memuatkan'
import { StatusAkaun } from './StatusAkaun'

export function RequireAuth() {
  const { session, profile, loading, profilSedia } = useAuth()

  if (loading) {
    return <PemuatHalaman latar />
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  // Closed by default: nothing is shown until the profile has answered...
  if (!profilSedia) {
    return <PemuatHalaman latar />
  }

  // ...and only an approved account gets in (no profile = deleted / never created)
  if (!profile || profile.status !== 'aktif') {
    return <StatusAkaun />
  }

  return <Outlet />
}
