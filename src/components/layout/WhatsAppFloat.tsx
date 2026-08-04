import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircleIcon } from 'lucide-react'
import { BRAND } from '../../lib/brand'
export function WhatsAppFloat() {
  return (
    <motion.a
      href={BRAND.whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with an agent on WhatsApp"
      initial={{
        scale: 0,
        opacity: 0,
      }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      transition={{
        delay: 0.8,
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      whileHover={{
        scale: 1.06,
      }}
      whileTap={{
        scale: 0.95,
      }}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/20"
    >
      <MessageCircleIcon className="h-6 w-6" />
      <span className="hidden sm:inline">Chat with an Agent</span>
    </motion.a>
  )
}
