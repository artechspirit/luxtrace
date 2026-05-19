import { NextRequest } from 'next/server'
import { paymentService } from '@/services/payment.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

/**
 * POST /api/transactions/:id/simulate-payment
 *
 * Secure helper route for operators to simulate a successful payment trigger.
 * Invokes the actual settlement logic (minting/transferring Web3 NFTs and updating status).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const { id } = await context.params
    const orderId = `LUX-${id}`

    await paymentService._handleSettlement(id, orderId)

    return ok({ settled: true })
  } catch (error) {
    console.error('[POST /api/transactions/:id/simulate-payment]', error)
    return serverError()
  }
}
