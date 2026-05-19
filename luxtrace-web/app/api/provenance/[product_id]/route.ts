import { NextRequest } from 'next/server'
import { productService } from '@/services/product.service'
import { ok, err, serverError } from '@/lib/response'

/**
 * GET /api/provenance/:product_id
 *
 * Fetch the complete provenance timeline for a product.
 * Public endpoint (no authentication required).
 * Chronologically ordered.
 *
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "product_id": "uuid-v4",
 *     "serial_number": "LUX-2026-00001",
 *     "brand": "Hermès",
 *     "name": "Birkin 30",
 *     "nft_token_id": "42",
 *     "current_status": "OWNED",
 *     "timeline": [
 *       {
 *         "log_id": "uuid-v4",
 *         "event": "MANUFACTURED",
 *         "actor_role": "brand",
 *         "metadata": {
 *           "batch_id": "uuid-v4"
 *         },
 *         "timestamp": "2026-05-01T00:00:00Z"
 *       }
 *     ]
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ product_id: string }> }
) {
  try {
    const { product_id } = await context.params
    if (!product_id) return err('INVALID_PAYLOAD', 'product_id is required', 422)

    const provenance = await productService.getProvenance(product_id)
    return ok(provenance)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'NOT_FOUND') {
      return err('NOT_FOUND', 'Product not found', 404)
    }
    console.error('[GET /api/provenance/:product_id]', error)
    return serverError()
  }
}
