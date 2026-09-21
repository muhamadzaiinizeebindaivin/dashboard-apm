import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AccessCodeForm } from './AccessCodeForm'
import { ambilKod } from '../lib/accessCode'
import apmLogo from '../assets/apm-logo.png'

type RequireCodeProps = {
  page: string
  label: string
  children: ReactNode
}

export function RequireCode({ page, label, children }: RequireCodeProps) {
  const navigate = useNavigate()
  const [ok, setOk] = useState(() => !!ambilKod(page))

  if (ok) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/60 p-8 shadow-xl backdrop-blur-md">
        <div className="mb-5 flex justify-center">
          <img src={apmLogo} alt="Logo APM" className="h-14 w-14 object-contain" />
        </div>
        <AccessCodeForm page={page} label={label} onSuccess={() => setOk(true)} />
        <button
          onClick={() => navigate('/')}
          className="mt-4 flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
      </div>
    </div>
  )
}