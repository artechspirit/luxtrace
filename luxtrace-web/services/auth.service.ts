import { supabase } from '@/lib/supabase'
import { profileRepository } from '@/repositories/profile.repository'
import { createUserWallet } from '@/lib/thirdweb-engine'
import type { Profile, UserRole } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic Ethereum wallet address for a user.
 * Uses HMAC-SHA256(WALLET_MASTER_SEED + userId) — synchronous, no network call.
 * Only the address is stored — brand wallet handles all on-chain signing.
 */
function generateWallet(userId: string): string {
  const { walletAddress } = createUserWallet(userId)
  return walletAddress
}

/**
 * Ensure a profile exists for this user.
 * Called after BOTH email/password AND OAuth logins.
 * - If profile exists → return it
 * - If not → create profile + generate real Thirdweb wallet
 */
async function getOrCreateProfile(
  userId: string,
  email: string,
  fullName: string | null,
  avatarUrl: string | null,
  defaultRole: UserRole = 'CONSUMER'
): Promise<Profile> {
  const existing = await profileRepository.findByUserId(userId)
  if (existing) return existing

  // Synchronous — no network call, no rollback needed
  const walletAddress = generateWallet(userId)

  return profileRepository.create({
    user_id: userId,
    email,
    wallet_address: walletAddress,
    role: defaultRole,
    full_name: fullName,
    avatar_url: avatarUrl,
  })
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Register with email + password.
   * Creates Supabase auth user → Thirdweb wallet → profile.
   */
  async register(
    email: string,
    password: string,
    fullName?: string,
    role?: UserRole
  ): Promise<{ profile: Profile; access_token: string; refresh_token: string }> {
    // 1. Create Supabase auth user (admin SDK — skip email confirmation for now)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? null },
    })
 
    if (authError) {
      const msg = authError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_ALREADY_EXISTS' })
      }
      throw authError
    }
 
    const userId = authData.user.id
 
    // 2. Create profile + wallet (rolls back auth user on wallet failure)
    const profile = await getOrCreateProfile(userId, email, fullName ?? null, null, role || 'CONSUMER')
 
    // 3. Sign in to get JWT session
    const { data: session, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (sessionError) throw sessionError
 
    return {
      profile,
      access_token: session.session!.access_token,
      refresh_token: session.session!.refresh_token,
    }
  },

  /**
   * Login with email + password.
   * Profile is guaranteed to exist (created at register time).
   */
  async loginWithPassword(
    email: string,
    password: string
  ): Promise<{ profile: Profile; access_token: string; refresh_token: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' })
    }

    const profile = await profileRepository.findByUserId(data.user.id)
    if (!profile) {
      // Edge case: auth user exists but profile was never created
      throw Object.assign(new Error('Profile not found — please contact support'), {
        code: 'PROFILE_NOT_FOUND',
      })
    }

    return {
      profile,
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
    }
  },

  /**
   * Process a Google OAuth callback.
   * Called server-side after Supabase exchanges the OAuth code.
   * Creates profile + wallet if first login.
   *
   * @param code - OAuth authorization code from the callback URL
   */
  async handleOAuthCallback(code: string): Promise<{
    profile: Profile
    access_token: string
    refresh_token: string
  }> {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.session) {
      throw Object.assign(new Error('OAuth code exchange failed'), { code: 'OAUTH_FAILED' })
    }

    const user = data.user
    const email = user.email ?? ''
    const fullName = (user.user_metadata?.full_name as string) ?? null
    const avatarUrl = (user.user_metadata?.avatar_url as string) ?? null

    // getOrCreateProfile is idempotent — safe to call on every OAuth login
    const profile = await getOrCreateProfile(user.id, email, fullName, avatarUrl, 'CONSUMER')

    return {
      profile,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }
  },

  /**
   * Refresh JWT tokens.
   */
  async refresh(
    refreshToken: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

    if (error || !data.session) {
      throw Object.assign(new Error('Invalid or expired refresh token'), { code: 'UNAUTHORIZED' })
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }
  },

  /**
   * Initiate Google OAuth — returns the redirect URL.
   * Mobile app opens this URL in a browser/webview.
   */
  async getGoogleOAuthUrl(redirectTo: string): Promise<string> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })

    if (error || !data.url) {
      throw Object.assign(new Error('Failed to generate OAuth URL'), { code: 'OAUTH_URL_FAILED' })
    }

    return data.url
  },

  /**
   * Get profile by userId (for /auth/me endpoint).
   */
  async getMe(userId: string): Promise<Profile> {
    const profile = await profileRepository.findByUserId(userId)
    if (!profile) {
      throw Object.assign(new Error('Profile not found'), { code: 'NOT_FOUND' })
    }
    return profile
  },
}
