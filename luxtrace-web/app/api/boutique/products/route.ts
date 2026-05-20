import { NextRequest } from 'next/server'
import { productService } from '@/services/product.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/response'

/**
 * GET /api/boutique/products
 *
 * List all products available in the primary boutique.
 * Only returns products with status = REGISTERED (minted, NFC bound, not yet sold).
 * Role required: OPERATOR or ADMIN
 *
 * Response 200:
 * {
 *   "products": [
 *     {
 *       "product_id": "uuid",
 *       "serial_number": "LUX-2026-00101",
 *       "brand": "Rolex",
 *       "name": "Submariner Date",
 *       "description": "...",
 *       "price_idr": 350000000,
 *       "nft_token_id": "42",
 *       "status": "REGISTERED"
 *     }
 *   ],
 *   "total": 5
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return forbidden('Only ADMIN or OPERATOR can view boutique inventory')
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const search = searchParams.get('search') ?? ''

    const result = await productService.getAll({
      status: 'REGISTERED',
      page,
      limit,
    })

    // Filter by search term if provided (brand or name or serial)
    const filtered = search
      ? result.data.filter(
          (p) =>
            p.brand.toLowerCase().includes(search.toLowerCase()) ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.serial_number.toLowerCase().includes(search.toLowerCase())
        )
      : result.data

    return ok({
      products: filtered.map((p) => ({
        product_id: p.product_id,
        serial_number: p.serial_number,
        brand: p.brand,
        name: p.name,
        description: p.description,
        price_idr: p.price_idr,
        nft_token_id: p.nft_token_id,
        status: p.status,
      })),
      total: filtered.length,
    })
  } catch (error: unknown) {
    console.error('[GET /api/boutique/products]', error)
    return serverError()
  }
}
