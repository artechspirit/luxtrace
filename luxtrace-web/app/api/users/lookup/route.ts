import { NextRequest } from 'next/server'
import { profileRepository } from '@/repositories/profile.repository'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * GET /api/users/lookup?email=buyer@example.com
 *
 * Find user profile information by email.
 * Role: Authenticated CONSUMER / BRAND
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return err('INVALID_PAYLOAD', 'email is required', 422)
    }

    const profile = await profileRepository.findByEmail(email.trim())
    if (!profile) {
      return err('NOT_FOUND', 'User profile not found with this email', 404)
    }

    return ok({
      user_id: profile.user_id,
      email: profile.email,
      full_name: profile.full_name,
      wallet_address: profile.wallet_address,
    })
  } catch (error) {
    console.error('[GET /api/users/lookup]', error)
    return serverError()
  }
}
