import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-sky-50 to-white text-sm text-neutral-400">
        Memuatkan...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
