import { NextRequest } from 'next/server'
import { authService } from '@/services/auth.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, unauthorized, serverError, err } from '@/lib/response'

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's full profile including:
 * - role (ADMIN | OPERATOR | CONSUMER)
 * - wallet_address (real Thirdweb-managed EOA)
 *
 * Headers: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const profile = await authService.getMe(user.user_id)

    return ok({
      user_id: profile.user_id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      wallet_address: profile.wallet_address,
      role: profile.role,
      created_at: profile.created_at,
    })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Profile not found', 404)
    console.error('[GET /api/auth/me]', error)
    return serverError()
  }
}
