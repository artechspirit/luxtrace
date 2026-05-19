"use client"

import React, { useEffect, useState } from 'react'

interface LoaderProps {
  isOpen: boolean
  title?: string
  message?: string
}

const LOADER_STEPS = [
  "Initializing Sepolia Web3 handshake...",
  "Broadcasting transaction to Ethereum network...",
  "Awaiting proof-of-authority block finality (~12s)...",
  "Validating hardware signature via NFC-gate...",
  "Updating digital twin ownership records...",
]

export default function Loader({ isOpen, title = "Executing Blockchain Sync", message }: LoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      return
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < LOADER_STEPS.length - 1 ? prev + 1 : prev))
    }, 2400) // Change message every 2.4 seconds to distribute over 12 seconds

    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl transition-all duration-500">
      
      {/* Container */}
      <div className="flex flex-col items-center max-w-sm w-full text-center px-6 py-8 rounded-2xl border border-[#00FFB2]/10 bg-[#0B0F0E]/50 shadow-[0_0_50px_rgba(0,255,178,0.08)] relative overflow-hidden mx-4">
        
        {/* Glow behind loader */}
        <div className="absolute -inset-10 bg-gradient-to-r from-[#00FFB2]/5 to-[#00FFB2]/0 rounded-full blur-3xl pointer-events-none"></div>

        {/* Elegant Animated Ring Spinner */}
        <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
          {/* Outer rotating neon border */}
          <div className="absolute inset-0 rounded-full border-2 border-t-[#00FFB2] border-r-transparent border-b-[#00FFB2]/20 border-l-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
          {/* Inner counter-rotating subtle border */}
          <div className="absolute inset-2 rounded-full border border-t-transparent border-r-[#00E6A8] border-b-transparent border-l-[#00E6A8]/20 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
          {/* Core pulsing green dot */}
          <div className="w-4 h-4 rounded-full bg-[#00FFB2] animate-pulse shadow-[0_0_15px_rgba(0,255,178,0.8)]"></div>
        </div>

        {/* Header */}
        <h3 className="text-white font-dm font-bold tracking-widest uppercase text-sm mb-2">{title}</h3>
        <p className="text-[10px] text-[#00FFB2] font-mono uppercase tracking-[0.2em] mb-6 h-5 animate-pulse">
          {message || LOADER_STEPS[currentStep]}
        </p>

        {/* Steps List */}
        <div className="w-full text-left space-y-2.5 border-t border-white/5 pt-5">
          {LOADER_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep
            const isActive = idx === currentStep
            return (
              <div key={idx} className="flex items-center gap-3 transition-opacity duration-300">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isCompleted 
                    ? 'bg-[#00FFB2] shadow-[0_0_5px_rgba(0,255,178,0.5)]' 
                    : isActive 
                    ? 'bg-[#00FFB2] animate-pulse' 
                    : 'bg-zinc-800'
                }`}></span>
                <span className={`text-[10px] font-mono tracking-wide ${
                  isCompleted 
                    ? 'text-zinc-400 line-through decoration-zinc-800' 
                    : isActive 
                    ? 'text-white' 
                    : 'text-zinc-600'
                }`}>
                  {step}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer info */}
        <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono mt-8 block">
          Do not close or refresh this page
        </span>

      </div>
    </div>
  )
}
