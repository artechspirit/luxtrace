import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { LuxuryLoader } from '@/components/ui/LuxuryLoader'
import { API_BASE_URL } from '@/constants/config'

const ONBOARDING_STEPS = [
  'Establishing secure gateway handshake...',
  'Resolving decentralized profile state...',
  'Synchronizing custodial cryptographic wallet...',
  'Securing digital twin ownership registry...',
  'Finalizing active user session...'
]

export default function AuthCallbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const code = params.code as string | undefined
  const { setSession } = useAuthStore()
  const { showAlert } = useAlertStore()

  const [isLuxuryLoading, setIsLuxuryLoading] = useState(true)
  const [loaderFinished, setLoaderFinished] = useState(false)
  const [pendingSession, setPendingSession] = useState<{ token: string; user: any } | null>(null)

  // Sync animation finish with login resolution to avoid premature routing
  useEffect(() => {
    if (loaderFinished && pendingSession) {
      setSession(pendingSession.token, pendingSession.user).then(() => {
        router.replace('/')
      })
    }
  }, [loaderFinished, pendingSession])

  useEffect(() => {
    if (!code) {
      // If accessed without a code, redirect to login
      router.replace('/(auth)/login')
      return
    }

    const exchangeCode = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/oauth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Google OAuth exchange failed')
        }

        const { access_token, user_id, email, full_name, avatar_url, wallet_address, role } = result.data
        const userData = { user_id, email, full_name, role, wallet_address, avatar_url }

        setPendingSession({ token: access_token, user: userData })
      } catch (err: any) {
        console.error('[OAuth Callback Error]', err)
        setIsLuxuryLoading(false)
        showAlert('Authentication Failed', err.message || 'Failed to complete Google login.')
        router.replace('/(auth)/login')
      }
    }

    exchangeCode()
  }, [code])

  return (
    <View style={styles.container}>
      <LuxuryLoader
        isOpen={isLuxuryLoading}
        title="SECURE GATEWAY ENCRYPTION"
        steps={ONBOARDING_STEPS}
        onFinished={() => setLoaderFinished(true)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
