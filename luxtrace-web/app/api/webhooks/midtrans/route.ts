import { NextRequest } from 'next/server'
import { paymentService } from '@/services/payment.service'
import { ok, serverError } from '@/lib/response'

// POST /api/webhooks/midtrans
// Called by Midtrans server — NOT by mobile clients
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    await paymentService.processWebhook(payload)
    return ok({ received: true })
  } catch (error: unknown) {
    const e = error as { code?: string }
    // Always return 200 to Midtrans to prevent retries on validation errors
    if (e.code === 'INVALID_SIGNATURE') {
      console.error('[Webhook] Invalid Midtrans signature — potential spoofing attempt')
      return ok({ received: false })
    }
    console.error('[POST /api/webhooks/midtrans]', error)
    return serverError()
  }
}
