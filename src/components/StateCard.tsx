import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

type StateCardProps = {
  nama: string
  logoUrl?: string
}

/**
 * Placeholder "logo" is a colored initials badge until real state/jabatan
 * logos are supplied — swap the `logoUrl` prop in once available and this
 * renders an <img> instead.
 */
export function StateCard({ nama, logoUrl }: StateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const initials = nama
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

  return (
    <motion.div
      layout
      onClick={() => setExpanded((e) => !e)}
      className="cursor-pointer rounded-xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-md"
      transition={{ layout: { duration: 0.2, ease: 'easeOut' } }}
    >
      <motion.div layout="position" className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={nama} className="h-10 w-10 object-contain" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
            {initials}
          </div>
        )}
        <span className="font-medium text-neutral-900">{nama}</span>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-3 overflow-hidden text-sm text-neutral-500"
          >
            Rekod bencana untuk {nama} akan dipaparkan di sini.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
