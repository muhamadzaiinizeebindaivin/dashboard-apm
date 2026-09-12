import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ParasMap } from '../components/ParasMap'
import type { LokasiPoint } from '../components/ParasMap'

export function SenaraiParas() {
  const [lokasi, setLokasi] = useState<LokasiPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('paras_lokasi')
      .select('id, negeri, latitude, longitude, created_at, status')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLokasi((data as LokasiPoint[]) ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel('senarai-paras-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paras_lokasi' },
        (payload) => {
          setLokasi((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((p) => p.id !== (payload.old as LokasiPoint).id)
            }
            const updated = payload.new as LokasiPoint
            const withoutOld = prev.filter((p) => p.id !== updated.id)
            return [updated, ...withoutOld]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // One marker per negeri — keep only the most recent point for each
  const DUA_MINIT = 2 * 60 * 1000

  const negeriAktif = Array.from(
    lokasi
      .filter((p) => p.status === 'aktif' && Date.now() - new Date(p.created_at).getTime() < DUA_MINIT)
      .reduce((map, p) => {
        const existing = map.get(p.negeri)
        if (!existing || new Date(p.created_at) > new Date(existing.created_at)) {
          map.set(p.negeri, p)
        }
        return map
      }, new Map<string, LokasiPoint>())
      .values(),
  )

  return (
    <div>
      <div className="py-2">
        <p className="text-sm text-neutral-400">Portal &gt; PARAS</p>
        <h1 className="text-2xl font-semibold text-neutral-900">PARAS — Negeri Aktif</h1>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-neutral-400">Memuatkan...</p>
        ) : negeriAktif.length === 0 ? (
          <p className="text-sm text-neutral-400">Tiada negeri aktif dijejak buat masa ini.</p>
        ) : (
          <ParasMap points={negeriAktif} />
        )}
      </div>
    </div>
  )
}
