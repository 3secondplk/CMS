'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingOverlayProps {
  loading: boolean
  label?: string
  children: React.ReactNode
  /** If true, shows a lighter overlay (for debounce waiting vs actual API loading) */
  light?: boolean
}

const LoadingOverlay = React.memo(function LoadingOverlay({ loading, label, children, light }: LoadingOverlayProps) {
  return (
    <div className="relative">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl ${
              light
                ? 'bg-white/15 dark:bg-black/5'
                : 'bg-white/30 dark:bg-black/10'
            }`}
          >
            {/* Spinner ring */}
            <div className="relative w-8 h-8 mb-2">
              <div className={`absolute inset-0 rounded-full border-[2.5px] ${light ? 'border-border/40 dark:border-border/30' : 'border-[#E6BAA3] dark:border-[#7A1A14]'}`} />
              <div className={`absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-[#E14227] ${light ? 'animate-spin' : 'animate-spin'}`} style={light ? { animationDuration: '1.5s' } : undefined} />
            </div>
            {label && (
              <p className={`text-xs font-medium ${light ? 'text-muted-foreground' : 'text-[#B8321E] dark:text-[#F07050]'}`}>{label}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Dim children when loading for visual consistency */}
      <div className={loading ? 'pointer-events-none opacity-70' : ''}>
        {children}
      </div>
    </div>
  )
})

export default LoadingOverlay
