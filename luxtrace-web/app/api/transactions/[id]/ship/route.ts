import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * POST /api/transactions/:id/ship
 *
 * Seller marks a paid P2P remote shipping transaction as IN_TRANSIT.
 * This route is intentionally separate from payment settlement so the
 * product only enters transit once the seller has shipped the item.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const { id } = await context.params
    const result = await transactionService.markP2PRemoteAsInTransit(
      id,
      user.user_id,
    )

    return ok(result)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Transaction not found', 404)
    if (e.code === 'FORBIDDEN') return err('FORBIDDEN', e.message ?? 'Forbidden', 403)
    if (e.code === 'INVALID_STATE') return err('INVALID_STATE', e.message ?? 'Transaction must be PAID before shipping', 409)
    if (e.code === 'INVALID_TRANSACTION_TYPE') return err('INVALID_TRANSACTION_TYPE', e.message ?? 'Only remote shipping transactions can be shipped', 422)
    if (e.code === 'INVALID_PRODUCT_STATE') return err('INVALID_PRODUCT_STATE', e.message ?? 'Product is not ready for shipment', 409)
    if (e.code === 'PRODUCT_STATE_CONFLICT') return err('PRODUCT_STATE_CONFLICT', e.message ?? 'Product state changed during shipping update', 409)

    console.error('[POST /api/transactions/:id/ship]', error)
    return serverError()
  }
}
