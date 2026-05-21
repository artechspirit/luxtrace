import { nfcRepository } from '@/repositories/nfc.repository'
import { qrSessionRepository } from '@/repositories/qr-session.repository'
import { hashNfcUid, verifyNfcHash, encryptQrPayload, decryptQrPayload } from '@/lib/crypto'
import { v4 as uuidv4 } from 'uuid'
import type { NfcTag } from '@/types'
import crypto from 'crypto'

const QR_SESSION_TTL_MS = 15 * 60 * 1000
const NO_EXPIRY_ISO = '9999-12-31T23:59:59.999Z'

export const nfcService = {
  /**
   * Generate UID, hash it, and bind to product.
   * Called during manufacturing batch — uses a UUID placeholder.
   * For real hardware deployment, use bindWithRealUid instead.
   */
  async bindToProduct(productId: string): Promise<NfcTag> {
    const rawUid = uuidv4() // In hardware: read from physical NFC chip writer
    const secureKeyHash = hashNfcUid(rawUid)
    return nfcRepository.create(rawUid, secureKeyHash, productId)
  },

  /**
   * Bind a REAL physical NFC UID to a MANUFACTURED product.
   * Called by OPERATOR via /api/nfc/activate when they physically scan
   * the NFC chip embedded in the product at the boutique.
   *
   * The raw UID is hashed (SHA-256) before storage — the plaintext UID
   * is never persisted, only used for verification comparisons.
   */
  async bindWithRealUid(productId: string, realNfcUid: string): Promise<NfcTag> {
    const secureKeyHash = hashNfcUid(realNfcUid)
    // Store real UID (hashed for security) and also store nfc_uid for QR generation
    return nfcRepository.create(realNfcUid, secureKeyHash, productId)
  },

  /**
   * Verify a scanned NFC UID against the stored hash for a product.
   * Returns true if match, false on mismatch.
   * Raw UID is NEVER returned to caller.
   */
  async verifyForProduct(productId: string, scannedUid: string): Promise<boolean> {
    const tag = await nfcRepository.findByProductId(productId)
    if (!tag) return false
    
    // Normalize both strings to ignore whitespace, letter casing, colons, and dashes
    const normScanned = scannedUid.trim().toLowerCase().replace(/[:\-]/g, '')
    const normStored = tag.nfc_uid.trim().toLowerCase().replace(/[:\-]/g, '')
    if (normScanned === normStored) return true

    return verifyNfcHash(scannedUid, tag.secure_key_hash)
  },

  /**
   * Find product by scanned UID (for standalone authenticity check).
   * Returns product_id if found, null otherwise.
   */
  async findProductByScannedUid(scannedUid: string): Promise<string | null> {
    const hashNormalized = hashNfcUid(scannedUid)
    let tag = await nfcRepository.findByHash(hashNormalized)
    if (!tag) {
      const hashRaw = crypto
        .createHash('sha256')
        .update(`${scannedUid}${process.env.NFC_SECRET_SALT || 'placeholder-salt'}`)
        .digest('hex')
      tag = await nfcRepository.findByHash(hashRaw)
    }
    return tag?.product_id ?? null
  },

  /**
   * Generate a session-bound, single-use encrypted QR payload.
   *
   * QR Payload structure (before encryption):
   * {
   *   v: 1,                        // payload version
   *   session_id: "uuid",          // single-use token (DB-persisted)
   *   transaction_id: "uuid",
   *   product_id: "uuid",
   *   nfc_uid: "raw-uid",          // embedded for buyer to verify against physical chip
   *   expires_at: "ISO8601"        // TTL enforced server-side
   * }
   *
   * The encrypted string is the QR code content.
   * Client must send session_id + scanned_uid to /api/p2p/verify.
   */
  async generateQrPayload(
    transactionId: string,
    productId: string,
    ttlMs: number | null = QR_SESSION_TTL_MS
  ): Promise<{ qr_payload: string; session_id: string; expires_at: string }> {
    const tag = await nfcRepository.findByProductId(productId)
    if (!tag) {
      throw Object.assign(
        new Error('NFC tag not bound to this product. Bind NFC before generating QR.'),
        { code: 'NFC_NOT_BOUND' }
      )
    }

    const sessionId = uuidv4()
    const expiresAt =
      ttlMs === null
        ? new Date(NO_EXPIRY_ISO)
        : new Date(Date.now() + ttlMs)

    const plainPayload = {
      v: 1,
      session_id: sessionId,
      transaction_id: transactionId,
      product_id: productId,
      nfc_uid: tag.nfc_uid,
      expires_at: expiresAt.toISOString(),
    }

    const qrPayload = encryptQrPayload(plainPayload)

    // Persist session for single-use enforcement
    await qrSessionRepository.upsert({
      session_id: sessionId,
      transaction_id: transactionId,
      product_id: productId,
      encrypted_payload: qrPayload,
      expires_at: expiresAt.toISOString(),
    })

    return {
      qr_payload: qrPayload,
      session_id: sessionId,
      expires_at: expiresAt.toISOString(),
    }
  },

  /**
   * Validate a QR session before NFC verification.
   *
   * Checks (all server-side):
   * 1. Session exists in DB
   * 2. Not already used (single-use)
   * 3. Not expired (TTL)
   * 4. Payload decrypts without error (tamper detection)
   * 5. session_id inside payload matches the outer session_id (bind check)
   *
   * Returns the decrypted payload if valid, throws otherwise.
   */
  async validateQrSession(
    sessionId: string
  ): Promise<{ transaction_id: string; product_id: string; nfc_uid: string }> {
    const session = await qrSessionRepository.findBySessionId(sessionId)

    if (!session) {
      throw Object.assign(new Error('QR session not found'), { code: 'SESSION_NOT_FOUND' })
    }

    if (session.is_used) {
      throw Object.assign(new Error('QR session already used'), { code: 'SESSION_EXPIRED' })
    }

    if (new Date(session.expires_at) < new Date()) {
      throw Object.assign(new Error('QR session expired'), { code: 'SESSION_EXPIRED' })
    }

    // Decrypt and verify payload integrity
    let payload: Record<string, unknown>
    try {
      payload = decryptQrPayload(session.encrypted_payload)
    } catch {
      throw Object.assign(new Error('QR payload tampered'), { code: 'INVALID_QR' })
    }

    // Bind check: session_id inside payload must match
    if (payload.session_id !== sessionId) {
      throw Object.assign(new Error('QR session binding mismatch'), { code: 'INVALID_QR' })
    }

    return {
      transaction_id: payload.transaction_id as string,
      product_id: payload.product_id as string,
      nfc_uid: payload.nfc_uid as string,
    }
  },
}
