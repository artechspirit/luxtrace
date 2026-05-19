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

export default function LoginScreen() {
  const router = useRouter()
  const { login, isLoading, error, isAuthenticated, user, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isFocusedEmail, setIsFocusedEmail] = useState(false)
  const [isFocusedPassword, setIsFocusedPassword] = useState(false)

  // Clear errors when entering screen
  useEffect(() => {
    clearError()
  }, [])

  // Handle redirect on successful login
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN' || user.role === 'OPERATOR') {
        router.replace('/explore') // Will route to operator screen when built
      } else {
        router.replace('/') // Routes to consumer dashboard
      }
    }
  }, [isAuthenticated, user])

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return
    }
    await login(email.trim(), password)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoLetter}>L</Text>
              </View>
            </View>
            <Text style={styles.logoText}>LUXTRACE</Text>
            <Text style={styles.logoTagline}>DIGITAL TWIN AUTHENTICATOR</Text>
          </View>

          {/* Form Card (Luxury Glassmorphic Panel) */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>SECURE GATEWAY</Text>
            <Text style={styles.cardSubtitle}>Sign in to authenticate luxury assets</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={[
                  styles.input,
                  isFocusedEmail && styles.inputFocused,
                ]}
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
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>SECURITY KEY / PASSWORD</Text>
              <TextInput
                style={[
                  styles.input,
                  isFocusedPassword && styles.inputFocused,
                ]}
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
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.buttonText}>ESTABLISH CONNECTION</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Powered by Ethereum Sepolia PoA & NFC cryptography
            </Text>
            <Text style={styles.footerSubtext}>
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
    backgroundColor: 'rgba(15, 42, 37, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.15)',
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
    borderColor: 'rgba(0, 255, 178, 0.1)',
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
