import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'
import { qrSessionRepository } from '@/repositories/qr-session.repository'
import { transactionRepository } from '@/repositories/transaction.repository'
import { nfcService } from '@/services/nfc.service'

/**
 * POST /api/transactions/:id/direct-verify
 *
 * Buyer submits NFC proximity scan to verify product authenticity and complete handover.
 *
 * Role: CONSUMER (caller must be buyer of this transaction)
 *
 * Request:
 * {
 *   "scanned_uid": "raw_uid_dari_nfc_chip",
 *   "session_id": "optional-uuid" // If not provided, will look up active session in DB
 * }
 *
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "transaction_id": "uuid-v4",
 *     "status": "COMPLETED",
 *     "nfc_verified": true,
 *     "nft_transfer": {
 *       "tx_hash": "0xabc...def",
 *       "from_wallet": "0xSELLER...WALLET",
 *       "to_wallet": "0xBUYER...WALLET",
 *       "token_id": "42"
 *     },
 *     "product_status": "OWNED",
 *     "via": "DIRECT_HANDOVER"
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { scanned_uid } = body
    let { session_id } = body

    if (!scanned_uid) return err('INVALID_PAYLOAD', 'scanned_uid is required', 422)

    const { id: transactionId } = await context.params

    // If session_id is not passed in body, lookup active session by transactionId
    if (!session_id) {
      let activeSession = await qrSessionRepository.findByTransactionId(transactionId)
      
      // If session is expired, treat it as null so we can recreate it
      if (activeSession && new Date(activeSession.expires_at) < new Date()) {
        activeSession = null
      }

      if (!activeSession) {
        // Find transaction to retrieve its product_id
        const tx = await transactionRepository.findById(transactionId)
        if (!tx) return err('NOT_FOUND', 'Transaction not found', 404)

        try {
          // Dynamically generate a new QR session for simulation robustness
          const qr = await nfcService.generateQrPayload(transactionId, tx.product_id)
          session_id = qr.session_id
        } catch (sessionErr: any) {
          return err('SESSION_CREATION_FAILED', sessionErr.message || 'Failed to create active session', 500)
        }
      } else {
        session_id = activeSession.session_id
      }
    }

    const result = await transactionService.verifyDirectHandover(
      session_id,
      user.user_id,
      scanned_uid
    )

    return ok({
      transaction_id: result.transaction_id,
      status: 'COMPLETED',
      nfc_verified: result.verified,
      nft_transfer: {
        tx_hash: result.nft_transfer.tx_hash,
        from_wallet: result.nft_transfer.from_wallet,
        to_wallet: result.nft_transfer.to_wallet,
        token_id: result.nft_transfer.token_id,
      },
      product_status: result.product_status,
      via: result.via,
    })
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

    console.error('[POST /api/transactions/:id/direct-verify]', error)
    return serverError()
  }
}
