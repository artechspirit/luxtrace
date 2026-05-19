import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * GET /api/p2p/remote/:transaction_id/qr
 *
 * Seller requests handover QR after escrow is locked.
 * Returns encrypted QR payload + session_id.
 *
 * Guards:
 * - Caller must be the seller
 * - Transaction must be PAID or IN_TRANSIT (escrow locked)
 * - NFC must be bound to product
 *
 * Response 200:
 * {
 *   "qr_payload": "AES256_ENCRYPTED_BASE64",   ← display as QR code
 *   "session_id": "uuid",                       ← send to buyer separately (optional)
 *   "expires_at": "2026-05-19T05:15:00Z",      ← 15-minute TTL
 *   "instructions": "..."
 * }
 *
 * The buyer will:
 * 1. Scan this QR
 * 2. Tap NFC chip on physical product
 * 3. POST /api/p2p/verify with { session_id, scanned_uid }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transaction_id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const { transaction_id } = await context.params
    const result = await transactionService.generateHandoverQr(
      transaction_id,
      user.user_id
    )

    return ok(result)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Transaction not found', 404)
    if (e.code === 'FORBIDDEN') return err('FORBIDDEN', e.message ?? 'Forbidden', 403)
    if (e.code === 'ESCROW_NOT_LOCKED') return err('ESCROW_NOT_LOCKED', e.message ?? 'Escrow not locked', 409)
    if (e.code === 'INVALID_TRANSACTION_TYPE') return err('INVALID_TRANSACTION_TYPE', e.message ?? 'Wrong transaction type', 422)
    if (e.code === 'NFC_NOT_BOUND') return err('NFC_NOT_BOUND', 'NFC not bound to product', 409)
    console.error('[GET /api/p2p/remote/:id/qr]', error)
    return serverError()
  }
}
