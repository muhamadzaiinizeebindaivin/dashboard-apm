import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'

export function LaporanAwam() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-semibold text-neutral-900">Laporan</h1>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-300"
          >
            <ArrowLeft size={14} />
            Keluar
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">
            Borang laporan awam (untuk orang ramai) akan dipaparkan di sini.
          </p>
        </div>
      </div>
    </div>
  )
}
