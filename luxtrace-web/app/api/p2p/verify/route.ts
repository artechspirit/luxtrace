import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * POST /api/p2p/verify
 *
 * Buyer submits NFC scan result to verify product authenticity and release escrow.
 * This is the critical gate for both P2P_REMOTE_SHIPPING and P2P_DIRECT_HANDOVER.
 *
 * Flow (P2P Remote Shipping):
 * 1. Buyer scans QR code → gets qr_payload + session_id
 * 2. Buyer taps NFC chip on physical product → gets raw scanned_uid
 * 3. POST this endpoint with { session_id, scanned_uid }
 * 4. Backend validates session + verifies NFC
 * 5. If valid: NFT transferred, escrow released
 * 6. If invalid: fraud logged, escrow held for manual review
 *
 * Request:
 * {
 *   "session_id": "uuid-from-qr",
 *   "scanned_uid": "raw-uid-from-nfc-chip",
 *   "mode": "remote" | "direct"    // defaults to "remote"
 * }
 *
 * Response 200 (success):
 * {
 *   "verified": true,
 *   "transaction_id": "uuid",
 *   "nft_transfer": {
 *     "tx_hash": "0xabc...def",
 *     "from_wallet": "0xSELLER...",
 *     "to_wallet": "0xBUYER..."
 *   },
 *   "escrow_released": true,
 *   "product_status": "OWNED"
 * }
 *
 * Response 400 (NFC mismatch):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "NFC_MISMATCH",
 *     "message": "NFC chip does not match product. Fraud attempt logged. Escrow held for review."
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { session_id, scanned_uid, mode = 'remote' } = body

    if (!session_id) return err('INVALID_PAYLOAD', 'session_id is required', 422)
    if (!scanned_uid) return err('INVALID_PAYLOAD', 'scanned_uid is required', 422)
    if (mode !== 'remote' && mode !== 'direct') {
      return err('INVALID_PAYLOAD', 'mode must be "remote" or "direct"', 422)
    }

    if (mode === 'direct') {
      const result = await transactionService.verifyDirectHandover(
        session_id,
        user.user_id,
        scanned_uid
      )
      return ok(result)
    }

    // mode === 'remote'
    const result = await transactionService.verifyNfcAndReleaseEscrow(
      session_id,
      user.user_id,
      scanned_uid
    )

    return ok(result)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }

    if (e.code === 'NFC_MISMATCH') {
      return err(
        'NFC_MISMATCH',
        e.message ?? 'NFC mismatch — fraud attempt logged',
        400
      )
    }
    if (e.code === 'SESSION_NOT_FOUND') return err('SESSION_NOT_FOUND', 'QR session not found', 404)
    if (e.code === 'SESSION_EXPIRED') return err('SESSION_EXPIRED', 'QR session expired or already used', 410)
    if (e.code === 'INVALID_QR') return err('INVALID_QR', 'QR payload is invalid or tampered', 400)
    if (e.code === 'FORBIDDEN') return err('FORBIDDEN', e.message ?? 'Forbidden', 403)
    if (e.code === 'INVALID_STATE') return err('INVALID_STATE', e.message ?? 'Transaction in wrong state', 409)
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Transaction not found', 404)
    if (e.code === 'NFT_TRANSFER_FAILED') return err('NFT_TRANSFER_FAILED', e.message ?? 'NFT transfer failed', 502)

    console.error('[POST /api/p2p/verify]', error)
    return serverError()
  }
}
