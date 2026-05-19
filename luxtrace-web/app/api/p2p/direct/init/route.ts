import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * POST /api/p2p/direct/init
 *
 * Seller creates a Direct Handover session.
 * No payment/escrow required — both parties are physically present.
 * Transfer completes purely via NFC proximity verification.
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
 *   "transaction_id": "uuid",
 *   "qr_payload": "AES256_ENCRYPTED",     ← display as QR code
 *   "session_id": "uuid",
 *   "expires_at": "2026-05-19T05:15:00Z"  ← 15-minute TTL
 * }
 *
 * After creation:
 * - Seller shows QR code to buyer
 * - Buyer scans QR + taps NFC chip on physical product
 * - Buyer calls POST /api/p2p/verify with { session_id, scanned_uid, mode: "direct" }
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
        product_id: result.transaction.product_id,
        seller_id: result.transaction.seller_id,
        buyer_id: result.transaction.buyer_id,
        qr_payload: result.qr_payload,
        session_id: result.session_id,
        expires_at: result.expires_at,
        instructions: 'Show this QR to the buyer. They must scan the QR AND tap the NFC chip on the physical product.',
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
    console.error('[POST /api/p2p/direct/init]', error)
    return serverError()
  }
}
