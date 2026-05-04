'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Sparkles, Database, Shield, BarChart3, Users, Rocket, CheckCircle2 } from 'lucide-react'

interface GamifiedLoaderProps {
  isLoading: boolean
}

/* ─── Loading Stage Config (no emojis) ────────────────── */
const LOADING_STAGES = [
  { min: 0, max: 15, label: 'Menghubungkan...', sub: 'Initializing system', icon: Database, color: 'from-[#9DB1CC] to-[#7A96B5]' },
  { min: 15, max: 35, label: 'Verifikasi Auth...', sub: 'Checking credentials', icon: Shield, color: 'from-[#E6BAA3] to-[#D4956B]' },
  { min: 35, max: 55, label: 'Memuat Dashboard...', sub: 'Fetching analytics', icon: BarChart3, color: 'from-[#E14227] to-[#B2AC88]' },
  { min: 55, max: 75, label: 'Sinkronisasi Crew...', sub: 'Syncing crew data', icon: Users, color: 'from-[#9DB1CC] to-[#7A96B5]' },
  { min: 75, max: 90, label: 'Hampir Selesai...', sub: 'Almost there', icon: Rocket, color: 'from-[#E14227] to-[#E6BAA3]' },
  { min: 90, max: 100, label: 'Siap!', sub: 'Ready to go', icon: CheckCircle2, color: 'from-[#E14227] to-[#B2AC88]' },
]

/* ─── Floating Particles ───────────────────────────────── */
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 3,
      opacity: Math.random() * 0.3 + 0.1,
    })),
  [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#E14227]/15"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ─── Animated Logo Component ──────────────────────────── */
function AnimatedLogo({ progress, showComplete }: { progress: number; showComplete: boolean }) {
  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24">
      {/* Rotating ring behind logo */}
      <motion.div
        className="absolute inset-[-6px] rounded-full border-2 border-dashed border-[#E14227]/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-[-12px] rounded-full bg-gradient-to-br from-[#E14227]/20 to-[#9DB1CC]/20 blur-lg"
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Logo image */}
      <motion.div
        className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl shadow-[#E14227]/20"
        animate={
          showComplete
            ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
            : { scale: [1, 1.04, 1] }
        }
        transition={
          showComplete
            ? { duration: 0.6, ease: 'easeOut' }
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <Image
          src="/logo-loader.webp"
          alt="3SC CMS"
          width={128}
          height={128}
          className="w-full h-full object-cover"
          priority
        />
      </motion.div>
      {/* Completion checkmark overlay */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#E14227]/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Progress Ring Component ───────────────────────────── */
function ProgressRing({ progress, stage }: { progress: number; stage: typeof LOADING_STAGES[0] }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  const StageIcon = stage.icon

  return (
    <div className="relative w-36 h-36 sm:w-44 sm:h-44">
      {/* Outer glow ring */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${stage.color} opacity-20 blur-xl scale-110 transition-all duration-500`} />

      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Background track */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/40" />
        {/* Animated progress arc */}
        <motion.circle
          cx="60" cy="60" r={radius} fill="none"
          stroke="url(#progressGradient)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E14227" />
            <stop offset="50%" stopColor="#D4956B" />
            <stop offset="100%" stopColor="#E6BAA3" />
          </linearGradient>
        </defs>
        {/* Decorative dots on track */}
        {[0, 25, 50, 75].map(deg => (
          <circle
            key={deg}
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="2 12"
            className="text-muted/20"
            transform={`rotate(${deg} 60 60)`}
          />
        ))}
      </svg>

      {/* Center content — percentage only */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={progress}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="text-2xl sm:text-3xl font-black tabular-nums bg-gradient-to-br from-[#E14227] to-[#D4956B] bg-clip-text text-transparent"
        >
          {Math.round(progress)}%
        </motion.span>
      </div>

      {/* Orbiting icon */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br ${stage.color} shadow-lg flex items-center justify-center`}>
          <StageIcon className="w-3.5 h-3.5 text-white" />
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Main GamifiedLoader ──────────────────────────────── */
export default function GamifiedLoader({ isLoading }: GamifiedLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const completedRef = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Effect 1: Increment progress while loading
  useEffect(() => {
    if (!isLoading) return

    completedRef.current = false
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    const showTick = setTimeout(() => {
      setIsVisible(true)
      setShowComplete(false)
      setProgress(0)
    }, 0)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 88) return prev + Math.random() * 0.8
        if (prev >= 70) return prev + Math.random() * 1.5
        if (prev >= 40) return prev + Math.random() * 2.5
        return prev + Math.random() * 3.5
      })
    }, 80)

    return () => {
      clearTimeout(showTick)
      clearInterval(interval)
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [isLoading])

  // Effect 2: Handle completion
  useEffect(() => {
    if (isLoading || !isVisible) return

    if (!completedRef.current) {
      completedRef.current = true
      queueMicrotask(() => {
        setProgress(100)
        setShowComplete(true)
      })
    }

    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false)
      hideTimerRef.current = null
    }, 900)

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [isLoading, isVisible])

  const stage = LOADING_STAGES.find(s => progress >= s.min && progress < s.max) || LOADING_STAGES[LOADING_STAGES.length - 1]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#F0EAD6] via-[#F0EAD6] to-[#E6DDD0] dark:from-[#1A1A1B] dark:via-[#222223] dark:to-[#1A1A1B]" />
          <div className="absolute inset-0 bg-dot-pattern opacity-50" />

          {/* Radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E14227]/8 rounded-full blur-[100px] pointer-events-none" />

          <FloatingParticles />

          <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 px-6">
            {/* Animated Logo */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AnimatedLogo progress={Math.min(progress, 100)} showComplete={showComplete} />
            </motion.div>

            {/* Brand text */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center -mt-1"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-[#E14227] via-[#D4956B] to-[#9DB1CC] bg-clip-text text-transparent">
                3SC CMS
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5 tracking-wider uppercase">
                Crew Management System
              </p>
            </motion.div>

            {/* Progress Ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: showComplete ? 1.05 : 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            >
              <ProgressRing progress={Math.min(progress, 100)} stage={stage} />
            </motion.div>

            {/* Stage Label */}
            <motion.div
              key={stage.label}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <p className="text-sm sm:text-base font-bold text-foreground">{stage.label}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stage.sub}</p>
            </motion.div>

            {/* Linear progress bar */}
            <div className="w-56 sm:w-72 space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#E14227] via-[#E6BAA3] to-[#B2AC88] bg-[length:200%_100%]"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                  animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <div className="flex justify-between items-center">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#E14227]/40" />
                </motion.div>
                <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
                  {Math.min(Math.round(progress), 100)} / 100
                </span>
                <motion.div animate={{ rotate: [0, -360] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#9DB1CC]/40" />
                </motion.div>
              </div>
            </div>

            {/* Stage indicators */}
            <div className="flex items-center gap-2">
              {LOADING_STAGES.map((s, i) => {
                const isActive = progress >= s.min
                return (
                  <React.Fragment key={i}>
                    <motion.div
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                        isActive ? 'bg-[#E14227] shadow-md shadow-[#E14227]/30 scale-110' : 'bg-muted-foreground/20'
                      }`}
                      animate={isActive && progress < s.max ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.8, repeat: isActive && progress < s.max ? Infinity : 0 }}
                    />
                    {i < LOADING_STAGES.length - 1 && (
                      <div className={`w-4 h-0.5 rounded-full transition-all duration-500 ${
                        progress >= LOADING_STAGES[i + 1]?.min ? 'bg-[#E14227]' : 'bg-muted-foreground/15'
                      }`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Loading complete burst */}
            <AnimatePresence>
              {showComplete && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E14227]/10 border border-[#E14227]/20"
                >
                  <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 1, repeat: 1 }}>
                    <CheckCircle2 className="w-4 h-4 text-[#E14227]" />
                  </motion.div>
                  <span className="text-xs font-bold text-[#E14227] dark:text-[#E6BAA3]">Loading Complete!</span>
                  <motion.div animate={{ rotate: [0, -360] }} transition={{ duration: 1, repeat: 1 }}>
                    <CheckCircle2 className="w-4 h-4 text-[#E14227]" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
