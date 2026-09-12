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
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => {
      setPosisiSaya([position.coords.latitude, position.coords.longitude])
    })
  }, [])

  useEffect(() => {
    async function muatSemula() {
      const { data } = await supabase.rpc('get_paras_lokasi_by_negeri', {
        p_negeri: negeri,
      })
      const semua = (data as LokasiPoint[]) ?? []
      setLokasiAwam(semua.filter((p) => p.status === 'aktif'))
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

  // Warn before an accidental tab close/refresh while tracking is active
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (sedangJejak) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sedangJejak])

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
    trackingIdRef.current = id
    setSedangJejak(true)

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, negeri }))

    hantarPosisi()
    intervalRef.current = setInterval(hantarPosisi, 500)
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
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={apmLogo} alt="Logo APM" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-semibold text-neutral-900">{negeri}</h1>
          </div>

          <button
            onClick={() => navigate('/paras')}
            disabled={sedangJejak}
            title={sedangJejak ? 'Tamatkan jejak dahulu sebelum kembali' : undefined}
            className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
        </div>

        {sedangJejak && (
          <p className="mt-2 text-xs text-neutral-400">
            Sila tekan "Tamat Jejak" sebelum kembali ke senarai negeri.
          </p>
        )}

        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
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

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Peta lokasi — {negeri}
          </h2>
          <ParasMap points={lokasiAwam} center={posisiSaya ?? undefined} />
        </div>
      </div>
    </div>
  )
}