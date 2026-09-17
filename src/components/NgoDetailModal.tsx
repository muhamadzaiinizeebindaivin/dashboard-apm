import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

type NgoRow = {
  id: string
  nama_kumpulan: string
  lokasi_bencana: string
  jenis_bantuan: string[]
  created_at: string
}

type NgoDetailModalProps = {
  open: boolean
  row: NgoRow | null
  onClose: () => void
}

export function NgoDetailModal({ open, row, onClose }: NgoDetailModalProps) {
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

            <h2 className="mb-6 text-base font-semibold text-neutral-900">Butiran NGO</h2>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-xs font-medium text-neutral-500">Nama Kumpulan</dt>
                <dd className="text-neutral-800">{row.nama_kumpulan}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium text-neutral-500">Lokasi Bencana</dt>
                <dd className="text-neutral-800">{row.lokasi_bencana}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium text-neutral-500">Jenis Bantuan</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {row.jenis_bantuan.map((jenis) => (
                    <span
                      key={jenis}
                      className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                    >
                      {jenis}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium text-neutral-500">Tarikh</dt>
                <dd className="text-neutral-800">
                  {new Date(row.created_at).toLocaleString('ms-MY')}
                </dd>
              </div>
            </dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}