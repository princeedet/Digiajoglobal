import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2Icon, InfoIcon, XCircleIcon, XIcon } from 'lucide-react'
import { useDashboard } from './DashboardContext'
export function Toast() {
  const { toast, dismissToast } = useDashboard()
  const Icon =
    toast?.tone === 'error'
      ? XCircleIcon
      : toast?.tone === 'info'
        ? InfoIcon
        : CheckCircle2Icon
  const color =
    toast?.tone === 'error'
      ? 'text-red-600'
      : toast?.tone === 'info'
        ? 'text-sky-600'
        : 'text-brand'
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 16,
          }}
          role="status"
          className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl"
        >
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
          <p className="text-sm leading-relaxed text-gray-700">
            {toast.message}
          </p>
          <button
            onClick={dismissToast}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Dismiss notification"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
