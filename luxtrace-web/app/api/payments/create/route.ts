import { NextRequest } from 'next/server'
import { paymentService } from '@/services/payment.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'
import type { TransactionType } from '@/types'

/**
 * POST /api/payments/create
 *
 * Create a payment invoice for purchasing a product.
 * Returns a Midtrans Snap token and redirect_url.
 *
 * Supports:
 * - PRIMARY_BOUTIQUE: buy from brand/boutique
 * - P2P_REMOTE_SHIPPING: buy from another user (with escrow)
 *
 * Request:
 * {
 *   "type": "PRIMARY_BOUTIQUE" | "P2P_REMOTE_SHIPPING",
 *   "product_id": "uuid",
 *   "seller_id": "uuid",        // required for P2P_REMOTE_SHIPPING
 *   "agreed_price_idr": 300000000  // optional, defaults to product.price_idr
 * }
 *
 * Response 201:
 * {
 *   "transaction_id": "uuid",
 *   "order_id": "LUX-uuid",
 *   "amount_idr": 350000000,
 *   "snap_token": "abc123...",
 *   "payment_url": "https://app.sandbox.midtrans.com/snap/v4/...",
 *   "expires_at": "2026-05-20T05:00:00Z"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { type, product_id, seller_id, agreed_price_idr } = body

    // ── Validate type ────────────────────────────────────────────────────────
    const VALID_TYPES: TransactionType[] = ['PRIMARY_BOUTIQUE', 'P2P_REMOTE_SHIPPING']
    if (!type || !VALID_TYPES.includes(type)) {
      return err(
        'INVALID_PAYLOAD',
        `type must be one of: ${VALID_TYPES.join(', ')}`,
        422
      )
    }

    if (!product_id) {
      return err('INVALID_PAYLOAD', 'product_id is required', 422)
    }

    if (type === 'P2P_REMOTE_SHIPPING' && !seller_id) {
      return err('INVALID_PAYLOAD', 'seller_id is required for P2P_REMOTE_SHIPPING', 422)
    }

    // Self-trade guard
    if (seller_id && seller_id === user.user_id) {
      return err('SELF_TRADE', 'Cannot buy your own product', 422)
    }

    // ── Create payment ───────────────────────────────────────────────────────
    const result = await paymentService.createPayment({
      type,
      productId: product_id,
      buyerId: user.user_id,
      sellerId: seller_id,
      agreedPriceIdr: agreed_price_idr,
    })

    return ok(result, 201)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }

    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', e.message ?? 'Resource not found', 404)
    if (e.code === 'PRODUCT_NOT_AVAILABLE') {
      return err('PRODUCT_NOT_AVAILABLE', e.message ?? 'Product not available', 409)
    }
    if (e.code === 'NOT_OWNER') return err('NOT_OWNER', 'You are not the product owner', 403)
    if (e.code === 'PRODUCT_LOCKED') return err('PRODUCT_LOCKED', 'Product is locked in another transaction', 409)
    if (e.code === 'PAYMENT_INIT_FAILED') return err('PAYMENT_INIT_FAILED', 'Payment gateway error', 502)

    console.error('[POST /api/payments/create]', error)
    return serverError()
  }
}
