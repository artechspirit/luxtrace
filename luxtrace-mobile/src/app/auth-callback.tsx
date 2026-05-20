import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
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
  const url = Linking.useURL()
  const { setSession } = useAuthStore()
  const { showAlert } = useAlertStore()

  const [isLuxuryLoading, setIsLuxuryLoading] = useState(true)
  const [loaderFinished, setLoaderFinished] = useState(false)
  const [pendingSession, setPendingSession] = useState<{ token: string; user: any } | null>(null)

  // Sync animation finish with login resolution to avoid premature routing
  useEffect(() => {
    console.log('[AuthCallback] Sync effect check - loaderFinished:', loaderFinished, 'pendingSession:', !!pendingSession)
    if (loaderFinished && pendingSession) {
      console.log('[AuthCallback] Conditions met, calling setSession...')
      setSession(pendingSession.token, pendingSession.user).then(() => {
        console.log('[AuthCallback] setSession complete, replacing route with "/"')
        router.replace('/')
      }).catch(err => {
        console.error('[AuthCallback] Error setting session:', err)
      })
    }
  }, [loaderFinished, pendingSession])

  useEffect(() => {
    console.log('[AuthCallback] Hook URL changed:', url)
    if (!url) return

    const parsed = Linking.parse(url)
    console.log('[AuthCallback] Parsed URL object:', parsed)

    // Robust parameter extractor for both query (?) and fragment (#)
    const getParam = (name: string) => {
      if (parsed.queryParams && parsed.queryParams[name]) {
        return parsed.queryParams[name] as string
      }
      const regex = new RegExp(`[?&#]${name}=([^&#]*)`)
      const match = url.match(regex)
      return match ? decodeURIComponent(match[1]) : undefined
    }

    const code = getParam('code')
    console.log('[AuthCallback] Extracted code:', code)

    if (!code) {
      console.log('[AuthCallback] No code found in URL yet. Checking access_token fallback...')
      const accessToken = getParam('access_token')
      if (accessToken) {
        console.log('[AuthCallback] Implicit access token found but code flow is required for profile sync. Returning to login.')
      }
      
      // Delay redirect slightly to ensure any background load has time to settle
      const timeout = setTimeout(() => {
        router.replace('/(auth)/login')
      }, 1000)
      return () => clearTimeout(timeout)
    }

    const exchangeCode = async () => {
      try {
        console.log('[AuthCallback] Exchanging code with API base:', API_BASE_URL)
        const response = await fetch(`${API_BASE_URL}/auth/oauth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const result = await response.json()
        console.log('[AuthCallback] API response status:', response.status, 'success:', result.success)

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Google OAuth exchange failed')
        }

        const { access_token, user_id, email, full_name, avatar_url, wallet_address, role } = result.data
        const userData = { user_id, email, full_name, role, wallet_address, avatar_url }

        console.log('[AuthCallback] Exchange success, userData:', userData)
        setPendingSession({ token: access_token, user: userData })
      } catch (err: any) {
        console.error('[OAuth Callback Error]', err)
        setIsLuxuryLoading(false)
        showAlert('Authentication Failed', err.message || 'Failed to complete Google login.')
        router.replace('/(auth)/login')
      }
    }

    exchangeCode()
  }, [url])

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
