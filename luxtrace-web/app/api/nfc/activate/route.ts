import { NextRequest } from 'next/server'
import { nfcService } from '@/services/nfc.service'
import { productRepository } from '@/repositories/product.repository'
import { productLogRepository } from '@/repositories/product-log.repository'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, serverError } from '@/lib/response'

/**
 * POST /api/nfc/activate
 *
 * Operator physically scans the NFC chip embedded in a MANUFACTURED product
 * and submits its UID. The system:
 *   1. Looks up the product by serial number (printed on the tag / box)
 *   2. Verifies product is still MANUFACTURED (not yet activated)
 *   3. Binds the real scanned NFC UID to the product (replaces any placeholder)
 *   4. Transitions product: MANUFACTURED → REGISTERED
 *   5. Writes an immutable provenance log
 *
 * Role required: OPERATOR or ADMIN
 *
 * Request:
 * {
 *   "serial_number": "LUX-2026-00101",   // printed serial on the box/product
 *   "nfc_uid": "04:A3:2B:C1:12:34:56"   // scanned from physical NFC chip
 * }
 *
 * Response 200:
 * {
 *   "product_id": "uuid",
 *   "serial_number": "LUX-2026-00101",
 *   "brand": "Rolex",
 *   "name": "Submariner Date",
 *   "nfc_uid": "04:A3:2B:C1:12:34:56",
 *   "status": "REGISTERED",
 *   "nft_token_id": "42"
 * }
 *
 * Errors:
 * - PRODUCT_NOT_FOUND 404
 * - ALREADY_REGISTERED 409: product already activated
 * - NFC_ALREADY_BOUND 409: a different NFC UID already bound to this product
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return forbidden('Only ADMIN or OPERATOR can activate products')
    }

    const body = await request.json()
    const { serial_number, nfc_uid } = body

    if (!serial_number || typeof serial_number !== 'string') {
      return err('INVALID_PAYLOAD', 'serial_number is required', 422)
    }
    if (!nfc_uid || typeof nfc_uid !== 'string') {
      return err('INVALID_PAYLOAD', 'nfc_uid is required (scanned from physical chip)', 422)
    }

    // 1. Find product by serial number
    const product = await productRepository.findBySerialNumber(serial_number.trim())
    if (!product) {
      return err('PRODUCT_NOT_FOUND', `No product found with serial: ${serial_number}`, 404)
    }

    // 2. State guard: must be MANUFACTURED
    if (product.status !== 'MANUFACTURED') {
      if (product.status === 'REGISTERED' || product.status === 'OWNED') {
        return err(
          'ALREADY_REGISTERED',
          `Product ${serial_number} is already activated (status: ${product.status})`,
          409
        )
      }
      return err('INVALID_STATE', `Product is in ${product.status} state — cannot activate`, 409)
    }

    // 3. Guard: NFC must not already be bound to a different UID
    if (product.nfc_bound) {
      return err('NFC_ALREADY_BOUND', 'This product already has an NFC chip bound', 409)
    }

    // 4. Bind the real physical NFC UID to this product
    await nfcService.bindWithRealUid(product.product_id, nfc_uid.trim())

    // 5. Transition: MANUFACTURED → REGISTERED
    const updated = await productRepository.updateStatus(
      product.product_id,
      'REGISTERED',
      'MANUFACTURED'
    )

    if (!updated) {
      return err('STATE_CONFLICT', 'Product state changed concurrently — please retry', 409)
    }

    // 6. Immutable provenance log
    await productLogRepository.insert({
      product_id: product.product_id,
      event: 'REGISTERED',
      actor_id: user.user_id,
      actor_role: 'OPERATOR',
      metadata: {
        action: 'NFC_PHYSICAL_ACTIVATION',
        nfc_uid_scanned: nfc_uid.trim(),
        activated_by: user.user_id,
      },
    })

    return ok({
      product_id: product.product_id,
      serial_number: product.serial_number,
      brand: product.brand,
      name: product.name,
      nfc_uid: nfc_uid.trim(),
      status: 'REGISTERED',
      nft_token_id: product.nft_token_id,
    })
  } catch (error: unknown) {
    console.error('[POST /api/nfc/activate]', error)
    return serverError()
  }
}
