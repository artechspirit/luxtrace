import { NextRequest } from 'next/server'
import { productService } from '@/services/product.service'
import { productRepository } from '@/repositories/product.repository'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'
import type { ProductStatus } from '@/types'

/**
 * GET /api/products
 *
 * Retrieve registered products list.
 * Admins/Operators can view all products with filters.
 * Consumers can only view products in their custody/ownership.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const status = (searchParams.get('status') || undefined) as ProductStatus | undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (user.role === 'ADMIN' || user.role === 'OPERATOR') {
      const result = await productService.getAll({ status, page, limit })
      return ok({
        items: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
        },
      })
    } else {
      // Consumers only get their own products
      const items = await productRepository.findAllByOwner(user.user_id)
      const filtered = status ? items.filter((i) => i.status === status) : items
      const paginated = filtered.slice((page - 1) * limit, page * limit)

      return ok({
        items: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
        },
      })
    }
  } catch (error) {
    console.error('[GET /api/products]', error)
    return serverError()
  }
}
