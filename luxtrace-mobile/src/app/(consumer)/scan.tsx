import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Button,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { API_BASE_URL } from '@/constants/config'
import { LuxuryLoader } from '@/components/ui/LuxuryLoader'

export default function ScanScreen() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [scanResult, setScanResult] = useState<{
    sessionId: string
    payload: string
  } | null>(null)

  const [apiResult, setApiResult] = useState<{
    success: boolean
    txHash?: string
    mode?: string
    status?: string
    errorMessage?: string
  } | null>(null)
  const [loaderFinished, setLoaderFinished] = useState(false)

  // Camera permissions are still loading
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FFB2" />
      </View>
    )
  }

  // Camera permissions are not granted yet
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Luxtrace requires camera permissions to scan authenticity QR codes
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>GRANT CAMERA PERMISSION</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const [nfcUidInput, setNfcUidInput] = useState('')
  const [isFocusedNfc, setIsFocusedNfc] = useState(false)

  // Helper to extract session ID from various QR formats
  const extractSessionId = (data: string): string => {
    try {
      // Format 1: JSON format
      const parsed = JSON.parse(data)
      if (parsed.session_id) return parsed.session_id
    } catch (e) {
      // Not JSON, continue to other checks
    }

    try {
      // Format 2: URL format (e.g., https://luxtrace.com/verify?session_id=...)
      if (data.includes('?')) {
        const queryParams = data.split('?')[1]
        const params = queryParams.split('&')
        for (const param of params) {
          const [key, value] = param.split('=')
          if (key === 'session_id') return value
        }
      }
    } catch (e) {
      // Failed to parse URL, fallback to raw
    }

    // Format 3: Raw UUID / Token
    return data.trim()
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return
    setScanned(true)

    const sessionId = extractSessionId(data)
    setScanResult({ sessionId, payload: data })
  }

  const handleVerificationResponse = (result: NonNullable<typeof apiResult>) => {
    setIsVerifying(false)
    if (result.success) {
      Alert.alert(
        'AUTHENTICITY VERIFIED',
        `Ownership transfer & escrow settlement successfully completed on-chain!\n\nTx Hash: ${result.txHash?.slice(0, 15)}...\nMode: ${result.mode?.toUpperCase()}\nStatus: ${result.status}`,
        [{ text: 'Dismiss', onPress: () => {
          setScanned(false)
          setScanResult(null)
          setNfcUidInput('')
          setApiResult(null)
          router.replace('/')
        }}]
      )
    } else {
      Alert.alert('Verification Failed', result.errorMessage || 'Error executing on-chain verification', [
        { text: 'OK', onPress: () => {
          setScanned(false)
          setScanResult(null)
          setNfcUidInput('')
          setApiResult(null)
        }}
      ])
    }
  }

  // Effect to wait for both API result and loader countdown
  useEffect(() => {
    if (loaderFinished && apiResult) {
      handleVerificationResponse(apiResult)
    }
  }, [loaderFinished, apiResult])

  const sendVerifyRequest = async (sessionId: string, scannedUid: string, mode: 'remote' | 'direct') => {
    if (!scannedUid.trim()) {
      Alert.alert('NFC UID Required', 'Please enter the physical tag NFC UID for simulation.')
      return
    }

    setIsVerifying(true)
    setLoaderFinished(false)
    setApiResult(null)

    try {
      const response = await fetch(`${API_BASE_URL}/p2p/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          scanned_uid: scannedUid.trim(),
          mode,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || result.message || 'Verification failed')
      }

      setApiResult({
        success: true,
        txHash: result.data?.nft_transfer?.tx_hash,
        mode,
        status: result.data?.product_status,
      })
    } catch (err: any) {
      setApiResult({
        success: false,
        errorMessage: err.message || 'Error executing on-chain verification',
      })
    }
  }

  return (
    <View style={styles.container}>
      <LuxuryLoader
        isOpen={isVerifying}
        onFinished={() => setLoaderFinished(true)}
      />

      {scanned && scanResult ? (
        <View style={styles.simulationContainer}>
          <View style={styles.simulationCard}>
            <Text style={styles.cardHeader}>NFC SIMULATOR TERMINAL</Text>
            <Text style={styles.cardSubtitle}>
              QR scan verified. Session ID: {scanResult.sessionId.slice(0, 18)}...
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>ENTER PHYSICAL NFC TAG UID</Text>
              <TextInput
                style={[
                  styles.input,
                  isFocusedNfc && styles.inputFocused,
                ]}
                placeholder="e.g. 04:F2:88:A2:9B:40"
                placeholderTextColor="#4a5568"
                autoCapitalize="characters"
                autoCorrect={false}
                value={nfcUidInput}
                onChangeText={setNfcUidInput}
                onFocus={() => setIsFocusedNfc(true)}
                onBlur={() => setIsFocusedNfc(false)}
              />
              <Text style={styles.inputHint}>
                Paste the real NFC UID bound to this product from your dashboard list.
              </Text>
            </View>

            {/* Remote Shipping Verification Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => sendVerifyRequest(scanResult.sessionId, nfcUidInput, 'remote')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>TRIGGER REMOTE P2P HANDOVER</Text>
            </TouchableOpacity>

            {/* Direct Handover Verification Button */}
            <TouchableOpacity
              style={[styles.button, styles.directButton]}
              onPress={() => sendVerifyRequest(scanResult.sessionId, nfcUidInput, 'direct')}
              activeOpacity={0.8}
            >
              <Text style={styles.directButtonText}>TRIGGER DIRECT HANDOVER</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setScanned(false)
                setScanResult(null)
                setNfcUidInput('')
              }}
            >
              <Text style={styles.resetButtonText}>RESET SCANNER</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Scanning Reticle Frame Overlay */}
          <View style={styles.overlayContainer}>
            <View style={styles.headerSpacer}>
              <Text style={styles.instructionText}>SCAN TRANSACTION QR</Text>
              <Text style={styles.instructionSubtext}>Align QR code inside the glow frame</Text>
            </View>

            <View style={styles.scannerRow}>
              <View style={styles.opaqueSide} />
              <View style={styles.scanTarget}>
                {/* Glow frame borders */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                {/* Animated horizontal scanning bar */}
                <View style={styles.scanLine} />
              </View>
              <View style={styles.opaqueSide} />
            </View>

            <View style={styles.footerSpacer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelButtonText}>ABORT SCAN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    color: '#a0aec0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#00FFB2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerSpacer: {
    height: '25%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.65)',
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  instructionSubtext: {
    color: '#00FFB2',
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 1,
  },
  scannerRow: {
    flexDirection: 'row',
    height: 250,
  },
  opaqueSide: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.65)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#00FFB2',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#00FFB2',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  footerSpacer: {
    height: '25%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.65)',
  },
  cancelButton: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1.5,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  verifyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  verifyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 24,
  },
  verifySubtext: {
    color: '#00FFB2',
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 1,
  },
  simulationContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  simulationCard: {
    backgroundColor: 'rgba(15, 42, 37, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.25)',
    padding: 24,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  cardHeader: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#a0aec0',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#00FFB2',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F0F0F',
    borderColor: 'rgba(0, 255, 178, 0.1)',
    borderWidth: 1.5,
    borderRadius: 10,
    height: 50,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputFocused: {
    borderColor: '#00FFB2',
    backgroundColor: '#141E1C',
  },
  inputHint: {
    color: '#718096',
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  button: {
    backgroundColor: '#00FFB2',
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  directButton: {
    backgroundColor: 'transparent',
    borderColor: '#00FFB2',
    borderWidth: 1.5,
  },
  directButtonText: {
    color: '#00FFB2',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  resetButton: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
})
