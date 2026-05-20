import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Platform,
  StatusBar,
  Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { API_BASE_URL } from '@/constants/config'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Product {
  name: string
  brand: string
  serial_number: string
}

interface Transaction {
  transaction_id: string
  product_id: string
  buyer_id: string
  seller_id: string
  amount_idr: number
  status: 'PENDING' | 'PAID' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
  type: 'P2P_REMOTE_SHIPPING' | 'P2P_DIRECT_HANDOVER'
  product?: Product
}

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, token, logout } = useAuthStore()
  const { showAlert } = useAlertStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTransactions = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (response.ok && result.success) {
        setTransactions(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Custodial Wallet Dashboard States
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [sepoliaBalance, setSepoliaBalance] = useState('0.0000')
  const [isFetchingBalance, setIsFetchingBalance] = useState(false)
  const [ownedNftCount, setOwnedNftCount] = useState(0)

  const fetchWalletDetails = async () => {
    if (!user?.wallet_address) return
    setIsFetchingBalance(true)
    try {
      // 1. Fetch Sepolia Balance via public RPC
      const balanceResponse = await fetch('https://rpc.ankr.com/eth_sepolia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [user.wallet_address, 'latest'],
          id: 1,
        }),
      })
      const balanceResult = await balanceResponse.json()
      if (balanceResult.result) {
        const wei = BigInt(balanceResult.result)
        const eth = Number(wei) / 1e18
        setSepoliaBalance(eth.toFixed(4))
      }

      // 2. Fetch owned assets count
      const productsResponse = await fetch(`${API_BASE_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const productsResult = await productsResponse.json()
      if (productsResponse.ok && productsResult.success) {
        const items = productsResult.data?.items || productsResult.data || []
        const nfts = items.filter((p: any) => p.nft_token_id).length
        setOwnedNftCount(nfts)
      }
    } catch (e) {
      console.warn('Failed to load wallet details', e)
    } finally {
      setIsFetchingBalance(false)
    }
  }

  useEffect(() => {
    if (isWalletModalOpen) {
      fetchWalletDetails()
    }
  }, [isWalletModalOpen])

  useEffect(() => {
    fetchTransactions()
  }, [token])

  const handleCopyWallet = () => {
    if (user?.wallet_address) {
      Clipboard.setString(user.wallet_address)
      showAlert('Address Copied', 'Public wallet address copied to clipboard.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const renderTxItem = ({ item }: { item: Transaction }) => {
    const isBuyer = item.buyer_id === user?.user_id
    const roleLabel = isBuyer ? 'BUYER' : 'SELLER'
    const showAction = isBuyer && (
      (item.type === 'P2P_REMOTE_SHIPPING' && item.status === 'IN_TRANSIT') ||
      (item.type === 'P2P_DIRECT_HANDOVER' && item.status === 'PENDING')
    )

    let statusBadgeClass = "bg-white/5"
    let statusTextClass = "text-[#a0aec0]"
    if (item.status === 'IN_TRANSIT') {
      statusBadgeClass = "bg-[#00FFB2]/10"
      statusTextClass = "text-[#00FFB2]"
    } else if (item.status === 'COMPLETED') {
      statusBadgeClass = "bg-green-500/10"
      statusTextClass = "text-green-500"
    } else if (item.status === 'CANCELLED') {
      statusBadgeClass = "bg-red-500/10"
      statusTextClass = "text-red-500"
    }

    return (
      <View className="bg-[#0D1110] border border-[#00FFB2]/8 rounded-2xl p-5 mb-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[2px]">
            {item.product?.brand?.toUpperCase() || 'LUXURY ITEM'}
          </Text>
          <View className={`px-2 py-1 rounded-md ${statusBadgeClass}`}>
            <Text className={`text-[9px] font-jakarta-bold tracking-[0.5px] ${statusTextClass}`}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push(`/products/${item.product_id}`)} activeOpacity={0.7}>
          <Text className="text-white text-base font-jakarta-bold mb-3">
            {item.product?.name || 'Loading Asset Twin...'} ↗
          </Text>
        </TouchableOpacity>

        <View className="flex-row mb-4">
          <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider mr-4">
            TYPE: <Text className="text-[#a0aec0] font-jakarta-medium">{item.type.replace('P2P_', '').replace('_', ' ')}</Text>
          </Text>
          <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">
            ROLE: <Text className="text-[#a0aec0] font-jakarta-medium">{roleLabel}</Text>
          </Text>
        </View>

        <View className="flex-row justify-between items-center border-t border-white/5 pt-3">
          <Text className="text-[#4a5568] text-[9px] font-jakarta-bold tracking-wider">ESCROW VALUE</Text>
          <Text className="text-white text-sm font-jakarta-bold">
            {formatCurrency(item.amount_idr)}
          </Text>
        </View>

        {showAction && (
          <TouchableOpacity
            className="bg-[#00FFB2] rounded-xl h-11 items-center justify-center mt-4 shadow-md shadow-[#00FFB2]/20"
            onPress={() => router.push('/scan')}
            activeOpacity={0.8}
          >
            <Text className="text-[#0A0A0A] text-[11px] font-jakarta-bold tracking-[1.5px]">
              VERIFY HANDOVER & RELEASE
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View
      className="flex-1 bg-[#0A0A0A]"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Luxury User Profile Header */}
      <View className="flex-row justify-between items-center px-6 mb-5">
        <View>
          <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[2px] mb-1">WELCOME BACK</Text>
          <Text className="text-white text-[20px] font-jakarta-bold tracking-[0.5px]">{user?.full_name?.toUpperCase() || 'USER'}</Text>
          <Text className="text-[#a0aec0] text-[11px] font-jakarta-semibold tracking-[0.5px] mt-1">ROLE: {user?.role}</Text>
        </View>
        <TouchableOpacity className="border border-[#ef4444] px-3 py-1.5 rounded-lg" onPress={logout}>
          <Text className="text-[#ef4444] text-[10px] font-jakarta-bold tracking-[1px]">LOG OUT</Text>
        </TouchableOpacity>
      </View>

      {/* Custodial Wallet Banner */}
      {user?.wallet_address && (
        <TouchableOpacity
          className="flex-row items-center bg-[#0d1614] border border-[#00FFB2]/20 rounded-xl p-3 mx-6 mb-6"
          onPress={() => setIsWalletModalOpen(true)}
          activeOpacity={0.8}
        >
          <View className="w-2 h-2 rounded-full bg-[#00FFB2] mr-3" />
          <View style={{ flex: 1 }}>
            <Text className="text-[#00FFB2] text-[8px] font-jakarta-bold tracking-[1.5px] mb-1">SECURED CUSTODIAL WALLET</Text>
            <Text className="text-[#a0aec0] text-[11px] font-jakarta-semibold" numberOfLines={1}>
              {user.wallet_address}
            </Text>
          </View>
          <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[0.5px] ml-3">VIEW</Text>
        </TouchableOpacity>
      )}

      {/* Main List Section */}
      <View className="flex-1 px-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-xs font-jakarta-bold tracking-wider">ACTIVE P2P ESCROWS</Text>
          <TouchableOpacity onPress={fetchTransactions}>
            <Text className="text-[#00FFB2] text-xs font-jakarta-medium">REFRESH</Text>
          </TouchableOpacity>
        </View>

        {isLoading && transactions.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#00FFB2" />
          </View>
        ) : transactions.length === 0 ? (
          <View className="flex-1 justify-center items-center py-10 px-4">
            <Text className="text-[#4a5568] text-sm font-jakarta-bold tracking-widest mb-2">NO ACTIVE TRANSACTIONS</Text>
            <Text className="text-[#718096] text-xs font-jakarta text-center mb-6 leading-relaxed">
              Your secondary market digital twin P2P trades will show up here.
            </Text>
            <TouchableOpacity
              className="bg-[#00FFB2] px-6 py-3 rounded-xl shadow-md shadow-[#00FFB2]/20"
              onPress={fetchTransactions}
            >
              <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-wider">SYNC STATUS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.transaction_id}
            renderItem={renderTxItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchTransactions()
            }}
          />
        )}
      </View>

      {/* Floating Action Button (FAB) to Scan QR */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-[120px] h-[50px] bg-[#00FFB2] rounded-full items-center justify-center shadow-lg shadow-[#00FFB2]/30"
        onPress={() => router.push('/scan')}
        activeOpacity={0.8}
      >
        <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-[2px]">SCAN QR</Text>
      </TouchableOpacity>

      {/* Custodial Wallet Detail Modal */}
      <Modal
        visible={isWalletModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWalletModalOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/60"
          activeOpacity={1}
          onPress={() => setIsWalletModalOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-[#111111] border-t border-[#00FFB2]/25 rounded-t-[30px] p-6"
            style={{
              width: '100%',
              shadowColor: '#00FFB2',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 24,
              paddingBottom: Math.max(insets.bottom + 20, 40),
            }}
          >
            {/* Drag Handle Indicator */}
            <View className="w-12 h-1 bg-white/20 rounded-full mb-4" style={{ alignSelf: 'center' }} />

            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-base font-jakarta-bold tracking-wide">SECURE CUSTODIAL ENGINE</Text>
              <TouchableOpacity onPress={() => setIsWalletModalOpen(false)}>
                <Text className="text-[#718096] text-xs font-jakarta-bold">CLOSE</Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Details Card */}
            <View className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 mb-6">
              <Text className="text-[#00FFB2] text-[8px] font-jakarta-bold tracking-[1.5px] mb-2">WALLET ADDRESS (SEPOLIA)</Text>
              <View className="flex-row justify-between items-center bg-black/40 rounded-xl p-3 border border-white/5 mb-4">
                <Text className="text-[#a0aec0] text-xs font-jakarta-semibold flex-1 mr-3" numberOfLines={1}>
                  {user?.wallet_address}
                </Text>
                <TouchableOpacity onPress={handleCopyWallet}>
                  <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold">COPY</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between">
                <View className="flex-1">
                  <Text className="text-[#718096] text-[8px] font-jakarta-bold tracking-[1.5px] mb-1">NATIVE BALANCE</Text>
                  {isFetchingBalance ? (
                    <ActivityIndicator size="small" color="#00FFB2" style={{ alignSelf: 'flex-start' }} />
                  ) : (
                    <Text className="text-white text-base font-jakarta-bold">{sepoliaBalance} ETH</Text>
                  )}
                </View>
                <View className="flex-1 items-end">
                  <Text className="text-[#718096] text-[8px] font-jakarta-bold tracking-[1.5px] mb-1">DIGITAL TWINS</Text>
                  <Text className="text-[#00FFB2] text-base font-jakarta-bold">{ownedNftCount} NFTs</Text>
                </View>
              </View>
            </View>

            {/* Network / Provider Stats */}
            <View className="mb-6">
              <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-3">ENGINE SPECIFICATIONS</Text>
              
              <View className="bg-black/30 rounded-xl p-4 border border-white/5">
                <View className="flex-row justify-between">
                  <Text className="text-[#718096] text-[10px] font-jakarta">Network Name</Text>
                  <Text className="text-white text-[10px] font-jakarta-bold font-jakarta-medium">Ethereum Sepolia</Text>
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-[#718096] text-[10px] font-jakarta">Wallet Provider</Text>
                  <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold">Thirdweb Engine</Text>
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-[#718096] text-[10px] font-jakarta">Gas Sponsoring</Text>
                  <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold">Gasless (Paymaster Active)</Text>
                </View>
              </View>
            </View>

            {/* Simulated Tx History / Actions */}
            <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-3">ON-CHAIN AUDIT TRAIL</Text>
            <View className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="text-white text-[11px] font-jakarta-bold">Custodial Account Init</Text>
                  <Text className="text-[#4a5568] text-[9px] font-jakarta">SUPABASE_AUTH_TRIGGER</Text>
                </View>
                <Text className="text-[#38a169] text-[10px] font-jakarta-bold">SUCCESS</Text>
              </View>
              <View className="h-[1px] bg-white/5 my-2" />
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-[11px] font-jakarta-bold">Gasless Signature Request</Text>
                  <Text className="text-[#4a5568] text-[9px] font-jakarta">THIRDWEB_RPC_CALL</Text>
                </View>
                <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold font-jakarta-medium">LISTENING</Text>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  welcomeText: {
    color: '#00FFB2',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  userRole: {
    color: '#718096',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1,
  },
  logoutButton: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  walletBanner: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(0, 255, 178, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.15)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FFB2',
    marginRight: 12,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  walletLabel: {
    color: '#00FFB2',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  walletAddress: {
    color: '#a0aec0',
    fontSize: 11,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyText: {
    color: '#00FFB2',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginLeft: 12,
  },
  listSection: {
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
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 20,
  },
  refreshButton: {
    borderColor: 'rgba(0, 255, 178, 0.3)',
    borderWidth: 1.2,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#00FFB2',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  listContent: {
    paddingBottom: 100,
  },
  txCard: {
    backgroundColor: 'rgba(11, 15, 14, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.08)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txBrand: {
    color: '#00FFB2',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statusInTransit: {
    backgroundColor: 'rgba(0, 255, 178, 0.08)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(56, 161, 105, 0.08)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  statusText: {
    color: '#a0aec0',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusTextInTransit: {
    color: '#00FFB2',
  },
  statusTextCompleted: {
    color: '#38a169',
  },
  statusTextCancelled: {
    color: '#ef4444',
  },
  txProductName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  txDetailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  txMetaLabel: {
    color: '#718096',
    fontSize: 10,
    marginRight: 16,
    letterSpacing: 0.5,
  },
  txMetaVal: {
    color: '#a0aec0',
    fontWeight: 'bold',
  },
  txPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 12,
  },
  txPriceLabel: {
    color: '#4a5568',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  txPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  verifyActionButton: {
    backgroundColor: '#00FFB2',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyActionButtonText: {
    color: '#0A0A0A',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    right: 24,
    width: 120,
    height: 50,
    backgroundColor: '#00FFB2',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
})
