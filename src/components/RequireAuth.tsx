import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PemuatHalaman } from './Memuatkan'

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return <PemuatHalaman latar />
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
