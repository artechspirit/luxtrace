import { NextRequest } from 'next/server'
import { authService } from '@/services/auth.service'
import { ok, err, serverError } from '@/lib/response'

/**
 * POST /api/auth/login
 *
 * Supports two modes:
 * - email/password login
 * - OAuth callback (exchange code for session)
 *
 * Body (email/password):
 * { "email": "...", "password": "..." }
 *
 * Body (OAuth callback):
 * { "code": "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ── OAuth code exchange ──────────────────────────────────────────────────
    if ('code' in body) {
      const { code } = body
      if (!code || typeof code !== 'string') {
        return err('INVALID_PAYLOAD', 'code is required for OAuth login', 422)
      }

      const result = await authService.handleOAuthCallback(code)

      return ok({
        user_id: result.profile.user_id,
        email: result.profile.email,
        full_name: result.profile.full_name,
        avatar_url: result.profile.avatar_url,
        wallet_address: result.profile.wallet_address,
        role: result.profile.role,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })
    }

    // ── Email + password ─────────────────────────────────────────────────────
    const { email, password } = body

    if (!email || !password) {
      return err('INVALID_PAYLOAD', 'email and password are required', 422)
    }

    const result = await authService.loginWithPassword(email, password)

    return ok({
      user_id: result.profile.user_id,
      email: result.profile.email,
      full_name: result.profile.full_name,
      avatar_url: result.profile.avatar_url,
      wallet_address: result.profile.wallet_address,
      role: result.profile.role,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'INVALID_CREDENTIALS')
      return err('INVALID_CREDENTIALS', 'Invalid email or password', 401)
    if (e.code === 'OAUTH_FAILED')
      return err('OAUTH_FAILED', 'OAuth code exchange failed', 401)
    if (e.code === 'PROFILE_NOT_FOUND')
      return err('PROFILE_NOT_FOUND', e.message ?? 'Profile not found', 404)
    console.error('[POST /api/auth/login]', error)
    return serverError()
  }
}
