import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Button,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { API_BASE_URL } from '@/constants/config'
import { LuxuryLoader } from '@/components/ui/LuxuryLoader'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import NfcManager, { NfcTech } from 'react-native-nfc-manager'

export default function ScanScreen() {
  const router = useRouter()
  const { token } = useAuthStore()
  const { showAlert } = useAlertStore()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [isCameraActive, setIsCameraActive] = useState(false)
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
  const [nfcUidInput, setNfcUidInput] = useState('')
  const [isFocusedNfc, setIsFocusedNfc] = useState(false)
  const [isNfcScanning, setIsNfcScanning] = useState(false)

  // Initialize NFC Manager on mount
  useEffect(() => {
    NfcManager.start().catch((err) => {
      console.warn('NfcManager failed to initialize', err)
    })
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {})
    }
  }, [])

  const handleNativeNfcScan = async () => {
    setIsNfcScanning(true)
    try {
      const isSupported = await NfcManager.isSupported()
      if (!isSupported) {
        showAlert('NFC Not Supported', 'This device does not support physical NFC tag scanning.')
        setIsNfcScanning(false)
        return
      }

      const isEnabled = await NfcManager.isEnabled()
      if (!isEnabled) {
        showAlert('NFC Disabled', 'Please enable NFC in your device settings to scan the product tag.')
        setIsNfcScanning(false)
        return
      }

      // Request Ndef technology connection
      await NfcManager.requestTechnology(NfcTech.Ndef)
      const tag = await NfcManager.getTag()
      
      if (tag && tag.id) {
        setNfcUidInput(tag.id)
        showAlert('NFC Tag Detected', `Successfully read UID: ${tag.id}`)
      } else {
        showAlert('Read Failure', 'Could not extract a valid tag UID from the chip.')
      }
    } catch (ex: any) {
      console.warn('NFC scanning error', ex)
      if (ex !== 'user cancel' && ex?.message !== 'user cancel') {
        showAlert('NFC Scanning Cancelled', 'The NFC chip scan process was interrupted.')
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {})
      setIsNfcScanning(false)
    }
  }

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
      showAlert(
        'AUTHENTICITY VERIFIED',
        `Ownership transfer & escrow settlement successfully completed on-chain!\n\nTx Hash: ${result.txHash?.slice(0, 15)}...\nMode: ${result.mode?.toUpperCase()}\nStatus: ${result.status}`,
        [{
          text: 'Dismiss', onPress: () => {
            setScanned(false)
            setScanResult(null)
            setNfcUidInput('')
            setApiResult(null)
            router.replace('/')
          }
        }]
      )
    } else {
      showAlert('Verification Failed', result.errorMessage || 'Error executing on-chain verification', [
        {
          text: 'OK', onPress: () => {
            setScanned(false)
            setScanResult(null)
            setNfcUidInput('')
            setApiResult(null)
          }
        }
      ])
    }
  }

  // Handle lazy initialization of the camera to avoid hardware permission crashes
  useEffect(() => {
    if (permission?.granted) {
      const timer = setTimeout(() => {
        setIsCameraActive(true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setIsCameraActive(false)
    }
  }, [permission])

  // Effect to wait for both API result and loader countdown
  useEffect(() => {
    if (loaderFinished && apiResult) {
      handleVerificationResponse(apiResult)
    }
  }, [loaderFinished, apiResult])

  const sendVerifyRequest = async (sessionId: string, scannedUid: string, mode: 'remote' | 'direct') => {
    if (!scannedUid.trim()) {
      showAlert('NFC UID Required', 'Please enter the physical tag NFC UID for simulation.')
      return
    }

    setIsVerifying(true)
    setLoaderFinished(false)
    setApiResult(null)

    try {
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const timestamp = Date.now().toString()

      const response = await fetch(`${API_BASE_URL}/p2p/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-nonce': nonce,
          'x-timestamp': timestamp,
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
      <View 
        className="flex-1 bg-[#0A0A0A] justify-center items-center p-8"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Text className="text-[#a0aec0] text-sm font-jakarta text-center mb-6 leading-relaxed">
          Luxtrace requires camera permissions to scan authenticity QR codes
        </Text>
        <TouchableOpacity 
          className="bg-[#00FFB2] px-6 py-3 rounded-xl shadow-md shadow-[#00FFB2]/20" 
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-wider">GRANT CAMERA PERMISSION</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Render initialization loading screen during the transition state
  if (permission.granted && !isCameraActive) {
    return (
      <View className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <ActivityIndicator size="large" color="#00FFB2" />
        <Text className="text-[#718096] text-xs font-jakarta mt-3 tracking-wider">Initializing camera...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-black">
      <LuxuryLoader
        isOpen={isVerifying}
        onFinished={() => setLoaderFinished(true)}
      />

      {scanned && scanResult ? (
        <View 
          className="flex-1 justify-center px-6 py-10 bg-[#0A0A0A]"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <View className="bg-[#111111] border border-white/5 rounded-2xl p-6">
            <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[2px] mb-1">NFC SIMULATOR TERMINAL</Text>
            
            {scanResult.payload === 'manual' ? (
              <View className="mb-4">
                <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-2">QR SESSION ID</Text>
                <TextInput
                  className="bg-[#0A0A0A] text-white text-xs px-4 h-12 rounded-xl border border-white/5 font-jakarta"
                  placeholder="Paste QR Session ID here"
                  placeholderTextColor="#4a5568"
                  autoCorrect={false}
                  value={scanResult.sessionId}
                  onChangeText={(val) => setScanResult({ ...scanResult, sessionId: val })}
                />
              </View>
            ) : (
              <Text className="text-[#718096] text-xs font-jakarta mb-6">
                QR scan verified. Session ID: {scanResult.sessionId.slice(0, 18)}...
              </Text>
            )}

            <View className="mb-5">
              <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-2">ENTER PHYSICAL NFC TAG UID</Text>
              
              {/* Native NFC Scan Trigger */}
              <TouchableOpacity
                className="bg-[#0d1614] border border-[#00FFB2]/20 rounded-xl h-12 items-center justify-center mb-3 flex-row shadow-sm shadow-[#00FFB2]/5"
                onPress={handleNativeNfcScan}
                disabled={isNfcScanning}
                activeOpacity={0.8}
              >
                {isNfcScanning ? (
                  <ActivityIndicator color="#00FFB2" size="small" />
                ) : (
                  <Text className="text-[#00FFB2] text-xs font-jakarta-bold tracking-[1.5px]">
                    TAP PHYSICAL NFC TAG TO SCAN
                  </Text>
                )}
              </TouchableOpacity>

              <TextInput
                className={`bg-[#0A0A0A] text-white text-sm px-4 h-12 rounded-xl border ${isFocusedNfc ? 'border-[#00FFB2] bg-[#141e1c]/30' : 'border-white/5'}`}
                style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
                placeholder="e.g. fc830227-a9df-4dce-8f6c-4eb1feb073e6"
                placeholderTextColor="#4a5568"
                autoCorrect={false}
                value={nfcUidInput}
                onChangeText={setNfcUidInput}
                onFocus={() => setIsFocusedNfc(true)}
                onBlur={() => setIsFocusedNfc(false)}
              />
              <Text className="text-[#718096] text-[10px] font-jakarta mt-2 leading-relaxed">
                Or paste the NFC UID bound to this product from your dashboard list.
              </Text>
            </View>

            {/* Remote Shipping Verification Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => sendVerifyRequest(scanResult.sessionId, nfcUidInput, 'remote')}
              activeOpacity={0.8}
            >
              <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-[1.5px]">TRIGGER REMOTE P2P HANDOVER</Text>
            </TouchableOpacity>

            {/* Direct Handover Verification Button */}
            <TouchableOpacity
              style={styles.directButton}
              onPress={() => sendVerifyRequest(scanResult.sessionId, nfcUidInput, 'direct')}
              activeOpacity={0.8}
            >
              <Text className="text-[#00FFB2] text-xs font-jakarta-bold tracking-[1.5px]">TRIGGER DIRECT HANDOVER</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-transparent py-2 items-center justify-center mt-2"
              onPress={() => {
                setScanned(false)
                setScanResult(null)
                setNfcUidInput('')
              }}
            >
              <Text className="text-[#ef4444] text-[10px] font-jakarta-bold tracking-[1.5px]">RESET SCANNER</Text>
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
            <View style={[styles.headerSpacer, { paddingTop: Math.max(insets.top, 20) }]}>
              <Text className="text-white text-base font-jakarta-bold tracking-wider mb-1 text-center">SCAN TRANSACTION QR</Text>
              <Text className="text-[#718096] text-xs font-jakarta text-center">Align QR code inside the glow frame</Text>
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

            <View style={[styles.footerSpacer, { paddingBottom: Math.max(insets.bottom, 20), justifyContent: 'flex-end', alignItems: 'center' }]}>
              <TouchableOpacity
                className="bg-[#00FFB2]/10 border border-[#00FFB2]/20 px-5 py-2.5 rounded-xl mb-4 shadow-sm"
                onPress={() => {
                  setScanned(true)
                  setScanResult({ sessionId: '', payload: 'manual' })
                }}
                activeOpacity={0.8}
              >
                <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[1.5px]">
                  SIMULATE SCAN (MANUAL ENTRY)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                <Text className="text-[#ef4444] text-xs font-jakarta-bold tracking-wider">ABORT SCAN</Text>
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
  loadingText: {
    color: '#718096',
    fontSize: 12,
    marginTop: 12,
    letterSpacing: 1,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.65)',
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
    flex: 1,
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
    backgroundColor: 'rgba(11, 15, 14, 0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.08)',
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
    borderColor: 'rgba(0, 255, 178, 0.08)',
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
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
