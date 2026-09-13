import { Home, ChevronRight } from 'lucide-react'
import { StateCard } from '../components/StateCard'

const NEGERI_LIST = [
  'Perlis',
  'Kedah',
  'Pulau Pinang',
  'Perak',
  'Selangor',
  'Negeri Sembilan',
  'Melaka',
  'Johor',
  'Pahang',
  'Terengganu',
  'Kelantan',
  'Sabah',
  'Sarawak',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya',
]

export function Bencana() {
  return (
    <div>
      <div className="mt-2 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-sm">
          <Home size={13} className="text-neutral-400" />
          <span className="text-neutral-400">Portal</span>
          <ChevronRight size={13} className="text-neutral-300" />
          <span className="font-medium text-emerald-700">Bencana</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Bencana</h1>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {NEGERI_LIST.map((negeri) => (
          <StateCard key={negeri} nama={negeri} />
        ))}
      </div>
    </div>
  )
}
