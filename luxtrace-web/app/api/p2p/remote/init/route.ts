import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * POST /api/p2p/remote/init
 *
 * Seller initiates P2P Remote Shipping.
 * Creates escrow invoice via Midtrans — buyer must pay to lock escrow.
 *
 * Role: CONSUMER (seller must be the current product owner)
 *
 * Request:
 * {
 *   "product_id": "uuid",
 *   "buyer_id": "uuid",
 *   "agreed_price_idr": 300000000
 * }
 *
 * Response 201:
 * {
 *   "transaction_id": "uuid",
 *   "order_id": "LUX-uuid",
 *   "amount_idr": 300000000,
 *   "snap_token": "66e4fa55...",
 *   "payment_url": "https://app.sandbox.midtrans.com/snap/v4/...",
 *   "expires_at": "2026-05-20T05:00:00Z"
 * }
 *
 * After buyer pays → webhook hits /api/webhooks/payment
 * → product moves to IN_TRANSIT
 * → seller can then call GET /api/p2p/remote/:id/qr
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { product_id, buyer_id, agreed_price_idr } = body

    if (!product_id) return err('INVALID_PAYLOAD', 'product_id is required', 422)
    if (!buyer_id) return err('INVALID_PAYLOAD', 'buyer_id is required', 422)
    if (!agreed_price_idr || typeof agreed_price_idr !== 'number' || agreed_price_idr <= 0) {
      return err('INVALID_PAYLOAD', 'agreed_price_idr must be a positive number', 422)
    }

    const result = await transactionService.initiateP2PRemote(
      product_id,
      user.user_id, // caller is the seller
      buyer_id,
      agreed_price_idr
    )

    return ok(result, 201)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'SELF_TRADE') return err('SELF_TRADE', 'Cannot trade with yourself', 422)
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', e.message ?? 'Product not found', 404)
    if (e.code === 'NOT_OWNER') return err('NOT_OWNER', 'You are not the product owner', 403)
    if (e.code === 'PRODUCT_NOT_AVAILABLE') return err('PRODUCT_NOT_AVAILABLE', e.message ?? 'Product not available', 409)
    if (e.code === 'PAYMENT_INIT_FAILED') return err('PAYMENT_INIT_FAILED', 'Payment gateway error', 502)
    console.error('[POST /api/p2p/remote/init]', error)
    return serverError()
  }
}
