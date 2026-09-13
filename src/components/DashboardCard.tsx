import type { ReactNode } from 'react'

type DashboardCardProps = {
  children: ReactNode
  className?: string
}

export function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/60 bg-white/40 p-6 shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}
