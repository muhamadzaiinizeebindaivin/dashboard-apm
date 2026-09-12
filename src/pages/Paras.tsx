import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import apmLogo from '../assets/apm-logo.png'
import logoJohor from '../assets/negeri/johor.png'
import logoKedah from '../assets/negeri/kedah.png'
import logoKelantan from '../assets/negeri/kelantan.png'
import logoMelaka from '../assets/negeri/melaka.png'
import logoNegeriSembilan from '../assets/negeri/negeri_sembilan.png'
import logoPahang from '../assets/negeri/pahang.png'
import logoPulauPinang from '../assets/negeri/pulau_pinang.png'
import logoPerak from '../assets/negeri/perak.png'
import logoPerlis from '../assets/negeri/perlis.png'
import logoSabah from '../assets/negeri/sabah.png'
import logoSarawak from '../assets/negeri/sarawak.png'
import logoSelangor from '../assets/negeri/selangor.png'
import logoTerengganu from '../assets/negeri/terengganu.png'
import logoWilayahPersekutuan from '../assets/negeri/wilayah_persekutuan.png'

const NEGERI_LIST = [
  { nama: 'Johor', logo: logoJohor },
  { nama: 'Kedah', logo: logoKedah },
  { nama: 'Kelantan', logo: logoKelantan },
  { nama: 'Melaka', logo: logoMelaka },
  { nama: 'Negeri Sembilan', logo: logoNegeriSembilan },
  { nama: 'Pahang', logo: logoPahang },
  { nama: 'Pulau Pinang', logo: logoPulauPinang },
  { nama: 'Perak', logo: logoPerak },
  { nama: 'Perlis', logo: logoPerlis },
  { nama: 'Sabah', logo: logoSabah },
  { nama: 'Sarawak', logo: logoSarawak },
  { nama: 'Selangor', logo: logoSelangor },
  { nama: 'Terengganu', logo: logoTerengganu },
  { nama: 'Wilayah Persekutuan', logo: logoWilayahPersekutuan },
]

export function Paras() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-semibold text-neutral-900">Paras Air</h1>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-300"
          >
            <ArrowLeft size={14} />
            Keluar
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {NEGERI_LIST.map(({ nama, logo }) => (
            <button
              key={nama}
              onClick={() => navigate(`/paras/jejak/${encodeURIComponent(nama)}`)}
              className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:border-emerald-600"
            >
              <img src={logo} alt={nama} className="h-10 w-14 rounded object-cover" />
              {nama}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}