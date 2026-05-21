import crypto from 'crypto'

const NFC_SECRET_SALT = process.env.NFC_SECRET_SALT || 'placeholder-salt'
const QR_ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

if ((!process.env.NFC_SECRET_SALT || !process.env.QR_ENCRYPTION_KEY || Buffer.from(process.env.QR_ENCRYPTION_KEY, 'hex').length !== 32) && process.env.NEXT_PHASE !== 'phase-production-build') {
  if (!process.env.NFC_SECRET_SALT) {
    throw new Error('[ENV] NFC_SECRET_SALT is required')
  }
  if (!process.env.QR_ENCRYPTION_KEY || Buffer.from(process.env.QR_ENCRYPTION_KEY, 'hex').length !== 32) {
    throw new Error('[ENV] QR_ENCRYPTION_KEY must be a 32-byte hex string')
  }
}

/**
 * Hash NFC UID with secret salt using SHA-256.
 * Raw UID is never stored or returned to the client.
 */
export function hashNfcUid(rawUid: string): string {
  return crypto
    .createHash('sha256')
    .update(`${rawUid}${NFC_SECRET_SALT}`)
    .digest('hex')
}

/**
 * Timing-safe comparison for NFC hash verification.
 */
export function verifyNfcHash(rawUid: string, storedHash: string): boolean {
  const computed = hashNfcUid(rawUid)
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(storedHash, 'hex')
  )
}

const ALGORITHM = 'aes-256-cbc'

/**
 * Encrypt QR payload using AES-256-CBC.
 * Returns base64 string of iv:ciphertext.
 */
export function encryptQrPayload(payload: Record<string, unknown>): string {
  const key = Buffer.from(QR_ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const plaintext = JSON.stringify(payload)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return `${iv.toString('hex')}:${encrypted.toString('base64')}`
}

/**
 * Decrypt QR payload. Returns parsed object or throws on tamper.
 */
export function decryptQrPayload(encrypted: string): Record<string, unknown> {
  const [ivHex, cipherB64] = encrypted.split(':')
  const key = Buffer.from(QR_ENCRYPTION_KEY!, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, 'base64')),
    decipher.final(),
  ])

  return JSON.parse(decrypted.toString('utf8'))
}
