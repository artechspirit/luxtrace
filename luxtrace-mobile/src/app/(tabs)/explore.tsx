import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { API_BASE_URL } from '@/constants/config'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ProductItem {
  product_id: string
  serial_number: string
  brand: string
  name: string
  status: string
  nft_token_id: string | null
  created_at: string
}

export default function VaultScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, token } = useAuthStore()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOwnedProducts = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (response.ok && result.success) {
        const items = result.data?.items || result.data || []
        setProducts(items)
      }
    } catch (error) {
      console.error('Failed to fetch owned products:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOwnedProducts()
  }, [token])

  const renderProductItem = ({ item }: { item: ProductItem }) => {
    return (
      <TouchableOpacity
        className="bg-[#131313] border border-white/5 rounded-2xl p-5 mb-4"
        onPress={() => router.push(`/products/${item.product_id}`)}
        activeOpacity={0.8}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[2px]">{item.brand.toUpperCase()}</Text>
          <View className="flex-row items-center bg-[#00FFB2]/10 px-2 py-1 rounded">
            <View className="w-1.5 h-1.5 rounded-full bg-[#00FFB2] mr-1.5" />
            <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold">
              {item.nft_token_id ? `NFT #${item.nft_token_id}` : 'VERIFIED'}
            </Text>
          </View>
        </View>

        <Text className="text-white text-base font-jakarta-bold mb-4">{item.name}</Text>

        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-[#718096] text-[9px] font-jakarta-bold tracking-wider">SERIAL NUMBER</Text>
            <Text className="text-[#a0aec0] text-[11px] font-jakarta-medium mt-0.5">{item.serial_number}</Text>
          </View>
          <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-wider">VIEW LEDGER ↗</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View 
      className="flex-1 bg-[#0A0A0A]"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Luxury Vault Header */}
      <View className="px-6 mb-5">
        <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[2.5px]">SECURE ASSET LEDGER</Text>
        <Text className="text-white text-24px font-jakarta-bold tracking-[1.5px] mt-1">DIGITAL VAULT</Text>
        <Text 
          className="text-[#718096] text-[10px] mt-1 font-semibold"
          style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
        >
          Linked to: {user?.wallet_address ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}` : 'Custodial Wallet'}
        </Text>
      </View>

      <View className="flex-1 bg-[#0D0D0D] rounded-t-[30px] px-6 pt-6">
        <View className="flex-row justify-between items-center mb-5">
          <Text className="text-white text-[11px] font-jakarta-bold tracking-[1.5px]">AUTHENTICATED COLLECTIBLES ({products.length})</Text>
          <TouchableOpacity onPress={fetchOwnedProducts}>
            <Text className="text-[#00FFB2] text-[11px] font-jakarta-bold tracking-[1.5px]">SYNC</Text>
          </TouchableOpacity>
        </View>

        {isLoading && products.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#00FFB2" />
            <Text className="text-[#718096] text-xs font-jakarta mt-4">Reading Decentralized Registry...</Text>
          </View>
        ) : products.length === 0 ? (
          <View className="flex-1 justify-center items-center py-10 px-4">
            <Text className="text-white text-[14px] font-jakarta-bold tracking-widest mb-2">VAULT IS EMPTY</Text>
            <Text className="text-[#718096] text-xs font-jakarta text-center mb-6 leading-relaxed">
              You do not own any registered luxury digital twins yet. When you verify a physical tag scan, items will transfer here.
            </Text>
            <TouchableOpacity
              className="bg-[#00FFB2] px-6 py-3 rounded-xl shadow-md shadow-[#00FFB2]/20"
              onPress={fetchOwnedProducts}
              activeOpacity={0.8}
            >
              <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-wider">SYNC STATUS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.product_id}
            renderItem={renderProductItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchOwnedProducts()
            }}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerSubtitle: {
    color: '#00FFB2',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  walletHint: {
    color: '#718096',
    fontSize: 10,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  body: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  refreshText: {
    color: '#00FFB2',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  centerContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#718096',
    fontSize: 11,
    marginTop: 12,
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#718096',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  syncButton: {
    backgroundColor: '#00FFB2',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  syncButtonText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  listContent: {
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: 'rgba(11, 15, 14, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandText: {
    color: '#00FFB2',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 178, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FFB2',
    marginRight: 6,
  },
  badgeText: {
    color: '#00FFB2',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.03)',
    paddingTop: 12,
  },
  serialLabel: {
    color: '#4a5568',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  serialValue: {
    color: '#a0aec0',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  provenanceLink: {
    color: '#00FFB2',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
})
