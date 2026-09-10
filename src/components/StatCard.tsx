import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

type StatCardProps = {
  label: string
  value: string
  detail: string
}

/**
 * Example micro-interaction: a card that expands in place to reveal detail,
 * rather than opening a separate modal. Demonstrates layout animation +
 * AnimatePresence for enter/exit — the two patterns you'll reuse most on
 * a dashboard (row/card expand, toast enter/exit, tab content swap).
 */
export function StatCard({ label, value, detail }: StatCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      onClick={() => setExpanded((e) => !e)}
      className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      transition={{ layout: { duration: 0.2, ease: 'easeOut' } }}
    >
      <motion.div layout="position" className="flex items-baseline justify-between">
        <span className="text-sm text-neutral-500">{label}</span>
        <span className="text-2xl font-semibold text-neutral-900">{value}</span>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-2 overflow-hidden text-sm text-neutral-600"
          >
            {detail}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
