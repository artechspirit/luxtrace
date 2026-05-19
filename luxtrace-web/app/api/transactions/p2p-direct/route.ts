import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * POST /api/transactions/p2p-direct
 *
 * Seller initiates a Direct Handover session.
 *
 * Role: CONSUMER (caller must be product owner)
 *
 * Request:
 * {
 *   "product_id": "uuid",
 *   "buyer_id": "uuid"
 * }
 *
 * Response 201:
 * {
 *   "success": true,
 *   "data": {
 *     "transaction_id": "uuid",
 *     "type": "P2P_DIRECT_HANDOVER",
 *     "status": "PENDING",
 *     "qr_payload": "AES256_ENCRYPTED_BASE64",
 *     "session_expires_at": "ISO8601"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { product_id, buyer_id } = body

    if (!product_id) return err('INVALID_PAYLOAD', 'product_id is required', 422)
    if (!buyer_id) return err('INVALID_PAYLOAD', 'buyer_id is required', 422)

    const result = await transactionService.initiateDirectHandover(
      product_id,
      user.user_id, // caller is the seller
      buyer_id
    )

    return ok(
      {
        transaction_id: result.transaction.transaction_id,
        type: result.transaction.type,
        status: result.transaction.status,
        qr_payload: result.qr_payload,
        session_expires_at: result.expires_at,
      },
      201
    )
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'SELF_TRADE') return err('SELF_TRADE', 'Cannot trade with yourself', 422)
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Product not found', 404)
    if (e.code === 'NOT_OWNER') return err('NOT_OWNER', 'You are not the product owner', 403)
    if (e.code === 'PRODUCT_LOCKED') return err('PRODUCT_LOCKED', 'Product is locked in another transaction', 409)
    if (e.code === 'NFC_NOT_BOUND') return err('NFC_NOT_BOUND', 'NFC not bound to this product', 409)
    console.error('[POST /api/transactions/p2p-direct]', error)
    return serverError()
  }
}
