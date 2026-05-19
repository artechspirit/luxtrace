import { NextRequest } from 'next/server'
import { nfcRepository } from '@/repositories/nfc.repository'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/response'

/**
 * GET /api/products/:id/nfc-debug
 *
 * Secure helper route for operators to fetch the bound NFC raw UID.
 * Restricted to ADMIN/OPERATOR roles for testing/simulation.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') return forbidden()

    const { id } = await context.params
    const tag = await nfcRepository.findByProductId(id)

    if (!tag) {
      return ok({ nfc_uid: null })
    }

    return ok({ nfc_uid: tag.nfc_uid })
  } catch (error) {
    console.error('[GET /api/products/:id/nfc-debug]', error)
    return serverError()
  }
}
