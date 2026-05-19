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
  Alert,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { API_BASE_URL } from '@/constants/config'

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
  price_idr: number
  status: 'PENDING' | 'PAID' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
  type: 'P2P_REMOTE_SHIPPING' | 'P2P_DIRECT_HANDOVER'
  product?: Product
}

export default function HomeScreen() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()
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

  useEffect(() => {
    fetchTransactions()
  }, [token])

  const handleCopyWallet = () => {
    if (user?.wallet_address) {
      Clipboard.setString(user.wallet_address)
      Alert.alert('Address Copied', 'Public wallet address copied to clipboard.')
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

    return (
      <View style={styles.txCard}>
        <View style={styles.txHeader}>
          <Text style={styles.txBrand}>
            {item.product?.brand || 'LUXURY ITEM'}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.status === 'IN_TRANSIT' && styles.statusInTransit,
              item.status === 'COMPLETED' && styles.statusCompleted,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === 'IN_TRANSIT' && styles.statusTextInTransit,
                item.status === 'COMPLETED' && styles.statusTextCompleted,
              ]}
            >
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push(`/products/${item.product_id}`)} activeOpacity={0.7}>
          <Text style={styles.txProductName}>
            {item.product?.name || 'Loading Asset Twin...'} ↗
          </Text>
        </TouchableOpacity>

        <View style={styles.txDetailsRow}>
          <Text style={styles.txMetaLabel}>TYPE: <Text style={styles.txMetaVal}>{item.type.replace('P2P_', '').replace('_', ' ')}</Text></Text>
          <Text style={styles.txMetaLabel}>ROLE: <Text style={styles.txMetaVal}>{roleLabel}</Text></Text>
        </View>

        <View style={styles.txPriceRow}>
          <Text style={styles.txPriceLabel}>ESCROW VALUE</Text>
          <Text style={styles.txPrice}>
            {formatCurrency(item.price_idr)}
          </Text>
        </View>

        {showAction && (
          <TouchableOpacity
            style={styles.verifyActionButton}
            onPress={() => router.push('/(consumer)/scan')}
          >
            <Text style={styles.verifyActionButtonText}>
              VERIFY HANDOVER & RELEASE
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Luxury User Profile Header */}
      <View style={styles.profileHeader}>
        <View>
          <Text style={styles.welcomeText}>WELCOME BACK</Text>
          <Text style={styles.userName}>{user?.full_name?.toUpperCase() || 'USER'}</Text>
          <Text style={styles.userRole}>ROLE: {user?.role}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>
      </View>

      {/* Custodial Wallet Banner */}
      {user?.wallet_address && (
        <TouchableOpacity
          style={styles.walletBanner}
          onPress={handleCopyWallet}
          activeOpacity={0.8}
        >
          <View style={styles.walletDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.walletLabel}>SECURED CUSTODIAL WALLET</Text>
            <Text style={styles.walletAddress} numberOfLines={1}>
              {user.wallet_address}
            </Text>
          </View>
          <Text style={styles.copyText}>COPY</Text>
        </TouchableOpacity>
      )}

      {/* Main List Section */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE P2P ESCROWS</Text>
          <TouchableOpacity onPress={fetchTransactions}>
            <Text style={styles.refreshText}>REFRESH</Text>
          </TouchableOpacity>
        </View>

        {isLoading && transactions.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#00FFB2" />
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO ACTIVE TRANSACTIONS</Text>
            <Text style={styles.emptySubtitle}>
              Your secondary market digital twin P2P trades will show up here.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchTransactions}>
              <Text style={styles.refreshButtonText}>SYNC STATUS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.transaction_id}
            renderItem={renderTxItem}
            contentContainerStyle={styles.listContent}
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
        style={styles.fab}
        onPress={() => router.push('/(consumer)/scan')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>SCAN QR</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
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
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statusInTransit: {
    backgroundColor: 'rgba(0, 255, 178, 0.1)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
  },
  statusText: {
    color: '#a0aec0',
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusTextInTransit: {
    color: '#00FFB2',
  },
  statusTextCompleted: {
    color: '#38a169',
  },
  txProductName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  txDetailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  txMetaLabel: {
    color: '#718096',
    fontSize: 10,
    marginRight: 16,
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
  },
  verifyActionButtonText: {
    color: '#0A0A0A',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
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
