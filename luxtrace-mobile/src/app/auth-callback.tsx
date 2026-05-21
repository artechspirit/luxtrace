import React, { useEffect, useState, useRef } from 'react'
import { StyleSheet, View, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
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
  const params = useLocalSearchParams()
  const routeCode = params.code as string | undefined
  const routeAccessToken = params.accessToken as string | undefined
  const url = Linking.useURL()
  const { setSession } = useAuthStore()
  const { showAlert } = useAlertStore()

  const [isLuxuryLoading, setIsLuxuryLoading] = useState(false)
  const [isApiLoading, setIsApiLoading] = useState(true)
  const [loaderFinished, setLoaderFinished] = useState(false)
  const [pendingSession, setPendingSession] = useState<{ token: string; user: any } | null>(null)
  
  const authenticatingRef = useRef(false)

  // Helper: redirect to the correct screen based on role
  const redirectByRole = (role: string | undefined) => {
    if (role === 'OPERATOR' || role === 'ADMIN') {
      console.log('[AuthCallback] Role is', role, '→ redirecting to /(operator)')
      router.replace('/(operator)')
    } else {
      console.log('[AuthCallback] Role is', role, '→ redirecting to /')
      router.replace('/')
    }
  }

  // Sync animation finish with login resolution to avoid premature routing
  useEffect(() => {
    console.log('[AuthCallback] Sync effect check - loaderFinished:', loaderFinished, 'pendingSession:', !!pendingSession)
    if (loaderFinished && pendingSession) {
      console.log('[AuthCallback] Conditions met, calling setSession...')
      setSession(pendingSession.token, pendingSession.user).then(() => {
        console.log('[AuthCallback] setSession complete')
        redirectByRole(pendingSession.user?.role)
      }).catch(err => {
        console.error('[AuthCallback] Error setting session:', err)
      })
    }
  }, [loaderFinished, pendingSession])

  useEffect(() => {
    console.log('[AuthCallback] Checking parameters. Route code:', routeCode, 'routeAccessToken:', routeAccessToken ? 'present' : 'missing', 'URL:', url)
    
    // Determine the code/token from route params or URL
    let code = routeCode
    let accessToken = routeAccessToken

    if (!code && !accessToken && url) {
      const getParam = (name: string) => {
        const regex = new RegExp(`[?&#]${name}=([^&#]*)`)
        const match = url.match(regex)
        return match ? decodeURIComponent(match[1]) : undefined
      }
      code = getParam('code')
      accessToken = getParam('access_token')
    }

    console.log('[AuthCallback] Resolved code:', code, 'accessToken:', accessToken ? 'present' : 'missing')

    if (!code && !accessToken) {
      console.log('[AuthCallback] No credentials resolved yet. Setting fallback timeout to return to login...')
      const timeout = setTimeout(() => {
        console.log('[AuthCallback] Code/Token resolution timed out. Redirecting back to login.')
        router.replace('/(auth)/login')
      }, 5000)
      return () => clearTimeout(timeout)
    }

    if (authenticatingRef.current) {
      console.log('[AuthCallback] Authentication already in progress. Ignoring duplicate trigger.')
      return
    }

    authenticatingRef.current = true

    const authenticate = async () => {
      try {
        if (code) {
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

          const { access_token, user_id, email, full_name, avatar_url, wallet_address, role, is_new_user } = result.data
          const userData = { user_id, email, full_name, role, wallet_address, avatar_url }

          console.log('[AuthCallback] Exchange success, userData:', userData, 'is_new_user:', is_new_user)
          
          if (is_new_user) {
            setIsApiLoading(false)
            setIsLuxuryLoading(true)
            setPendingSession({ token: access_token, user: userData })
          } else {
            setIsApiLoading(false)
            await setSession(access_token, userData)
            redirectByRole(userData.role)
          }
        } else if (accessToken) {
          console.log('[AuthCallback] Validating implicit access token with backend...')
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })

          const result = await response.json()
          console.log('[AuthCallback] API /auth/me status:', response.status, 'success:', result.success)

          if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to fetch user profile with access token')
          }

          console.log('[AuthCallback] Profile fetch success, userData:', result.data)
          setIsApiLoading(false)
          await setSession(accessToken, result.data)
          redirectByRole(result.data?.role)
        }
      } catch (err: any) {
        console.error('[OAuth Callback Error]', err)
        setIsApiLoading(false)
        setIsLuxuryLoading(false)
        showAlert('Authentication Failed', err.message || 'Failed to complete Google login.')
        router.replace('/(auth)/login')
      }
    }

    authenticate()
  }, [routeCode, routeAccessToken, url])

  if (isApiLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00FFB2" />
      </View>
    )
  }

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
