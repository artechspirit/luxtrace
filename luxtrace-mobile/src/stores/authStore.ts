import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { API_BASE_URL } from '@/constants/config'

const SECURE_STORE_TOKEN_KEY = 'luxtrace_auth_token'

export interface UserProfile {
  user_id: string
  email: string
  full_name: string
  role: 'ADMIN' | 'OPERATOR' | 'CONSUMER'
  wallet_address: string | null
  avatar_url?: string
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loadSession: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Login failed')
      }

      const { access_token, user_id, full_name, avatar_url, wallet_address, role } = result.data

      // Save token to secure storage on device
      await SecureStore.setItemAsync(SECURE_STORE_TOKEN_KEY, access_token)

      set({
        token: access_token,
        user: {
          user_id,
          email,
          full_name,
          role,
          wallet_address,
          avatar_url,
        },
        isAuthenticated: true,
        isLoading: false,
      })

      return true
    } catch (err: any) {
      set({
        error: err.message || 'Network error occurred during login',
        isLoading: false,
      })
      return false
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_TOKEN_KEY)
    } catch (err) {
      console.warn('Failed to delete token from SecureStore:', err)
    }
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  },

  loadSession: async () => {
    set({ isLoading: true, error: null })
    try {
      const token = await SecureStore.getItemAsync(SECURE_STORE_TOKEN_KEY)
      if (!token) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      // Fetch fresh profile from backend with token
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        // Token might be expired or invalid, log out
        await SecureStore.deleteItemAsync(SECURE_STORE_TOKEN_KEY)
        set({ token: null, user: null, isAuthenticated: false, isLoading: false })
        return
      }

      set({
        token,
        user: result.data,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err: any) {
      // Keep offline/uncaught state safe
      set({
        isLoading: false,
      })
    }
  },
}))
