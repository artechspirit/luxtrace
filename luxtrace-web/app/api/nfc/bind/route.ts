import { NextRequest } from 'next/server'
import { productService } from '@/services/product.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, serverError } from '@/lib/response'

/**
 * POST /api/nfc/bind
 *
 * Manually bind an NFC tag to a product that is already REGISTERED.
 * Used when hardware NFC writer is applied after batch mint completes.
 * Role required: ADMIN or OPERATOR
 *
 * Request:
 * { "product_id": "uuid-v4" }
 *
 * Response 200:
 * { "product_id": "uuid", "nfc_bound": true }
 *
 * Errors:
 * - PRODUCT_NOT_FOUND 404: product doesn't exist
 * - INVALID_STATE 409: product must be REGISTERED first
 * - NFC_ALREADY_BOUND 409: already has an NFC tag
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return forbidden('Only ADMIN or OPERATOR can bind NFC tags')
    }

    const body = await request.json()
    const { product_id } = body

    if (!product_id || typeof product_id !== 'string') {
      return err('INVALID_PAYLOAD', 'product_id is required', 422)
    }

    const result = await productService.bindNfcToProduct(product_id, user.user_id)

    return ok(result)
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Product not found', 404)
    if (e.code === 'INVALID_STATE') return err('INVALID_STATE', e.message ?? 'Invalid product state', 409)
    if (e.code === 'NFC_ALREADY_BOUND') return err('NFC_ALREADY_BOUND', 'NFC tag already bound to this product', 409)
    console.error('[POST /api/nfc/bind]', error)
    return serverError()
  }
}
