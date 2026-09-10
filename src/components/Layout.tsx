import { motion } from 'framer-motion'
import { useLocation, Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="px-8 pb-8"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
