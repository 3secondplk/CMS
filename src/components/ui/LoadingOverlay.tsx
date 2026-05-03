'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingOverlayProps {
  loading: boolean
  label?: string
  children: React.ReactNode
}

const LoadingOverlay = React.memo(function LoadingOverlay({ loading, label, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl"
          >
            {/* Spinner ring */}
            <div className="relative w-8 h-8 mb-2">
              <div className="absolute inset-0 rounded-full border-[2.5px] border-emerald-200 dark:border-emerald-800" />
              <div className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-emerald-500 animate-spin" />
            </div>
            {label && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{label}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Dim children when loading for visual consistency */}
      <div className={loading ? 'pointer-events-none opacity-50' : ''}>
        {children}
      </div>
    </div>
  )
})

export default LoadingOverlay
