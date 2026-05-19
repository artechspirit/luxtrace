import { NextRequest } from 'next/server'
import { paymentService } from '@/services/payment.service'
import type { MidtransWebhookPayload } from '@/services/payment.service'
import { ok, serverError } from '@/lib/response'

/**
 * POST /api/webhooks/payment
 *
 * Midtrans HTTP Notification endpoint.
 * Must be registered in Midtrans Dashboard → Settings → Payment → Notification URL.
 *
 * Security:
 * - IP whitelist recommended: 103.208.23.0/24 (Midtrans IP ranges)
 * - Signature validation: SHA512(order_id + status_code + gross_amount + server_key)
 *
 * This endpoint ALWAYS returns 200 to Midtrans.
 * Errors are logged internally — Midtrans retries on non-200.
 *
 * Midtrans Notification Payload Example:
 * {
 *   "transaction_id": "9aed5972-5b6a-401e-894b-a32c91ed1a3f",
 *   "order_id": "LUX-c2b8e4f0-...",
 *   "transaction_status": "settlement",
 *   "status_code": "200",
 *   "gross_amount": "350000000.00",
 *   "payment_type": "qris",
 *   "signature_key": "d0b5...sha512...hash",
 *   "fraud_status": "accept",
 *   "transaction_time": "2026-05-19 05:00:00",
 *   "settlement_time": "2026-05-19 05:01:30"
 * }
 *
 * Possible transaction_status values:
 * - settlement: payment confirmed → trigger NFT transfer
 * - capture: credit card captured → same as settlement
 * - pending: waiting for payment → no-op
 * - cancel: user cancelled → mark CANCELLED
 * - expire: payment window expired → mark CANCELLED
 * - deny: bank denied → mark CANCELLED
 * - challenge: fraud check required → mark FRAUD_FLAGGED
 */
export async function POST(request: NextRequest) {
  let orderIdForLog = 'unknown'

  try {
    const payload = await request.json() as MidtransWebhookPayload
    orderIdForLog = payload.order_id ?? 'unknown'

    await paymentService.processWebhook(payload)

    return ok({ received: true })
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }

    if (e.code === 'INVALID_SIGNATURE') {
      // Log potential spoofing attempt — still return 200 to avoid Midtrans retries
      console.error(
        `[Webhook] SECURITY: Invalid signature for order ${orderIdForLog}. Possible spoofing.`
      )
      return ok({ received: false })
    }

    // Other errors: log and return 500 to trigger Midtrans retry
    console.error(`[Webhook] Error processing order ${orderIdForLog}:`, error)
    return serverError()
  }
}
