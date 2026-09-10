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
      <div className="py-2">
        <p className="text-sm text-neutral-400">Portal &gt; Bencana</p>
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
