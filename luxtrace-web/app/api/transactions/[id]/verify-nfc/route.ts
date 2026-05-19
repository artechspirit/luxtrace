import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

// POST /api/transactions/:id/verify-nfc
// Deprecated: use POST /api/p2p/verify instead.
// Kept for backward compatibility — proxies to the new session-based flow.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { scanned_uid, session_id } = body

    if (!session_id) return err('INVALID_PAYLOAD', 'session_id is required (use /api/p2p/verify)', 422)
    if (!scanned_uid) return err('INVALID_PAYLOAD', 'scanned_uid is required', 422)

    const { id } = await context.params
    const result = await transactionService.verifyNfcAndReleaseEscrow(
      session_id,
      user.user_id,
      scanned_uid
    )

    return ok({
      transaction_id: id,
      status: 'COMPLETED',
      nfc_verified: result.verified,
      nft_transfer: result.nft_transfer,
      escrow_released: result.escrow_released,
      product_status: result.product_status,
    })
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'NFC_MISMATCH') return err('NFC_MISMATCH', e.message ?? 'NFC mismatch', 400)
    if (e.code === 'FORBIDDEN') return err('FORBIDDEN', 'Forbidden', 403)
    if (e.code === 'INVALID_STATE') return err('INVALID_STATE', 'Transaction is not in IN_TRANSIT state', 409)
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Transaction not found', 404)
    console.error('[POST /api/transactions/:id/verify-nfc]', error)
    return serverError()
  }
}
