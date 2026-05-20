"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Loader from '@/components/Loader'
import { withMinimumDelay } from '@/lib/loader-helper'

// ─── DATA SEEDING ─────────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  {
    product_id: "prod-1",
    serial_number: "LUX-2026-00012",
    brand: "Hermès",
    name: "Birkin 30 Togo Gold",
    status: "OWNED",
    nft_token_id: "782",
    wallet: "0x3F6A...E884",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: { batch_id: "B-2026-X8", location: "Hermès Atelier, Paris" },
        timestamp: "2026-05-01T08:00:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: { nft_token_id: "782", tx_hash: "0x89d2...3eef", nfc_uid: "04:F2:88:A2:9B:40" },
        timestamp: "2026-05-01T14:22:15Z",
      },
      {
        event: "BRAND_OUTLET",
        actor_role: "system",
        metadata: { invoice: "INV-HE-9921", boutique: "Hermès Boutique, Plaza Indonesia", tx_hash: "0x74a2...ff01" },
        timestamp: "2026-05-05T11:00:00Z",
      },
      {
        event: "TRANSFERRED",
        actor_role: "CONSUMER",
        metadata: { via: "P2P_DIRECT_HANDOVER", tx_hash: "0x3bc9...a311", from: "0xBrand...Custody", to: "0x3F6A...E884" },
        timestamp: "2026-05-19T16:45:00Z",
      }
    ]
  },
  {
    product_id: "prod-2",
    serial_number: "LUX-2026-00085",
    brand: "Patek Philippe",
    name: "Nautilus 5711/1A",
    status: "IN_TRANSIT",
    nft_token_id: "109",
    wallet: "0x98D2...1A2B",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: { batch_id: "B-2026-W3", location: "Patek Manufacture, Geneva" },
        timestamp: "2026-05-02T09:15:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: { nft_token_id: "109", tx_hash: "0x51da...8a22", nfc_uid: "04:A1:B2:C3:D4:E5" },
        timestamp: "2026-05-02T16:05:40Z",
      },
      {
        event: "BRAND_OUTLET",
        actor_role: "system",
        metadata: { invoice: "INV-PP-0882", boutique: "Patek Salon, Place Vendôme", tx_hash: "0x9d2e...44f0" },
        timestamp: "2026-05-08T10:12:00Z",
      }
    ]
  },
  {
    product_id: "prod-3",
    serial_number: "LUX-2026-00104",
    brand: "Audemars Piguet",
    name: 'Royal Oak "Jumbo"',
    status: "REGISTERED",
    nft_token_id: "351",
    wallet: "0xAP_Custody...88B0",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: { batch_id: "B-2026-A1", location: "Le Brassus, Switzerland" },
        timestamp: "2026-05-04T07:11:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: { nft_token_id: "351", tx_hash: "0xe2b2...89a2", nfc_uid: "04:77:88:99:AA:BB" },
        timestamp: "2026-05-04T12:00:30Z",
      }
    ]
  },
  {
    product_id: "prod-4",
    serial_number: "LUX-2026-00219",
    brand: "Louis Vuitton",
    name: "Courrier Lozine 110",
    status: "OWNED",
    nft_token_id: "904",
    wallet: "0x71C9...8E3F",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: { batch_id: "B-2026-L5", location: "Asnières Atelier, France" },
        timestamp: "2026-04-20T08:00:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: { nft_token_id: "904", tx_hash: "0xa8c2...12db", nfc_uid: "04:12:34:56:78:90" },
        timestamp: "2026-04-20T15:30:00Z",
      },
      {
        event: "BRAND_OUTLET",
        actor_role: "system",
        metadata: { invoice: "INV-LV-7762", boutique: "Louis Vuitton Maison Champs-Élysées", tx_hash: "0xb7c8...e044" },
        timestamp: "2026-04-25T14:15:00Z",
      },
      {
        event: "TRANSFERRED",
        actor_role: "CONSUMER",
        metadata: { via: "P2P_REMOTE_SHIPPING", tx_hash: "0xd28a...b881", from: "0xLouis...Custody", to: "0x71C9...8E3F" },
        timestamp: "2026-05-18T10:05:00Z",
      }
    ]
  }
]

const INITIAL_TRANSACTIONS = [
  { id: "TX-9901", product_id: "prod-1", product: "Hermès Birkin 30 Togo Gold", serial: "LUX-2026-00012", type: "P2P_DIRECT_HANDOVER", amount: "Rp 350.000.000", status: "COMPLETED", date: "May 19, 2026" },
  { id: "TX-9844", product_id: "prod-2", product: "Patek Philippe Nautilus 5711/1A", serial: "LUX-2026-00085", type: "P2P_REMOTE_SHIPPING", amount: "Rp 1.450.000.000", status: "IN_TRANSIT", date: "May 18, 2026" },
  { id: "TX-9812", product_id: "prod-4", product: "Louis Vuitton Courrier Lozine 110", serial: "LUX-2026-00219", type: "P2P_REMOTE_SHIPPING", amount: "Rp 420.000.000", status: "COMPLETED", date: "May 18, 2026" },
  { id: "TX-9788", product_id: "prod-3", product: "Audemars Piguet Royal Oak", serial: "LUX-2026-00104", type: "PRIMARY_BOUTIQUE", amount: "Rp 750.000.000", status: "PENDING", date: "May 17, 2026" },
]

export default function Dashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'products' | 'transactions'
  const [productStatusFilter, setProductStatusFilter] = useState('ALL')
  const [adminUser, setAdminUser] = useState<any | null>(null)

  // Dynamic KPIs calculations from active state
  const totalTwins = products.length

  const activeEscrowsList = transactions.filter(t => ['PENDING', 'PAID', 'IN_TRANSIT'].includes(t.status))
  const activeEscrowsCount = activeEscrowsList.length
  const lockedVolumeVal = activeEscrowsList.reduce((sum, t) => sum + (t.amountNum || 0), 0)

  const formatVolume = (val: number) => {
    if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(2)}B`
    if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(2)}M`
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  const activeHandoversCount = transactions.filter(t => t.type === 'P2P_DIRECT_HANDOVER' && ['PENDING', 'PAID', 'IN_TRANSIT'].includes(t.status)).length

  // Sync tab with URL search parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam && ['dashboard', 'products', 'transactions'].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  // Switch tabs and update URL query param without full page reload
  const switchTab = (tab: string) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.pushState({}, '', url.toString())
    }
  }

  // Loader states
  const [isLoaderOpen, setIsLoaderOpen] = useState(false)
  const [loaderTitle, setLoaderTitle] = useState('')
  const [loaderMessage, setLoaderMessage] = useState('')

  // Load real data from REST endpoints if authenticated
  useEffect(() => {
    const token = localStorage.getItem('luxtrace_token')
    if (!token) {
      router.push('/')
      return
    }

    const fetchData = async () => {
      try {
        // Fetch current admin profile
        try {
          const userRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const userData = await userRes.json()
          if (userRes.ok && userData.success) {
            setAdminUser(userData.data)
          }
        } catch (e) {
          console.warn('[Dashboard] Failed to fetch admin profile.', e)
        }

        // Fetch products
        const prodRes = await fetch('/api/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const prodData = await prodRes.json()
        if (prodRes.ok && prodData.success && Array.isArray(prodData.data.items)) {
          const mappedProducts = await Promise.all(prodData.data.items.map(async (p: any) => {
            let timeline: any[] = []
            try {
              const provRes = await fetch(`/api/provenance/${p.product_id}`)
              const provData = await provRes.json()
              if (provRes.ok && provData.success) {
                timeline = provData.data.timeline || []
              }
            } catch (e) {}
            return {
              product_id: p.product_id,
              serial_number: p.serial_number,
              brand: p.brand,
              name: p.name,
              status: p.status,
              nft_token_id: p.nft_token_id || '',
              wallet: p.current_owner_id || '0xBrand...Custody',
              timeline
            }
          }))
          setProducts(mappedProducts)
          if (mappedProducts.length > 0) {
            setSelectedProduct(mappedProducts[0])
          } else {
            setSelectedProduct(null)
          }
        } else {
          setProducts([])
          setSelectedProduct(null)
        }

        // Fetch transactions
        const txRes = await fetch('/api/transactions', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const txData = await txRes.json()
        if (txRes.ok && txData.success && Array.isArray(txData.data)) {
          const mappedTxs = txData.data.map((t: any) => ({
            id: t.transaction_id,
            product_id: t.product_id,
            product: t.product_name || `Product ${t.product_id.slice(0, 8)}`,
            serial: t.serial_number || 'N/A',
            type: t.type,
            amount: `Rp ${t.amount_idr.toLocaleString('id-ID')}`,
            amountNum: t.amount_idr,
            status: t.status,
            date: new Date(t.created_at).toLocaleDateString()
          }))
          setTransactions(mappedTxs)
        } else {
          setTransactions([])
        }
      } catch (err) {
        console.warn('[Dashboard] Failed to fetch real data.', err)
        setProducts([])
        setTransactions([])
        setSelectedProduct(null)
      }
    }

    fetchData()
  }, [router])

  const isUuid = (id?: string) => {
    if (!id) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  }

  const getSecurityHeaders = (token: string) => {
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const timestamp = Date.now().toString()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-nonce': nonce,
      'x-timestamp': timestamp
    }
  }

  const refreshData = async () => {
    const token = localStorage.getItem('luxtrace_token')
    if (!token) return

    try {
      // Fetch products
      const prodRes = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const prodData = await prodRes.json()
      if (prodRes.ok && prodData.success && Array.isArray(prodData.data.items)) {
        const mappedProducts = await Promise.all(prodData.data.items.map(async (p: any) => {
          let timeline: any[] = []
          try {
            const provRes = await fetch(`/api/provenance/${p.product_id}`)
            const provData = await provRes.json()
            if (provRes.ok && provData.success) {
              timeline = provData.data.timeline || []
            }
          } catch (e) {}
          return {
            product_id: p.product_id,
            serial_number: p.serial_number,
            brand: p.brand,
            name: p.name,
            status: p.status,
            nft_token_id: p.nft_token_id || '',
            wallet: p.current_owner_id || '0xBrand...Custody',
            timeline
          }
        }))
        setProducts(mappedProducts)
        if (selectedProduct) {
          const updatedSelected = mappedProducts.find(x => x.product_id === selectedProduct.product_id)
          if (updatedSelected) setSelectedProduct(updatedSelected)
        }
      }

      // Fetch transactions
      const txRes = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const txData = await txRes.json()
      if (txRes.ok && txData.success && Array.isArray(txData.data)) {
        const mappedTxs = txData.data.map((t: any) => ({
          id: t.transaction_id,
          product_id: t.product_id,
          product: t.product_name || `Product ${t.product_id.slice(0, 8)}`,
          serial: t.serial_number || 'N/A',
          type: t.type,
          amount: `Rp ${t.amount_idr.toLocaleString('id-ID')}`,
          amountNum: t.amount_idr,
          status: t.status,
          date: new Date(t.created_at).toLocaleDateString()
        }))
        setTransactions(mappedTxs)
      }
    } catch (e) {
      console.warn('[Dashboard] Failed to refresh data:', e)
    }
  }

  // ─── INTEGRATED SIMULATION HANDLERS ──────────────────────────────────────────
  const handlePaymentSuccess = async (txId?: string) => {
    setLoaderTitle('Payment Settlement')
    setLoaderMessage('Verifying incoming bank deposit via Midtrans IRIS...')
    setIsLoaderOpen(true)
    try {
      const token = localStorage.getItem('luxtrace_token') || ''
      if (txId && isUuid(txId)) {
        // Real database transaction — call actual endpoint
        const response = await fetch(`/api/transactions/${txId}/simulate-payment`, {
          method: 'POST',
          headers: getSecurityHeaders(token),
        })
        const result = await response.json()
        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to trigger real payment settlement')
        }
        await withMinimumDelay(Promise.resolve(), 12500)
        await refreshData()
      } else {
        // Mock fallback for mock transaction
        await withMinimumDelay(
          new Promise((resolve) => setTimeout(resolve, 3000)),
          12500 // 12.5s minimum delay
        )
        if (txId) {
          setTransactions(prev => prev.map(tx => {
            if (tx.id === txId) return { ...tx, status: 'PAID' }
            return tx
          }))
          const targetTx = transactions.find(t => t.id === txId)
          if (targetTx) {
            setProducts(prev => prev.map(p => {
              if (p.product_id === targetTx.product_id) {
                const updatedP = { 
                  ...p, 
                  status: 'OWNED',
                  timeline: [
                    ...p.timeline,
                    {
                      event: "BRAND_OUTLET",
                      actor_role: "system",
                      metadata: { invoice: `INV-${targetTx.id}`, boutique: "Boutique Terminal Gateway", tx_hash: "0x3f12...acdd" },
                      timestamp: new Date().toISOString()
                    }
                  ]
                }
                setSelectedProduct(updatedP)
                return updatedP
              }
              return p
            }))
          }
        }
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Payment processing failed'}`)
    } finally {
      setIsLoaderOpen(false)
    }
  }

  const handleNftTransfer = async (txId?: string) => {
    setLoaderTitle('On-Chain NFT Relayer')
    setLoaderMessage('Broadcasting gasless NFT mint to Sepolia endpoint...')
    setIsLoaderOpen(true)
    try {
      if (txId && isUuid(txId)) {
        // Real transaction — refresh status (NFT transfer is automated during payment / NFC verification)
        await withMinimumDelay(Promise.resolve(), 13500)
        await refreshData()
      } else {
        await withMinimumDelay(
          new Promise((resolve) => setTimeout(resolve, 4000)),
          13500 // 13.5s minimum delay
        )
        if (txId) {
          setTransactions(prev => prev.map(tx => {
            if (tx.id === txId) return { ...tx, status: 'COMPLETED' }
            return tx
          }))
        }
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'NFT Relayer failed'}`)
    } finally {
      setIsLoaderOpen(false)
    }
  }

  const handleNfcVerification = async (txId?: string) => {
    setLoaderTitle('NFC Proximity Check')
    setLoaderMessage('Retrieving active NFC session keys & scanning physical UID...')
    setIsLoaderOpen(true)
    try {
      const token = localStorage.getItem('luxtrace_token') || ''
      if (txId && isUuid(txId)) {
        // Find transaction info from state
        const targetTx = transactions.find(t => t.id === txId)
        if (!targetTx) throw new Error('Transaction not found in dashboard state')

        // 1. Fetch nfc_uid from nfc-debug route
        const nfcDebugRes = await fetch(`/api/products/${targetTx.product_id}/nfc-debug`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const nfcDebugData = await nfcDebugRes.json()
        if (!nfcDebugRes.ok || !nfcDebugData.success || !nfcDebugData.data.nfc_uid) {
          throw new Error('NFC Tag not bound to this product yet')
        }
        const scannedUid = nfcDebugData.data.nfc_uid

        // 2. Generate active QR session via API
        const qrRes = await fetch(`/api/p2p/remote/${txId}/qr`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const qrData = await qrRes.json()
        if (!qrRes.ok || !qrData.success) {
          throw new Error(qrData.error?.message || 'Failed to generate active QR session')
        }
        const sessionId = qrData.data.session_id

        // 3. Post to verify endpoint (remote P2P shipping or direct handover)
        const isDirect = targetTx.type === 'P2P_DIRECT_HANDOVER'
        const verifyRes = await fetch('/api/p2p/verify', {
          method: 'POST',
          headers: getSecurityHeaders(token),
          body: JSON.stringify({
            session_id: sessionId,
            scanned_uid: scannedUid,
            mode: isDirect ? 'direct' : 'remote'
          })
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error?.message || 'NFC verification match check failed')
        }

        await withMinimumDelay(Promise.resolve(), 12000)
        await refreshData()
      } else {
        // Mock fallback
        await withMinimumDelay(
          new Promise((resolve) => setTimeout(resolve, 2000)),
          12000 // 12s minimum delay
        )
        if (txId) {
          setTransactions(prev => prev.map(tx => {
            if (tx.id === txId) return { ...tx, status: 'COMPLETED' }
            return tx
          }))
          const targetTx = transactions.find(t => t.id === txId)
          if (targetTx) {
            setProducts(prev => prev.map(p => {
              if (p.product_id === targetTx.product_id) {
                const updatedP = {
                  ...p,
                  status: 'OWNED',
                  timeline: [
                    ...p.timeline,
                    {
                      event: "TRANSFERRED",
                      actor_role: "CONSUMER",
                      metadata: { via: targetTx.type, tx_hash: "0x98f2...11ac", from: p.wallet, to: "0xNEW_OWNER...99b2" },
                      timestamp: new Date().toISOString()
                    }
                  ]
                }
                setSelectedProduct(updatedP)
                return updatedP
              }
              return p
            }))
          }
        }
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'NFC Verification failed'}`)
    } finally {
      setIsLoaderOpen(false)
    }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoaderTitle('Bulk Registration Queue')
    setLoaderMessage('Parsing CSV and validating serial duplicates...')
    setIsLoaderOpen(true)

    try {
      const token = localStorage.getItem('luxtrace_token') || ''
      const formData = new FormData()
      formData.append('file', file)

      // Post file to upload endpoint
      const response = await fetch('/api/products/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || result.message || 'CSV upload failed')
      }

      const batchId = result.data.batch_id
      setLoaderMessage(`Batch submitted! Processing on Ethereum Sepolia. Polling progress...`)

      // Poll batch status every 3 seconds until completed
      let isCompleted = false
      let attempts = 0
      while (!isCompleted && attempts < 40) {
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 3000))
        
        const pollRes = await fetch(`/api/products/batch/${batchId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const pollData = await pollRes.json()
        
        if (pollRes.ok && pollData.success) {
          const batch = pollData.data
          setLoaderMessage(`Ethereum Sepolia Finality: Processing ${batch.processed} of ${batch.total_submitted} items...`)
          
          if (batch.status === 'COMPLETED' || batch.status === 'FAILED') {
            isCompleted = true
            if (batch.failed && batch.failed.length > 0) {
              const failures = batch.failed.map((f: any) => `${f.serial_number}: ${f.reason}`).join('\n')
              alert(`Batch completed with some errors:\n${failures}`)
            } else {
              alert(`Successfully minted and registered ${batch.total_submitted} digital twins on Ethereum Sepolia!`)
            }
          }
        }
      }

      await refreshData()
    } catch (err: any) {
      alert(`Upload Error: ${err.message || 'Invalid CSV file format'}`)
    } finally {
      setIsLoaderOpen(false)
      // Reset input
      e.target.value = ''
    }
  }

  // ─── FILTER PRODUCTS ───────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = productStatusFilter === 'ALL' || p.status === productStatusFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] font-sans antialiased text-[#ededed]">
      
      {/* ─── SIDEBAR ───────────────────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-[#00FFB2]/8 bg-black/40 backdrop-blur-md flex flex-col justify-between p-6">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#0F2A25] to-[#00FFB2] flex items-center justify-center border border-[#00FFB2]/20 shadow-[0_0_15px_rgba(0,255,178,0.25)]">
              <span className="text-black font-dm font-bold text-sm tracking-wider">L</span>
            </div>
            <div>
              <span className="text-white font-dm font-bold tracking-widest text-lg block">LUXTRACE</span>
              <span className="text-[10px] text-[#00FFB2] uppercase tracking-[0.2em] font-mono leading-none">PROVENANCE v1.0</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button 
              onClick={() => switchTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 font-dm uppercase tracking-wider cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-[#0F2A25] to-[#081C18] border border-[#00FFB2]/20 text-[#00FFB2] shadow-[0_0_15px_rgba(0,255,178,0.05)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/3'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => switchTab('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 font-dm uppercase tracking-wider cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-gradient-to-r from-[#0F2A25] to-[#081C18] border border-[#00FFB2]/20 text-[#00FFB2] shadow-[0_0_15px_rgba(0,255,178,0.05)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/3'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Asset Registry</span>
            </button>

            <button 
              onClick={() => switchTab('transactions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 font-dm uppercase tracking-wider cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-gradient-to-r from-[#0F2A25] to-[#081C18] border border-[#00FFB2]/20 text-[#00FFB2] shadow-[0_0_15px_rgba(0,255,178,0.05)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/3'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>P2P Escrows</span>
            </button>
          </nav>
        </div>

        {/* Network & Wallet Status & Logout */}
        <div className="space-y-4">
          <div className="border border-[#00FFB2]/10 bg-black/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#00FFB2] animate-pulse"></span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">SEPOLIA GATEWAY</span>
            </div>
            <p className="text-xs text-white font-mono truncate mb-1" title={adminUser?.wallet_address || '0xBrand...Custody'}>
              {adminUser?.wallet_address 
                ? `${adminUser.wallet_address.slice(0, 6)}...${adminUser.wallet_address.slice(-4)}`
                : '0xBrand...Custody'}
            </p>
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-[11px] font-bold text-white truncate">{adminUser?.full_name || 'System Operator'}</p>
              <p className="text-[9px] text-zinc-500 truncate">{adminUser?.email || 'operator@luxtrace.com'}</p>
            </div>
            <div className="flex items-center justify-between text-[9px] text-[#00FFB2] font-mono border-t border-white/5 pt-2 mt-2">
              <span>GAS RELAYER: ACTIVE</span>
              <span className="opacity-60">12s LATENCY</span>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('luxtrace_token')
              router.push('/')
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/10 hover:bg-red-950/30 border border-red-500/20 hover:border-red-500/40 rounded-lg text-xs font-dm uppercase tracking-wider font-semibold text-red-400 hover:text-red-300 transition duration-200 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-10 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl font-bold font-dm uppercase tracking-wider text-white">
              {activeTab === 'dashboard' && "System Operations"}
              {activeTab === 'products' && "Asset Registry"}
              {activeTab === 'transactions' && "P2P Escrow Manager"}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {activeTab === 'dashboard' && "Real-time status of physical NFC-bound luxury assets on Sepolia Ethereum"}
              {activeTab === 'products' && "Trace, audit, and inspect digital twins registered in the smart contract"}
              {activeTab === 'transactions' && "Inspect Midtrans invoices and release funds upon hardware proximity scan"}
            </p>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search Serial / Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-black/40 border border-[#00FFB2]/10 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-[#00FFB2] transition duration-300 font-sans"
              />
              <svg className="w-4 h-4 absolute right-3 top-2.5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Simulated Action Triggers */}
            {activeTab === 'dashboard' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePaymentSuccess()}
                  className="px-3 py-2 bg-[#0B0F0E] hover:bg-[#0F2A25]/50 border border-zinc-800 hover:border-[#00FFB2]/30 rounded-lg text-xs font-mono text-zinc-400 hover:text-[#00FFB2] transition duration-200 cursor-pointer"
                >
                  Simulate Payment Success
                </button>
                <button 
                  onClick={() => handleNftTransfer()}
                  className="px-3 py-2 bg-[#0B0F0E] hover:bg-[#0F2A25]/50 border border-zinc-800 hover:border-[#00FFB2]/30 rounded-lg text-xs font-mono text-zinc-400 hover:text-[#00FFB2] transition duration-200 cursor-pointer"
                >
                  Simulate NFT Transfer
                </button>
                <button 
                  onClick={() => handleNfcVerification()}
                  className="px-3 py-2 bg-[#0B0F0E] hover:bg-[#0F2A25]/50 border border-zinc-800 hover:border-[#00FFB2]/30 rounded-lg text-xs font-mono text-zinc-400 hover:text-[#00FFB2] transition duration-200 cursor-pointer"
                >
                  Simulate NFC Verify
                </button>
              </div>
            )}

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="glow-btn px-5 py-2 rounded-lg text-xs font-dm uppercase tracking-wider font-semibold cursor-pointer"
            >
              Mint New Twin
            </button>
          </div>
        </div>

        {/* ─── TAB CONTENT: DASHBOARD ───────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6">
              <div className="luxury-card rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#00FFB2]/2 rounded-full blur-2xl group-hover:bg-[#00FFB2]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-[#00FFB2] font-mono uppercase tracking-widest block mb-2">Total Registered Twins</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">{totalTwins}</span>
                  <span className="text-xs text-[#00FFB2] font-mono leading-none">Active Twins</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">100% on-chain Sepolia NFT proof</p>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#00FFB2]/2 rounded-full blur-2xl group-hover:bg-[#00FFB2]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">Escrow Locked Volume</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-dm text-white">{formatVolume(lockedVolumeVal)}</span>
                  <span className="text-xs text-zinc-400 font-mono leading-none">{activeEscrowsCount} escrows</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">Midtrans transaction hold state</p>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#00FFB2]/2 rounded-full blur-2xl group-hover:bg-[#00FFB2]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">P2P Handover Sessions</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">{activeHandoversCount}</span>
                  <span className="text-xs text-[#00FFB2] font-mono leading-none">Active Sessions</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">5-minute active TTL verification</p>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden border-[#ff3e3e]/20 group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#ff3e3e]/2 rounded-full blur-2xl group-hover:bg-[#ff3e3e]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-[#ff3e3e] font-mono uppercase tracking-widest block mb-2">NFC Fraud Incidents</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">0</span>
                  <span className="text-xs text-emerald-400 font-mono leading-none">Secured</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">Real-time hardware check matching</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-3 gap-6">
              <div className="luxury-card rounded-xl p-6 col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">Verification Throughput</h3>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">Sepolia blockchain transaction latency trends</p>
                  </div>
                  <div className="flex gap-4 text-[9px] font-mono text-[#00FFB2]">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2]"></span>
                      <span>Primary Sales</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                      <span>P2P Transfers</span>
                    </div>
                  </div>
                </div>

                <div className="h-64 relative">
                  <svg className="w-full h-full" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00FFB2" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#00FFB2" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="190" x2="600" y2="190" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                    <path d="M 0 190 L 100 170 L 200 110 L 300 150 L 400 80 L 500 120 L 600 60 L 600 210 L 0 210 Z" fill="url(#areaGradient)" />
                    <path d="M 0 190 L 100 170 L 200 110 L 300 150 L 400 80 L 500 120 L 600 60" 
                          stroke="#00FFB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                          style={{ filter: 'drop-shadow(0px 0px 8px rgba(0, 255, 178, 0.5))' }} />

                    <circle cx="200" cy="110" r="4" fill="#00FFB2" stroke="#0A0A0A" strokeWidth="1.5" />
                    <circle cx="400" cy="80" r="4" fill="#00FFB2" stroke="#0A0A0A" strokeWidth="1.5" />
                    <circle cx="600" cy="60" r="4" fill="#00FFB2" stroke="#0A0A0A" strokeWidth="1.5" />

                    <text x="180" y="95" fill="white" fontSize="9" fontFamily="monospace">15.2s (Peak)</text>
                    <text x="385" y="65" fill="white" fontSize="9" fontFamily="monospace">12.0s (Min)</text>
                  </svg>
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-2 px-1">
                    <span>00:00 AM</span>
                    <span>04:00 AM</span>
                    <span>08:00 AM</span>
                    <span>12:00 PM</span>
                    <span>04:00 PM</span>
                    <span>08:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="luxury-card rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">Security Integrity</h3>
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">Percentage match rate of hardware tags</p>
                </div>
                
                <div className="flex justify-center items-center py-4 relative">
                  <svg className="w-36 h-36" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#00FFB2" strokeWidth="6" fill="transparent" 
                            strokeDasharray="251.2" strokeDashoffset="12.5" strokeLinecap="round"
                            transform="rotate(-90 50 50)" 
                            style={{ filter: 'drop-shadow(0px 0px 5px rgba(0, 255, 178, 0.4))' }} />
                    <text x="50" y="55" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="monospace">95%</text>
                  </svg>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>TRUST SCORE:</span>
                    <span className="text-[#00FFB2] font-semibold">AAA SECURITY</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Split view: operations list & timeline */}
            <div className="grid grid-cols-5 gap-6">
              {/* Operations list */}
              <div className="luxury-card rounded-xl p-6 col-span-3">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">Twin Transactions</h3>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">Live off-chain invoice locks & digital signature states</p>
                  </div>
                  <span className="text-[9px] text-[#00FFB2] font-mono bg-[#00FFB2]/5 px-2.5 py-1 border border-[#00FFB2]/10 rounded-full">
                    {transactions.filter(t => t.status !== 'COMPLETED').length} ACTIVE ESCROWS
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                        <th className="py-3 px-2">TX ID</th>
                        <th className="py-3 px-2">Twin Model</th>
                        <th className="py-3 px-2">Transfer Type</th>
                        <th className="py-3 px-2 text-right">Value</th>
                        <th className="py-3 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map((tx) => (
                        <tr 
                          key={tx.id} 
                          className="hover:bg-white/2 cursor-pointer transition duration-150 group"
                          onClick={() => {
                            const matched = products.find(p => p.product_id === tx.product_id)
                            if (matched) setSelectedProduct(matched)
                          }}
                        >
                          <td className="py-4 px-2 font-mono text-[#00FFB2]">{tx.id}</td>
                          <td className="py-4 px-2 text-white font-medium group-hover:text-[#00FFB2] transition duration-200">
                            <span className="block font-dm text-sm leading-none mb-1">{tx.product}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{tx.serial}</span>
                          </td>
                          <td className="py-4 px-2 font-mono text-[10px] text-zinc-400">{tx.type}</td>
                          <td className="py-4 px-2 text-right font-mono font-medium">{tx.amount}</td>
                          <td className="py-4 px-2 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono tracking-widest uppercase border ${
                              tx.status === 'COMPLETED' 
                                ? 'bg-[#00FFB2]/5 border-[#00FFB2]/15 text-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.05)]' 
                                : tx.status === 'IN_TRANSIT' 
                                ? 'bg-amber-400/5 border-amber-400/15 text-amber-400' 
                                : tx.status === 'PAID'
                                ? 'bg-[#00FFB2]/5 border-[#00FFB2]/20 text-[#00FFB2]'
                                : 'bg-zinc-400/5 border-zinc-400/15 text-zinc-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Provenance Explorer */}
              <div className="luxury-card rounded-xl p-6 col-span-2">
                <div className="mb-6">
                  <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">Provenance Explorer</h3>
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">Trace digital twin lifecycles from manufacture to ownership</p>
                </div>

                {!selectedProduct ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border border-dashed border-[#00FFB2]/20 flex items-center justify-center text-zinc-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono">No active digital twins selected</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">Select Active Asset Twin</label>
                      <select 
                        className="w-full bg-black/40 border border-[#00FFB2]/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00FFB2] text-white"
                        value={selectedProduct.product_id}
                        onChange={(e) => {
                          const matched = products.find(p => p.product_id === e.target.value)
                          if (matched) setSelectedProduct(matched)
                        }}
                      >
                        {products.map(p => (
                          <option key={p.product_id} value={p.product_id} className="bg-[#0A0A0A] text-white">
                            [{p.serial_number}] {p.brand} {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border border-white/5 bg-black/20 rounded-lg p-3.5 mb-6 text-xs relative overflow-hidden">
                      <div className="absolute right-3 top-3 px-2 py-0.5 bg-[#00FFB2]/5 border border-[#00FFB2]/10 rounded text-[9px] text-[#00FFB2] font-mono">
                        NFT ID: #{selectedProduct.nft_token_id || 'PENDING'}
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono">{selectedProduct.brand}</p>
                      <h4 className="font-dm font-bold text-sm text-white mt-0.5 uppercase tracking-wide">{selectedProduct.name}</h4>
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-3 border-t border-white/5 pt-2">
                        <span>OWNER WALLET:</span>
                        <span className="text-white hover:text-[#00FFB2] cursor-pointer font-mono">{selectedProduct.wallet}</span>
                      </div>
                    </div>

                    {/* Timeline display */}
                    <div className="relative pl-6 border-l border-[#00FFB2]/10 space-y-6">
                      {selectedProduct.timeline && selectedProduct.timeline.map((log: any, index: number) => {
                        const isLast = index === selectedProduct.timeline.length - 1
                        return (
                          <div key={index} className="relative">
                            <span className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${
                              isLast ? 'bg-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.5)]' : 'bg-zinc-800'
                            }`}>
                              {isLast && <span className="w-1.5 h-1.5 rounded-full bg-black"></span>}
                            </span>

                            <div>
                              <div className="flex justify-between items-baseline mb-1">
                                <span className={`text-[10px] font-mono tracking-widest uppercase font-semibold ${
                                  isLast ? 'text-[#00FFB2]' : 'text-white'
                                }`}>
                                  {log.event}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {new Date(log.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-[11px] text-zinc-400 space-y-1">
                                <div className="flex justify-between text-[9px] font-mono">
                                  <span>ACTOR: {log.actor_role}</span>
                                </div>
                                {log.metadata && Object.entries(log.metadata).map(([key, value]) => (
                                  <div key={key} className="flex justify-between font-mono">
                                    <span className="uppercase opacity-60 text-[9px]">{key.replace('_', ' ')}:</span>
                                    <span className="text-white truncate max-w-[150px]">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT: ASSET REGISTRY ──────────────────────────────────────── */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-3 gap-8">
            
            {/* Products registry list (2/3 columns) */}
            <div className="luxury-card rounded-xl p-6 col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-bold font-dm uppercase tracking-widest text-white">Registered Twins</h3>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-[#0F2A25]/30 hover:bg-[#0F2A25]/50 border border-[#00FFB2]/20 hover:border-[#00FFB2]/40 rounded-lg text-[10px] font-mono text-[#00FFB2] cursor-pointer transition duration-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Mint New Twin (CSV)</span>
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleCsvUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
                
                {/* Status Filter Tab */}
                <div className="flex border border-white/5 rounded-lg overflow-hidden bg-black/40">
                  {['ALL', 'MANUFACTURED', 'REGISTERED', 'OWNED', 'IN_TRANSIT'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setProductStatusFilter(filter)}
                      className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider cursor-pointer transition ${
                        productStatusFilter === filter 
                          ? 'bg-[#00FFB2]/10 text-[#00FFB2] border-r border-white/5' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {filter.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                      <th className="py-3 px-2">Twin Model</th>
                      <th className="py-3 px-2">Serial Number</th>
                      <th className="py-3 px-2">NFT Token ID</th>
                      <th className="py-3 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.map((p) => (
                      <tr 
                        key={p.product_id}
                        onClick={() => setSelectedProduct(p)}
                        className={`hover:bg-white/2 cursor-pointer transition duration-150 ${
                          selectedProduct.product_id === p.product_id ? 'bg-white/2 border-l border-[#00FFB2]' : ''
                        }`}
                      >
                        <td className="py-4 px-2 text-white font-medium">
                          <span className="block font-dm text-sm leading-none mb-1">{p.brand}</span>
                          <span className="text-[10px] text-zinc-400">{p.name}</span>
                        </td>
                        <td className="py-4 px-2 font-mono text-zinc-400">{p.serial_number}</td>
                        <td className="py-4 px-2 font-mono text-[#00FFB2]">
                          {p.nft_token_id ? `#${p.nft_token_id}` : 'UNMINTED'}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono tracking-widest uppercase border ${
                            p.status === 'OWNED' 
                              ? 'bg-[#00FFB2]/5 border-[#00FFB2]/15 text-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.05)]' 
                              : p.status === 'IN_TRANSIT' 
                              ? 'bg-amber-400/5 border-amber-400/15 text-amber-400' 
                              : p.status === 'REGISTERED'
                              ? 'bg-blue-400/5 border-blue-400/15 text-blue-400'
                              : 'bg-zinc-400/5 border-zinc-400/15 text-zinc-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Product Twin detailed properties inspection (1/3 columns) */}
            <div className="space-y-6">
              {!selectedProduct ? (
                <div className="luxury-card rounded-xl p-6 text-center py-12">
                  <p className="text-xs text-zinc-500 font-mono">No product selected</p>
                </div>
              ) : (
                <>
                  <div className="luxury-card rounded-xl p-6 space-y-6">
                    <div>
                      <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-zinc-400">Twin Properties</h3>
                      <h2 className="text-lg font-bold font-dm text-white mt-1 uppercase tracking-wide">
                        {selectedProduct.brand} {selectedProduct.name}
                      </h2>
                    </div>

                    <div className="space-y-4 text-xs border-t border-white/5 pt-4">
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">ID:</span>
                        <span className="text-white">{selectedProduct.product_id}</span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">Serial Number:</span>
                        <span className="text-white">{selectedProduct.serial_number}</span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">Status:</span>
                        <span className="text-[#00FFB2]">{selectedProduct.status}</span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">NFT Token ID:</span>
                        <span className="text-white hover:underline cursor-pointer">
                          {selectedProduct.nft_token_id ? `#${selectedProduct.nft_token_id}` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">Current Custody:</span>
                        <span className="text-white truncate max-w-[130px]" title={selectedProduct.wallet}>
                          {selectedProduct.wallet}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Provenance timeline on the same products view */}
                  <div className="luxury-card rounded-xl p-6">
                    <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white mb-6">Off-Chain Log Audits</h3>
                    
                    <div className="relative pl-6 border-l border-[#00FFB2]/10 space-y-6">
                      {selectedProduct.timeline && selectedProduct.timeline.map((log: any, index: number) => {
                        const isLast = index === selectedProduct.timeline.length - 1
                        return (
                          <div key={index} className="relative">
                            <span className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${
                              isLast ? 'bg-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.5)]' : 'bg-zinc-800'
                            }`}>
                              {isLast && <span className="w-1.5 h-1.5 rounded-full bg-black"></span>}
                            </span>

                            <div>
                              <div className="flex justify-between items-baseline mb-1">
                                <span className={`text-[10px] font-mono tracking-widest uppercase font-semibold ${
                                  isLast ? 'text-[#00FFB2]' : 'text-white'
                                }`}>
                                  {log.event}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {new Date(log.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-[11px] text-zinc-400 space-y-1">
                                <div className="flex justify-between text-[9px] font-mono">
                                  <span>ACTOR: {log.actor_role}</span>
                                </div>
                                {log.metadata && Object.entries(log.metadata).map(([key, value]) => (
                                  <div key={key} className="flex justify-between font-mono">
                                    <span className="uppercase opacity-60 text-[9px]">{key.replace('_', ' ')}:</span>
                                    <span className="text-white truncate max-w-[150px]">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* ─── TAB CONTENT: P2P ESCROWS ────────────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            
            {/* Escrow summary KPIs */}
            <div className="grid grid-cols-3 gap-6">
              <div className="luxury-card rounded-xl p-5 relative overflow-hidden">
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">Escrows Awaiting Verification</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {transactions.filter(t => t.status === 'PAID' || t.status === 'IN_TRANSIT').length}
                  </span>
                  <span className="text-xs text-amber-400 font-mono">Active lock</span>
                </div>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden">
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">Completed Escrow Payouts</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {transactions.filter(t => t.status === 'COMPLETED').length}
                  </span>
                  <span className="text-xs text-[#00FFB2] font-mono">Settled</span>
                </div>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden">
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">Awaiting Buyer Deposit</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {transactions.filter(t => t.status === 'PENDING').length}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">Invoices open</span>
                </div>
              </div>
            </div>

            {/* Escrow operations table */}
            <div className="luxury-card rounded-xl p-6">
              <h3 className="text-sm font-bold font-dm uppercase tracking-widest text-white mb-6">P2P Escrow Ledger</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                      <th className="py-3 px-2">Tx ID</th>
                      <th className="py-3 px-2">Product Details</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2 text-right">Value</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-right">Operational Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/2 transition">
                        <td className="py-4 px-2 font-mono text-[#00FFB2]">{tx.id}</td>
                        <td className="py-4 px-2 text-white font-medium">
                          <span className="block font-dm text-sm leading-none mb-1">{tx.product}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{tx.serial}</span>
                        </td>
                        <td className="py-4 px-2 font-mono text-zinc-400 text-[10px]">{tx.type}</td>
                        <td className="py-4 px-2 text-right font-mono font-medium">{tx.amount}</td>
                        <td className="py-4 px-2 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono tracking-widest uppercase border ${
                            tx.status === 'COMPLETED' 
                              ? 'bg-[#00FFB2]/5 border-[#00FFB2]/15 text-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.05)]' 
                              : tx.status === 'IN_TRANSIT' 
                              ? 'bg-amber-400/5 border-amber-400/15 text-amber-400' 
                              : tx.status === 'PAID'
                              ? 'bg-[#00FFB2]/5 border-[#00FFB2]/20 text-[#00FFB2]'
                              : 'bg-zinc-400/5 border-zinc-400/15 text-zinc-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex gap-2 justify-end">
                            {tx.status === 'PENDING' && (
                              <button
                                onClick={() => handlePaymentSuccess(tx.id)}
                                className="px-3 py-1.5 bg-[#0F2A25]/30 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/20 hover:border-[#00FFB2]/40 rounded text-[9px] font-mono text-[#00FFB2] transition uppercase tracking-wider cursor-pointer"
                              >
                                Trigger Pay
                              </button>
                            )}

                            {tx.status === 'PAID' && (
                              <button
                                onClick={() => handleNftTransfer(tx.id)}
                                className="px-3 py-1.5 bg-[#0F2A25]/30 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/20 hover:border-[#00FFB2]/40 rounded text-[9px] font-mono text-[#00FFB2] transition uppercase tracking-wider cursor-pointer"
                              >
                                Release NFT
                              </button>
                            )}

                            {tx.status === 'IN_TRANSIT' && (
                              <button
                                onClick={() => handleNfcVerification(tx.id)}
                                className="px-3 py-1.5 bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 hover:border-amber-400/40 rounded text-[9px] font-mono text-amber-400 transition uppercase tracking-wider cursor-pointer"
                              >
                                NFC Close
                              </button>
                            )}

                            {tx.status === 'COMPLETED' && (
                              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                                Settled & Audited
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
      
      {/* Hidden file input for global CSV import */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".csv" 
        onChange={handleCsvUpload} 
        className="hidden" 
      />

      {/* ─── PREMIUM LOADER OVERLAY ───────────────────────────────────────────── */}
      <Loader isOpen={isLoaderOpen} title={loaderTitle} message={loaderMessage} />
    </div>
  )
}
