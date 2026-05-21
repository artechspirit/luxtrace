import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { API_BASE_URL } from '@/constants/config'
import Ionicons from '@expo/vector-icons/Ionicons'
import QRCode from 'react-native-qrcode-svg'

interface BoutiqueProduct {
  product_id: string
  serial_number: string
  brand: string
  name: string
  price_idr: number
  nft_token_id: string | null
}

interface SaleResult {
  transaction_id: string
  order_id: string
  product: { brand: string; name: string; serial_number: string }
  buyer: { full_name: string | null; email: string | null }
  amount_idr: number
  payment_url: string
  snap_token?: string
  expires_at: string
}

const SCREEN_WIDTH = Dimensions.get('window').width

export default function SellScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { token } = useAuthStore()
  const { showAlert } = useAlertStore()
  const params = useLocalSearchParams<{ product_id?: string; product_name?: string }>()

  const [products, setProducts] = useState<BoutiqueProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<BoutiqueProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<BoutiqueProduct | null>(null)
  const [buyerEmail, setBuyerEmail] = useState('')
  const [isFocusedEmail, setIsFocusedEmail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null)

  const formatPrice = (idr: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(idr)

  const fetchProducts = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/boutique/products?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        const prods: BoutiqueProduct[] = json.data.products
        setProducts(prods)
        setFilteredProducts(prods)
        if (params.product_id) {
          const preSelected = prods.find((p) => p.product_id === params.product_id)
          if (preSelected) setSelectedProduct(preSelected)
        }
      }
    } catch (err) {
      console.warn('[SellScreen] fetch error:', err)
    } finally {
      setIsLoadingProducts(false)
    }
  }, [token, params.product_id])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredProducts(products); return }
    const q = searchQuery.toLowerCase()
    setFilteredProducts(
      products.filter(
        (p) =>
          p.brand.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.serial_number.toLowerCase().includes(q)
      )
    )
  }, [searchQuery, products])

  const handleInitiateSale = async () => {
    if (!selectedProduct) {
      showAlert('Select Product', 'Please select a product from the inventory list.')
      return
    }
    if (!buyerEmail.trim()) {
      showAlert('Buyer Email Required', 'Enter the email address of the buyer.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(buyerEmail.trim())) {
      showAlert('Invalid Email', 'Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/boutique/initiate-sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedProduct.product_id,
          buyer_email: buyerEmail.trim().toLowerCase(),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        const code = json.error?.code ?? 'UNKNOWN'
        showAlert(`[${code}]`, json.error?.message ?? 'Sale initiation failed')
        return
      }
      setSaleResult(json.data)
    } catch (err: any) {
      showAlert('Network Error', err.message ?? 'Check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setSaleResult(null)
    setSelectedProduct(null)
    setBuyerEmail('')
    setSearchQuery('')
  }

  // ── SUCCESS STATE ──────────────────────────────────────────────────────────
  if (saleResult) {
    const qrSize = SCREEN_WIDTH - 48 - 80 // screen minus padding minus card padding
    const hasPaymentUrl = !!saleResult.payment_url

    return (
      <ScrollView
        className="flex-1 bg-[#0A0A0A]"
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: Math.max(insets.bottom, 24) + 40,
          paddingHorizontal: 24,
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

        <View className="bg-[#0D1110] border border-[#C9A84C]/15 rounded-2xl p-6">
          <View className="items-center mb-4">
            <Ionicons name="checkmark-circle" size={52} color="#C9A84C" />
          </View>
          <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[2px] mb-1 text-center">
            SALE INITIATED
          </Text>
          <Text className="text-white text-base font-jakarta-bold mb-4 text-center">
            Invoice Ready
          </Text>

          <View className="flex-row justify-between mb-3 border-b border-white/5 pb-3">
            <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">PRODUCT</Text>
            <Text className="text-white text-[10px] font-jakarta-bold">
              {saleResult.product.brand} {saleResult.product.name}
            </Text>
          </View>
          <View className="flex-row justify-between mb-3 border-b border-white/5 pb-3">
            <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">SERIAL</Text>
            <Text className="text-white text-[10px] font-jakarta-bold">{saleResult.product.serial_number}</Text>
          </View>
          <View className="flex-row justify-between mb-3 border-b border-white/5 pb-3">
            <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">BUYER</Text>
            <Text className="text-[#a0aec0] text-[10px] font-jakarta-semibold">{saleResult.buyer.email}</Text>
          </View>
          <View className="flex-row justify-between mb-4 border-b border-white/5 pb-3">
            <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">AMOUNT</Text>
            <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold">{formatPrice(saleResult.amount_idr)}</Text>
          </View>
          <View className="flex-row justify-between mb-5 border-b border-white/5 pb-4">
            <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">ORDER ID</Text>
            <Text className="text-[#a0aec0] text-[10px] font-jakarta">{saleResult.order_id}</Text>
          </View>

          {/* ── QR CODE PAYMENT SECTION ─────────────────────────────────── */}
          {hasPaymentUrl ? (
            <View className="items-center mb-5">
              <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[2px] mb-3 text-center">
                📲 SCAN TO PAY · BUYER SCANS THIS QR
              </Text>
              <View
                style={{
                  padding: 16,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  shadowColor: '#C9A84C',
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                }}
              >
                <QRCode
                  value={saleResult.payment_url}
                  size={Math.min(qrSize, 220)}
                  color="#0A0A0A"
                  backgroundColor="#FFFFFF"
                  quietZone={8}
                />
              </View>
              <Text className="text-[#718096] text-[9px] font-jakarta text-center mt-3 leading-relaxed">
                Buyer scans this code to open Midtrans payment page{`\n`}NFT transfers automatically after payment.
              </Text>
            </View>
          ) : (
            <View className="bg-[#C9A84C]/8 border border-[#C9A84C]/15 rounded-xl p-4 mb-5">
              <Text className="text-[#a0aec0] text-xs font-jakarta leading-relaxed">
                📱 Buyer has received a push notification with their payment link. Once they pay, the digital twin NFT will transfer to their wallet automatically.
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-[#C9A84C] rounded-xl h-11 items-center justify-center mb-3 shadow-md"
            onPress={reset}
            activeOpacity={0.8}
          >
            <Text className="text-[#0A0A0A] text-[11px] font-jakarta-bold tracking-[1.5px]">
              INITIATE ANOTHER SALE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="border border-[#C9A84C]/40 rounded-xl h-11 items-center justify-center"
            onPress={() => router.push('/(operator)')}
            activeOpacity={0.8}
          >
            <Text className="text-[#C9A84C] text-[11px] font-jakarta-bold tracking-[1.5px]">
              ← BACK TO DASHBOARD
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  // ── MAIN FORM ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-[#0A0A0A]"
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: Math.max(insets.bottom, 24) + 40,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-[#718096] text-[11px] font-jakarta-bold tracking-[1.5px]">← BACK</Text>
        </TouchableOpacity>

        <Text className="text-[#C9A84C] text-[9px] font-jakarta-bold tracking-[2px] mb-1">
          BOUTIQUE OPERATOR
        </Text>
        <Text className="text-white text-xl font-jakarta-bold tracking-[0.5px] mb-1">
          INITIATE SALE
        </Text>
        <Text className="text-[#718096] text-xs font-jakarta mb-8 leading-relaxed">
          Select the luxury item and buyer. A Midtrans payment link will be sent to their phone.
        </Text>

        {/* Step 1: Product */}
        <View className="bg-[#111111] border border-white/5 rounded-2xl p-6 mb-4">
          <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[2px] mb-1">
            STEP 1 · SELECT PRODUCT
          </Text>
          <Text className="text-[#718096] text-xs font-jakarta mb-5 leading-relaxed">
            Choose from registered boutique inventory.
          </Text>

          {selectedProduct ? (
            <View>
              <View className="bg-[#0A0A0A] border border-[#C9A84C]/20 rounded-xl p-4 mb-3">
                <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[1px] mb-1">
                  {selectedProduct.brand.toUpperCase()}
                </Text>
                <Text className="text-white text-base font-jakarta-bold">{selectedProduct.name}</Text>
                <Text className="text-[#718096] text-[10px] font-jakarta mt-1">
                  {selectedProduct.serial_number}
                </Text>
                <Text className="text-white text-sm font-jakarta-bold mt-2">
                  {formatPrice(selectedProduct.price_idr)}
                </Text>
              </View>
              <TouchableOpacity
                className="border border-white/10 rounded-xl h-10 items-center justify-center"
                onPress={() => setSelectedProduct(null)}
                activeOpacity={0.8}
              >
                <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-[1px]">
                  CHANGE PRODUCT
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                className="bg-[#0A0A0A] text-white text-sm font-jakarta px-4 h-12 rounded-xl border border-white/5 mb-3"
                placeholder="Search by brand, name, serial..."
                placeholderTextColor="#4a5568"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {isLoadingProducts ? (
                <View className="flex-row items-center py-4">
                  <ActivityIndicator color="#C9A84C" size="small" />
                  <Text className="text-[#718096] text-xs font-jakarta ml-3">Loading inventory...</Text>
                </View>
              ) : filteredProducts.length === 0 ? (
                <Text className="text-[#718096] text-xs font-jakarta text-center py-4">
                  No products available. Activate MANUFACTURED items first.
                </Text>
              ) : (
                filteredProducts.map((p) => (
                  <TouchableOpacity
                    key={p.product_id}
                    className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 mb-3 flex-row justify-between items-center"
                    onPress={() => setSelectedProduct(p)}
                    activeOpacity={0.8}
                  >
                    <View>
                      <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[1px]">
                        {p.brand.toUpperCase()}
                      </Text>
                      <Text className="text-white text-sm font-jakarta-bold mt-0.5">{p.name}</Text>
                      <Text className="text-[#718096] text-[10px] font-jakarta mt-0.5">{p.serial_number}</Text>
                    </View>
                    <Text className="text-white text-xs font-jakarta-bold">{formatPrice(p.price_idr)}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Step 2: Buyer Email */}
        <View className="bg-[#111111] border border-white/5 rounded-2xl p-6 mb-6">
          <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[2px] mb-1">
            STEP 2 · BUYER EMAIL ADDRESS
          </Text>
          <Text className="text-[#718096] text-xs font-jakarta mb-5 leading-relaxed">
            The buyer must have a Luxtrace account. Enter their registered email address.
          </Text>
          <TextInput
            className={`bg-[#0A0A0A] text-white text-sm font-jakarta px-4 h-12 rounded-xl border ${
              isFocusedEmail ? 'border-[#C9A84C] bg-[#1a1508]/30' : 'border-white/5'
            }`}
            placeholder="buyer@example.com"
            placeholderTextColor="#4a5568"
            value={buyerEmail}
            onChangeText={setBuyerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setIsFocusedEmail(true)}
            onBlur={() => setIsFocusedEmail(false)}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          className={`bg-[#C9A84C] rounded-xl h-12 items-center justify-center shadow-md ${
            (!selectedProduct || !buyerEmail || isSubmitting) ? 'opacity-40' : ''
          }`}
          onPress={handleInitiateSale}
          disabled={!selectedProduct || !buyerEmail || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#0A0A0A" size="small" />
          ) : (
            <Text className="text-[#0A0A0A] text-[11px] font-jakarta-bold tracking-[1.5px]">
              SEND PAYMENT INVOICE TO BUYER
            </Text>
          )}
        </TouchableOpacity>

        <Text className="text-[#4a5568] text-[9px] font-jakarta-semibold text-center mt-4 leading-relaxed">
          After confirmation, the buyer receives a push notification with their Midtrans payment link.
          NFT is transferred automatically upon payment.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
