import type { ReactNode } from 'react'

type DashboardCardProps = {
  children: ReactNode
  className?: string
}

export function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
