import { NextRequest } from 'next/server'
import { authService } from '@/services/auth.service'
import { ok, err, serverError } from '@/lib/response'

/**
 * GET /api/auth/oauth/google
 *
 * Returns the Google OAuth URL for the mobile app to open.
 * The app opens this in a browser/webview, then receives the code
 * via the redirect URI and calls POST /api/auth/login with { code }.
 *
 * Query param: redirect_to (required) — e.g. luxtrace://auth/callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const redirectTo = searchParams.get('redirect_to')

    if (!redirectTo) {
      return err('INVALID_PAYLOAD', 'redirect_to query parameter is required', 422)
    }

    const url = await authService.getGoogleOAuthUrl(redirectTo)

    return ok({ url })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'OAUTH_URL_FAILED') return err('OAUTH_URL_FAILED', 'Failed to generate OAuth URL', 502)
    console.error('[GET /api/auth/oauth/google]', error)
    return serverError()
  }
}

/**
 * POST /api/auth/oauth/google
 *
 * Register a new user via Google OAuth.
 * Body: { "code": "<oauth_code>", "redirect_to": "<redirect_uri>" }
 *
 * Equivalent to POST /api/auth/login with { code },
 * but also handles new user creation (getOrCreateProfile is idempotent).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) return err('INVALID_PAYLOAD', 'code is required', 422)

    const result = await authService.handleOAuthCallback(code)

    return ok(
      {
        user_id: result.profile.user_id,
        email: result.profile.email,
        full_name: result.profile.full_name,
        avatar_url: result.profile.avatar_url,
        wallet_address: result.profile.wallet_address,
        role: result.profile.role,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        is_new_user: result.isNewUser,
      },
      200
    )
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'OAUTH_FAILED') return err('OAUTH_FAILED', 'OAuth code exchange failed', 401)
    if (e.code === 'WALLET_GENERATION_FAILED') return err('WALLET_GENERATION_FAILED', 'Wallet generation failed', 502)
    console.error('[POST /api/auth/oauth/google]', error)
    return serverError()
  }
}
