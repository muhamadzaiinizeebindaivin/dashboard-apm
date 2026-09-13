import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Navigation } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ParasMap } from '../components/ParasMap'
import type { LokasiPoint } from '../components/ParasMap'
import apmLogo from '../assets/apm-logo.png'

const STORAGE_KEY = 'paras_jejak_active'

type SesiJejak = { id: string; negeri: string }

export function ParasJejak() {
  const navigate = useNavigate()
  const { negeri: negeriParam } = useParams<{ negeri: string }>()
  const negeri = decodeURIComponent(negeriParam ?? '')

  const [sedangJejak, setSedangJejak] = useState(false)
  const [ralat, setRalat] = useState('')
  const [lokasiAwam, setLokasiAwam] = useState<LokasiPoint[]>([])
  const [posisiSaya, setPosisiSaya] = useState<[number, number] | null>(null)

  const trackingIdRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function muatSemula() {
      const { data } = await supabase.rpc('get_paras_lokasi_by_negeri', {
        p_negeri: negeri,
      })
      setLokasiAwam((data as LokasiPoint[]) ?? [])
    }

    muatSemula()
    const poll = setInterval(muatSemula, 3000)
    return () => clearInterval(poll)
  }, [negeri])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      const sesi = JSON.parse(saved) as SesiJejak
      if (sesi.negeri !== negeri) return

      trackingIdRef.current = sesi.id
      setSedangJejak(true)

      hantarPosisi()
      intervalRef.current = setInterval(hantarPosisi, 500)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negeri])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function hantarPosisi() {
    if (!trackingIdRef.current) return

    const id = trackingIdRef.current

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setPosisiSaya([latitude, longitude])
        await supabase.rpc('track_paras_lokasi', {
          p_id: id,
          p_negeri: negeri,
          p_latitude: latitude,
          p_longitude: longitude,
        })
      },
      () => {
        setRalat('Tidak dapat mengesan lokasi. Sila benarkan akses GPS.')
        handleTamatJejak()
      },
    )
  }

  function handleMulaJejak() {
    if (!navigator.geolocation) {
      setRalat('Pelayar ini tidak menyokong GPS.')
      return
    }

    setRalat('')
    const id = crypto.randomUUID()

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setPosisiSaya([latitude, longitude])

        trackingIdRef.current = id
        setSedangJejak(true)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, negeri }))

        await supabase.rpc('track_paras_lokasi', {
          p_id: id,
          p_negeri: negeri,
          p_latitude: latitude,
          p_longitude: longitude,
        })

        intervalRef.current = setInterval(hantarPosisi, 500)
      },
      () => {
        setRalat('Tidak dapat mengesan lokasi. Sila benarkan akses GPS.')
      },
    )
  }

  async function handleTamatJejak() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null

    if (trackingIdRef.current) {
      const { error } = await supabase.rpc('stop_paras_lokasi', {
        p_id: trackingIdRef.current,
      })
      if (error) {
        setRalat('Gagal mengemaskini status. Sila cuba lagi.')
        console.error(error)
      }
    }

    localStorage.removeItem(STORAGE_KEY)
    trackingIdRef.current = null
    setSedangJejak(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-white px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-semibold text-neutral-900">{negeri}</h1>
          </div>

          <button
            onClick={() => navigate('/paras')}
            className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-md transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
        </div>

        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-white/60 bg-white/40 p-6 shadow-lg backdrop-blur-md">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={sedangJejak ? handleTamatJejak : handleMulaJejak}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white ${
              sedangJejak ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {sedangJejak && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-white"
              />
            )}
            <Navigation size={16} />
            {sedangJejak ? 'Tamat Jejak' : 'Mula Jejak'}
          </motion.button>

          {ralat && <p className="text-sm text-red-600">{ralat}</p>}
        </div>

        <div className="mt-6 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-md">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Peta lokasi — {negeri}
          </h2>
          <ParasMap points={lokasiAwam} center={posisiSaya ?? undefined} />
        </div>
      </div>
    </div>
  )
}