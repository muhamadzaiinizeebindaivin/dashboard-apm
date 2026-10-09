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
import logoKualaLumpur from '../assets/negeri/kuala_lumpur.png'
import logoPutrajaya from '../assets/negeri/putrajaya.png'
import logoLabuan from '../assets/negeri/labuan.png'

export const NEGERI_FLAG: Record<string, string> = {
  Johor: logoJohor,
  Kedah: logoKedah,
  Kelantan: logoKelantan,
  Melaka: logoMelaka,
  'Negeri Sembilan': logoNegeriSembilan,
  Pahang: logoPahang,
  'Pulau Pinang': logoPulauPinang,
  Perak: logoPerak,
  Perlis: logoPerlis,
  Sabah: logoSabah,
  Sarawak: logoSarawak,
  Selangor: logoSelangor,
  Terengganu: logoTerengganu,
  'Kuala Lumpur': logoKualaLumpur,
  Putrajaya: logoPutrajaya,
  Labuan: logoLabuan,
}

export const NEGERI_LIST = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Pulau Pinang',
  'Perak',
  'Perlis',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Putrajaya',
  'Labuan',
]

// Approximate centre + zoom per negeri, used to frame maps
export const NEGERI_PUSAT: Record<string, { pusat: [number, number]; zoom: number }> = {
  Johor: { pusat: [1.9, 103.4], zoom: 8 },
  Kedah: { pusat: [6.0, 100.6], zoom: 9 },
  Kelantan: { pusat: [5.3, 102.0], zoom: 8 },
  Melaka: { pusat: [2.25, 102.3], zoom: 10 },
  'Negeri Sembilan': { pusat: [2.75, 102.1], zoom: 9 },
  Pahang: { pusat: [3.8, 102.6], zoom: 8 },
  'Pulau Pinang': { pusat: [5.4, 100.35], zoom: 10 },
  Perak: { pusat: [4.6, 101.0], zoom: 8 },
  Perlis: { pusat: [6.5, 100.25], zoom: 10 },
  Sabah: { pusat: [5.4, 117.0], zoom: 7 },
  Sarawak: { pusat: [2.5, 113.0], zoom: 7 },
  Selangor: { pusat: [3.3, 101.5], zoom: 9 },
  Terengganu: { pusat: [4.9, 103.0], zoom: 8 },
  'Kuala Lumpur': { pusat: [3.14, 101.69], zoom: 11 },
  Putrajaya: { pusat: [2.93, 101.69], zoom: 12 },
  Labuan: { pusat: [5.3, 115.22], zoom: 11 },
}

export const PUSAT_MALAYSIA: { pusat: [number, number]; zoom: number } = { pusat: [4.2, 108.0], zoom: 5 }