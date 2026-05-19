import { NextRequest } from 'next/server'
import { productService } from '@/services/product.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/response'

/**
 * GET /api/products/batch/:batch_id
 *
 * Poll manufacturing batch status.
 * Accessible by ADMIN and OPERATOR only.
 *
 * Response while processing:
 * {
 *   "batch_id": "uuid",
 *   "status": "PROCESSING",
 *   "total_submitted": 50,
 *   "processed": 12,
 *   "results": [...],
 *   "failed": [...]
 * }
 *
 * Terminal statuses: COMPLETED | PARTIALLY_FAILED | FAILED
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ batch_id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return err('FORBIDDEN', 'Only ADMIN or OPERATOR can view batch status', 403)
    }

    const { batch_id } = await context.params
    const batch = await productService.getBatchStatus(batch_id)

    return ok(batch)
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Batch not found', 404)
    console.error('[GET /api/products/batch/:batch_id]', error)
    return serverError()
  }
}
