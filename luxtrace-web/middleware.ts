import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── 1. RATE LIMITING CONFIGURATION ──────────────────────────────────────────
const rateLimitCache = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60 // Max 60 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  
  // Clean up old timestamps for this IP
  const timestamps = rateLimitCache.get(ip) || []
  const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitCache.set(ip, validTimestamps)
    return true
  }
  
  validTimestamps.push(now)
  rateLimitCache.set(ip, validTimestamps)
  return false
}

// ─── 2. ANTI-REPLAY PROTECTION CONFIGURATION ──────────────────────────────────
const nonceCache = new Map<string, number>() // nonce -> expiration timestamp
const NONCE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes validity window

function validateAndCacheNonce(nonce: string, timestampStr: string): { valid: boolean; reason?: string } {
  const timestampMs = parseInt(timestampStr, 10)
  if (isNaN(timestampMs)) {
    return { valid: false, reason: 'Invalid x-timestamp header format' }
  }

  const now = Date.now()

  // Clean up expired nonces from cache
  for (const [cachedNonce, expirationTime] of nonceCache.entries()) {
    if (now > expirationTime) {
      nonceCache.delete(cachedNonce)
    }
  }

  // Validate clock skew: request cannot be more than 5 mins old or 5 mins in the future
  if (Math.abs(now - timestampMs) > NONCE_WINDOW_MS) {
    return { valid: false, reason: 'Request timestamp expired (outside 5-minute window)' }
  }

  // Verify nonce uniqueness
  if (nonceCache.has(nonce)) {
    return { valid: false, reason: 'Replay attack detected (nonce already processed)' }
  }

  // Cache nonce with expiration TTL
  nonceCache.set(nonce, timestampMs + NONCE_WINDOW_MS)
  return { valid: true }
}

// ─── 3. WEB HASH HELPER FOR WEBHOOKS (EDGE COMPATIBLE SHA-512) ───────────────
async function sha512(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ─── 4. REGEX INPUT SCHEMA VALIDATORS ─────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NFC_UID_REGEX = /^([0-9a-fA-F]{2}:){6}[0-9a-fA-F]{2}$|^[0-9a-fA-F]{14}$/

function isValidUuid(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val)
}

function isValidNfcUid(val: any): boolean {
  return typeof val === 'string' && (NFC_UID_REGEX.test(val) || UUID_REGEX.test(val))
}

// ─── MAIN MIDDLEWARE HANDLER ─────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Only apply to /api/ routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 1. IP Rate Limiting
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Max 60 requests per minute.' },
      { status: 429 }
    )
  }

  // 2. Webhook Signature Validation
  if (pathname === '/api/webhooks/payment' || pathname === '/api/webhooks/midtrans') {
    try {
      const clonedReq = request.clone()
      const payload = await clonedReq.json()
      
      const { order_id, status_code, gross_amount, signature_key } = payload
      
      if (!order_id || !status_code || !gross_amount || !signature_key) {
        return NextResponse.json(
          { error: 'INVALID_PAYLOAD', message: 'Missing parameters for signature verification' },
          { status: 400 }
        )
      }

      const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
      const calculatedSignature = await sha512(`${order_id}${status_code}${gross_amount}${serverKey}`)

      if (!timingSafeCompare(calculatedSignature, signature_key)) {
        console.warn(`[Security Middleware] Webhook validation failed for order_id: ${order_id}`)
        return NextResponse.json(
          { error: 'UNAUTHORIZED_WEBHOOK', message: 'Invalid webhook signature key' },
          { status: 401 }
        )
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid JSON payload structure' },
        { status: 400 }
      )
    }
  }

  // 3. Anti-Replay Protection (Enforced on mutating actions or secure read routes)
  const isMutatingAction = ['POST', 'PUT', 'PATCH'].includes(request.method)
  const isSecureEndpoint = pathname.includes('/transactions/') || pathname.includes('/p2p/') || pathname.includes('/provenance/')

  if (isMutatingAction && isSecureEndpoint) {
    const nonce = request.headers.get('x-nonce')
    const timestampStr = request.headers.get('x-timestamp')

    if (!nonce || !timestampStr) {
      return NextResponse.json(
        { error: 'REPLAY_CHECK_FAILED', message: 'Missing x-nonce or x-timestamp security headers' },
        { status: 400 }
      )
    }

    const nonceCheckResult = validateAndCacheNonce(nonce, timestampStr)
    if (!nonceCheckResult.valid) {
      return NextResponse.json(
        { error: 'REPLAY_CHECK_FAILED', message: nonceCheckResult.reason },
        { status: 400 }
      )
    }
  }

  // 4. Input Payload Validation & DOS Protection
  if (isMutatingAction) {
    const isUploadRoute = pathname === '/api/products/upload'

    // Apply appropriate payload size limits
    if (isUploadRoute) {
      const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
      if (contentLength > 1024 * 1024) { // 1MB limit for CSV uploads
        return NextResponse.json(
          { error: 'PAYLOAD_TOO_LARGE', message: 'CSV payload exceeds limit of 1MB' },
          { status: 413 }
        )
      }
    } else {
      const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
      if (contentLength > 15 * 1024) { // 15KB limit for standard JSON API endpoints
        return NextResponse.json(
          { error: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds maximum limit of 15KB' },
          { status: 413 }
        )
      }
    }

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        const clonedReq = request.clone()
        const text = await clonedReq.text()
        if (text && text.trim().length > 0) {
          const body = JSON.parse(text)

          // Common parameter validations
          if (body.session_id !== undefined && !isValidUuid(body.session_id)) {
            return NextResponse.json({ error: 'VALIDATION_FAILED', message: 'session_id must be a valid UUIDv4' }, { status: 400 })
          }
          if (body.transaction_id !== undefined && !isValidUuid(body.transaction_id)) {
            return NextResponse.json({ error: 'VALIDATION_FAILED', message: 'transaction_id must be a valid UUIDv4' }, { status: 400 })
          }
          if (body.product_id !== undefined && !isValidUuid(body.product_id)) {
            return NextResponse.json({ error: 'VALIDATION_FAILED', message: 'product_id must be a valid UUIDv4' }, { status: 400 })
          }
          if (body.scanned_uid !== undefined && !isValidNfcUid(body.scanned_uid)) {
            return NextResponse.json({ error: 'VALIDATION_FAILED', message: 'scanned_uid must be a valid NFC hardware UID hex pattern' }, { status: 400 })
          }
        }
      } catch (e) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'Invalid JSON body syntax' },
          { status: 400 }
        )
      }
    }
  }

  return NextResponse.next()
}

// Apply middleware to all API routes
export const config = {
  matcher: '/api/:path*',
}
