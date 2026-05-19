import { NextRequest } from 'next/server'
import { authService } from '@/services/auth.service'
import { ok, err, serverError } from '@/lib/response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, role } = body

    if (!email || !password) {
      return err('INVALID_PAYLOAD', 'email and password are required', 422)
    }

    const result = await authService.register(email, password, fullName, role)

    return ok(
      {
        user_id: result.profile.user_id,
        email: result.profile.email,
        wallet_address: result.profile.wallet_address,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      },
      201
    )
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'EMAIL_ALREADY_EXISTS') return err('EMAIL_ALREADY_EXISTS', 'Email already registered', 409)
    if (e.code === 'WALLET_GENERATION_FAILED') return err('WALLET_GENERATION_FAILED', 'Wallet generation failed', 502)
    console.error('[POST /api/auth/register]', error)
    return serverError()
  }
}
