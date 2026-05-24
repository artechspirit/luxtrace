import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { API_BASE_URL } from '@/constants/config'
import Ionicons from '@expo/vector-icons/Ionicons'

interface BoutiqueProduct {
  product_id: string
  serial_number: string
  brand: string
  name: string
  price_idr: number
  nft_token_id: string | null
  status: string
}

export default function OperatorDashboard() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, token, logout } = useAuthStore()

  const [products, setProducts] = useState<BoutiqueProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const formatPrice = (idr: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(idr)

  const fetchInventory = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/boutique/products?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) setProducts(json.data.products)
    } catch (err) {
      console.warn('[OperatorDashboard] fetch error:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [token])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const onRefresh = () => { setIsRefreshing(true); fetchInventory() }

  return (
    <View
      className="flex-1 bg-[#0A0A0A]"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-6 mb-5">
        <View>
          <Text className="text-[#C9A84C] text-[9px] font-jakarta-bold tracking-[2px] mb-1">
            BOUTIQUE OPERATOR
          </Text>
          <Text className="text-white text-[20px] font-jakarta-bold tracking-[0.5px]">
            {user?.full_name?.toUpperCase() || 'OPERATOR'}
          </Text>
          <Text className="text-[#718096] text-[12px] font-jakarta mb-1">
            {user?.email}
          </Text>
          <Text className="text-[#a0aec0] text-[11px] font-jakarta-semibold tracking-[0.5px] mt-1">
            ROLE: {user?.role}
          </Text>
        </View>
        <TouchableOpacity
          className="border border-[#ef4444]/50 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5"
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={13} color="#ef4444" />
          <Text className="text-[#ef4444] text-[10px] font-jakarta-bold tracking-[1px]">LOG OUT</Text>
        </TouchableOpacity>
      </View>

      {/* Action Cards */}
      <View className="flex-row px-6 mb-6 gap-3">
        <TouchableOpacity
          className="flex-1 bg-[#0D1110] border border-[#C9A84C]/20 rounded-2xl p-4 items-center shadow-sm"
          onPress={() => router.push('/(operator)/activate')}
          activeOpacity={0.8}
        >
          <Ionicons name="radio-outline" size={26} color="#C9A84C" style={{ marginBottom: 6 }} />
          <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[1.5px]">ACTIVATE</Text>
          <Text className="text-[#718096] text-[9px] font-jakarta mt-1">NFC Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-[#0D1110] border border-[#C9A84C]/20 rounded-2xl p-4 items-center shadow-sm"
          onPress={() => router.push('/(operator)/sell')}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={26} color="#C9A84C" style={{ marginBottom: 6 }} />
          <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[1.5px]">SELL</Text>
          <Text className="text-[#718096] text-[9px] font-jakarta mt-1">Create Sale</Text>
        </TouchableOpacity>
      </View>

      {/* Inventory */}
      <View className="flex-1 px-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-xs font-jakarta-bold tracking-wider">
            BOUTIQUE INVENTORY
          </Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text className="text-[#C9A84C] text-xs font-jakarta-medium">REFRESH</Text>
          </TouchableOpacity>
        </View>

        {isLoading && products.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#C9A84C" />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#C9A84C"
              />
            }
          >
            {products.length === 0 ? (
              <View className="flex-1 justify-center items-center py-10 px-4">
                <Text className="text-[#4a5568] text-sm font-jakarta-bold tracking-widest mb-2">
                  NO ITEMS AVAILABLE
                </Text>
                <Text className="text-[#718096] text-xs font-jakarta text-center mb-6 leading-relaxed">
                  Activate MANUFACTURED products first using the NFC scanner.
                </Text>
                <TouchableOpacity
                  className="bg-[#C9A84C] px-6 py-3 rounded-xl"
                  onPress={() => router.push('/(operator)/activate')}
                  activeOpacity={0.8}
                >
                  <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-wider">
                    SCAN & ACTIVATE PRODUCT
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              products.map((p) => (
                <View
                  key={p.product_id}
                  className="bg-[#0D1110] border border-[#C9A84C]/8 rounded-2xl p-5 mb-4 shadow-sm"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[2px]">
                      {p.brand.toUpperCase()}
                    </Text>
                    <View className="bg-[#00FFB2]/10 px-2 py-1 rounded-md">
                      <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[0.5px]">
                        REGISTERED
                      </Text>
                    </View>
                  </View>

                  <Text className="text-white text-base font-jakarta-bold mb-1">{p.name}</Text>
                  <Text className="text-[#718096] text-[10px] font-jakarta mb-3">
                    {p.serial_number} · NFT #{p.nft_token_id ?? '—'}
                  </Text>

                  <View className="flex-row justify-between items-center border-t border-white/5 pt-3">
                    <Text className="text-[#4a5568] text-[9px] font-jakarta-bold tracking-wider">
                      BOUTIQUE PRICE
                    </Text>
                    <Text className="text-white text-sm font-jakarta-bold">
                      {formatPrice(p.price_idr)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    className="bg-[#C9A84C] rounded-xl h-11 items-center justify-center mt-4 shadow-md"
                    onPress={() =>
                      router.push({
                        pathname: '/(operator)/sell',
                        params: { product_id: p.product_id, product_name: `${p.brand} ${p.name}` },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text className="text-[#0A0A0A] text-[11px] font-jakarta-bold tracking-[1.5px]">
                      INITIATE SALE →
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  )
}
