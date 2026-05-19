import { NextRequest } from 'next/server'
import { transactionService } from '@/services/transaction.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

/**
 * GET /api/transactions
 *
 * Retrieve transaction history.
 * Admins/Operators can view all records.
 * Consumers can only view transactions they are involved in.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const transactions = await transactionService.getAllTransactions()

    if (user.role === 'ADMIN' || user.role === 'OPERATOR') {
      return ok(transactions)
    } else {
      // Consumers only see transactions they are involved in
      const filtered = transactions.filter(
        (tx) => tx.buyer_id === user.user_id || tx.seller_id === user.user_id
      )
      return ok(filtered)
    }
  } catch (error) {
    console.error('[GET /api/transactions]', error)
    return serverError()
  }
}
