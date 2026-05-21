import Midtrans from 'midtrans-client'
import crypto from 'crypto'

const serverKey = process.env.MIDTRANS_SERVER_KEY || 'placeholder-server-key'
const clientKey = process.env.MIDTRANS_CLIENT_KEY || 'placeholder-client-key'
const isProduction = process.env.NODE_ENV === 'production'

if ((!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('[ENV] MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY are required')
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export const snap = new Midtrans.Snap({ isProduction, serverKey, clientKey })
export const coreApi = new Midtrans.CoreApi({ isProduction, serverKey, clientKey })

// ─── Types ────────────────────────────────────────────────────────────────────

export type MidtransPaymentMethod = 'snap' | 'bank_transfer' | 'qris' | 'echannel'

export interface SnapInvoiceResult {
  token: string
  redirect_url: string
}

export interface MidtransTransactionStatus {
  transaction_id: string
  order_id: string
  transaction_status: string
  payment_type: string
  gross_amount: string
  status_code: string
  fraud_status?: string
  bank?: string
  va_numbers?: Array<{ bank: string; va_number: string }>
  payment_amounts?: Array<{ paid_at: string; amount: string }>
  transaction_time: string
  settlement_time?: string
}

// ─── Signature Validation ─────────────────────────────────────────────────────

/**
 * Validate Midtrans webhook notification signature.
 * Formula: SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  receivedSignature: string
): boolean {
  // Guard: signature must be exactly 128 hex chars (SHA512)
  if (receivedSignature.length !== 128) return false

  const expected = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )
  } catch {
    // Buffer length mismatch → invalid
    return false
  }
}

// ─── Invoice Creation ─────────────────────────────────────────────────────────

export interface CreateSnapInvoiceParams {
  orderId: string
  amountIdr: number
  customerName: string
  customerEmail: string
  itemId: string
  itemName: string
  /**
   * Optional: restrict payment methods shown in Snap popup.
   * Default: all methods enabled (QRIS, VA, etc.)
   */
  enabledPayments?: string[]
}

/**
 * Create a Midtrans Snap payment page (QRIS + Bank Transfer + etc).
 * Returns a token (for Snap.js embed) and a redirect_url (for webview).
 */
export async function createSnapInvoice(
  params: CreateSnapInvoiceParams
): Promise<SnapInvoiceResult> {
  const {
    orderId,
    amountIdr,
    customerName,
    customerEmail,
    itemId,
    itemName,
    enabledPayments,
  } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (snap as any).createTransaction({
    transaction_details: {
      order_id: orderId,
      gross_amount: amountIdr,
    },
    customer_details: {
      first_name: customerName,
      email: customerEmail,
    },
    item_details: [
      {
        id: itemId,
        price: amountIdr,
        quantity: 1,
        name: itemName.substring(0, 50), // Midtrans max 50 chars
      },
    ],
    ...(enabledPayments ? { enabled_payments: enabledPayments } : {}),
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_APP_URL}/payment/finish`,
      unfinish: `${process.env.NEXT_PUBLIC_APP_URL}/payment/unfinish`,
      error: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error`,
    },
  })

  return result as SnapInvoiceResult
}

// ─── Transaction Status ───────────────────────────────────────────────────────

/**
 * Query live Midtrans transaction status by order_id.
 * Used for polling fallback when webhook is not received.
 */
export async function getMidtransTransactionStatus(
  orderId: string
): Promise<MidtransTransactionStatus> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (coreApi as any).transaction.status(orderId)
  return result as MidtransTransactionStatus
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export interface RefundParams {
  orderId: string
  amountIdr: number
  reason: string
}

/**
 * Issue a full or partial refund via Midtrans Core API.
 * Used when escrow release fails after payment settlement.
 */
export async function refundTransaction(params: RefundParams): Promise<void> {
  const { orderId, amountIdr, reason } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (coreApi as any).transaction.refund(orderId, {
    refund_amount: amountIdr,
    reason,
  })
}

// ─── Cancellation ─────────────────────────────────────────────────────────────

/**
 * Cancel a PENDING Midtrans transaction.
 * Only valid before payment is made.
 */
export async function cancelTransaction(orderId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (coreApi as any).transaction.cancel(orderId)
}
