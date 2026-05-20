import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { API_BASE_URL } from '@/constants/config'
import NfcManager, { NfcTech } from 'react-native-nfc-manager'
import Ionicons from '@expo/vector-icons/Ionicons'

type ActivationStep = 'IDLE' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'

interface ActivationResult {
  product_id: string
  serial_number: string
  brand: string
  name: string
  nfc_uid: string
  nft_token_id: string | null
  status: string
}

export default function ActivateScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { token } = useAuthStore()
  const { showAlert } = useAlertStore()

  const [step, setStep] = useState<ActivationStep>('IDLE')
  const [nfcUid, setNfcUid] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [isFocusedNfc, setIsFocusedNfc] = useState(false)
  const [isFocusedSerial, setIsFocusedSerial] = useState(false)
  const [isNfcScanning, setIsNfcScanning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    NfcManager.start().catch((err) =>
      console.warn('[ActivateScreen] NfcManager start failed:', err)
    )
    return () => { NfcManager.cancelTechnologyRequest().catch(() => {}) }
  }, [])

  const handleNativeScan = async () => {
    setIsNfcScanning(true)
    try {
      const isSupported = await NfcManager.isSupported()
      if (!isSupported) {
        showAlert('NFC Not Supported', 'This device does not support NFC hardware scanning.')
        return
      }
      const isEnabled = await NfcManager.isEnabled()
      if (!isEnabled) {
        showAlert('NFC Disabled', 'Please enable NFC in your device settings.')
        return
      }
      await NfcManager.requestTechnology(NfcTech.Ndef)
      const tag = await NfcManager.getTag()
      if (tag?.id) {
        setNfcUid(tag.id)
        showAlert('✅ NFC Chip Read', `Tag UID captured: ${tag.id.slice(0, 16)}...`)
      } else {
        showAlert('Read Failed', 'Could not extract UID from chip. Try again.')
      }
    } catch (ex: any) {
      if (ex !== 'user cancel' && ex?.message !== 'user cancel') {
        showAlert('Scan Cancelled', 'NFC scan was interrupted.')
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {})
      setIsNfcScanning(false)
    }
  }

  const handleActivate = async () => {
    if (!nfcUid.trim()) {
      showAlert('NFC UID Required', 'Please scan the physical NFC chip first.')
      return
    }
    if (!serialNumber.trim()) {
      showAlert('Serial Required', 'Please enter the product serial number printed on the box.')
      return
    }

    setIsSubmitting(true)
    setStep('CONFIRMING')

    try {
      const res = await fetch(`${API_BASE_URL}/nfc/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serial_number: serialNumber.trim().toUpperCase(),
          nfc_uid: nfcUid.trim(),
        }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        const code = json.error?.code ?? 'UNKNOWN'
        const msg = json.error?.message ?? 'Activation failed'
        setErrorMessage(`[${code}] ${msg}`)
        setStep('ERROR')
        return
      }

      setResult(json.data)
      setStep('SUCCESS')
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Network error — check your connection')
      setStep('ERROR')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setStep('IDLE')
    setNfcUid('')
    setSerialNumber('')
    setResult(null)
    setErrorMessage('')
  }

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
          NFC ACTIVATION
        </Text>
        <Text className="text-[#718096] text-xs font-jakarta mb-8 leading-relaxed">
          Bind a physical NFC chip to a manufactured product and register it for boutique sale.
        </Text>

        {/* ── SUCCESS ── */}
        {step === 'SUCCESS' && result && (
          <View className="bg-[#0D1110] border border-[#00FFB2]/15 rounded-2xl p-6 mb-4">
            <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[2px] mb-1">
              ACTIVATION COMPLETE
            </Text>
            <Text className="text-white text-base font-jakarta-bold mb-4">
              {result.brand} {result.name}
            </Text>

            <View className="flex-row justify-between mb-3 border-b border-white/5 pb-3">
              <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">SERIAL</Text>
              <Text className="text-white text-[10px] font-jakarta-bold">{result.serial_number}</Text>
            </View>
            <View className="flex-row justify-between mb-3 border-b border-white/5 pb-3">
              <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">NFT TOKEN</Text>
              <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold">#{result.nft_token_id ?? '—'}</Text>
            </View>
            <View className="flex-row justify-between mb-3 border-b border-white/5 pb-3">
              <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">STATUS</Text>
              <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold">{result.status}</Text>
            </View>
            <View className="flex-row justify-between mb-4">
              <Text className="text-[#718096] text-[10px] font-jakarta-bold tracking-wider">NFC UID</Text>
              <Text className="text-[#a0aec0] text-[10px] font-jakarta">{result.nfc_uid.slice(0, 22)}...</Text>
            </View>

            <Text className="text-[#718096] text-xs font-jakarta text-center mb-4 leading-relaxed">
              Product is now visible in boutique inventory and ready to sell.
            </Text>

            <TouchableOpacity
              className="bg-[#C9A84C] rounded-xl h-11 items-center justify-center mb-3 shadow-md"
              onPress={reset}
              activeOpacity={0.8}
            >
              <Text className="text-[#0A0A0A] text-[11px] font-jakarta-bold tracking-[1.5px]">
                ACTIVATE ANOTHER PRODUCT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-[#C9A84C]/40 rounded-xl h-11 items-center justify-center"
              onPress={() => router.push('/(operator)/sell')}
              activeOpacity={0.8}
            >
              <Text className="text-[#C9A84C] text-[11px] font-jakarta-bold tracking-[1.5px]">
                SELL THIS PRODUCT NOW →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── ERROR ── */}
        {step === 'ERROR' && (
          <View className="bg-[#1a0d0d] border border-[#ef4444]/20 rounded-2xl p-6 mb-4">
            <Text className="text-[#ef4444] text-[10px] font-jakarta-bold tracking-[2px] mb-1">
              ACTIVATION FAILED
            </Text>
            <Text className="text-white text-base font-jakarta-bold mb-3">Unable to Register</Text>
            <Text className="text-[#a0aec0] text-xs font-jakarta leading-relaxed mb-5">
              {errorMessage}
            </Text>
            <TouchableOpacity
              className="bg-[#C9A84C] rounded-xl h-11 items-center justify-center shadow-md"
              onPress={reset}
              activeOpacity={0.8}
            >
              <Text className="text-[#0A0A0A] text-[11px] font-jakarta-bold tracking-[1.5px]">TRY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FORM ── */}
        {(step === 'IDLE' || step === 'CONFIRMING') && (
          <View>
            {/* Step 1: NFC Scan */}
            <View className="bg-[#111111] border border-white/5 rounded-2xl p-6 mb-4">
              <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[2px] mb-1">
                STEP 1 · PHYSICAL NFC CHIP
              </Text>
              <Text className="text-[#718096] text-xs font-jakarta mb-5 leading-relaxed">
                Hold device close to the NFC chip embedded in the product packaging.
              </Text>

              <TouchableOpacity
                className={`h-12 rounded-xl border items-center justify-center mb-3 flex-row gap-2 ${
                  nfcUid
                    ? 'bg-[#0d1614] border-[#00FFB2]/30'
                    : 'bg-[#0d1212] border-[#C9A84C]/30'
                }`}
                onPress={handleNativeScan}
                disabled={isNfcScanning}
                activeOpacity={0.8}
              >
                {isNfcScanning ? (
                  <ActivityIndicator color="#C9A84C" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={nfcUid ? 'checkmark-circle' : 'radio'}
                      size={18}
                      color={nfcUid ? '#00FFB2' : '#C9A84C'}
                    />
                    <Text className={`text-[11px] font-jakarta-bold tracking-[1.5px] ${
                      nfcUid ? 'text-[#00FFB2]' : 'text-[#C9A84C]'
                    }`}>
                      {nfcUid ? 'NFC SCANNED — TAP TO RE-SCAN' : 'TAP TO SCAN NFC CHIP'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {nfcUid ? (
                <Text className="text-[#00FFB2] text-[10px] font-jakarta mb-4">
                  UID: {nfcUid.slice(0, 26)}...
                </Text>
              ) : null}

              <Text className="text-[#4a5568] text-[9px] font-jakarta-bold tracking-widest text-center mb-3">
                — OR ENTER MANUALLY (DEV ONLY) —
              </Text>
              <TextInput
                className={`bg-[#0A0A0A] text-white text-sm font-jakarta px-4 h-12 rounded-xl border ${
                  isFocusedNfc ? 'border-[#C9A84C] bg-[#1a1508]/30' : 'border-white/5'
                }`}
                placeholder="04:A3:2B:C1:12:34:56"
                placeholderTextColor="#4a5568"
                value={nfcUid}
                onChangeText={setNfcUid}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => setIsFocusedNfc(true)}
                onBlur={() => setIsFocusedNfc(false)}
              />
            </View>

            {/* Step 2: Serial Number */}
            <View className="bg-[#111111] border border-white/5 rounded-2xl p-6 mb-6">
              <Text className="text-[#C9A84C] text-[10px] font-jakarta-bold tracking-[2px] mb-1">
                STEP 2 · PRODUCT SERIAL NUMBER
              </Text>
              <Text className="text-[#718096] text-xs font-jakarta mb-5 leading-relaxed">
                Find the serial number printed on the box, certificate, or product label.
              </Text>
              <TextInput
                className={`bg-[#0A0A0A] text-white text-sm font-jakarta px-4 h-12 rounded-xl border ${
                  isFocusedSerial ? 'border-[#C9A84C] bg-[#1a1508]/30' : 'border-white/5'
                }`}
                placeholder="e.g. LUX-2026-00101"
                placeholderTextColor="#4a5568"
                value={serialNumber}
                onChangeText={(t) => setSerialNumber(t.toUpperCase())}
                autoCorrect={false}
                autoCapitalize="characters"
                onFocus={() => setIsFocusedSerial(true)}
                onBlur={() => setIsFocusedSerial(false)}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              className={`bg-[#C9A84C] rounded-xl h-12 items-center justify-center shadow-md ${
                (!nfcUid || !serialNumber || isSubmitting) ? 'opacity-40' : ''
              }`}
              onPress={handleActivate}
              disabled={!nfcUid || !serialNumber || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <Text className="text-[#0A0A0A] text-[11px] font-jakarta-bold tracking-[1.5px]">
                  ACTIVATE PRODUCT
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
