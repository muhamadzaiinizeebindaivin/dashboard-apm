import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { STATUS_LABEL, STATUS_BADGE_CLASS } from '../lib/sumbanganStatus'
import type { SumbanganStatus } from '../lib/sumbanganStatus'

type SumbanganRow = {
  id: string
  jenis_kumpulan: string
  nama_kumpulan: string
  no_tel: string | null
  jenis_sumbangan: string
  lokasi_bantuan: string
  status: SumbanganStatus
  created_at: string
}

type SumbanganItem = {
  id: string
  nama_item: string
  kuantiti: string | null
  unit: string | null
}

type SumbanganDetailModalProps = {
  open: boolean
  row: SumbanganRow | null
  onClose: () => void
}

export function SumbanganDetailModal({ open, row, onClose }: SumbanganDetailModalProps) {
  const [items, setItems] = useState<SumbanganItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !row) return

    setLoading(true)
    supabase
      .from('sumbangan_items')
      .select('id, nama_item, kuantiti, unit')
      .eq('sumbangan_id', row.id)
      .then(({ data }) => {
        setItems((data as SumbanganItem[]) ?? [])
        setLoading(false)
      })
  }, [open, row])

  return (
    <AnimatePresence>
      {open && row && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur-md"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            <h2 className="mb-6 text-base font-semibold text-neutral-900">Butiran Sumbangan</h2>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-neutral-500">Jenis Kumpulan</dt>
                <dd className="text-neutral-800">{row.jenis_kumpulan}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Nama Kumpulan</dt>
                <dd className="text-neutral-800">{row.nama_kumpulan}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">No. Tel</dt>
                <dd className="text-neutral-800">{row.no_tel ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Jenis Sumbangan</dt>
                <dd className="text-neutral-800">{row.jenis_sumbangan}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Status</dt>
                <dd>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[row.status]}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium text-neutral-500">Lokasi Bantuan</dt>
                <dd className="text-neutral-800">{row.lokasi_bantuan}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium text-neutral-500">Tarikh</dt>
                <dd className="text-neutral-800">
                  {new Date(row.created_at).toLocaleString('ms-MY')}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-neutral-200 pt-4">
              <h3 className="mb-2 text-xs font-medium text-neutral-500">Jumlah Sumbangan</h3>
              {loading ? (
                <p className="text-sm text-neutral-400">Memuatkan...</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-neutral-400">Tiada butiran tambahan.</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
                    >
                      {item.nama_item}
                      {(item.kuantiti || item.unit) && (
                        <span className="text-neutral-500">
                          {' — '}
                          {item.kuantiti} {item.unit}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}