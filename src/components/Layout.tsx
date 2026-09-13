import { Outlet } from 'react-router-dom'
import { AppShell } from './AppShell'

export function Layout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
