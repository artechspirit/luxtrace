import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Clipboard,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { API_BASE_URL } from '@/constants/config'

interface TimelineEvent {
  log_id: string
  event: string
  actor_role: string
  metadata: Record<string, any>
  timestamp: string
}

interface ProvenanceData {
  product_id: string
  serial_number: string
  brand: string
  name: string
  nft_token_id: string | null
  current_status: string
  timeline: TimelineEvent[]
}

export default function ProductProvenanceScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [data, setData] = useState<ProvenanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProvenance = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/provenance/${id}`)
      const result = await response.json()

      if (response.ok && result.success) {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch provenance history')
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchProvenance()
    }
  }, [id])

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text)
    Alert.alert('Copied', `${label} copied to clipboard.`)
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEventStyle = (event: string) => {
    switch (event.toUpperCase()) {
      case 'MANUFACTURED':
        return { label: 'MANUFACTURED', color: '#00FFB2', glow: styles.glowGreen }
      case 'REGISTERED':
        return { label: 'NFC BIND COMPLETE', color: '#00FFB2', glow: styles.glowGreen }
      case 'TRANSFER':
      case 'TRANSFERRED':
        return { label: 'OWNERSHIP HANDOVER', color: '#00E6A8', glow: styles.glowGreen }
      case 'FRAUD_FLAGGED':
      case 'FRAUD_ATTEMPT':
        return { label: 'FRAUD ATTEMPT DETECTED', color: '#FF0055', glow: styles.glowRed }
      default:
        return { label: event.replace('_', ' '), color: '#38A169', glow: styles.glowGreen }
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROVENANCE CHAIN</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00FFB2" />
          <Text style={styles.loadingText}>Reading Ledger Records...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProvenance}>
            <Text style={styles.retryButtonText}>RETRY SYNC</Text>
          </TouchableOpacity>
        </View>
      ) : !data ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No records found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Twin Properties Section */}
          <View style={styles.productCard}>
            <Text style={styles.productBrand}>{data.brand.toUpperCase()}</Text>
            <Text style={styles.productName}>{data.name}</Text>

            <View style={styles.divider} />

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>SERIAL NUMBER</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{data.serial_number}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>NFT TOKEN ID</Text>
                <Text style={styles.metaValue}>{data.nft_token_id ? `# ${data.nft_token_id}` : 'UNMINTED'}</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>REGISTRY STATE:</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{data.current_status}</Text>
              </View>
            </View>
          </View>

          {/* Timeline Section */}
          <Text style={styles.timelineHeaderTitle}>CHRONOLOGICAL LEDGER</Text>

          {data.timeline && data.timeline.length > 0 ? (
            <View style={styles.timelineContainer}>
              {data.timeline.map((event, index) => {
                const isLast = index === data.timeline.length - 1
                const config = getEventStyle(event.event)
                const isFraud = event.event.includes('FRAUD')

                return (
                  <View key={event.log_id} style={styles.timelineItem}>
                    {/* Time Marker Column */}
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeText}>
                        {formatDate(event.timestamp).split(',')[0]}
                      </Text>
                      <Text style={styles.subTimeText}>
                        {formatDate(event.timestamp).split(',')[1]?.trim().split(' ')[0] || ''}
                      </Text>
                    </View>

                    {/* Glowing Node Column */}
                    <View style={styles.nodeColumn}>
                      <View style={[styles.outerNodeCircle, isFraud && styles.outerCircleRed]}>
                        <View style={[styles.innerNodeDot, { backgroundColor: config.color }, config.glow]} />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Event Detail Card Column */}
                    <View style={styles.cardColumn}>
                      <View style={[styles.eventCard, isFraud && styles.eventCardRed]}>
                        <Text style={[styles.eventTitle, { color: config.color }]}>
                          {config.label}
                        </Text>
                        <Text style={styles.eventActor}>
                          ACTOR: {event.actor_role.toUpperCase()}
                        </Text>

                        {/* Metadata details */}
                        {event.metadata && (
                          <View style={styles.metadataBox}>
                            {Object.entries(event.metadata).map(([key, val]) => {
                              if (typeof val === 'object') return null
                              const valStr = String(val)
                              const isAddress = valStr.startsWith('0x')
                              return (
                                <TouchableOpacity
                                  key={key}
                                  disabled={!isAddress}
                                  onPress={() => isAddress && copyToClipboard(valStr, key)}
                                  style={styles.metadataRow}
                                >
                                  <Text style={styles.metadataKey}>
                                    {key.replace('_', ' ').toUpperCase()}:
                                  </Text>
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.metadataVal,
                                      isAddress && styles.addressVal,
                                    ]}
                                  >
                                    {valStr}
                                  </Text>
                                </TouchableOpacity>
                              )
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <View style={styles.noHistoryBox}>
              <Text style={styles.noHistoryText}>No provenance history registered.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: '#00FFB2',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#a0aec0',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderColor: '#00FFB2',
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#00FFB2',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  productCard: {
    backgroundColor: 'rgba(15, 42, 37, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
  },
  productBrand: {
    color: '#00FFB2',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 255, 178, 0.1)',
    marginVertical: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flex: 0.48,
  },
  metaLabel: {
    color: '#4a5568',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    color: '#a0aec0',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: {
    color: '#718096',
    fontSize: 11,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 255, 178, 0.15)',
    borderColor: 'rgba(0, 255, 178, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#00FFB2',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timelineHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
    opacity: 0.7,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 90,
  },
  timeColumn: {
    width: 65,
    paddingRight: 10,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  subTimeText: {
    color: '#4a5568',
    fontSize: 9,
    marginTop: 2,
  },
  nodeColumn: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  outerNodeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 255, 178, 0.1)',
    borderColor: 'rgba(0, 255, 178, 0.25)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  outerCircleRed: {
    backgroundColor: 'rgba(255, 0, 85, 0.1)',
    borderColor: 'rgba(255, 0, 85, 0.3)',
  },
  innerNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glowGreen: {
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  glowRed: {
    shadowColor: '#FF0055',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(0, 255, 178, 0.15)',
    position: 'absolute',
    top: 18,
    bottom: -18,
    zIndex: 1,
  },
  cardColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  eventCard: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    padding: 14,
  },
  eventCardRed: {
    borderColor: 'rgba(255, 0, 85, 0.15)',
    backgroundColor: 'rgba(255, 0, 85, 0.02)',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  eventActor: {
    color: '#718096',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 10,
  },
  metadataBox: {
    backgroundColor: '#070707',
    borderRadius: 8,
    padding: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  metadataKey: {
    color: '#4a5568',
    fontSize: 8,
    fontWeight: 'bold',
  },
  metadataVal: {
    color: '#a0aec0',
    fontSize: 9,
    flex: 1,
    textAlign: 'right',
    paddingLeft: 12,
  },
  addressVal: {
    color: '#00FFB2',
    textDecorationLine: 'underline',
  },
  noHistoryBox: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  noHistoryText: {
    color: '#4a5568',
    fontSize: 12,
  },
})
