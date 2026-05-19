import { NextRequest } from 'next/server'
import { productService } from '@/services/product.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, serverError } from '@/lib/response'

/**
 * GET /api/products/:id
 *
 * Retrieve detailed properties for a single digital twin.
 * Consumers can only fetch details for assets currently in their custody.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const { id } = await context.params
    const product = await productService.getById(id)

    // Guard: Consumers can only view their own products
    if (user.role === 'CONSUMER' && product.current_owner_id !== user.user_id) {
      return forbidden()
    }

    return ok(product)
  } catch (error) {
    const e = error as { code?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', 'Product not found', 404)
    console.error('[GET /api/products/:id]', error)
    return serverError()
  }
}
