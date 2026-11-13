import { useState } from 'react'
import { Loader2, LogOut, Monitor, Smartphone, Tablet } from 'lucide-react'
import { HAD_PERANTI, bacaEjen, logKeluarPeranti, usePeranti } from '../lib/peranti'
import type { Peranti } from '../lib/peranti'
import { ConfirmModal } from './ConfirmModal'

// List of the devices logged in to an account, like WhatsApp's "Linked devices"

const IKON = { telefon: Smartphone, tablet: Tablet, komputer: Monitor }

// Seen within this time = "Aktif sekarang" (the app reports every minute)
const BARU_MS = 2 * 60_000

const masa = (iso: string) =>
  new Date(iso).toLocaleString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// userId omitted = the logged-in user's own devices.
// bolehLogKeluar: Super Admin view, with a "Log keluar" button per device.
export function SenaraiPeranti({
  userId,
  namaPengguna,
  bolehLogKeluar = false,
  tunjukIp = true,
}: {
  userId?: string
  namaPengguna?: string
  bolehLogKeluar?: boolean
  tunjukIp?: boolean // false in the Super Admin view
}) {
  const { senarai, memuat, ralat, muat } = usePeranti(userId)
  const [sasaran, setSasaran] = useState<Peranti | null>(null)
  const [memproses, setMemproses] = useState(false)
  const [ralatLogKeluar, setRalatLogKeluar] = useState('')

  async function sahkanLogKeluar() {
    if (!sasaran) return
    setMemproses(true)
    setRalatLogKeluar('')
    const gagal = await logKeluarPeranti(sasaran.peranti_id)
    setMemproses(false)
    if (gagal) {
      setRalatLogKeluar(gagal)
      return
    }
    setSasaran(null)
    void muat()
  }

  function tutupSah() {
    setSasaran(null)
    setRalatLogKeluar('')
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Peranti dipautkan ({senarai.length}/{HAD_PERANTI})
      </p>

      {memuat ? (
        <div className="flex items-center gap-2 py-3 text-sm text-neutral-500">
          <Loader2 size={15} className="animate-spin" />
          Memuatkan peranti…
        </div>
      ) : ralat ? (
        <p className="py-3 text-sm text-red-600">{ralat}</p>
      ) : senarai.length === 0 ? (
        <p className="py-3 text-sm text-neutral-500">Tiada peranti yang sedang log masuk.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {senarai.map((p) => {
            const { nama, jenis } = bacaEjen(p.ejen)
            const Ikon = IKON[jenis]
            const aktifSekarang = Date.now() - new Date(p.aktif_terakhir).getTime() < BARU_MS
            return (
              <li key={p.peranti_id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Ikon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800">
                    {nama}
                    {p.semasa && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Peranti ini
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {aktifSekarang ? (
                      <span className="font-medium text-emerald-700">Aktif sekarang</span>
                    ) : (
                      `Aktif terakhir ${masa(p.aktif_terakhir)}`
                    )}
                    {` · Log masuk ${masa(p.log_masuk)}`}
                    {tunjukIp && p.alamat_ip ? ` · IP ${p.alamat_ip}` : ''}
                  </p>
                </div>
                {bolehLogKeluar && !p.semasa && (
                  <button
                    onClick={() => setSasaran(p)}
                    title="Log keluar peranti ini"
                    className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut size={14} />
                    Log keluar
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmModal
        open={!!sasaran}
        title="Log Keluar Peranti"
        message={`Log keluar ${sasaran ? bacaEjen(sasaran.ejen).nama : ''}${
          namaPengguna ? ` daripada akaun ${namaPengguna}` : ''
        }? Peranti ini akan kembali ke halaman log masuk dalam masa seminit.`}
        confirmLabel="Log Keluar"
        loadingLabel="Melog keluar..."
        danger
        loading={memproses}
        error={ralatLogKeluar}
        onConfirm={sahkanLogKeluar}
        onCancel={tutupSah}
      />
    </div>
  )
}