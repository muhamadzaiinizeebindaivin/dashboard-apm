import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'

// ---------------------------------------------------------------------------
// Shared loading primitives. Rules:
//  - one colour / radius / pulse everywhere (Skeleton)
//  - skeletons mirror the real layout so nothing jumps when data arrives
//  - nothing is shown for fast loads (250 ms delay, space still reserved)
//  - screen readers get a status message; reduced-motion users get no pulse
// ---------------------------------------------------------------------------

const TUNDA_MS = 250

type SkeletonProps = { className?: string; style?: CSSProperties }

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`block animate-pulse rounded-md bg-neutral-200/80 motion-reduce:animate-none ${className}`}
    />
  )
}

// Wraps any loading placeholder: reserves its space immediately (invisible),
// fades it in only if loading lasts longer than TUNDA_MS.
type MemuatProps = { label?: string; className?: string; children: ReactNode }

export function Memuat({ label = 'Memuatkan', className = '', children }: MemuatProps) {
  const [nampak, setNampak] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setNampak(true), TUNDA_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`transition-opacity duration-200 ${nampak ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  )
}

// Full-page gate (lazy routes, auth, role)
type PemuatHalamanProps = { latar?: boolean; penuh?: boolean }

export function PemuatHalaman({ latar = false, penuh = true }: PemuatHalamanProps) {
  return (
    <div
      className={`flex items-center justify-center ${penuh ? 'min-h-screen' : 'py-24'} ${
        latar ? 'bg-gradient-to-br from-sky-100 via-sky-50 to-white' : ''
      }`}
    >
      <Memuat label="Memuatkan halaman" className="flex flex-col items-center gap-4">
        <img src={apmLogo} alt="" className="h-14 w-14 object-contain" />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-neutral-200/80">
          <span className="pemuat-bar block h-full w-1/3 rounded-full bg-emerald-600" />
        </div>
        <p aria-hidden="true" className="text-xs font-medium tracking-wide text-neutral-500">
          Memuatkan
        </p>
      </Memuat>
    </div>
  )
}

// Small areas (inside modals, expanded sections)
export function PemuatSebaris({ teks = 'Memuatkan' }: { teks?: string }) {
  return (
    <Memuat label={teks} className="flex items-center gap-2 text-xs text-neutral-400">
      <Loader2 size={14} className="animate-spin text-emerald-600 motion-reduce:animate-none" />
      <span aria-hidden="true">{teks}…</span>
    </Memuat>
  )
}

// ---------------------------------------------------------------------------
// Layout-shaped skeletons
// ---------------------------------------------------------------------------

const LEBAR = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-2/5']

// Card with title/subtitle, status pill and a 3-column stat row
// (Pengurusan PPS cards, Rekod PARAS records)
export function SkeletonKad({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200/80 bg-white/70 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Icon + two lines (report lists)
export function SkeletonBaris() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/40 p-4 backdrop-blur-md">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-40 max-w-full" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  )
}

// Div-based table (used where the whole table is replaced while loading)
export function SkeletonJadual({ baris = 5, lajur = 5 }: { baris?: number; lajur?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-neutral-200 pb-2">
        {Array.from({ length: lajur }, (_, c) => (
          <div key={c} className="flex-1">
            <Skeleton className="h-2.5 w-1/2 bg-neutral-200/60" />
          </div>
        ))}
      </div>
      {Array.from({ length: baris }, (_, r) => (
        <div key={r} className="flex items-center gap-4 py-1">
          {Array.from({ length: lajur }, (_, c) => (
            <div key={c} className="flex-1">
              <Skeleton className={`h-3 ${LEBAR[(r + c) % LEBAR.length]}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// <tr> rows for tables that keep their real <thead> while loading
export function SkeletonBarisJadual({ baris = 5, lajur = 4 }: { baris?: number; lajur?: number }) {
  return (
    <>
      <tr className="sr-only">
        <td role="status">Memuatkan…</td>
      </tr>
      {Array.from({ length: baris }, (_, r) => (
        <tr key={r} aria-hidden="true" className="border-b border-white/40 last:border-0">
          {Array.from({ length: lajur }, (_, c) => (
            <td key={c} className="px-5 py-4">
              <Skeleton className={`h-3 ${LEBAR[(r + c) % LEBAR.length]}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// Logistik: uploaded document row
export function SkeletonDokumen() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-white/60 px-4 py-3">
      <div className="flex flex-1 items-center gap-2">
        <Skeleton className="h-5 w-5 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-48 max-w-full" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>
      <Skeleton className="h-7 w-24 rounded-full" />
    </div>
  )
}

// Logistik: vehicle cards (photo + text), same grid as the real one
export function SkeletonKenderaan({ bil = 3 }: { bil?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: bil }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  )
}