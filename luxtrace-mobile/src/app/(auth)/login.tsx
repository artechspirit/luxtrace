import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { API_BASE_URL } from '@/constants/config'
import { useAlertStore } from '@/stores/alertStore'
import { LuxuryLoader } from '@/components/ui/LuxuryLoader'

WebBrowser.maybeCompleteAuthSession()

const ONBOARDING_STEPS = [
  'Establishing secure gateway handshake...',
  'Resolving decentralized profile state...',
  'Synchronizing custodial cryptographic wallet...',
  'Securing digital twin ownership registry...',
  'Finalizing active user session...'
]

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setSession, isAuthenticated, user, clearError } = useAuthStore()
  const { showAlert } = useAlertStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isFocusedEmail, setIsFocusedEmail] = useState(false)
  const [isFocusedPassword, setIsFocusedPassword] = useState(false)
  
  // Luxury Loader states
  const [isLuxuryLoading, setIsLuxuryLoading] = useState(false)
  const [loaderFinished, setLoaderFinished] = useState(false)
  const [pendingSession, setPendingSession] = useState<{ token: string; user: any } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Clear errors when entering screen
  useEffect(() => {
    clearError()
  }, [])

  // Helper: redirect to the correct screen based on role
  const redirectByRole = (role: string | undefined) => {
    if (role === 'OPERATOR' || role === 'ADMIN') {
      router.replace('/(operator)')
    } else {
      router.replace('/')
    }
  }

  // Sync animation finish with login resolution to avoid premature routing
  useEffect(() => {
    if (loaderFinished && pendingSession) {
      setIsLuxuryLoading(false)
      setSession(pendingSession.token, pendingSession.user).then(() => {
        const role = pendingSession.user?.role
        if (role === 'OPERATOR' || role === 'ADMIN') {
          router.replace('/(operator)')
        } else {
          router.replace('/(tabs)')
        }
      })
    }
  }, [loaderFinished, pendingSession])

  const handleGoogleLogin = async () => {
    clearError()
    try {
      const redirectUrl = Linking.createURL('auth-callback')
      console.log('[Google Login] Redirect URL:', redirectUrl)

      const response = await fetch(`${API_BASE_URL}/auth/oauth/google?redirect_to=${encodeURIComponent(redirectUrl)}`)
      const result = await response.json()

      if (!response.ok || !result.success || !result.data?.url) {
        throw new Error(result.message || 'Failed to initialize Google OAuth session.')
      }

      const authUrl = result.data.url
      
      console.log('[Google Login] Opening auth browser...')
      const browserResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)
      console.log('[Google Login] Browser result type:', browserResult.type)

      if (browserResult.type === 'success' && browserResult.url) {
        console.log('[Google Login] Browser returned URL:', browserResult.url)
        
        const getParam = (url: string, name: string) => {
          const regex = new RegExp(`[?&#]${name}=([^&#]*)`)
          const match = url.match(regex)
          return match ? decodeURIComponent(match[1]) : undefined
        }

        const code = getParam(browserResult.url, 'code')
        const accessToken = getParam(browserResult.url, 'access_token')

        console.log('[Google Login] Extracted code:', code, 'accessToken:', accessToken ? 'found' : 'missing')

        if (code) {
          router.replace({
            pathname: '/auth-callback',
            params: { code }
          })
        } else if (accessToken) {
          router.replace({
            pathname: '/auth-callback',
            params: { accessToken }
          })
        } else {
          throw new Error('Google OAuth callback did not contain authentication code or access token.')
        }
      } else if (browserResult.type === 'cancel') {
        console.log('[Google Login] User cancelled session.')
      } else {
        throw new Error('Google OAuth flow aborted or failed.')
      }
    } catch (err: any) {
      console.error('[Google Login Error]', err)
      useAuthStore.setState({ error: err.message || 'Failed to authenticate with Google' })
      showAlert('Authentication Failed', err.message || 'Failed to authenticate with Google.')
    }
  }

  // Handle redirect on successful login
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[Login] 🔍 isAuthenticated effect fired, user.role:', user.role, '| typeof:', typeof user.role)
      if (user.role === 'ADMIN' || user.role === 'OPERATOR') {
        router.replace('/(operator)')
      } else {
        router.replace('/(tabs)')
      }
    }
  }, [isAuthenticated, user])

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Input Required', 'Please enter both your email address and password.')
      return
    }

    setIsSubmitting(true)
    clearError()

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Login failed')
      }

      const { access_token, user_id, full_name, avatar_url, wallet_address, role } = result.data
      const userData = { user_id, email: email.trim(), full_name, role, wallet_address, avatar_url }

      // 🔍 DEBUG
      console.log('[Login] 🔍 RAW result.data:', JSON.stringify(result.data))
      console.log('[Login] 🔍 Extracted role:', role, '| typeof:', typeof role)

      await setSession(access_token, userData)
    } catch (err: any) {
      useAuthStore.setState({ error: err.message || 'Invalid email or password.' })
      showAlert('Access Denied', err.message || 'Invalid email or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View 
      className="flex-1 bg-[#0A0A0A]"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <LuxuryLoader
        isOpen={isLuxuryLoading}
        title="SECURE GATEWAY ENCRYPTION"
        steps={ONBOARDING_STEPS}
        onFinished={() => setLoaderFinished(true)}
      />
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-xl bg-[#0A0A0A] border border-[#00FFB2]/30 items-center justify-center shadow-md shadow-[#00FFB2]/10">
              <Text className="text-[#00FFB2] text-2xl font-jakarta-extrabold tracking-wider">L</Text>
            </View>
            <Text className="text-white text-xl font-jakarta-bold tracking-[4px] mt-4">LUXTRACE</Text>
            <Text className="text-[#00FFB2] text-[9px] font-jakarta-semibold tracking-[2px] mt-1">DIGITAL TWIN AUTHENTICATOR</Text>
          </View>

          {/* Form Card (Simple & Elegant Panel) */}
          <View className="bg-[#111111] border border-white/5 rounded-2xl p-6">
            <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[2px] mb-1">SECURE GATEWAY</Text>
            <Text className="text-[#718096] text-xs font-jakarta mb-6">Sign in to authenticate luxury assets</Text>

            {/* Email Field */}
            <View className="mb-5">
              <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-2">EMAIL ADDRESS</Text>
              <TextInput
                className={`bg-[#0A0A0A] text-white text-sm font-jakarta px-4 h-12 rounded-xl border ${isFocusedEmail ? 'border-[#00FFB2] bg-[#141e1c]/30' : 'border-white/5'}`}
                placeholder="operator@luxtrace.com"
                placeholderTextColor="#4a5568"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsFocusedEmail(true)}
                onBlur={() => setIsFocusedEmail(false)}
              />
            </View>

            {/* Password Field */}
            <View className="mb-6">
              <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-2">SECURITY KEY / PASSWORD</Text>
              <TextInput
                className={`bg-[#0A0A0A] text-white text-sm font-jakarta px-4 h-12 rounded-xl border ${isFocusedPassword ? 'border-[#00FFB2] bg-[#141e1c]/30' : 'border-white/5'}`}
                placeholder="••••••••••••"
                placeholderTextColor="#4a5568"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsFocusedPassword(true)}
                onBlur={() => setIsFocusedPassword(false)}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-[1.5px]">ESTABLISH CONNECTION</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-white/5" />
              <Text className="text-[#4a5568] text-[9px] font-jakarta-bold mx-3 tracking-widest">OR</Text>
              <View className="flex-1 h-[1px] bg-white/5" />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text className="text-white text-xs font-jakarta-bold tracking-[1.5px]">CONTINUE WITH GOOGLE</Text>
            </TouchableOpacity>
          </View>

          {/* Info Footer */}
          <View className="items-center mt-10">
            <Text className="text-[#4a5568] text-[9px] font-jakarta-semibold tracking-wider text-center">
              Powered by Ethereum Sepolia PoA & NFC cryptography
            </Text>
            <Text className="text-[#718096] text-[10px] font-jakarta text-center mt-1">
              Invisible Custodial Wallet Gated Client
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoGlow: {
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#0A0A0A',
    borderColor: 'rgba(0, 255, 178, 0.25)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#00FFB2',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'monospace',
    letterSpacing: 2,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif',
  },
  logoTagline: {
    fontSize: 10,
    color: '#00FFB2',
    letterSpacing: 3,
    marginTop: 6,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'CourierNewPS-BoldMT' : 'monospace',
  },
  card: {
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
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
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
  },
  inputFocused: {
    borderColor: '#00FFB2',
    backgroundColor: '#141E1C',
  },
  button: {
    backgroundColor: '#00FFB2',
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  googleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#718096',
    fontSize: 11,
    textAlign: 'center',
  },
  footerSubtext: {
    color: '#00FFB2',
    opacity: 0.5,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
})
