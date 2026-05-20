"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error?.message || 'Authentication failed. Please verify credentials.')
      } else {
        // Store session tokens locally for subsequent requests
        localStorage.setItem('luxtrace_token', result.data.access_token)
        localStorage.setItem('luxtrace_user', JSON.stringify(result.data))
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      console.error('[Login] Connection error:', err)
      setError('System connection error. Please verify your Supabase environment setup.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center relative overflow-hidden font-sans antialiased text-[#ededed]">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FFB2]/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFB2]/3 rounded-full blur-3xl pointer-events-none"></div>

      {/* Login Card */}
      <div className="w-full max-w-md luxury-card rounded-2xl p-8 relative overflow-hidden z-10 mx-4">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded bg-gradient-to-tr from-[#0F2A25] to-[#00FFB2] flex items-center justify-center border border-[#00FFB2]/20 shadow-[0_0_20px_rgba(0,255,178,0.3)] mb-4">
            <span className="text-black font-dm font-bold text-xl tracking-wider">L</span>
          </div>
          <h2 className="text-white font-dm font-bold tracking-widest text-2xl uppercase">LUXTRACE</h2>
          <p className="text-[10px] text-[#00FFB2] uppercase tracking-[0.3em] font-mono mt-1">ADMIN CONTROL PORTAL</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="operator@luxtrace.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-[#00FFB2]/10 rounded-lg px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00FFB2] transition duration-300 font-sans"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block mb-1.5">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-[#00FFB2]/10 rounded-lg px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00FFB2] transition duration-300 font-sans"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full glow-btn py-3 rounded-lg text-xs font-dm font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <p className="text-[8px] text-zinc-600 font-mono text-center mt-6 uppercase tracking-wider">
          Secured by Supabase Auth & Thirdweb Engine
        </p>

      </div>
    </div>
  )
}
