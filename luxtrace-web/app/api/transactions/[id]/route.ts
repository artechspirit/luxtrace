import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, serverError } from '@/lib/response'

// GET /api/transactions/:id
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const { id } = await context.params
    const tx = await transactionService.getById(id)

    // Guard: only involved parties or admin
    const isInvolved = tx.buyer_id === user.user_id || tx.seller_id === user.user_id
    if (!isInvolved && user.role !== 'ADMIN') return forbidden()

    return ok(tx)
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Transaction not found', 404)
    console.error('[GET /api/transactions/:id]', error)
    return serverError()
  }
}
