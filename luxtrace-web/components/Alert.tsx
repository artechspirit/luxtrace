"use client"

import React, { useEffect } from 'react'

interface AlertProps {
  isOpen: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  onClose: () => void
}

export default function Alert({ isOpen, type, title, message, onClose }: AlertProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Styling maps based on type
  const themeStyles = {
    success: {
      border: 'border-[#00FFB2]/20',
      glow: 'shadow-[0_0_40px_rgba(0,255,178,0.15)]',
      bgGlow: 'from-[#00FFB2]/5 to-[#00FFB2]/0',
      textAccent: 'text-[#00FFB2]',
      iconBg: 'bg-[#00FFB2]/10',
      iconColor: '#00FFB2',
      buttonBg: 'bg-gradient-to-r from-[#0F2A25] to-[#081C18] border-[#00FFB2]/20 hover:border-[#00FFB2]/50 hover:shadow-[0_0_15px_rgba(0,255,178,0.25)] text-[#00FFB2]',
      iconPath: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      )
    },
    error: {
      border: 'border-[#ff3e3e]/20',
      glow: 'shadow-[0_0_40px_rgba(255,62,62,0.15)]',
      bgGlow: 'from-[#ff3e3e]/5 to-[#ff3e3e]/0',
      textAccent: 'text-[#ff3e3e]',
      iconBg: 'bg-[#ff3e3e]/10',
      iconColor: '#ff3e3e',
      buttonBg: 'bg-gradient-to-r from-[#2A0F0F] to-[#1C0808] border-[#ff3e3e]/20 hover:border-[#ff3e3e]/50 hover:shadow-[0_0_15px_rgba(255,62,62,0.25)] text-[#ff3e3e]',
      iconPath: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      )
    },
    warning: {
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_40px_rgba(245,158,11,0.15)]',
      bgGlow: 'from-amber-500/5 to-amber-500/0',
      textAccent: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      iconColor: '#F59E0B',
      buttonBg: 'bg-gradient-to-r from-[#2A1F0F] to-[#1C1508] border-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] text-amber-400',
      iconPath: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      )
    },
    info: {
      border: 'border-blue-500/20',
      glow: 'shadow-[0_0_40px_rgba(59,130,246,0.15)]',
      bgGlow: 'from-blue-500/5 to-blue-500/0',
      textAccent: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      iconColor: '#3B82F6',
      buttonBg: 'bg-gradient-to-r from-[#0F1E2A] to-[#08121C] border-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] text-blue-400',
      iconPath: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      )
    }
  }

  const currentTheme = themeStyles[type] || themeStyles.info

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md transition-all duration-300 animate-fadeIn">
      {/* Modal Container */}
      <div className={`flex flex-col items-center max-w-md w-full text-center px-8 py-8 rounded-2xl border ${currentTheme.border} bg-[#0A0A0A]/90 ${currentTheme.glow} relative overflow-hidden mx-4`}>
        
        {/* Ambient Glow */}
        <div className={`absolute -inset-10 bg-gradient-to-r ${currentTheme.bgGlow} rounded-full blur-3xl pointer-events-none`}></div>

        {/* Dynamic Icon */}
        <div className={`w-16 h-16 rounded-full ${currentTheme.iconBg} flex items-center justify-center mb-5 border border-white/5`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: currentTheme.iconColor }}>
            {currentTheme.iconPath}
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-white font-dm font-bold tracking-widest uppercase text-base mb-3">
          {title}
        </h3>

        {/* Message */}
        <p className="text-xs text-zinc-400 font-mono tracking-wide leading-relaxed mb-8 break-words whitespace-pre-wrap max-w-sm">
          {message}
        </p>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-lg text-xs font-dm uppercase tracking-widest font-semibold border transition-all duration-300 cursor-pointer ${currentTheme.buttonBg}`}
        >
          Acknowledge
        </button>

      </div>
    </div>
  )
}
