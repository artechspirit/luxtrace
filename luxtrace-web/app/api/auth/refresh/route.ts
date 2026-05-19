import { NextRequest } from 'next/server'
import { authService } from '@/services/auth.service'
import { ok, err, serverError } from '@/lib/response'

/**
 * POST /api/auth/refresh
 * Body: { "refresh_token": "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return err('INVALID_PAYLOAD', 'refresh_token is required', 422)
    }

    const tokens = await authService.refresh(refresh_token)

    return ok(tokens)
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'UNAUTHORIZED') return err('UNAUTHORIZED', 'Invalid or expired refresh token', 401)
    console.error('[POST /api/auth/refresh]', error)
    return serverError()
  }
}
