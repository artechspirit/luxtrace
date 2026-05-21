import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * GET /api/transactions/:id/qr
 *
 * Generates or retrieves the single-use handover QR session for a given transaction.
 * Supports P2P_REMOTE_SHIPPING, P2P_DIRECT_HANDOVER, and PRIMARY_BOUTIQUE.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const { id } = await context.params
    const result = await transactionService.generateHandoverQr(
      id,
      user.user_id
    )

    return ok(result)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Transaction not found', 404)
    if (e.code === 'FORBIDDEN') return err('FORBIDDEN', e.message ?? 'Forbidden', 403)
    if (e.code === 'ESCROW_NOT_LOCKED') return err('ESCROW_NOT_LOCKED', e.message ?? 'Escrow not locked', 409)
    if (e.code === 'INVALID_STATE') return err('INVALID_STATE', e.message ?? 'Invalid transaction state', 409)
    console.error('[GET /api/transactions/:id/qr]', error)
    return serverError()
  }
}
