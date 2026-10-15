import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'

export function TidakDijumpai() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white/60 p-8 text-center shadow-xl backdrop-blur-md sm:p-10">
        <img src={apmLogo} alt="Logo APM" className="mx-auto h-14 w-14 object-contain" />
        <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Compass size={24} />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700">Ralat 404</p>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Halaman tidak dijumpai</h1>
        <p className="mt-2 text-sm text-neutral-500">Pautan ini mungkin salah atau halaman telah dipindahkan.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <ArrowLeft size={15} />
          Kembali ke Laman Utama
        </Link>
      </div>
    </div>
  )
}